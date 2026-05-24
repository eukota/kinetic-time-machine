import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))
const backendStatic = path.resolve(root, '../backend/static')
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

/** Serve backend/static locally so the race route works without the API running. */
function serveBackendStatic(): Plugin {
  return {
    name: 'serve-backend-static',
    configureServer(server) {
      server.middlewares.use('/static', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '/').split('?')[0])
        const filePath = path.normalize(path.join(backendStatic, rel))
        if (!filePath.startsWith(backendStatic) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.geojson': 'application/geo+json',
          '.json': 'application/json',
        }
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveBackendStatic()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: !!process.env.VITE_DOCKER,
    },
    proxy: {
      '/api': backend,
      '/photos': backend,
      ...(process.env.VITE_DOCKER ? { '/static': backend } : {}),
    },
  },
})
