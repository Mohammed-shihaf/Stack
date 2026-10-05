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
      "security/detect-object-injection": "error",
      "security/detect-child-process": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-pseudoRandomBytes": "error",
    },
  }
);
