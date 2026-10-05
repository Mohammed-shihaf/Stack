import { buildOverrideSarifComponent, buildOverrideSarifResults } from "../../src/output/override-findings-sarif.js";
import type { OverrideFinding } from "../../src/overrides/types.js";
import { getCliVersion } from "../../src/utils/version-info.js";

describe("override-findings-sarif", () => {
  it("buildOverrideSarifComponent registers OA001..OA009 rules", () => {
    const c = buildOverrideSarifComponent();
    const ruleIds = (c as any).rules?.map((r: any) => r.id);
    expect(ruleIds).toEqual(
      expect.arrayContaining(["OA001", "OA002", "OA003", "OA004", "OA005", "OA006", "OA007", "OA008", "OA009"])
    );
  });

  it("buildOverrideSarifResults emits one result per finding with ruleId set", () => {
    const f: OverrideFinding = {
      ruleId: "OA001",
      severity: "high",
      package: { name: "postcss" },
      location: { file: "package.json", jsonPath: "/overrides/postcss" },
      message: "x",
    };
    const results = buildOverrideSarifResults([f]);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("OA001");
    expect(results[0].level).toMatch(/error|warning|note/);
  });

  it("results carry a toolComponent.index reference to the extension (SARIF 2.1.0 3.27.7)", () => {
    const f: OverrideFinding = {
      ruleId: "OA001",
      severity: "high",
      package: { name: "postcss" },
      location: { file: "package.json", jsonPath: "/overrides/postcss" },
      message: "x",
    };
    const [result] = buildOverrideSarifResults([f]);
    expect(result.rule).toEqual({ id: "OA001", toolComponent: { index: 0 } });
  });

  it("buildOverrideSarifComponent version tracks the CLI version, not a hard-coded literal", () => {
    const c = buildOverrideSarifComponent() as { version: string };
    expect(c.version).toBe(getCliVersion());
    expect(c.version).not.toBe("1.0.0");
  });
});

describe("override-findings-sarif: SARIF 2.1.0 result fields", () => {
  const finding: OverrideFinding = {
    ruleId: "OA001",
    severity: "high",
    package: { name: "postcss" },
    location: { file: "package.json", jsonPath: "/overrides/postcss" },
    message: "Override target not in resolved tree",
  };

  it("result has kind: open", () => {
    const [result] = buildOverrideSarifResults([finding]);
    expect(result.kind).toBe("open");
  });

  it("result has ruleIndex matching OA001 position in OA_RULES", () => {
    const [result] = buildOverrideSarifResults([finding]);
    // OA001 is first in OA_RULES array
    expect(result.ruleIndex).toBe(0);
  });

  it("PD001 ruleIndex is 10 (11th entry in OA_RULES)", () => {
    const pd1Finding: OverrideFinding = {
      ruleId: "PD001",
      severity: "high",
      package: { name: "react" },
      location: { file: "package.json", jsonPath: "/overrides/react" },
      message: "Phantom import",
    };
    const [result] = buildOverrideSarifResults([pd1Finding]);
    expect(result.ruleIndex).toBe(10);
  });

  it("result has partialFingerprints.primaryLocationLineHash as a non-empty hex string", () => {
    const [result] = buildOverrideSarifResults([finding]);
    const hash = result.partialFingerprints.primaryLocationLineHash;
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("primaryLocationLineHash is stable for the same ruleId+pkg", () => {
    const [r1] = buildOverrideSarifResults([finding]);
    const [r2] = buildOverrideSarifResults([finding]);
    expect(r1.partialFingerprints.primaryLocationLineHash)
      .toBe(r2.partialFingerprints.primaryLocationLineHash);
  });

  it("buildOverrideSarifComponent registers PD001 and PD002", () => {
    const c = buildOverrideSarifComponent();
    const ruleIds = (c as any).rules?.map((r: any) => r.id);
    expect(ruleIds).toContain("PD001");
    expect(ruleIds).toContain("PD002");
  });

  it("throws for an unregistered ruleId", () => {
    const bad: OverrideFinding = {
      ruleId: "OA999",
      severity: "high",
      package: { name: "x" },
      location: { file: "package.json" },
      message: "x",
    };
    expect(() => buildOverrideSarifResults([bad])).toThrow(/unknown ruleId/);
  });
});
