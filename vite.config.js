import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 開發模式設定 (npm run dev)
  server: {
    host: '0.0.0.0', // 監聽所有 IP，解決 Render 無法連線問題
    port: parseInt(process.env.PORT) || 5173, // 使用 Render 分配的 Port 或預設 5173
  },
  // 預覽/生產模式設定 (npm run preview)
  preview: {
    host: '0.0.0.0', // 監聽所有 IP
    port: parseInt(process.env.PORT) || 4173, // 使用 Render 分配的 Port 或預設 4173
    allowedHosts: true, // 允許所有主機名稱（解決 Invalid Host header 問題）
  }
})
