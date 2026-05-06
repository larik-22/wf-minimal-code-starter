---
name: webflow-env
description: Mental model for working in this Webflow + custom code project. Code is built locally, hosted on Vercel CDN, and injected into Webflow pages via a single <script src="main.js"> tag. Use when adding features, creating pages, targeting DOM elements, or reasoning about how/when code runs in Webflow.
---

# Webflow Environment

## Runtime model

Webflow hosts the HTML. This project only injects JavaScript — no HTML, no CSS framework, no server rendering.

```
Webflow page (HTML)
  └── <script src="https://cdn.../main.js">   ← site-wide custom code
        └── reads document.body.dataset.page
        └── dynamically injects <script type="module" src="[page].[hash].js">
              └── runs features for that page
```

The loader in `main.js` reads `<body data-page="name">` to decide which page bundle to load. That attribute is set in Webflow on each page's body tag.

## Code structure

```
src/features/global/   ← runs on every page automatically
src/features/[page]/   ← page-specific features
src/pages/[page].ts    ← wires features together for that page
```

A **Feature** is just `{ name, init() }`. Every feature exposes `init()` — the build system calls it on `DOMContentLoaded`.

A **Page** collects its features and calls `feature.init()` for each one.

## Adding a new page

1. Create `src/pages/[name].ts` — must match `data-page="name"` in Webflow
2. Create `src/features/[name]/` for its features
3. Run `bun run build:pages` — the new bundle is auto-discovered

## Targeting DOM elements

All elements exist in Webflow's DOM. Query them from `init()` — the DOM is ready by the time it's called.

```ts
// safe — init() fires after DOMContentLoaded
const btn = document.querySelector<HTMLButtonElement>('[data-btn="submit"]');
```

Use `data-*` attributes as selectors — they're stable, not tied to CSS class names Webflow may change.

## Key constraints

- **No DOM manipulation outside `init()`** — elements don't exist yet at module parse time
- **No ES module imports from Webflow** — treat the Webflow page as a black box of HTML
- **`console.*` is stripped in production** — use freely in dev, never rely on it in prod logic
- **jQuery is external** — available globally in Webflow (`$`), not bundled
- **Global features always run** — don't put page-specific code in `src/features/global/`

## Dev vs prod

| Context | Entry | How it loads |
|---|---|---|
| `bun run dev` | `src/main.ts` | Vite HMR, all pages via import.meta.glob |
| production | `dist/main.js` | IIFE loader, dynamic ESM per page from CDN |

The dev entry (`main.ts`) is never shipped. Don't reference it from page code.
