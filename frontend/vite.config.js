import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Covers every route in main.py:
      //   /api/orchestrate
      //   /api/agents/*
      //   /api/applications, /api/profile, /api/logs, /api/feedback
      //   /api/scout/*
      //   /api/resume, /api/research, /api/outreach, /api/skill-gap
      //   /api/interview/v2/*  (REST)
      '/api': {
        target: BACKEND,
        changeOrigin: true,
      },
      // WebSocket must be a separate entry with ws:true
      // Vite matches the most specific key first, so this takes
      // priority over the '/api' entry above for WS upgrade requests
      '/api/interview/v2/ws': {
        target: BACKEND,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
