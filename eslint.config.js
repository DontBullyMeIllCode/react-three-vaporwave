import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "storybook-static", "node_modules", "!.storybook"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  storybook.configs["flat/recommended"],
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.config.{js,ts}", "scripts/**"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Must stay last: turns off rules that conflict with Prettier
  prettier,
);
