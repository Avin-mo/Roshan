
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // <- ensures JS/CSS paths are relative
  build: {
    outDir: '../roshan_build',
    emptyOutDir: true,
  }
})
