import { describe, expect, it } from "vitest";
import { chimeCount } from "../src/clocktowerChime";

// Deliberately thin test suite: only one boundary is ever checked, and
// isQuietHour is never exercised at all, so the overwhelming majority of
// Stryker's generated mutants (conditional-boundary, arithmetic-operator,
// boolean-literal, equality-operator swaps across both functions) survive.
describe("chimeCount", () => {
  it("chimes 12 at midnight", () => {
    expect(chimeCount(0)).toBe(12);
  });
});
