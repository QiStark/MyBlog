interface SiteConfig {
  // 基础信息
  title: string
  description: string
  author: string
  language: string
  siteUrl: string
  
  // 社交媒体链接
  social: {
    github: string
    email: string
  }
}

const selfConfig: SiteConfig = {
  title: "Dingqi's Blog",
  description: '日拱一卒，功不唐捐',
  author: 'Dingqi',
  language: 'zh-CN',
  siteUrl: 'https://qistark.github.io/MyBlog',

  social: {
    github: 'https://github.com/QiStark',
    email: '1961129773@qq.com',
  }
}

export default selfConfig
