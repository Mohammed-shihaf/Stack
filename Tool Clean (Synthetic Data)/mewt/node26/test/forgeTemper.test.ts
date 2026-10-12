import { describe, expect, it } from "vitest";
import { classifyTemper, quenchSeconds } from "../src/forgeTemper";

describe("classifyTemper", () => {
  it("classifies below 35 as soft", () => {
    expect(classifyTemper(20)).toBe("soft");
  });
  it("classifies exactly 35 as medium", () => {
    expect(classifyTemper(35)).toBe("medium");
  });
  it("classifies just under 55 as medium", () => {
    expect(classifyTemper(54)).toBe("medium");
  });
  it("classifies exactly 55 as hard", () => {
    expect(classifyTemper(55)).toBe("hard");
  });
  it("classifies well above 55 as hard", () => {
    expect(classifyTemper(62)).toBe("hard");
  });
});

describe("quenchSeconds", () => {
  it("quenches hard the longest", () => {
    expect(quenchSeconds("hard")).toBe(12);
  });
  it("quenches medium in between", () => {
    expect(quenchSeconds("medium")).toBe(8);
  });
  it("quenches soft the shortest", () => {
    expect(quenchSeconds("soft")).toBe(4);
  });
});
