# 部署上线指南

自己发布博客的完整流程：**写文 → 本地预览 → 推送上线**。

## 环境准备（仅首次）

需要 Node.js 20 和 pnpm：

```bash
node -v            # 确认 >= 20
npm i -g pnpm      # 没有 pnpm 时安装
```

## 首次安装依赖

```bash
pnpm install
```

## 1. 写一篇新博文

在 `content/posts/` 下新建 Markdown 文件，文件名**必须**是 `YYYY-MM-DD-<slug>.md`，
例如 `2026-08-02-my-note.md`，最终链接为 `/posts/2026-08-02-my-note`。

文件开头写 frontmatter：

```markdown
---
title: 文章标题
date: 2026-08-02
tags:
  - 标签1
  - 标签2
---

正文从这里开始……
```

- 图片放到 `public/images/`，正文里写 `![描述](/images/xxx.png)`（不要手动加 `/MyBlog` 前缀，构建时会自动处理）。
- 无需任何注册步骤，保存文件即生效；列表按日期倒序排列。

## 2. 本地预览（实时热更新）

```bash
pnpm dev
# 访问 http://localhost:3000/MyBlog
# Ctrl+C 停止
```

## 3. 构建验证（可选）

推送前想确认能正常构建：

```bash
pnpm build         # 静态产物输出到 out/
pnpm lint          # 顺便检查代码规范
```

## 4. 推送上线

推送到 `main` 分支即触发 GitHub Actions 自动构建并发布到 GitHub Pages，无需手动部署：

```bash
git add -A && git commit -m "post: 新增/更新内容" && git push origin main
```

## 一键流程（写完笔记后）

```bash
pnpm dev                                                       # 本地预览确认
# Ctrl+C 停止后：
git add -A && git commit -m "post: 新增/更新内容" && git push origin main
```

## 常见坑

- `public/` 里的静态资源在**代码**中引用时要手动加 `/MyBlog` 前缀（如 `metadata.icons`、`<img src>`）。
  `next/link` 会自动加 basePath，但 metadata 与原始 HTML 标签不会。
- favicon 路径例：`icon: '/MyBlog/icon.svg'`，写成 `/icon.svg` 会在静态导出后 404。
- **`src/app/favicon.*` / `src/app/icon.*` 文件约定在 `output: 'export'` 下可能不被复制到 `out/`，导致线上 404。**
  推荐做法：把图标放 `public/<name>.<ext>`，在 `metadata.icons` 里手动写 `/MyBlog/<name>.<ext>`。

## 查看部署状态

- Actions 构建进度：https://github.com/QiStark/MyBlog/actions
- 线上站点：https://qistark.github.io/MyBlog/
