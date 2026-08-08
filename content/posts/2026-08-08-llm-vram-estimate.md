---
title: LLM训练的显存估计
date: 2026-08-08
tags:
  - LLM
  - 训练
---

### 基于Transformer的大语言模型，GPU显存估计

### **1.  模型状态，FP16混合精度训练：**

参数：参数副本，精度FP16保存，每个参数2字节

梯度：精度FP16保存，每个参数2字节

adam优化器：精度FP32保存，包括：参数、梯度指数平滑值、梯度平方指数平滑值，总计每个参数12字节

**假设参数为10B，占用160G显存**

**对应的工程方案**

 DeepSpeed的**ZeRO**，原理：模型状态切分并分发到多张 GPU 上，降低每张 GPU 的显存消耗。

特点：渐进式的多阶段优化

ZeRO-1：adam 状态分配到多个GPU上
$$
\text{precision} * \text{model\_size} + \text{precision} * \text{model\_size} + \frac{(12 * \text{model\_size})}{\text{num\_gpus}}
$$




ZeRO-2：梯度与adam 状态并行
$$
\text{precision} * \text{model\_size} + \frac{(\text{precision} + 12)* \text{model\_size}}{\text{num\_gpus}}
$$


ZeRO-3：参数、梯度、adam都并行
$$
\frac{(\text{precision} +\text{precision} + 12)* \text{model\_size}}{\text{num\_gpus}}
$$

### **2. 激活值**

![Transformer层激活值示意](/images/llm-vram-activations.png)

在训练大模型时，除了模型参数、梯度和优化器状态外，前向传播产生的**中间激活值**也必须保存下来，直到反向传播完成才能释放。

- $L$ — number of transformer layers
- $s$ — sequence length
- $b$ — batch size
- $h$ — hidden dimension size
- $a$ — number of attention heads
- $p$ — precision

后续出现psbh用于指代p * s * b * h

**MLP模块**

- 第一个线性层的输出：4psbh
- GeLU层输出：4psbh
- 第二个线性层的输出：psbh
- dropout mask： sbh，mask二进制，可以理解为p为1  

对于激活值存储MLP需要：9psbh + sbh

**注意力模块**

自注意力模块的中间结果：

- 矩阵乘以Q、K、V输出结果：3psbh
- QK<sup>T</sup>的乘积结果：矩阵大小s\*s，a个头，结合批次 b， 所以是 pas<sup>2</sup>b
- Softmax 的输出结果：同上步骤，pas<sup>2</sup>b
- Softmax 后的 Dropout Mask：as<sup>2</sup>b

自注意力模块的输出：psbh

线性层输出：psbh

Dropout mask ：sbh

对于激活值存储注意力模块需要：总计：5psbh + 2pas<sup>2</sup>b + as<sup>2</sup>b +sbh

**归一化模块**

2个Norm Layers： 2psbh

**综上，激活值的计算公式为**
$$
L_{psbh} \left( 16 + \frac{2}{p} + \frac{2as}{h} + \frac{as}{ph} \right)
$$
训练的时候，一般只修改batch size，这个与显存线性相关

**对应的工程方案**

激活检查点技术：**用计算时间（多算一遍前向）来换取显存空间（少存中间结果）**。代价是 33% 的额外计算开销。

粗略的计算公式估计：
$$
\sqrt{Lpsbh \left( 16 + \frac{2}{p} + \frac{2as}{h} + \frac{as}{ph} \right)}
$$

### 3. 总结

1. **明确可用的 GPU 加速器类型，更具体地说，需要搞清楚到底有多少张卡。**
2. **获取模型的参数规模，并计算存储“模型状态”所需的 GPU 显存。** 考虑引入哪种级别的 ZeRO Stages。
3. **获取详细的模型架构参数（例如配置文件 config.json）并进行分析。**设定Batch Size，以及是否需要开启Activation Checkpointing。
4. **最终得出一个合理的显存估算数值，并跑一个 小规模验证实验来验证实际开销是否符合预估。**

 计算代码

 ```
 def activations_memory(num_layers, seq_len, batch_size, hidden_dim, num_heads, precision=2):
     "Returns amount of GPU VRAM (in GB) required to store intermediate activations for traditional Transformer Encoder block"
     mem_bytes = num_layers * precision * seq_len * batch_size * hidden_dim * (
         16 + 2/precision + 2*num_heads*seq_len/hidden_dim + num_heads*seq_len/(precision*hidden_dim))
     return round(mem_bytes / 10**9, 2)
 
 def gpu_memory_required(model_size, num_gpus, num_layers, seq_len, batch_size, hidden_dim, num_heads, precision=2, activations_checkpoint=False, stage=0):
     model_in_memory = (precision + precision + 12) * model_size
     print(f'In default mode model states would have taken: {model_in_memory} GB')    
     if stage == 0:
         model_in_memory = (precision + precision + 12) * model_size
     elif stage == 1:
         model_in_memory = precision * model_size + precision * model_size + (12 * model_size) / num_gpus
     elif stage == 2:
         model_in_memory = precision * model_size + (precision +12) * model_size  / num_gpus
     elif stage == 3:
         model_in_memory = (precision + precision + 12) * model_size / num_gpus
     else:
         raise ValueError
     print(f'Stage {stage} selected, model states would require {model_in_memory} GB')
     
     activations = activations_memory(num_layers, seq_len, batch_size, hidden_dim, num_heads, precision)
     print(f'Model activations would require {activations} GB without activations checkpointing')
     if activations_checkpoint:
         activations = activations ** 0.5
         print(f'Activations checkpointing is enabled, activations would require {activations} GB')
         
     return activations + model_in_memory
 ```

#### 参考文章

https://medium.com/@maxshapp/understanding-and-estimating-gpu-memory-demands-for-training-llms-in-practise-c5ef20a4baff
