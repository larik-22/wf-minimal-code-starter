// animation sequence or any other interactivity / logic

export interface Feature {
	name: string;
	global?: boolean; // if true, runs on all pages
	init: () => void;
}
