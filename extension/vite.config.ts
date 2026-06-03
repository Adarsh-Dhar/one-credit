import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-html-files',
      writeBundle() {
        // Copy HTML files to root of dist and rewrite script references
        const htmlFiles = [
          { src: 'src/pages/popup/index.html', dest: 'dist/popup.html', script: 'js/popup.js' },
          { src: 'src/pages/sidepanel/index.html', dest: 'dist/sidepanel.html', script: 'js/sidepanel.js' },
          { src: 'src/pages/options/index.html', dest: 'dist/options.html', script: 'js/options.js' },
        ]

        htmlFiles.forEach(({ src, dest, script }) => {
          const srcPath = path.resolve(__dirname, src)
          const destPath = path.resolve(__dirname, dest)
          if (existsSync(srcPath)) {
            let content = readFileSync(srcPath, 'utf-8')
            // Rewrite script reference
            content = content.replace(/<script type="module" src="\/src\/pages\/[^\/]+\/main\.tsx"><\/script>/, `<script type="module" src="/${script}"></script>`)
            writeFileSync(destPath, content)
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      'tw-animate-css': 'tw-animate-css',
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
