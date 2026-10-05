import { renderOverrideFindings } from "../../src/output/override-findings-terminal.js";
import type { OverrideFinding } from "../../src/overrides/types.js";

const f = (over: Partial<OverrideFinding> = {}): OverrideFinding => ({
  ruleId: "OA001",
  severity: "high",
  package: { name: "postcss" },
  location: { file: "package.json", jsonPath: "/overrides/postcss" },
  message: "Override target not in resolved tree",
  ...over,
});

describe("renderOverrideFindings (terminal)", () => {
  it("returns a friendly empty message when there are no findings", () => {
    const out = renderOverrideFindings([]);
    expect(out).toMatch(/no override hygiene issues found/i);
  });

  it("renders a section header followed by one row per finding", () => {
    const out = renderOverrideFindings([f(), f({ ruleId: "OA003", severity: "high", package: { name: "react" } })]);
    expect(out).toMatch(/Override hygiene/i);
    expect(out).toMatch(/OA001/);
    expect(out).toMatch(/OA003/);
  });

  it("groups findings by severity, critical first", () => {
    const out = renderOverrideFindings([
      f({ ruleId: "OA001", severity: "low" }),
      f({ ruleId: "OA008", severity: "critical", package: { name: "lodash" } }),
    ]);
    const critIdx = out.indexOf("OA008");
    const lowIdx = out.indexOf("OA001");
    expect(critIdx).toBeGreaterThan(-1);
    expect(lowIdx).toBeGreaterThan(-1);
    expect(critIdx).toBeLessThan(lowIdx);
  });

  it("shows the jsonPath in the location column", () => {
    const out = renderOverrideFindings([f({ location: { file: "package.json", jsonPath: "/pnpm/overrides/react" } })]);
    expect(out).toMatch(/\/pnpm\/overrides\/react/);
  });

  it("prints the copy-and-run command when a fix carries one", () => {
    const out = renderOverrideFindings([
      f({
        fix: {
          type: "rfc6902",
          patch: [{ op: "remove", path: "/overrides/postcss" }],
          runnableCommand: "cve-lite overrides --fix --rule OA001",
        },
      }),
    ]);
    expect(out).toMatch(/> cve-lite overrides --fix --rule OA001/);
  });

  it("omits the run line when a fix has no runnableCommand", () => {
    const out = renderOverrideFindings([
      f({
        fix: {
          type: "rfc6902",
          patch: [{ op: "remove", path: "/overrides/postcss" }],
        },
      }),
    ]);
    expect(out).not.toMatch(/>/);
  });

  it("verbose mode shows a cyan header without leading box-drawing separators", () => {
    const out = renderOverrideFindings([f()], { verbose: true });
    expect(out).toMatch(/Override Hygiene/i);
    const headerIdx = out.indexOf("Override Hygiene");
    const separatorBefore = out.lastIndexOf("────", headerIdx);
    expect(separatorBefore).toBe(-1);
  });

  it("compact mode (default) wraps the header in box-drawing separators", () => {
    const out = renderOverrideFindings([f()]);
    expect(out).toMatch(/────/);
    expect(out).toMatch(/Override Hygiene/i);
    const headerIdx = out.indexOf("Override Hygiene");
    const separatorBefore = out.lastIndexOf("────", headerIdx);
    expect(separatorBefore).toBeGreaterThan(-1);
  });

  it("verbose empty shows no override issues without separator", () => {
    const out = renderOverrideFindings([], { verbose: true });
    expect(out).toMatch(/no override hygiene issues found/i);
    expect(out).not.toMatch(/────/);
  });

  it("shows a footer count line matching the number of findings", () => {
    const out = renderOverrideFindings([f(), f({ ruleId: "OA002", severity: "high" })]);
    expect(out).toMatch(/2 override hygiene issues found/i);
  });

  it("deduplicates fix commands - only one command per ruleId", () => {
    const fix = { type: "rfc6902" as const, patch: [], runnableCommand: "cve-lite overrides --fix --rule OA001" };
    const out = renderOverrideFindings([f({ fix }), f({ fix })]);
    const count = (out.match(/> cve-lite overrides --fix --rule OA001/g) ?? []).length;
    expect(count).toBe(1);
  });
});
