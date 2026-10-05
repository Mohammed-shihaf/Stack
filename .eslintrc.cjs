/**
 * eslint 8 eslintrc config, in a CommonJS file, inside a CommonJS package.
 *
 * Two deliberate choices, both of which are gate G3:
 *
 * 1. This file is `.cjs` and the package does NOT declare "type": "module".
 *    WillowBrook shipped a CommonJS rule file inside a package declaring
 *    "type":"module"; eslint could not load it and 4 of 9 tool families were
 *    blocked.
 *
 * 2. `plugin:security/recommended-legacy`, NOT `plugin:security/recommended`.
 *    eslint-plugin-security 2.1.1 exports both. `recommended` is flat-config
 *    shaped (its `plugins` is an object) and fails eslintrc schema validation --
 *    whereupon eslint throws "Converting circular structure to JSON" while
 *    FORMATTING that validation error, so the output is a stack trace that
 *    never names the real cause.
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "sonarjs", "security"],
  env: { node: true, es2019: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:sonarjs/recommended",
    "plugin:security/recommended-legacy",
  ],
  rules: {
    "sonarjs/cognitive-complexity": ["error", 15],
    complexity: ["error", 10],
    "max-depth": ["error", 4],
    eqeqeq: ["error", "always"],
    "no-var": "error",
    "prefer-const": "error",
  },
  ignorePatterns: ["dist/", "build/", "reports/", "node_modules/", "coverage*/", ".yarn/"],
};
