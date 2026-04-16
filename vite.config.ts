import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  server: {
    port: 7777,
    // true = bind 0.0.0.0 so phone Safari on the same Wi‑Fi can open the "Network" URL Vite prints
    host: true,
    // Default HMR (ws on the dev server port). The wss:443 setup only works when Vite is
    // reached via an HTTPS tunnel; locally it breaks the socket and causes reload loops.
    ...(process.env.VITE_TUNNEL_HMR === "1"
      ? {
          hmr: {
            protocol: "wss",
            host: "vovi.howufeelingtoday.online",
            clientPort: 443,
          },
        }
      : {}),
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
