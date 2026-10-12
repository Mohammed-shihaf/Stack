// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import security from "eslint-plugin-security";
import globals from "globals";

/**
 * eslint 9 FLAT CONFIG.
 *
 * This is a different shape from every earlier repo in the corpus, and the
 * difference is the point.
 *
 * On Node 12/14/16 the config was `.eslintrc.cjs`, and the plugins' `recommended`
 * exports were the WRONG ones: eslint-plugin-security 2.1.1 and
 * eslint-plugin-sonarjs 1.0.4 both ship a flat-shaped `recommended` that fails
 * eslintrc schema validation -- and eslint then crashes while *formatting* that
 * error, so the stack trace never names the cause. Those repos must extend
 * `recommended-legacy`.
 *
 * Here that inverts. eslint 9 defaults to flat config, so `recommended` is the
 * correct export and `recommended-legacy` is the wrong one. Same plugin, same
 * export name, opposite answer -- decided entirely by the eslint major.
 *
 * `import.meta.dirname` is Node 20.11+, so the Node 18 form is used below.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "dist/**", "build/**", "reports/**", "coverage/**", "coverage-nyc/**",
      "coverage-vitest/**", "node_modules/**", ".yarn/**", "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  security.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "sonarjs/cognitive-complexity": ["error", 15],
      complexity: ["error", 10],
      "max-depth": ["error", 4],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
);
