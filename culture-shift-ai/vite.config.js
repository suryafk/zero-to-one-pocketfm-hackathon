import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See README.md -> "Wiring up the real backend" for how /api is proxied.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
