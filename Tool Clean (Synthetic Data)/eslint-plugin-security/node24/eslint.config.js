// @ts-check
const tseslint = require("typescript-eslint");
const security = require("eslint-plugin-security");

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
    },
  }
);
