# Dingqi's Blog

基于 Next.js 构建的静态博客，托管于 GitHub Pages，并由 GitHub Actions 自动构建部署。

## 快速开始
- `pnpm install`
- `pnpm dev` 开发预览
- `pnpm build` 生成静态产物

## 内容结构
- 基础信息：`src/config/self.config.ts`
- 网站图标：`src/app/icon.ico`
- 关于页：`content/about.md`
- 博文：`content/posts`，文件命名必须为 `YYYY-MM-DD-<slug>.md`（日期+slug 组成最终链接 `/posts/YYYY-MM-DD-<slug>`，避免同名冲突）
- 项目文档：`content/project`（可编辑 `index.md` 作为入口）

## Markdown 与代码
- 支持 GFM、数学公式（KaTeX）、图片尺寸自动填充、Prism 代码高亮（包含 ts/js/py/r/shell/json/yaml/dockerfile 等常见别名）
- 支持 QQ 音乐标签：`[qqmusic:音乐ID]`

## 部署
- 开发：`pnpm dev`
- 构建：`pnpm build`（静态输出用于 GitHub Pages）