import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // react-draggable의 내부 로그 함수가 process.env.DRAGGABLE_DEBUG를 참조하는데,
    // 브라우저엔 process 전역이 없어 드래그/리사이즈 시작 시 ReferenceError로 죽는 문제 방지
    'process.env.DRAGGABLE_DEBUG': 'false',
  },
})