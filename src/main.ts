// Dev entry point + legacy single-bundle (npm run build).
// Production per-page bundles → npm run build:pages (scripts/build.ts).
import "./styles/style.css";

import type { Feature } from "./types/feature";
import type { Page } from "./types/page";

// Import all feature files from nested folders
const featureModules = import.meta.glob<{ default: Feature }>(
  "./features/**/*.ts",
  { eager: true }
);

// Import all page files
const pageModules = import.meta.glob<{ default: Page }>("./pages/*.ts", {
  eager: true,
});

// Extract features from modules
const allFeatures: Feature[] = Object.values(featureModules)
  .map((module) => {
    if (!module.default) {
      console.warn(`Feature module has no default export`);
      return null;
    }
    return module.default;
  })
  .filter((f): f is Feature => f !== null);

// Extract pages and map by name
const pages: Record<string, Page> = Object.fromEntries(
  Object.values(pageModules)
    .map((module) => {
      if (!module.default) {
        console.warn(`Page module has no default export`);
        return null;
      }
      return [module.default.name, module.default];
    })
    .filter((entry): entry is [string, Page] => entry !== null)
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
    console.warn(
      `Page "${currentPageName}" not found. Available pages:`,
      Object.keys(pages)
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
