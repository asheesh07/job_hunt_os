import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env safely
  const env = loadEnv(mode, process.cwd(), '')

  // Safe fallback (prevents crash)
  const BACKEND = env.VITE_API_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: BACKEND,
          changeOrigin: true,
          secure: true,
        },
        '/api/interview/v2/ws': {
          target: BACKEND,
          changeOrigin: true,
          ws: true,
          secure: true,
        },
      },
    },
  }
})
