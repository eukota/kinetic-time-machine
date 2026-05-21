import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: !!process.env.VITE_DOCKER,
    },
    proxy: {
      '/api': backend,
      '/photos': backend,
      '/static': backend,
    },
  },
})
