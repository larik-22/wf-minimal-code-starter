/// <reference types="node" />
import * as esbuild from "esbuild";
import {
  readdirSync,
  existsSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { resolve, basename, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "src");
const DIST = resolve(ROOT, "dist");

// ─── Types ────────────────────────────────────────────────────────────────────

type PageManifest = { entry: string; deps: string[] };
type Manifest = Record<string, PageManifest>;

// ─── Virtual entry plugin ─────────────────────────────────────────────────────
// Synthesizes a per-page entry module in-memory (no temp files).
// Each virtual module imports all global features then the page module,
// and calls initApp() on DOMContentLoaded.

function virtualEntryPlugin(
  pages: string[],
  globalFeaturePaths: string[],
): esbuild.Plugin {
  const NAMESPACE = "virtual-entry";

  return {
    name: "virtual-entries",
    setup(build) {
      build.onResolve({ filter: /^virtual-entry:/ }, (args) => ({
        path: args.path,
        namespace: NAMESPACE,
      }));

      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, (args) => {
        const page = args.path.replace("virtual-entry:", "");
        if (!pages.includes(page)) return null;

        const globalImports = globalFeaturePaths
          .map((p, i) => `import _g${i} from ${JSON.stringify(p)};`)
          .join("\n");

        const globalRefs = globalFeaturePaths
          .map((_, i) => `_g${i}`)
          .join(", ");

        const pageEntry = resolve(SRC, "pages", `${page}.ts`);

        const code = [
          globalImports,
          `import _page from ${JSON.stringify(pageEntry)};`,
          "",
          "function initApp() {",
          globalFeaturePaths.length > 0
            ? `  [${globalRefs}].forEach(function (f) { f.init(); });`
            : null,
          "  _page.init();",
          "}",
          "",
          'if (document.readyState === "loading") {',
          '  document.addEventListener("DOMContentLoaded", initApp);',
          "} else {",
          "  initApp();",
          "}",
        ]
          .filter((l) => l !== null)
          .join("\n");

        return { contents: code, loader: "ts", resolveDir: ROOT };
      });
    },
  };
}

// ─── Manifest builder ─────────────────────────────────────────────────────────
// Parses the esbuild metafile to map page names → hashed entry + chunk deps.
// Entry files are identified by the presence of an `entryPoint` field.

function buildManifest(outputs: esbuild.Metafile["outputs"]): Manifest {
  const manifest: Manifest = {};

  for (const [outPath, meta] of Object.entries(outputs)) {
    if (!meta.entryPoint) continue; // skip chunks — they have no entryPoint

    // metafile entryPoint format is "{namespace}:{path}" = "virtual-entry:virtual-entry:home"
    const page = meta.entryPoint.replace(/^virtual-entry:virtual-entry:/, "");

    // outPath is cwd-relative: "dist/home.ABCD1234.js" → "home.ABCD1234.js"
    const entry = relative(DIST, resolve(ROOT, outPath));

    // Direct import-statement dependencies (esbuild-generated chunks only)
    const deps = (meta.imports ?? [])
      .filter((imp) => imp.kind === "import-statement" && !imp.external)
      .map((imp) => relative(DIST, resolve(ROOT, imp.path)));

    manifest[page] = { entry, deps };
  }

  return manifest;
}

// ─── Loader template ──────────────────────────────────────────────────────────
// Tiny IIFE written to dist/main.js and added to Webflow site-wide custom code.
// Embeds the manifest so no extra network request is needed at runtime.
// Uses <link rel="modulepreload"> for the page entry + all chunk deps,
// then injects <script type="module"> to start execution.

function buildLoaderSource(manifest: Manifest): string {
  return `(function () {
  var manifest = ${JSON.stringify(manifest)};
  var scripts = document.querySelectorAll("script[src]");
  var base = "";
  for (var i = 0; i < scripts.length; i++) {
    if (/\\/main\\.js(\\?.*)?$/.test(scripts[i].src)) {
      base = scripts[i].src.replace(/main\\.js(\\?.*)?$/, "");
      break;
    }
  }
  var page = (document.body && document.body.dataset.page) || "home";
  var config = manifest[page];
  if (!config) return;
  var files = [config.entry].concat(config.deps || []);
  for (var j = 0; j < files.length; j++) {
    var link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = base + files[j];
    document.head.appendChild(link);
  }
  var script = document.createElement("script");
  script.type = "module";
  script.src = base + config.entry;
  document.head.appendChild(script);
})();`;
}

// ─── Preview index.html ───────────────────────────────────────────────────────
// Only used by `bun run preview:pages`. Not shipped to Webflow.
const PREVIEW_HTML = /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview — wf-minimal-code-starter</title>
    <!--
      Simulates the Webflow site-wide snippet.
      Change data-page on <body> to preview a different page bundle.
    -->
    <script defer src="/main.js"></script>
  </head>
  <body data-page="home"></body>
</html>`;

// ─── Setup ────────────────────────────────────────────────────────────────────

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ─── Page + feature discovery ─────────────────────────────────────────────────

const pages = readdirSync(resolve(SRC, "pages"))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => basename(f, ".ts"));

const globalFeaturesDir = resolve(SRC, "features/global");
const globalFeaturePaths: string[] = existsSync(globalFeaturesDir)
  ? readdirSync(globalFeaturesDir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => resolve(globalFeaturesDir, f))
  : [];

console.log(`\nBuilding ${pages.length} page bundle(s): ${pages.join(", ")}`);
console.log(`Global features: ${globalFeaturePaths.length}\n`);

// ─── Single esbuild build (all pages at once) ─────────────────────────────────
// Running all pages in one call lets esbuild detect shared modules and extract
// them into chunks/[hash].js automatically — no duplication across page bundles.

const entryPoints: Record<string, string> = {};
for (const page of pages) {
  entryPoints[page] = `virtual-entry:${page}`;
}

const result = await esbuild.build({
  entryPoints,
  plugins: [virtualEntryPlugin(pages, globalFeaturePaths)],
  bundle: true,
  splitting: true, // extract shared code into chunks/; requires format: "esm"
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outdir: DIST,
  entryNames: "[name].[hash]",
  chunkNames: "chunks/[hash]",
  metafile: true,
  minify: true,
  drop: ["console"], // strip all console.* calls in production
  treeShaking: true,
  external: ["jquery"],
  logLevel: "warning",
});

// ─── Manifest + loader ────────────────────────────────────────────────────────

const manifest = buildManifest(result.metafile.outputs);

const loaderSource = buildLoaderSource(manifest);
const { code: minifiedLoader } = await esbuild.transform(loaderSource, {
  minify: true,
  target: "es2019", // slightly conservative for the loader itself
});

writeFileSync(resolve(DIST, "main.js"), minifiedLoader, "utf-8");
writeFileSync(resolve(DIST, "index.html"), PREVIEW_HTML, "utf-8");

// ─── Summary ──────────────────────────────────────────────────────────────────

const outputs = result.metafile.outputs;
const fmt = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

console.log("Done. Output:");
console.log(
  `  dist/main.js  (loader — add to Webflow site-wide)  ${fmt(Buffer.byteLength(minifiedLoader))}`,
);

for (const page of pages) {
  const entry = manifest[page]?.entry;
  if (!entry) continue;
  const meta = outputs[`dist/${entry}`] ?? outputs[relative(ROOT, resolve(DIST, entry))];
  const size = meta ? fmt(meta.bytes) : "?";
  console.log(`  dist/${entry}  ${size}`);

  for (const dep of manifest[page]?.deps ?? []) {
    const depMeta = outputs[`dist/${dep}`] ?? outputs[relative(ROOT, resolve(DIST, dep))];
    const depSize = depMeta ? fmt(depMeta.bytes) : "?";
    console.log(`    dist/${dep}  ${depSize}`);
  }
}
console.log();
