import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See README.md -> "Wiring up the real backend" for how /api is proxied.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Uncomment once a real backend exists — the app already calls these
      // paths and falls back to local mock data if they 404 or error out.
      // '/api': 'http://localhost:8000',
    },
  },
})
