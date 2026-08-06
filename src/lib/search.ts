import { cache } from 'react'
import { getAllPosts } from './markdown'

export interface SearchResult {
  id: string
  title: string
  excerpt: string
  slug: string
  date: string
  matchType: 'title' | 'content'
}

export const generateSearchIndex = cache(async () => {
  const posts = await getAllPosts()
  
  const searchIndex = posts.flatMap(post => {
    const titleResult: SearchResult = {
      id: `${post.slug}-title`,
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
      date: post.date,
      matchType: 'title'
    }
    
    const contentResult: SearchResult = {
      id: `${post.slug}-content`,
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
      date: post.date,
      matchType: 'content'
    }
    
    return [titleResult, contentResult]
  })
  
  return searchIndex
})
