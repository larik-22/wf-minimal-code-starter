# Minimal Webflow Development Typescript Template

This is a a bun-based Webflow integration project that enables TypeScript development for Webflow websites. The compiled code is hosted on a CDN and loaded into Webflow sites via custom code blocks.

## Purpose

- Provide a modern TypeScript development environment for Webflow projects
- Enable modular, maintainable code for Webflow sites
- Support page-specific and global features/interactions
- Integrate with GSAP for animations
- Integrate with Finsweet for list management (in case filtering is needed)

## Key Characteristics

- Code is built and hosted externally, then loaded into Webflow
- Uses data attributes (`data-page`, `data-menu-toggle`, etc.) to connect with Webflow elements

## Quick Structure (for fast setup)

```txt
Webflow <body data-page="home">
            │
            ▼
src/pages/home.ts
  name: "home"   ← must match data-page
  features: [...]
  init()         ← runs page features
            │
            ▼
src/features/home/*.ts
  init()         ← feature logic lives here

src/features/global/*.ts
  global: true   ← runs on every page
  init()
```

### Rules

- Set a page key in Webflow: `<body data-page="page_name">`
- Create `/src/pages/page_name.ts`
- In that file, set `name: "page_name"` (must be the same key)
- Every feature must implement `init()`
- If a feature should run on all pages, place it in `src/features/global/` and set `global: true`

### Feature-Based Architecture

**Features** (`src/features/`):

- Self-contained interactive components or animations
- Organized in folders by scope: `global/`, `artists/`, `home/`, etc.
- Can be global (run on all pages) by setting `global: true`
- Must implement the `Feature` interface with `name`, `init()`
- Export as default
- Place in `features/global/` for global features, or `features/[page-name]/` for page-specific

**Pages** (`src/pages/`):

- Consolidate features for specific pages
- Must implement the `Page` interface with `name`, `features[]`, `init()`, and optional `destroy()`
- Page name matches `data-page` attribute on `<body>` element in Webflow
- Export as default

---

# Integration with Webflow

In Webflow, there are two possibilities:

In both cases, you have the HMR (Hot Module Reload) in place, it allows you to refresh the page each time you save a TS file. It's convenient and it will save you time.

-   If you do both Webflow dev and TS:

    Paste this script into the `Before </body> tag` part of the Webflow custom code in the project settings so that it loads on all pages.

    ```html
    <script type="module" src="http://localhost:3000/@vite/client"></script>
    <script type="module" src="http://localhost:3000/src/main.ts"></script>
    ```

-   If you are doing the TS dev but not the Webflow dev (**recommended version**):

    Paste this script in the `Before </body> tag` part of the Webflow custom code in the project settings so that it loads on all pages. We will change the url of Netlify later to load the production files.

    ```jsx
    <script>
      (function () {
        const LOCALHOST_URL = [
          'http://localhost:3000/@vite/client',
          'http://localhost:3000/src/main.ts',
        ]
        const PROD_URL = ['https://MY-PROJECT.netlify.app/main.js']

        function createScripts(arr, isDevMode) {
          return arr.map(function (url) {
            const s = document.createElement('script')
            s.src = url

            if (isDevMode) {
              s.type = 'module'
            }

            return s
          })
        }

        function insertScript(scriptArr) {
          scriptArr.forEach(function (script) {
            document.body.appendChild(script)
          })
        }

        const localhostScripts = createScripts(LOCALHOST_URL, true)
        const prodScripts = createScripts(PROD_URL, false)

        let choosedScripts = null

        fetch(LOCALHOST_URL[0], {})
          .then(() => {
            choosedScripts = localhostScripts
          })
          .catch((e) => {
            choosedScripts = prodScripts
            console.error(e)
          })
          .finally(() => {
            if (choosedScripts) {
              insertScript(choosedScripts)

              return
            }

            console.error('something went wrong, no scripts loaded')
          })
      })()
    </script>
    ```
