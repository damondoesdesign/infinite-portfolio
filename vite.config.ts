import { defineConfig } from 'vite'

const forPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: forPages ? '/infinite-portfolio/' : '/',
  build: {
    outDir: forPages ? 'docs' : 'dist',
    emptyOutDir: true,
  },
})
