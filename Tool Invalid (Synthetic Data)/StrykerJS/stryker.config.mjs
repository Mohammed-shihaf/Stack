/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  mutate: ["src/**/*.ts"],
  testRunner: "vitest",
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  reporters: ["progress", "clear-text"],
  coverageAnalysis: "all",
  // Invalid-data twin of the clean corpus: thresholds stay meaningful
  // (break below 50 is a real gate, not just "any imperfection"), and the
  // thin test suite above is measured to land well under it.
  thresholds: { high: 80, low: 50, break: 50 },
};
