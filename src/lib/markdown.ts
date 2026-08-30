import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { unified } from 'unified'
import type { Plugin } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import rehypePrism from 'rehype-prism-plus'
import rehypeImgSize from 'rehype-img-size'
import { remarkQQMusic } from './plugins/remarkQQMusic'

const prismAliases = {
  typescript: ['ts'],
  javascript: ['js'],
  python: ['py'],
  r: ['R'],
  perl: ['pl'],
  shell: ['bash', 'sh', 'zsh'],
  shellsession: ['console', 'terminal'],
  json: ['jsonc'],
  yaml: ['yml'],
  markdown: ['md'],
  plaintext: ['text', 'txt'],
  dockerfile: ['docker'],
  powershell: ['ps', 'ps1']
}

// basePath 前缀，与 next.config.js 中保持一致
const BASE_PATH = '/MyBlog'

// 最小的 hast 元素节点形状（仅本文件遍历图片所需）
interface HastNode {
  type: string
  tagName?: string
  properties?: { src?: unknown }
  value?: unknown
  children?: HastNode[]
}

// 遍历 hast 树中所有 img 元素，对其 src 应用 transform
function visitImgTree(tree: HastNode, transform: (src: string) => string | null) {
  const visit = (node: HastNode) => {
    if (node.type === 'element' && node.tagName === 'img') {
      const src = node.properties?.src
      if (typeof src === 'string' && node.properties) {
        const next = transform(src)
        if (next !== null) node.properties.src = next
      }
    }
    if (node.type === 'raw' && typeof node.value === 'string') {
      node.value = node.value.replace(/<img\b[^>]*\bsrc="([^"]*)"/g, (whole, src: string) => {
        const next = transform(src)
        return next === null ? whole : whole.slice(0, whole.length - src.length - 1) + next + '"'
      })
    }
    if (node.children) node.children.forEach(visit)
  }
  visit(tree)
}

// 在 rehype-img-size 之前剥掉 src 的 basePath 前缀，
// 使其能在 public/ 下正确读到文件计算尺寸。
const rehypeStripBasePath: Plugin = () => (tree) => {
  visitImgTree(tree as HastNode, (src) =>
    src.startsWith(BASE_PATH + '/') ? '/' + src.slice(BASE_PATH.length + 1) : null
  )
}

// 在 rehype-img-size 之后把 basePath 前缀加回去，
// 保证最终 HTML 中的 <img src> 在静态部署（basePath=/MyBlog）下能正确访问。
const rehypeRestoreBasePath: Plugin = () => (tree) => {
  visitImgTree(tree as HastNode, (src) =>
    src.startsWith('/') && !src.startsWith(BASE_PATH + '/') ? BASE_PATH + src : null
  )
}

// 创建统一的 markdown 处理器
const processor = unified()
  .use(remarkParse)
  .use(remarkQQMusic)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkRehype, {
    allowDangerousHtml: true
  })
  .use(rehypeStripBasePath)
  .use(rehypePrism, {
    showLineNumbers: true,
    ignoreMissing: true,
    aliases: prismAliases
  })
  .use(rehypeImgSize, {
    dir: path.join(process.cwd(), 'public')
  })
  .use(rehypeRestoreBasePath)
  .use(rehypeKatex, {
    strict: false
  })
  .use(rehypeStringify, {
    allowDangerousHtml: true
  })

// 异步渲染 markdown（缓存同一内容的渲染结果）
export const renderMarkdown = cache(async (content: string): Promise<string> => {
  const result = await processor.process(content)
  return result.toString()
})

// 接口定义保持不变
export interface BlogPost {
  slug: string
  slugBase: string
  title: string
  date: string
  tags: string[]
  excerpt: string
  content: string
}

// 从文件名中提取日期和slug
function parseFileName(fileName: string) {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/)
  if (!match) throw new Error(`Invalid file name format: ${fileName}`)
  const date = match[1]
  const slugBase = match[2]
  return {
    date,
    slugBase,
    slug: `${date}-${slugBase}`
  }
}

// 生成摘要
function generateExcerpt(content: string, maxLength: number = 200) {
  const plainText = content
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`]/g, '')
    .trim()
  
  const firstParagraph = plainText
    .split('\n')
    .find(line => line.trim().length > 0)
    ?.trim() || ''

  return firstParagraph.length > maxLength
    ? `${firstParagraph.slice(0, maxLength)}...`
    : firstParagraph
}

function parseTags(tags: unknown): string[] {
  // 如果是字符串（单行格式），按逗号或空格分割
  if (typeof tags === 'string') {
    return tags
      .split(/[,\s]+/)
      .map(tag => tag.trim())
      .filter(Boolean)
  }
  
  // 如果是数组（YAML 列表格式），确保每个元素都是字符串
  if (Array.isArray(tags)) {
    return tags
      .map(tag => String(tag).trim())
      .filter(Boolean)
  }
  
  // 其他情况返回空数组
  return []
}

// 修改为异步函数
export const getAllPosts = cache(async (): Promise<BlogPost[]> => {
  const postsDirectory = path.join(process.cwd(), 'content/posts')
  const fileNames = fs.readdirSync(postsDirectory)
  
  const posts = await Promise.all(fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(async fileName => {
      const { date, slug, slugBase } = parseFileName(fileName)
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        slug,
        slugBase,
        title: data.title || slugBase,
        date,
        tags: parseTags(data.tags),
        excerpt: generateExcerpt(content),
        content: await renderMarkdown(content)
      }
    }))

  return posts.sort((a, b) => b.date.localeCompare(a.date))
})

// 分页相关接口定义保持不变
export interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedPosts {
  posts: BlogPost[]
  pagination: PaginationInfo
}

// 修改为异步函数
export async function getPaginatedPosts(page: number = 1, limit: number = 5): Promise<PaginatedPosts> {
  const posts = await getAllPosts()
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const totalPages = Math.ceil(posts.length / limit)

  return {
    posts: posts.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: endIndex < posts.length,
      hasPrevPage: page > 1
    }
  }
} 
