// Dev entry point + legacy single-bundle (npm run build).
// Production per-page bundles → npm run build:pages (scripts/build.ts).
import "./styles/style.css";

import type { Feature } from "./types/feature";
import type { Page } from "./types/page";

// Import all feature files from nested folders
const featureModules = import.meta.glob<{ default: Feature }>("./features/**/*.ts", {
  eager: true,
});

// Import all page files
const pageModules = import.meta.glob<{ default: Page }>("./pages/*.ts", {
  eager: true,
});

// A file under features/ is a "feature entry" iff its default export has the
// Feature shape ({ name, init }). Helpers like ./heroLoader/test.ts or
// ./heroLoader/utils.ts have no Feature-shaped default and are silently skipped.
const isFeature = (m: unknown): m is Feature =>
  !!m && typeof (m as Feature).name === "string" && typeof (m as Feature).init === "function";

const allFeatures: Feature[] = Object.values(featureModules)
  .map((module) => module.default)
  .filter(isFeature);

const isPage = (m: unknown): m is Page =>
  !!m && typeof (m as Page).name === "string" && typeof (m as Page).init === "function";

const pages: Record<string, Page> = Object.fromEntries(
  Object.values(pageModules)
    .map((module) => module.default)
    .filter(isPage)
    .map((page) => [page.name, page] as const)
);

// Global features that run on all pages
const globalFeatures = allFeatures.filter((feature) => feature.global);

function initApp(): void {
  // Initialize global features first
  globalFeatures.forEach((feature) => {
    feature.init();
  });

  // Get current page from data-page attribute and initialize it
  const currentPageName = document.body.dataset.page || "home";
  const currentPage = pages[currentPageName];

  if (currentPage) {
    console.log("Initializing page:", currentPage.name);
    currentPage.init();
  } else {
    console.warn(`Page "${currentPageName}" not found. Available pages:`, Object.keys(pages));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
