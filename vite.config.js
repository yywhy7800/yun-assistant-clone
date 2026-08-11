import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置文件 - 云助手
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 8899,
    open: false,
    proxy: {
      '/api': 'http://localhost:8000',
      '/game': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
