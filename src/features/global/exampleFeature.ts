import type { Feature } from "../../types/feature";

const globalFeature: Feature = {
	name: "global-example",
	global: true,
	init() {
		console.log("Global feature initialized");
	},
};

export default globalFeature;
