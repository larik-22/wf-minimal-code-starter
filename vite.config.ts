import { rm, stat } from "node:fs/promises";
import path from "node:path";

import { defineConfig, type PluginOption } from "vite";

function devTunnelStatusPlugin(): PluginOption {
  const bootedAt = new Date();
  const bootId = Math.random().toString(36).slice(2, 10);
  const pruned: { path: string; existed: boolean }[] = [];

  return {
    name: "dev-tunnel-status",
    apply: "serve",
    transform(code, id) {
      // Inject a console banner into main.ts so every Webflow page that loads
      // the tunnel script logs the boot ID. Same ID across reloads = same
      // server run; new ID = the dev server restarted and you're on fresh code.
      // if (id.endsWith("/src/main.ts")) {
      //   const banner =
      //     `console.log(` +
      //     `"%c[wf-malayy dev]%c tunnel script loaded",` +
      //     `"background:#2da44e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",` +
      //     `"color:#2da44e",` +
      //     `{ bootId: ${JSON.stringify(bootId)}, ` +
      //     `bootedAt: ${JSON.stringify(bootedAt.toISOString())}, ` +
      //     `loadedAt: new Date().toISOString() });\n`;
      //   return { code: banner + code, map: null };
      // }
      return null;
    },
    async configResolved(config) {
      const targets = [
        path.resolve(config.root, "node_modules/.vite"),
        path.resolve(config.root, "node_modules/.vite-temp"),
      ];
      for (const p of targets) {
        let existed = false;
        try {
          await stat(p);
          existed = true;
        } catch {
          /* missing is fine */
        }
        await rm(p, { recursive: true, force: true });
        pruned.push({ path: p, existed });
      }
    },
    configureServer(server) {
      // Defeat Cloudflare tunnel + browser caching for every dev response.
      server.middlewares.use((_req, res, next) => {
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, max-age=0"
        );
        res.setHeader("CDN-Cache-Control", "no-store");
        res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
      });

      // Status landing page at root — confirms fresh boot + cache prune.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (url !== "/" && url !== "/index.html") return next();

        const servedAt = new Date();
        const reqId = Math.random().toString(36).slice(2, 10);

        const prunedRows = pruned
          .map(
            (p) =>
              `<li><code>${p.path}</code> — ${
                p.existed ? "removed" : "not present"
              }</li>`
          )
          .join("");

        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>wf-minimal-code-starter · dev tunnel live</title>
    <style>
      :root { color-scheme: dark light; }
      body { font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 760px; margin: 3rem auto; padding: 0 1.5rem; }
      h1 { font-size: 1rem; margin: 0 0 1rem; display: flex; align-items: center; gap: .6rem; }
      .badge { padding: 2px 8px; border-radius: 999px; background: #2da44e; color: #fff; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
      .ok { color: #2da44e; font-weight: 600; }
      dl { display: grid; grid-template-columns: 10rem 1fr; gap: .35rem 1rem; margin: 1rem 0; }
      dt { color: #888; }
      code { background: rgba(127,127,127,.15); padding: 1px 6px; border-radius: 4px; word-break: break-all; }
      ul { padding-left: 1.2rem; margin: .25rem 0; }
      hr { border: 0; border-top: 1px solid rgba(127,127,127,.25); margin: 1.5rem 0; }
      small { color: #888; }
    </style>
  </head>
  <body>
    <h1><span class="badge">live</span> wf-minimal-code-starter dev tunnel</h1>
    <p class="ok">✓ no cache used — Vite dep cache pruned on this boot</p>
    <dl>
      <dt>booted at</dt><dd>${bootedAt.toISOString()}</dd>
      <dt>boot id</dt><dd><code>${bootId}</code></dd>
      <dt>served at</dt><dd>${servedAt.toISOString()} <small>(this response)</small></dd>
      <dt>request id</dt><dd><code>${reqId}</code> <small>(unique per fetch — reload to see it change)</small></dd>
      <dt>pid</dt><dd>${process.pid}</dd>
      <dt>port</dt><dd>${server.config.server.port ?? 7777}</dd>
      <dt>response headers</dt><dd>
        <code>Cache-Control: no-store, no-cache, must-revalidate, max-age=0</code><br/>
        <code>CDN-Cache-Control: no-store</code><br/>
        <code>Cloudflare-CDN-Cache-Control: no-store</code>
      </dd>
    </dl>
    <p><strong>Cache prune targets</strong></p>
    <ul>${prunedRows}</ul>
    <hr/>
    <p>Entry: <code>&lt;script type="module" src="/src/main.ts"&gt;&lt;/script&gt;</code></p>
    <p><small>If a Webflow page still appears stale, hard-reload (⌘⇧R). The dev server, the Cloudflare tunnel edge, and the browser are all instructed to bypass cache on this URL.</small></p>
    <script>
      console.log(
        "%c[wf-minimal-code-starter dev]%c status page served fresh",
        "background:#2da44e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold",
        "color:#2da44e",
        {
          bootId: ${JSON.stringify(bootId)},
          bootedAt: ${JSON.stringify(bootedAt.toISOString())},
          servedAt: ${JSON.stringify(servedAt.toISOString())},
          requestId: ${JSON.stringify(reqId)},
          renderedAt: new Date().toISOString()
        }
      );
    </script>
  </body>
</html>`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });

      const existed = pruned.filter((p) => p.existed).length;

      console.log(
        `\n[dev-tunnel-status] pruned ${existed}/${pruned.length} vite cache dir(s); cache-bypass headers active.\n`
      );
    },
  };
}

export default defineConfig({
  plugins: [devTunnelStatusPlugin()],
  resolve: {
    alias: {
      $: path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 7777,
    // true = bind 0.0.0.0 so phone Safari on the same Wi‑Fi can open the "Network" URL Vite prints
    host: true,
    allowedHosts: ["vovi.howufeelingtoday.online"],
    // Webflow loads our scripts cross-origin (e.g. https://malayy-vovi.webflow.io
    // → https://vovi.howufeelingtoday.online). Module scripts need CORS headers.
    cors: {
      origin: [
        /\.webflow\.io$/,
        /\.webflow\.com$/,
        /^https?:\/\/localhost(:\d+)?$/,
        // add your custom Webflow domain here when you publish
      ],
      credentials: false,
    },
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
