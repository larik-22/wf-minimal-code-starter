import { defineConfig } from "vite";

// Dev server + legacy single-bundle only (npm run build).
// Per-page production bundles → npm run build:pages (scripts/build.ts).
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
