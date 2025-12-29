import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/v1/tts': {
        target: 'https://openspeech.bytedance.com',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/mega_tts': {
        target: 'https://openspeech.bytedance.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
