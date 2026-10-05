/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  mutate: ["src/**/*.ts"],
  testRunner: "vitest",
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  reporters: ["progress", "clear-text"],
  coverageAnalysis: "all",
  thresholds: { high: 100, low: 100, break: 100 },
};
