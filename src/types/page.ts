// consolidation of features per page

import type { Feature } from "./feature";

export interface Page {
	name: string;
	features: Feature[];
	init: () => void;
	destroy?: () => void;
}
