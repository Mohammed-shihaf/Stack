// @ts-check
const tseslint = require("typescript-eslint");
const sonarjs = require("eslint-plugin-sonarjs");

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "sonarjs/cognitive-complexity": ["error", 5],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/no-small-switch": "error",
      "sonarjs/no-redundant-boolean": "error",
      "sonarjs/no-duplicate-string": ["error", { threshold: 2 }],
    },
  }
);
