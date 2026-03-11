import { defineConfig } from "vite";

// vite.config.js
export default defineConfig({
  server: {
    host: "localhost",
    cors: "*",
    port: 3000,
    allowedHosts: "all",
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
  },
  build: {
    minify: true,
    manifest: true,
    rollupOptions: {
      input: "./src/main.ts",
      output: {
        format: "iife",
        entryFileNames: "main.js",
        inlineDynamicImports: true,
        compact: true,
        globals: {
          jquery: "$",
        },
      },
      external: ["jquery"],
    },
  },
  optimizeDeps: {
    include: ["gsap", "gsap/ScrollTrigger", "gsap/SplitText"],
  },
});
