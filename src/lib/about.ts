import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { renderMarkdown } from './markdown'

export const getAboutContent = cache(async () => {
  const filePath = path.join(process.cwd(), 'content/about.md')
  const content = fs.readFileSync(filePath, 'utf-8')
  const { data, content: markdown } = matter(content)
  
  return {
    title: data.title || '关于',
    content: await renderMarkdown(markdown)
  }
})
