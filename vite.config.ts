import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    // إذا كنا في وضع الـ Build نستخدم '/Hikaya/'، وإذا كنا في وضع التشغيل المحلي نستخدم '/'
    base: command === 'serve' ? '/' : '/Hikaya/',
  }
})