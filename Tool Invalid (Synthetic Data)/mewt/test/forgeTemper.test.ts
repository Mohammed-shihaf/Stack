import { describe, expect, it } from "vitest";
import { classifyTemper } from "../src/forgeTemper";

// Deliberately thin: quenchSeconds is never tested, and classifyTemper is
// only checked at one point far from any boundary, leaving most of mewt's
// comprehensive mutation/edge-case checks unaddressed.
describe("classifyTemper", () => {
  it("classifies well above 55 as hard", () => {
    expect(classifyTemper(90)).toBe("hard");
  });
});
