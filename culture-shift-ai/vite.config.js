import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See README.md -> "Wiring up the real backend" for how /api is proxied.
export default defineConfig({
  plugins: [react()],
  build: {
    // FastAPI serves this directory in the deployed Databricks App.
    outDir: '../backend/app/static',
    emptyOutDir: true,
  },
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
