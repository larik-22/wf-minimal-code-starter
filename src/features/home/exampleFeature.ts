import type { Feature } from "../../types/feature";

const homeFeature: Feature = {
  name: "home-example",
  init() {
    console.log("Home feature initialized");
  },
};

export default homeFeature;
