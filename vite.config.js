import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.GITHUB_REPOSITORY?.split('/').pop()
const pagesBase = repoName ? `/${repoName}/` : '/'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? pagesBase : '/',
  server: {
    port: 5173,
    host: true,
  },
})
