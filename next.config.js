/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/MyBlog',
  assetPrefix: '/MyBlog/',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig 