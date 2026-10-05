// @ts-check
const tseslint = require("typescript-eslint");
const sonarjs = require("eslint-plugin-sonarjs");

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ["src/**/*.ts"],
  }
);
