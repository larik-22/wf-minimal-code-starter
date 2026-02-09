import type { Page } from "../types/page";
import homeFeature from "../features/home/exampleFeature";

const homePage: Page = {
	name: "home",
	features: [homeFeature],
	init() {
		console.log("Home page initialized");
		this.features.forEach((feature) => feature.init());
	},
};

export default homePage;
