# Product Overview

This is a Webflow integration project that enables TypeScript development for Webflow websites. The compiled code is hosted on a CDN and loaded into Webflow sites via custom code blocks.

## Purpose

- Provide a modern TypeScript development environment for Webflow projects
- Enable modular, maintainable code for Webflow sites
- Support page-specific and global features/interactions
- Integrate with GSAP for animations
- Integrate with Finsweet for list management (in case filtering is needed)

## Key Characteristics

- Code is built and hosted externally, then loaded into Webflow
- Uses data attributes (`data-page`, `data-menu-toggle`, etc.) to connect with Webflow elements

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
