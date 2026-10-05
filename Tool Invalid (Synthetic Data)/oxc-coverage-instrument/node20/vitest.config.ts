import { defineConfig } from "vitest/config";
import { createOxcInstrumenter } from "oxc-coverage-instrument/vitest";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      instrumenter: (options) => createOxcInstrumenter(options),
      include: ["src/**/*.ts"],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
