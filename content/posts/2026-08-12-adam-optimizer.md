---
title: Adam优化器
date: 2026-08-12
tags:
  - 深度学习
  - 优化器
---

### 1. 普通的梯度下降的问题

#### 1.1 梯度为0，但是是**局部最小值**，或者位于**鞍点**

![局部最小值与鞍点](/images/adam-local-min-saddle.png)

#### 1.2 在谷底两侧来回反弹

      │  ╲                              ╱
      │   ╲        ●→               ←●  ╱
      │    ╲         ●→           ←●   ╱
      │     ╲          ●→       ←●    ╱
      │      ╲           ●→   ←●     ╱
      │       ╲            ●←●      ╱
      │        ╲_____    ↓↓↓↓   ___╱
      │              ╲__________╱
      └────────────────────────────────→
           Steep      Wasted energy     Slow progress
           walls      zigzagging!       along valley

#### 1.3 梯度很小的区域，参数更新缓慢

      │
      │           ● → ● → ● → ● → ● → ●
      │  ________________________________________
      │                                         ╲
      │                                          ╲
      │                                           ╲___
      └────────────────────────────────────────────────→
           Tiny gradient = tiny, tiny steps
           (this could take millions of iterations)

### 2. 解决方案

#### **2.1 Momentum** 

**不只是看当前这一时刻的梯度，而是会累积之前的梯度信息**。从而克服局部最小值，并减少由噪声梯度引起的震荡。

![Momentum](/images/adam-momentum.png)

具体公式
$$
m_t = \beta_1 m_{t-1} + (1-\beta_1)g_t
$$

然后更新参数：

$$
\theta_{t+1} = \theta_t - \eta m_t
$$

其中：

**θₜ**：第 *t* 次迭代时的模型参数

**gₜ**：第 t 步的梯度

**mₜ**：第 *t* 次迭代的动量项，用于累积历史梯度信息，m<sub>0</sub> = 0

**β**：动量系数，控制历史梯度的影响程度，通常取 0.9

**η**：学习率，控制每次参数更新的步长

**偏差纠正**

可以看到当t比较小的时候，比如m<sub>1</sub> 为0.1倍的初始梯度，这是因为m<sub>0</sub> 被初始化为 0，导致训练初期的动量估计明显偏小。因此要进行偏差纠正。公式为
$$
\hat{m}_t = \frac{m_t}{1-\beta_1^t}
$$
为什么是这么纠正呢？（**以下为大模型给出的解释**）
$$
m_t = (1 - \beta) \sum_{i=1}^{t} \beta^{t-i} g_i
$$
m<sub>t</sub> 应该是个“加权平均”结果，权重和应该等于 1。但是现在为等比数列
$$
(1-\beta)(1+\beta+\beta^2+\cdots+\beta^{t-1})
$$

根据等比数列公式：

$$
1+\beta+\cdots+\beta^{t-1}
=
\frac{1-\beta^t}{1-\beta}
$$

因此，现在总的权重和为 1−β<sup>t</sup>，因此进行修正，除以该项。

#### **2.2 Adaptive Learning Rates** 

动机：不同的参数梯度不一样，有的大，有的小，应该动态设置学习率，梯度较大的参数使用较小的学习率，梯度较小的参数使用较大的学习率。

具体算法为**RMSProp** (Root Mean Square Propagation)，公式为：
$$
s_t = \beta_2 s_{t-1} + (1-\beta_2)g_t^2
$$

$$
\theta_t = \theta_{t-1}
- \frac{\eta}{\sqrt{s_t}+\epsilon}g_t
$$

其中：

**gₜ**：第 t 步的梯度

**sₜ**：梯度平方的指数移动平均，s<sub>0</sub> = 0

**β<sub>2</sub>**：衰减率，通常取 0.999

**η**：学习率

**ε**：防止除零的小常数，通常取 10⁻⁸

**θₜ**：第 t 步的参数

同样要进行偏差纠正，同Momentum

### 3. 综合以上两种方法的adam

**Adam（Adaptive Moment Estimation，自适应矩估计）** 将这两个思想结合起来：

1. **一阶矩（First Moment，Momentum）**：记录过去的运动方向 → **决定往哪个方向走**
2. **二阶矩（Second Moment， RMSProp）**：记录梯度变化有多剧烈 → **决定每一步应该走多大**

![Adam](/images/adam-overview.png)
