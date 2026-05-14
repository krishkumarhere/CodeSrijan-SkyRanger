import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 443, // Force Vite to use the public HTTPS port for HMR
    },
    proxy: {
      '/ws': {
        target: 'ws://10.239.125.80:8000',
        ws: true,
      },
      '/api': {
        target: 'http://10.239.125.80:8000',
        changeOrigin: true,
      }
    }
  }
})