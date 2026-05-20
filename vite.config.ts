import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/infinite-portfolio/' : '/',
  build: {
    outDir: 'dist',
  },
})
