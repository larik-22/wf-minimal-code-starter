import homeFeature from "../features/home/exampleFeature";
import type { Page } from "../types/page";

const homePage: Page = {
  name: "home",
  features: [homeFeature],
  init() {
    console.log("Home page initialized");
    this.features.forEach((feature) => feature.init());
  },
};

export default homePage;
