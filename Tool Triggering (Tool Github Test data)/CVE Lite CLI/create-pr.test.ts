import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";
import type {
  buildFixResultAppliedEntries as buildFixResultAppliedEntriesType,
  buildPullRequestBody as buildPullRequestBodyType,
  buildPullRequestTitle as buildPullRequestTitleType,
  collectAdvisoryIdsForPackage as collectAdvisoryIdsForPackageType,
  defaultFixBranchName as defaultFixBranchNameType,
  findingsMeetFailOnThreshold as findingsMeetFailOnThresholdType,
  selectAvailableBranchName as selectAvailableBranchNameType,
  stageDependencyFilesOnly as stageDependencyFilesOnlyType,
} from "../src/utils/create-pr.js";
import type { Finding, OsvVuln } from "../src/types.js";
import { validateOptions } from "../src/cli/validate.js";
import { parseArgs } from "../src/cli/args.js";

const spawnMock = jest.fn();

jest.unstable_mockModule("node:child_process", () => ({
  spawn: spawnMock,
}));

let buildFixResultAppliedEntries: typeof buildFixResultAppliedEntriesType;
let buildPullRequestBody: typeof buildPullRequestBodyType;
let buildPullRequestTitle: typeof buildPullRequestTitleType;
let collectAdvisoryIdsForPackage: typeof collectAdvisoryIdsForPackageType;
let defaultFixBranchName: typeof defaultFixBranchNameType;
let findingsMeetFailOnThreshold: typeof findingsMeetFailOnThresholdType;
let selectAvailableBranchName: typeof selectAvailableBranchNameType;
let stageDependencyFilesOnly: typeof stageDependencyFilesOnlyType;

type MockCommandResult = {
  stdout?: string;
  stderr?: string;
  status?: number | null;
  error?: Error;
};

function queueCommandResults(results: MockCommandResult[]): void {
  const queue = [...results];
  spawnMock.mockImplementation(() => {
    const result = queue.shift() ?? { status: 0 };
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    process.nextTick(() => {
      if (result.error) {
        child.emit("error", result.error);
        return;
      }
      if (result.stdout) child.stdout.emit("data", result.stdout);
      if (result.stderr) child.stderr.emit("data", result.stderr);
      child.emit("close", result.status ?? 0);
    });

    return child;
  });
}

beforeAll(async () => {
  const mod = await import("../src/utils/create-pr.js");
  buildFixResultAppliedEntries = mod.buildFixResultAppliedEntries;
  buildPullRequestBody = mod.buildPullRequestBody;
  buildPullRequestTitle = mod.buildPullRequestTitle;
  collectAdvisoryIdsForPackage = mod.collectAdvisoryIdsForPackage;
  defaultFixBranchName = mod.defaultFixBranchName;
  findingsMeetFailOnThreshold = mod.findingsMeetFailOnThreshold;
  selectAvailableBranchName = mod.selectAvailableBranchName;
  stageDependencyFilesOnly = mod.stageDependencyFilesOnly;
});

beforeEach(() => {
  spawnMock.mockReset();
});

function createFinding(overrides?: Partial<Finding>): Finding {
  const vuln: OsvVuln = {
    id: "GHSA-abc",
    aliases: ["CVE-2026-0001"],
    summary: "Example",
  };

  return {
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [vuln],
    severity: "high",
    cveAliases: ["CVE-2026-0001"],
    dependencyPaths: [["project", "lodash"]],
    relationship: "direct",
    firstFixedVersion: "4.17.21",
    ...overrides,
  };
}

describe("create-pr helpers", () => {
  it("builds a dated branch name", () => {
    expect(defaultFixBranchName(new Date("2026-05-30T12:00:00Z"))).toBe("cve-lite/fix-2026-05-30");
  });

  it("builds a pull request title for applied fixes", () => {
    expect(buildPullRequestTitle(1, ["lodash"])).toBe(
      "[CVE-Lite-CLI] fix: upgrade lodash (1 vulnerability resolved)",
    );
    expect(buildPullRequestTitle(4, ["lodash", "axios", "express", "minimist"])).toBe(
      "[CVE-Lite-CLI] fix: upgrade lodash, axios +2 more (4 vulnerabilities resolved)",
    );
  });

  it("collects OSV and CVE identifiers for a package", () => {
    const findings = [createFinding()];
    expect(collectAdvisoryIdsForPackage(findings, "lodash")).toEqual(["CVE-2026-0001", "GHSA-abc"]);
  });

  it("builds a markdown body with fixes and scan counts", () => {
    const body = buildPullRequestBody({
      fixResult: {
        appliedFixCount: 1,
        appliedWithinRangeRefreshCount: 0,
        parentUpgradeCount: 0,
        breakingUpgradeCount: 0,
        noFixCount: 0,
        applied: [{ package: "lodash", from: "4.17.20", to: "4.17.21" }],
        note: null,
      },
      findingsBeforeFix: [createFinding(), createFinding({ pkg: { name: "express", version: "4.0.0", ecosystem: "npm" } })],
      findingsAfterFix: [createFinding()],
    });

    expect(body).toContain("lodash");
    expect(body).toContain("4.17.20");
    expect(body).toContain("4.17.21");
    expect(body).toContain("CVE-2026-0001");
    expect(body).toContain("Findings before fix: **2**");
    expect(body).toContain("Findings after fix: **1**");
    expect(body).not.toContain("Closes #367");
    expect(body).not.toContain("Override hygiene");
  });

  it("names the refreshed child and uses the child's advisories on parent-update body lines", () => {
    const formDataFinding = createFinding({
      pkg: { name: "form-data", version: "4.0.5", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-form-data-0001", aliases: ["CVE-2025-7783"], summary: "form-data" }],
      cveAliases: ["CVE-2025-7783"],
    });
    const axiosFinding = createFinding({
      pkg: { name: "axios", version: "1.16.1", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-axios-0001", aliases: ["CVE-2026-9999"], summary: "axios" }],
      cveAliases: ["CVE-2026-9999"],
    });
    const body = buildPullRequestBody({
      fixResult: {
        appliedFixCount: 1,
        appliedWithinRangeRefreshCount: 1,
        parentUpgradeCount: 0,
        breakingUpgradeCount: 0,
        noFixCount: 0,
        applied: [{
          package: "axios",
          from: "1.16.1",
          to: "1.16.1",
          childPackage: "form-data",
          childTargetVersion: "4.0.6",
        }],
        note: null,
      },
      findingsBeforeFix: [formDataFinding, axiosFinding],
      findingsAfterFix: [axiosFinding],
    });

    expect(body).toContain("refresh form-data to 4.0.6");
    expect(body).toContain("GHSA-form-data-0001");
    expect(body).toContain("CVE-2025-7783");
    expect(body).not.toContain("GHSA-axios-0001");
    expect(body).not.toContain("CVE-2026-9999");
  });

  it("buildFixResultAppliedEntries uses child advisories and preserves child fields for parent-update", () => {
    const formDataFinding = createFinding({
      pkg: { name: "form-data", version: "4.0.5", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-form-data-0001", aliases: ["CVE-2025-7783"], summary: "form-data" }],
      cveAliases: ["CVE-2025-7783"],
    });
    const axiosFinding = createFinding({
      pkg: { name: "axios", version: "1.16.1", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-axios-0001", aliases: ["CVE-2026-9999"], summary: "axios" }],
      cveAliases: ["CVE-2026-9999"],
    });
    const applied = buildFixResultAppliedEntries(
      [{
        package: "axios",
        from: "1.16.1",
        to: "1.16.1",
        childPackage: "form-data",
        childTargetVersion: "4.0.6",
      }],
      [formDataFinding, axiosFinding],
    );

    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual({
      package: "axios",
      from: "1.16.1",
      to: "1.16.1",
      advisories: ["CVE-2025-7783", "GHSA-form-data-0001"],
      childPackage: "form-data",
      childTargetVersion: "4.0.6",
    });
    expect(applied[0].advisories).not.toContain("GHSA-axios-0001");
    expect(applied[0].advisories).not.toContain("CVE-2026-9999");
  });

  it("buildFixResultAppliedEntries looks up advisories on the named package when no child is set", () => {
    const axiosFinding = createFinding({
      pkg: { name: "axios", version: "1.16.1", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-axios-0001", aliases: ["CVE-2026-9999"], summary: "axios" }],
      cveAliases: ["CVE-2026-9999"],
    });
    const applied = buildFixResultAppliedEntries(
      [{ package: "axios", from: "1.16.1", to: "1.19.0" }],
      [axiosFinding],
    );
    expect(applied[0]).toEqual({
      package: "axios",
      from: "1.16.1",
      to: "1.19.0",
      advisories: ["CVE-2026-9999", "GHSA-axios-0001"],
    });
    expect(applied[0]).not.toHaveProperty("childPackage");
    expect(applied[0]).not.toHaveProperty("childTargetVersion");
  });

  it("includes an override hygiene section when override fixes were applied", () => {
    const body = buildPullRequestBody({
      fixResult: {
        appliedFixCount: 1,
        appliedWithinRangeRefreshCount: 0,
        parentUpgradeCount: 0,
        breakingUpgradeCount: 0,
        noFixCount: 0,
        applied: [{ package: "lodash", from: "4.17.20", to: "4.17.21" }],
        note: null,
      },
      findingsBeforeFix: [createFinding()],
      findingsAfterFix: [],
      overrideFixCount: 2,
    });
    expect(body).toContain("Override hygiene");
    expect(body).toContain("**2** override hygiene");
  });

  it("builds an override-only title when no CVE fixes were applied", () => {
    expect(buildPullRequestTitle(0, [], 3)).toContain("override hygiene");
  });

  it("checks fail-on threshold against initial findings", () => {
    expect(findingsMeetFailOnThreshold([createFinding({ severity: "high" })], "critical")).toBe(false);
    expect(findingsMeetFailOnThreshold([createFinding({ severity: "critical" })], "critical")).toBe(true);
  });

  it("uses the base branch name when it is available", async () => {
    queueCommandResults([{ status: 1 }]);

    await expect(selectAvailableBranchName("/repo", "cve-lite/fix-2026-06-02")).resolves.toBe(
      "cve-lite/fix-2026-06-02",
    );

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--verify", "cve-lite/fix-2026-06-02"],
      expect.objectContaining({ cwd: "/repo" }),
    );
  });

  it("adds numeric suffix when branch already exists", async () => {
    queueCommandResults([{ status: 0 }, { status: 1 }]);

    await expect(selectAvailableBranchName("/repo", "cve-lite/fix-2026-06-02")).resolves.toBe(
      "cve-lite/fix-2026-06-02-2",
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--verify", "cve-lite/fix-2026-06-02"],
      expect.objectContaining({ cwd: "/repo" }),
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "git",
      ["rev-parse", "--verify", "cve-lite/fix-2026-06-02-2"],
      expect.objectContaining({ cwd: "/repo" }),
    );
  });

  it("stages only changed dependency files without requiring a git repository", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-create-pr-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"), '{"name":"test"}\n');
      fs.writeFileSync(path.join(tmpDir, "package-lock.json"), '{"lockfileVersion":3}\n');

      const changedFiles = new Set(["package.json"]);
      const stagedFiles = new Set<string>();
      spawnMock.mockImplementation((_command, args: string[]) => {
        const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();

        process.nextTick(() => {
          const filePath = args[2];
          if (args[0] === "add" && args[1] === "--" && changedFiles.has(filePath)) {
            stagedFiles.add(filePath);
          }
          child.emit("close", 0);
        });

        return child;
      });

      await expect(stageDependencyFilesOnly(tmpDir)).resolves.toBeUndefined();

      expect([...stagedFiles]).toEqual(["package.json"]);
      expect(spawnMock).toHaveBeenCalledTimes(2);
      expect(spawnMock).toHaveBeenNthCalledWith(
        1,
        "git",
        ["add", "--", "package.json"],
        expect.objectContaining({ cwd: tmpDir }),
      );
      expect(spawnMock).toHaveBeenNthCalledWith(
        2,
        "git",
        ["add", "--", "package-lock.json"],
        expect.objectContaining({ cwd: tmpDir }),
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("create-pr CLI options", () => {
  it("parses --create-pr and --base", () => {
    const result = parseArgs([".", "--fix", "--create-pr", "--base", "develop"]);
    expect(result.options.fix).toBe(true);
    expect(result.options.createPr).toBe(true);
    expect(result.options.prBase).toBe("develop");
  });

  it("requires --fix for --create-pr", async () => {
    await expect(
      validateOptions({ failOn: "critical", batchSize: "100", searchDepth: "4", createPr: true }),
    ).rejects.toThrow("--create-pr requires --fix");
  });
});
