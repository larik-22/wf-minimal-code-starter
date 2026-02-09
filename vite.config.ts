import { defineConfig } from "vite";

// vite.config.js
export default defineConfig({
	plugins: [],
	server: {
		host: "localhost",
		port: 3000,
		cors: true,
		hmr: {
			host: "localhost",
			protocol: "ws",
		},
	},
	build: {
		minify: true,
		manifest: true,
		rollupOptions: {
			input: "./src/main.ts",
			output: {
				format: "umd",
				entryFileNames: "main.js",
				esModule: false,
				compact: true,
				globals: {
					jquery: "$",
				},
			},
			external: ["jquery"],
		},
	},
});
