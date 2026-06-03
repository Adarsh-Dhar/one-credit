import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    minify: 'terser',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/pages/popup/index.html'),
        sidepanel: path.resolve(__dirname, 'src/pages/sidepanel/index.html'),
        options: path.resolve(__dirname, 'src/pages/options/index.html'),
        background: path.resolve(__dirname, 'src/background.ts'),
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].chunk.js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
            return `images/[name][extname]`
          } else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
            return `fonts/[name][extname]`
          } else if (ext === 'css') {
            return `css/[name][extname]`
          }
          return `[name][extname]`
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
