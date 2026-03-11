import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
	{ ignores: ["dist/**", "node_modules/**", "*.config.js"] },
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
		files: ["**/*.ts"],
		plugins: {
			"simple-import-sort": simpleImportSort,
			prettier,
		},
		rules: {
			"prettier/prettier": "warn",
			"simple-import-sort/imports": "warn",
			"simple-import-sort/exports": "warn",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
);
