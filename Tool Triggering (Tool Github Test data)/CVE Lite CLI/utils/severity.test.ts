import { reachesFailOn } from "../../src/utils/severity.js";

describe("reachesFailOn", () => {
  it("returns true when finding severity >= threshold", () => {
    expect(reachesFailOn([{ severity: "critical" }], "low")).toBe(true);
    expect(reachesFailOn([{ severity: "high" }], "medium")).toBe(true);
    expect(reachesFailOn([{ severity: "medium" }], "medium")).toBe(true);
  });

  it("returns false when finding severity < threshold", () => {
    expect(reachesFailOn([{ severity: "low" }], "medium")).toBe(false);
    expect(reachesFailOn([{ severity: "none" }], "low")).toBe(false);
  });

  it("treats unknown severity same as low (rank 1)", () => {
    expect(reachesFailOn([{ severity: "unknown" }], "low")).toBe(true);
    expect(reachesFailOn([{ severity: "unknown" }], "medium")).toBe(false);
  });

  it("handles empty findings array", () => {
    expect(reachesFailOn([], "low")).toBe(false);
  });

  it("normalizes threshold input", () => {
    expect(reachesFailOn([{ severity: "high" }], "HIGH")).toBe(true);
    expect(reachesFailOn([{ severity: "low" }], "Critical")).toBe(false);
  });

  it("returns false when failOn is empty string", () => {
    expect(reachesFailOn([{ severity: "critical" }], "")).toBe(false);
    expect(reachesFailOn([{ severity: "high" }], "")).toBe(false);
  });
});
