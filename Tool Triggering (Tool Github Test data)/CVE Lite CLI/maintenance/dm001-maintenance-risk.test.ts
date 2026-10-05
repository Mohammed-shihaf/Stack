import { jest } from "@jest/globals";
import type { Finding, PackageRef } from "../../src/types.js";
import type { Packument } from "../../src/remediation/npm-registry.js";
import { STALE_YEARS } from "../../src/maintenance/score.js";

const fetchPackumentMock = jest.fn<() => Promise<Packument | null>>();

jest.unstable_mockModule("../../src/remediation/npm-registry.js", () => ({
  fetchPackument: fetchPackumentMock,
}));

let detectDM001: (
  findings: ReadonlyArray<Finding>,
  directDependencies: ReadonlyArray<PackageRef>,
  isOffline: boolean,
) => Promise<import("../../src/maintenance/types.js").MaintenanceFinding[]>;

beforeAll(async () => {
  const mod = await import("../../src/maintenance/dm001-maintenance-risk.js");
  detectDM001 = mod.detectDM001;
});

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "js-yaml", version: "3.14.1" },
    relationship: "transitive",
    severity: "high",
    vulnerabilities: [{ id: "GHSA-qqhq-8r1c-r5w7", description: "", severity: "HIGH", aliases: [] }],
    cveAliases: ["CVE-2023-1234"],
    firstFixedVersion: "4.0.0",
    fixedVersions: ["4.0.0"],
    recommendedParentUpgrade: {
      package: "gray-matter",
      currentVersion: "4.0.3",
      targetVersion: "5.0.0",
      viaPath: ["gray-matter", "js-yaml"],
      vulnerablePackage: "js-yaml",
      confidence: "verified",
      reason: "Major upgrade required",
    },
    ...overrides,
  } as Finding;
}

function makePackageRef(overrides: Partial<PackageRef> = {}): PackageRef {
  return {
    name: "left-pad",
    version: "1.3.0",
    ecosystem: "npm",
    ...overrides,
  };
}

describe("detectDM001", () => {
  afterEach(() => {
    fetchPackumentMock.mockReset();
  });

  it("emits a high-severity drag finding for a transitive CVE requiring major parent upgrade", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe("DM001");
    expect(findings[0]!.severity).toBe("high");
    expect(findings[0]!.package).toEqual({ name: "gray-matter", version: "4.0.3" });
    expect(findings[0]!.drag).toHaveLength(1);
    expect(findings[0]!.drag![0]).toEqual({
      constrainedPackage: "js-yaml",
      installedVersion: "3.14.1",
      fixVersion: "4.0.0",
      parentTargetVersion: "5.0.0",
      cveId: "CVE-2023-1234",
    });
    expect(findings[0]!.deprecated).toBeUndefined();
  });

  it("skips packument fetch in offline mode and still emits drag finding", async () => {
    const findings = await detectDM001([makeFinding()], [], true);

    expect(fetchPackumentMock).not.toHaveBeenCalled();
    expect(findings).toHaveLength(1);
    expect(findings[0]!.drag).toHaveLength(1);
    expect(findings[0]!.deprecated).toBeUndefined();
  });

  it("adds deprecated signal when packument returns deprecated on latest version", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": { deprecated: "Use gray-matter v5 instead" } },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.severity).toBe("high");
    expect(findings[0]!.deprecated).toEqual({ message: "Use gray-matter v5 instead" });
  });

  it("severity is still high when both drag and deprecated are present", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": { deprecated: "Use gray-matter v5" } },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.severity).toBe("high");
  });

  it("attaches a staleness signal and keeps severity high when the parent's latest version is old", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
      time: { "4.0.3": "2015-01-01T00:00:00Z" },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.severity).toBe("high");
    expect(findings[0]!.staleness).toEqual({ lastPublish: "2015-01-01T00:00:00Z", ageYears: expect.any(Number) });
    expect(findings[0]!.staleness!.ageYears).toBeGreaterThanOrEqual(STALE_YEARS);
  });

  it("does not attach a staleness signal when the parent's latest version was published recently", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
      time: { "4.0.3": new Date().toISOString() },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.severity).toBe("high"); // drag stays high regardless of age
    expect(findings[0]!.staleness).toBeUndefined(); // a fresh package gets no staleness context
  });

  it("attaches a staleness signal when the parent's latest version is old", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
      time: { "4.0.3": "2015-01-01T00:00:00Z" },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.severity).toBe("high");
    expect(findings[0]!.staleness).toEqual({ lastPublish: "2015-01-01T00:00:00Z", ageYears: expect.any(Number) });
    expect(findings[0]!.staleness!.ageYears).toBeGreaterThanOrEqual(STALE_YEARS);
  });

  it("does not attach a staleness signal when offline", async () => {
    const findings = await detectDM001([makeFinding()], [], true);

    expect(findings[0]!.staleness).toBeUndefined();
  });

  it("does not attach a staleness signal when the packument has no time entry for the latest version", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.staleness).toBeUndefined();
  });

  it("ignores a fresh time.modified and uses the latest version's real publish time (recently-deprecated-but-abandoned regression)", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": { deprecated: "Use gray-matter v5 instead" } },
      time: {
        modified: new Date().toISOString(), // bumped by a recent `npm deprecate`
        "4.0.3": "2015-01-01T00:00:00Z", // the real last release
      },
    });

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings[0]!.staleness).toEqual({ lastPublish: "2015-01-01T00:00:00Z", ageYears: expect.any(Number) });
    expect(findings[0]!.staleness!.ageYears).toBeGreaterThanOrEqual(STALE_YEARS);
    expect(findings[0]!.severity).toBe("high");
  });

  it("ignores transitive findings where parent upgrade is same major version", async () => {
    const sameMinorFinding = makeFinding({
      recommendedParentUpgrade: {
        package: "gray-matter",
        currentVersion: "4.0.3",
        targetVersion: "4.1.0",
        viaPath: ["gray-matter", "js-yaml"],
        vulnerablePackage: "js-yaml",
        confidence: "verified",
        reason: "Minor upgrade",
      },
    });

    const findings = await detectDM001([sameMinorFinding], [], false);

    expect(findings).toHaveLength(0);
  });

  it("ignores direct findings", async () => {
    const directFinding = makeFinding({ relationship: "direct" as const });

    const findings = await detectDM001([directFinding], [], false);

    expect(findings).toHaveLength(0);
  });

  it("ignores findings with no recommendedParentUpgrade", async () => {
    const noUpgradeFinding = makeFinding({ recommendedParentUpgrade: null });

    const findings = await detectDM001([noUpgradeFinding], [], false);

    expect(findings).toHaveLength(0);
  });

  it("groups multiple CVEs blocked by the same parent into a single finding", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": {} },
    });

    const secondFinding = makeFinding({
      pkg: { name: "another-dep", version: "1.0.0" },
      cveAliases: ["CVE-2023-5678"],
      firstFixedVersion: "2.0.0",
    });

    const findings = await detectDM001([makeFinding(), secondFinding], [], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.drag).toHaveLength(2);
  });

  it("returns empty array when no findings have drag", async () => {
    const findings = await detectDM001([], [], false);
    expect(findings).toHaveLength(0);
  });

  it("continues gracefully when packument fetch throws", async () => {
    fetchPackumentMock.mockRejectedValue(new Error("Network error"));

    const findings = await detectDM001([makeFinding()], [], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.deprecated).toBeUndefined();
  });

  it("sorts results by severity then package name", async () => {
    fetchPackumentMock.mockResolvedValue(null);

    const findingA = makeFinding({
      recommendedParentUpgrade: {
        package: "z-package",
        currentVersion: "1.0.0",
        targetVersion: "2.0.0",
        viaPath: ["z-package", "js-yaml"],
        vulnerablePackage: "js-yaml",
        confidence: "unverified",
        reason: "Major upgrade",
      },
    });
    const findingB = makeFinding({
      recommendedParentUpgrade: {
        package: "a-package",
        currentVersion: "1.0.0",
        targetVersion: "2.0.0",
        viaPath: ["a-package", "js-yaml"],
        vulnerablePackage: "js-yaml",
        confidence: "unverified",
        reason: "Major upgrade",
      },
    });

    const findings = await detectDM001([findingA, findingB], [], false);

    expect(findings[0]!.package.name).toBe("a-package");
    expect(findings[1]!.package.name).toBe("z-package");
  });

  it("fires a medium-severity finding for a deprecated-only direct dependency with no drag", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "1.3.0" },
      versions: { "1.3.0": { deprecated: "Use the built-in String.prototype.padStart instead" } },
    });

    const findings = await detectDM001([], [makePackageRef()], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe("DM001");
    expect(findings[0]!.severity).toBe("medium");
    expect(findings[0]!.package).toEqual({ name: "left-pad", version: "1.3.0" });
    expect(findings[0]!.drag).toBeUndefined();
    expect(findings[0]!.deprecated).toEqual({ message: "Use the built-in String.prototype.padStart instead" });
    expect(findings[0]!.message).toBe("Deprecated: Use the built-in String.prototype.padStart instead");
  });

  it("fires a medium-severity finding for an old deprecated-only direct dependency, with a staleness context signal", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "1.3.0" },
      versions: { "1.3.0": { deprecated: "No longer maintained" } },
      time: { "1.3.0": "2015-01-01T00:00:00Z" },
    });

    const findings = await detectDM001([], [makePackageRef()], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("medium"); // deprecation is advisory; age does not escalate it
    expect(findings[0]!.staleness).toEqual({ lastPublish: "2015-01-01T00:00:00Z", ageYears: expect.any(Number) });
    expect(findings[0]!.staleness!.ageYears).toBeGreaterThanOrEqual(STALE_YEARS);
  });

  it("keeps a deprecated-only finding medium and attaches no staleness signal when the latest version is recent", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "1.3.0" },
      versions: { "1.3.0": { deprecated: "No longer maintained" } },
      time: { "1.3.0": new Date().toISOString() },
    });

    const findings = await detectDM001([], [makePackageRef()], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("medium");
    expect(findings[0]!.staleness).toBeUndefined();
  });

  it("reads staleness from the latest version's real publish time, not time.modified (recently-deprecated-but-abandoned regression)", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "1.3.0" },
      versions: { "1.3.0": { deprecated: "No longer maintained" } },
      time: {
        modified: new Date().toISOString(), // bumped by a recent `npm deprecate`
        "1.3.0": "2015-01-01T00:00:00Z", // the real last release
      },
    });

    const findings = await detectDM001([], [makePackageRef()], false);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("medium");
    expect(findings[0]!.staleness).toEqual({ lastPublish: "2015-01-01T00:00:00Z", ageYears: expect.any(Number) });
  });

  it("does not check direct dependencies for deprecation when offline", async () => {
    const findings = await detectDM001([], [makePackageRef()], true);

    expect(fetchPackumentMock).not.toHaveBeenCalled();
    expect(findings).toHaveLength(0);
  });

  it("does not double-count a direct dependency that is both a drag candidate and deprecated", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "4.0.3" },
      versions: { "4.0.3": { deprecated: "Use gray-matter v5" } },
    });

    const findings = await detectDM001(
      [makeFinding()],
      [makePackageRef({ name: "gray-matter", version: "4.0.3" })],
      false,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]!.package.name).toBe("gray-matter");
    expect(findings[0]!.drag).toHaveLength(1);
    expect(findings[0]!.deprecated).toEqual({ message: "Use gray-matter v5" });
    expect(fetchPackumentMock).toHaveBeenCalledTimes(1);
  });

  it("does not fire a deprecated-only finding for a direct dependency that is not deprecated", async () => {
    fetchPackumentMock.mockResolvedValue({
      "dist-tags": { latest: "1.3.0" },
      versions: { "1.3.0": {} },
    });

    const findings = await detectDM001([], [makePackageRef()], false);

    expect(findings).toHaveLength(0);
  });
});
