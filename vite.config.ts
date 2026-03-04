import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'

// vite.config.js
export default defineConfig({
  plugins: [eslintPlugin()],
  server: {
    host: 'localhost',
    cors: '*',
    allowedHosts: 'all',
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
  },
  build: {
    minify: true,
    manifest: true,
    rollupOptions: {
      input: './src/main.ts',
      output: {
        format: 'iife',
        entryFileNames: 'main.js',
        inlineDynamicImports: true,
        compact: true,
        globals: {
          jquery: '$',
        },
      },
      external: ['jquery'],
    },
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText'],
  },
})

