import { jest } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const loadMultiplePackagesMock = jest.fn<any>();
const scanCompleteness = { complete: true, diagnostics: [] };
const scanPackagesMock = jest.fn<any>(() => Promise.resolve({ findings: [], completeness: scanCompleteness }));
const buildCoverageNotesMock = jest.fn<any>(() => []);
const sortFindingsForOutputMock = jest.fn<any>((f: any[]) => f);
const normalizeSeverityMock = jest.fn<any>(() => "medium");
const selectFindingsForTableMock = jest.fn<any>((f: any[]) => f);
const buildSuggestedFixCommandPlanMock = jest.fn<any>(() => null);
const readDirectDependencyNamesMock = jest.fn<any>(() => new Set<string>());
const buildOverrideContextMock = jest.fn<any>(() => ({}));
const auditMock = jest.fn<any>(() => Promise.resolve({ findings: [] }));

jest.unstable_mockModule("../src/parsers/multi-package.js", () => ({
  loadMultiplePackages: loadMultiplePackagesMock,
  findNestedLockfiles: jest.fn(() => []),
  hasRootLockfile: jest.fn(() => false),
}));

jest.unstable_mockModule("../src/scanner.js", () => ({
  scanPackages: scanPackagesMock,
  buildCoverageNotes: buildCoverageNotesMock,
}));

jest.unstable_mockModule("../src/output/formatters.js", () => ({
  sortFindingsForOutput: sortFindingsForOutputMock,
  serializeFinding: jest.fn((f: any) => ({
    package: f.pkg?.name ?? "lodash",
    version: f.pkg?.version ?? "4.17.20",
    severity: f.severity ?? "high",
  })),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

jest.unstable_mockModule("../src/osv/severity.js", () => ({
  normalizeSeverity: normalizeSeverityMock,
}));

jest.unstable_mockModule("../src/output/finding-display.js", () => ({
  selectFindingsForTable: selectFindingsForTableMock,
}));

jest.unstable_mockModule("../src/remediation/fix-commands.js", () => ({
  buildSuggestedFixCommandPlan: buildSuggestedFixCommandPlanMock,
  findSuggestedCommandForFinding: jest.fn(() => null),
}));

const hasOverrideEntriesMock = jest.fn<any>(() => false);

jest.unstable_mockModule("../src/utils/package-json.js", () => ({
  readDirectDependencyNames: readDirectDependencyNamesMock,
  hasOverrideEntries: hasOverrideEntriesMock,
}));

jest.unstable_mockModule("../src/overrides/index.js", () => ({
  buildOverrideContext: buildOverrideContextMock,
  audit: auditMock,
}));

const detectDM001Mock = jest.fn<any>(() => Promise.resolve([]));

jest.unstable_mockModule("../src/maintenance/dm001-maintenance-risk.js", () => ({
  detectDM001: detectDM001Mock,
}));

const readBaselineMock = jest.fn<any>(() => null);
const writeBaselineMock = jest.fn<any>();
const filterNewFindingsMock = jest.fn<any>((findings: any[]) => ({ newFindings: findings, suppressedCount: 0 }));
const ratchetOutcomeMock = jest.fn<any>(() => ({ action: "save" }));

jest.unstable_mockModule("../src/utils/baseline.js", () => ({
  readBaseline: readBaselineMock,
  writeBaseline: writeBaselineMock,
  filterNewFindings: filterNewFindingsMock,
  ratchetOutcome: ratchetOutcomeMock,
}));

const scanProjectForPackageUsageMock = jest.fn<any>(() => ({}));

jest.unstable_mockModule("../src/usage/scanner.js", () => ({
  scanProjectForPackageUsage: scanProjectForPackageUsageMock,
}));

jest.unstable_mockModule("../src/audit-log/index.js", () => ({
  NULL_AUDIT_LOG: { emit: jest.fn(), close: jest.fn() },
  createAuditLog: jest.fn(() => ({ emit: jest.fn(), close: jest.fn() })),
}));

jest.unstable_mockModule("../src/output/multi-folder-printer.js", () => ({
  printMultiFolderResults: jest.fn(),
}));

jest.unstable_mockModule("../src/output/printers.js", () => ({
  printOverrideHint: jest.fn(),
}));

jest.unstable_mockModule("../src/output/multi-folder-html-reporter.js", () => ({
  writeMultiFolderHtmlReport: jest.fn(() => Promise.resolve({ reportPath: "/tmp/report/index.html" })),
}));

jest.unstable_mockModule("../src/utils/version-info.js", () => ({
  getCliVersion: jest.fn(() => "1.18.1"),
}));

const stdoutWriteSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
const consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => {});

afterEach(() => jest.clearAllMocks());
afterAll(() => {
  stdoutWriteSpy.mockRestore();
  consoleLogMock.mockRestore();
});

const makeScanInput = () => ({
  mode: "resolved-lockfile" as const,
  source: "package-lock" as const,
  filePath: "/project/sessionManager/package-lock.json",
  packages: [{ name: "lodash", version: "4.17.20", ecosystem: "npm" }],
  notes: [],
  warnings: [],
  skippedDependencies: [],
});

const baseOptions = {
  failOn: "none",
  batchSize: "100",
  searchDepth: "4",
  minSeverity: "medium",
} as any;

let runMultiFolderScan: any;
let handleMultiFolderScan: any;
let EXIT_ERROR: number;

beforeAll(async () => {
  const mod = await import("../src/scan/multi-folder-scan.js");
  runMultiFolderScan = mod.runMultiFolderScan;
  handleMultiFolderScan = mod.handleMultiFolderScan;
  ({ EXIT_ERROR } = await import("../src/types.js"));
});

describe("runMultiFolderScan", () => {
  it("returns one result per folder", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
      { subfolder: "apiServer", scanInput: makeScanInput() },
    ]);

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: baseOptions,
    });

    expect(results).toHaveLength(2);
    expect(results[0].subfolder).toBe("sessionManager");
    expect(results[1].subfolder).toBe("apiServer");
    expect(results[0].completeness).toBe(scanCompleteness);
  });

  it("calls scanPackages once per folder", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
      { subfolder: "apiServer", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(scanPackagesMock).toHaveBeenCalledTimes(2);
  });

  it("skips folders with zero packages", async () => {
    const emptyScanInput = { ...makeScanInput(), packages: [] };
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "empty", scanInput: emptyScanInput },
      { subfolder: "apiServer", scanInput: makeScanInput() },
    ]);

    const results = await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(results).toHaveLength(1);
    expect(results[0].subfolder).toBe("apiServer");
  });

  it("writes a folder header to stdout for each scanned folder when not in JSON mode", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
      { subfolder: "apiServer", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    const written = stdoutWriteSpy.mock.calls.map(call => String(call[0])).join("");
    expect(written).toContain("sessionManager/");
    expect(written).toContain("apiServer/");
  });

  it("does not write folder headers to stdout in JSON mode", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, json: true },
    });

    const written = stdoutWriteSpy.mock.calls.map(call => String(call[0])).join("");
    expect(written).not.toContain("sessionManager/");
  });

  it("runs the override audit once per folder and attaches findings when --check-overrides is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
      { subfolder: "b", scanInput: makeScanInput() },
    ]);
    auditMock.mockResolvedValue({
      findings: [
        { ruleId: "OA001", severity: "high", package: { name: "x" }, location: { file: "package.json" }, message: "orphan" },
      ],
    });

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkOverrides: true },
    });

    expect(auditMock).toHaveBeenCalledTimes(2);
    expect(results[0].overrideFindings).toHaveLength(1);
    expect(results[0].overrideFindings[0].ruleId).toBe("OA001");
  });

  it("forwards an explicit audit-log handle to override audits in multi-folder mode", async () => {
    const auditLog = { emit: jest.fn(), close: jest.fn(), isNoOp: false };
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkOverrides: true },
      auditLog,
    });

    expect(buildOverrideContextMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auditLog }),
    );
  });

  it("does not run the override audit when --check-overrides is not set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);

    const results = await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(auditMock).not.toHaveBeenCalled();
    expect(results[0].overrideFindings ?? []).toHaveLength(0);
  });

  it("does not run the override audit when --ratchet is set even with --check-overrides", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkOverrides: true, ratchet: true },
    });

    expect(auditMock).not.toHaveBeenCalled();
  });

  it("attaches subfolder to suggestedFixCommands plan", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
    ]);
    buildSuggestedFixCommandPlanMock.mockReturnValue({ sections: [], targets: [], skipped: [], command: "npm install" });

    await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(buildSuggestedFixCommandPlanMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ subfolder: "sessionManager" }),
    );
  });
});

describe("runMultiFolderScan - usage / only-used", () => {
  const finding = {
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["app", "lodash"]],
    relationship: "direct",
    firstFixedVersion: "4.17.21",
  };

  beforeEach(() => {
    scanPackagesMock.mockResolvedValue({ findings: [finding], completeness: scanCompleteness });
    sortFindingsForOutputMock.mockImplementation((f: any[]) => f);
  });

  afterEach(() => {
    scanPackagesMock.mockResolvedValue({ findings: [], completeness: scanCompleteness });
  });

  it("annotates findings with usage data per subfolder when --usage is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "packages/a", scanInput: makeScanInput() },
    ]);
    scanProjectForPackageUsageMock.mockReturnValue({ lodash: ["src/index.ts"] });

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, usage: true },
    });

    expect(scanProjectForPackageUsageMock).toHaveBeenCalledWith(
      path.join("/project", "packages/a"),
      expect.any(Set),
    );
    expect(results[0].sorted[0].usage).toEqual({ imported: true, files: ["src/index.ts"] });
  });

  it("filters to imported packages when --only-used is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "packages/a", scanInput: makeScanInput() },
    ]);
    scanPackagesMock.mockResolvedValue({
      findings: [
        finding,
        {
          ...finding,
          pkg: { name: "unused-pkg", version: "1.0.0", ecosystem: "npm" },
        },
      ],
      completeness: scanCompleteness,
    });
    scanProjectForPackageUsageMock.mockReturnValue({
      lodash: ["src/index.ts"],
      "unused-pkg": [],
    });

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, usage: true, onlyUsed: true },
    });

    expect(results[0].sorted).toHaveLength(1);
    expect(results[0].sorted[0].pkg.name).toBe("lodash");
  });

  it("does not scan usage when --usage is not set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "packages/a", scanInput: makeScanInput() },
    ]);

    await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(scanProjectForPackageUsageMock).not.toHaveBeenCalled();
  });

  it("isolates usage per subfolder (imported in one folder, not the other)", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "packages/a", scanInput: makeScanInput() },
      { subfolder: "packages/b", scanInput: makeScanInput() },
    ]);
    scanPackagesMock.mockImplementation(() =>
      Promise.resolve({
        findings: [{
          ...finding,
          pkg: { ...finding.pkg },
          dependencyPaths: [["app", "lodash"]],
        }],
        completeness: scanCompleteness,
      }),
    );
    scanProjectForPackageUsageMock.mockImplementation((projectPath: string) => {
      if (String(projectPath).endsWith(`${path.sep}packages${path.sep}a`) || String(projectPath).endsWith("packages/a")) {
        return { lodash: ["src/index.ts"] };
      }
      return { lodash: [] };
    });

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, usage: true, onlyUsed: true },
    });

    expect(scanProjectForPackageUsageMock).toHaveBeenCalledTimes(2);
    expect(scanProjectForPackageUsageMock).toHaveBeenCalledWith(
      path.join("/project", "packages/a"),
      expect.any(Set),
    );
    expect(scanProjectForPackageUsageMock).toHaveBeenCalledWith(
      path.join("/project", "packages/b"),
      expect.any(Set),
    );
    expect(results[0].sorted).toHaveLength(1);
    expect(results[0].sorted[0].usage).toEqual({ imported: true, files: ["src/index.ts"] });
    expect(results[1].sorted).toHaveLength(0);
  });
});

describe("runMultiFolderScan - maintenance risk", () => {
  it("runs DM001 detection once per folder and attaches findings when --check-maintenance is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
      { subfolder: "b", scanInput: makeScanInput() },
    ]);
    detectDM001Mock.mockResolvedValue([
      { ruleId: "DM001", severity: "high", package: { name: "gray-matter", version: "4.0.3" }, drag: [], message: "x" },
    ]);

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true },
    });

    expect(detectDM001Mock).toHaveBeenCalledTimes(2);
    expect(results[0].maintenanceFindings).toHaveLength(1);
    expect(results[0].maintenanceFindings[0].ruleId).toBe("DM001");
  });

  it("does not run DM001 detection when --check-maintenance is not set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);

    const results = await runMultiFolderScan({ projectRoot: "/project", batchSize: 100, options: baseOptions });

    expect(detectDM001Mock).not.toHaveBeenCalled();
    expect(results[0].maintenanceFindings ?? []).toHaveLength(0);
  });

  it("passes only the folder's direct dependencies (filtered by name) as the second argument to detectDM001", async () => {
    const scanInputWithTwoPackages = {
      ...makeScanInput(),
      packages: [
        { name: "lodash", version: "4.17.20", ecosystem: "npm" as const },
        { name: "some-transitive-only-dep", version: "1.0.0", ecosystem: "npm" as const },
      ],
    };
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: scanInputWithTwoPackages },
    ]);
    readDirectDependencyNamesMock.mockReturnValue(new Set(["lodash"]));

    await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true },
    });

    expect(detectDM001Mock).toHaveBeenCalledWith(
      expect.anything(),
      [{ name: "lodash", version: "4.17.20", ecosystem: "npm" }],
      expect.anything(),
    );
  });

  it("does not leak one folder's direct dependencies into another folder's detectDM001 call", async () => {
    const scanInputA = {
      ...makeScanInput(),
      packages: [{ name: "pkg-a-dep", version: "1.0.0", ecosystem: "npm" as const }],
    };
    const scanInputB = {
      ...makeScanInput(),
      packages: [{ name: "pkg-b-dep", version: "2.0.0", ecosystem: "npm" as const }],
    };
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: scanInputA },
      { subfolder: "b", scanInput: scanInputB },
    ]);
    readDirectDependencyNamesMock.mockImplementation((subfolderAbs: string) =>
      subfolderAbs.endsWith("/a") ? new Set(["pkg-a-dep"]) : new Set(["pkg-b-dep"]),
    );

    await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true },
    });

    expect(detectDM001Mock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      [{ name: "pkg-a-dep", version: "1.0.0", ecosystem: "npm" }],
      expect.anything(),
    );
    expect(detectDM001Mock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      [{ name: "pkg-b-dep", version: "2.0.0", ecosystem: "npm" }],
      expect.anything(),
    );
  });
});

describe("handleMultiFolderScan", () => {
  beforeEach(() => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
    ]);
  });

  it("returns EXIT_ERROR when --fix is requested in multi-folder mode", async () => {
    await expect(handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, fix: true },
    })).resolves.toBe(EXIT_ERROR);
  });

  it.each([
    ["--sarif", { sarif: true }],
    ["--cdx", { cdx: true }],
  ])("returns EXIT_ERROR when %s is requested in multi-folder mode", async (_flag, option) => {
    await expect(handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ...option },
    })).resolves.toBe(EXIT_ERROR);
  });

  it.each([
    ["--fix", { fix: true }],
    ["--sarif", { sarif: true }],
    ["--cdx", { cdx: true }],
  ])("emits scan.finished before returning for unsupported %s", async (_flag, option) => {
    const emit = jest.fn();

    await expect(handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ...option },
      auditLog: { emit, close: jest.fn(), isNoOp: false },
    })).resolves.toBe(EXIT_ERROR);

    const events = emit.mock.calls.map(([event]) => event as any);
    expect(events.map(event => event.type)).toEqual(["scan.started", "scan.finished"]);
    expect(events[1]).toEqual(expect.objectContaining({
      findingsCount: 0,
      exitCode: EXIT_ERROR,
    }));
  });

  it("emits scan.started and scan.finished events when audit logging is enabled", async () => {
    const emit = jest.fn();
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "sessionManager", scanInput: makeScanInput() },
    ]);

    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: baseOptions,
      auditLog: { emit, close: jest.fn(), isNoOp: false },
    });

    expect(exitCode).toBe(0);
    const events = emit.mock.calls.map(([event]) => event as any);
    expect(events.some((event) => event.type === "scan.started")).toBe(true);
    expect(events.some((event) => event.type === "scan.finished")).toBe(true);

    const start = events.find((event) => event.type === "scan.started");
    const finish = events.find((event) => event.type === "scan.finished");
    expect(start?.flags?.folderCount).toBe("1");
    expect(finish?.findingsCount).toBe(0);
    expect(finish?.exitCode).toBe(0);
  });
});

describe("handleMultiFolderScan - maintenance risk fail-on", () => {
  beforeEach(() => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
  });

  it("counts a high-severity DM001 finding toward --fail-on high across folders", async () => {
    detectDM001Mock.mockResolvedValue([
      { ruleId: "DM001", severity: "high", package: { name: "gray-matter", version: "4.0.3" }, drag: [], message: "x" },
    ]);

    const { EXIT_FINDINGS } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true, failOn: "high" },
    });

    expect(exitCode).toBe(EXIT_FINDINGS);
  });

  it("does not fail when maintenance findings exist but --check-maintenance was not requested", async () => {
    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, failOn: "high" },
    });

    expect(exitCode).toBe(EXIT_OK);
  });
});

describe("handleMultiFolderScan - override hygiene fail-on", () => {
  beforeEach(() => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
  });

  it("counts a high-severity OA001 finding toward --fail-on high across folders", async () => {
    auditMock.mockResolvedValue({
      findings: [
        { ruleId: "OA001", severity: "high", package: { name: "x" }, location: { file: "package.json" }, message: "orphan" },
      ],
    });

    const { EXIT_FINDINGS } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkOverrides: true, failOn: "high" },
    });

    expect(exitCode).toBe(EXIT_FINDINGS);
  });

  it("does not fail when override findings exist but --check-overrides was not requested", async () => {
    // Even if audit would return findings, the audit is not run without the flag,
    // so overrideFindings stay empty and --fail-on must not trip.
    auditMock.mockResolvedValue({
      findings: [
        { ruleId: "OA001", severity: "high", package: { name: "x" }, location: { file: "package.json" }, message: "orphan" },
      ],
    });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, failOn: "high" },
    });

    expect(auditMock).not.toHaveBeenCalled();
    expect(exitCode).toBe(EXIT_OK);
  });

  it("does not fail when override findings are below --fail-on threshold", async () => {
    auditMock.mockResolvedValue({
      findings: [
        { ruleId: "OA007", severity: "low", package: { name: "y" }, location: { file: "package.json" }, message: "frozen" },
      ],
    });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkOverrides: true, failOn: "high" },
    });

    expect(exitCode).toBe(EXIT_OK);
  });
});

describe("handleMultiFolderScan - maintenance risk JSON output", () => {
  let tmpCwd: string;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-mf-json-"));
    process.chdir(tmpCwd);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(tmpCwd, { recursive: true, force: true });
  });

  function readWrittenScanJson(): any {
    const files = fs.readdirSync(tmpCwd).filter(f => f.startsWith("cve-lite-scan-") && f.endsWith(".json"));
    expect(files).toHaveLength(1);
    return JSON.parse(fs.readFileSync(path.join(tmpCwd, files[0]), "utf8"));
  }

  it("writes a timestamped JSON file and includes maintenanceFindings when --check-maintenance is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
    detectDM001Mock.mockResolvedValue([
      { ruleId: "DM001", severity: "high", package: { name: "gray-matter", version: "4.0.3" }, drag: [], message: "x" },
    ]);

    await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true, json: true },
    });

    const savedMsg = consoleLogMock.mock.calls.map(c => String(c[0])).find(s => s.includes("JSON saved to"));
    expect(savedMsg).toBeDefined();

    const payload = readWrittenScanJson();
    expect(payload.multiFolder).toBe(true);
    expect(payload.maintenanceFindings).toHaveLength(1);
    expect(payload.maintenanceFindings[0].subfolder).toBe("a");
  });

  it("omits maintenanceFindings from the JSON file when --check-maintenance is not set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);

    await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, json: true },
    });

    const payload = readWrittenScanJson();
    expect(payload.maintenanceFindings).toBeUndefined();
  });

  it("writes aggregate completeness fields to the JSON file", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
    scanPackagesMock.mockResolvedValueOnce({
      findings: [],
      completeness: {
        complete: false,
        diagnostics: [{
          code: "PACKUMENT_FETCH_FAILURE",
          severity: "warning",
          message: "1 packument fetch failed — remediation guidance may be incomplete.",
          impact: "remediation",
          count: 1,
        }],
      },
    });

    await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, json: true },
    });

    const payload = readWrittenScanJson();
    expect(payload.status).toBe("partial");
    expect(payload.complete).toBe(false);
    expect(payload.diagnostics).toEqual([
      expect.objectContaining({
        code: "PACKUMENT_FETCH_FAILURE",
        impact: "remediation",
        count: 1,
      }),
    ]);
  });
});

describe("handleMultiFolderScan - maintenance risk terminal render", () => {
  it("prints a maintenance risk section per folder when --check-maintenance is set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
    detectDM001Mock.mockResolvedValue([
      { ruleId: "DM001", severity: "high", package: { name: "gray-matter", version: "4.0.3" }, drag: [], message: "x" },
    ]);

    await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, checkMaintenance: true },
    });

    const written = stdoutWriteSpy.mock.calls.map(call => String(call[0])).join("");
    expect(written).toContain("maintenance risk");
  });
});

describe("handleMultiFolderScan - ratchet / baseline", () => {
  const finding = {
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-xxx", aliases: [], summary: "" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "lodash"]],
    relationship: "direct",
    firstFixedVersion: null,
  };

  beforeEach(() => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
      { subfolder: "b", scanInput: makeScanInput() },
    ]);
    scanPackagesMock.mockResolvedValue({ findings: [finding], completeness: scanCompleteness });
    sortFindingsForOutputMock.mockImplementation((f: any[]) => f);
  });

  it("saves a per-folder baseline and exits 0 on first --ratchet run", async () => {
    readBaselineMock.mockReturnValue(null);
    ratchetOutcomeMock.mockReturnValue({ action: "save" });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ratchet: true },
    });

    expect(writeBaselineMock).toHaveBeenCalledTimes(2);
    expect(writeBaselineMock).toHaveBeenCalledWith("/project/a", expect.any(Array));
    expect(writeBaselineMock).toHaveBeenCalledWith("/project/b", expect.any(Array));
    expect(exitCode).toBe(EXIT_OK);
    const output = consoleLogMock.mock.calls.flat().join("\n");
    expect(output).toMatch(/a\/: Baseline saved/i);
    expect(output).toMatch(/b\/: Baseline saved/i);
  });

  it("processes clean folders and rejects incomplete folders under --ratchet", async () => {
    scanPackagesMock.mockResolvedValueOnce({
      findings: [finding],
      completeness: scanCompleteness,
    }).mockResolvedValueOnce({
      findings: [finding],
      completeness: {
        complete: false,
        diagnostics: [{
          code: "OSV_DETAIL_TRANSIENT_FAILURE",
          severity: "warning",
          message: "1 advisory detail lookup failed.",
          impact: "detection",
          count: 1,
        }],
      },
    });
    ratchetOutcomeMock.mockReturnValue({ action: "save" });

    const { EXIT_ERROR } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ratchet: true },
    });

    expect(exitCode).toBe(EXIT_ERROR);
    expect(ratchetOutcomeMock).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).toHaveBeenCalledWith("/project/a", expect.any(Array));
    const output = consoleLogMock.mock.calls.flat().join("\n");
    expect(output).toMatch(/a\/: Baseline saved/i);
    expect(output).toMatch(/b\/: Scan data is incomplete/i);
    expect(output).toContain("advisory detail lookup failed with a transient error");
  });

  it("allows --ratchet when only remediation diagnostics are incomplete", async () => {
    scanPackagesMock.mockResolvedValue({
      findings: [finding],
      completeness: {
        complete: false,
        diagnostics: [{
          code: "PACKUMENT_FETCH_FAILURE",
          severity: "warning",
          message: "1 packument fetch failed.",
          impact: "remediation",
          count: 1,
        }],
      },
    });
    ratchetOutcomeMock.mockReturnValue({ action: "save" });

    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ratchet: true },
    });

    const { EXIT_OK } = await import("../src/types.js");
    expect(exitCode).toBe(EXIT_OK);
    expect(ratchetOutcomeMock).toHaveBeenCalledTimes(2);
    expect(writeBaselineMock).toHaveBeenCalledTimes(2);
  });

  it("exits 0 when existing baselines suppress all findings under --ratchet", async () => {
    readBaselineMock.mockReturnValue({ version: 1, createdAt: "x", findings: [] });
    ratchetOutcomeMock.mockReturnValue({ action: "gate", newFindings: [], suppressedCount: 1 });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ratchet: true },
    });

    expect(writeBaselineMock).not.toHaveBeenCalled();
    expect(exitCode).toBe(EXIT_OK);
    const output = consoleLogMock.mock.calls.flat().join("\n");
    expect(output).toMatch(/No new findings above baseline/i);
  });

  it("exits EXIT_FINDINGS when any folder has findings above its baseline under --ratchet", async () => {
    readBaselineMock.mockReturnValue({ version: 1, createdAt: "x", findings: [] });
    ratchetOutcomeMock
      .mockReturnValueOnce({ action: "gate", newFindings: [], suppressedCount: 1 })
      .mockReturnValueOnce({ action: "gate", newFindings: [finding], suppressedCount: 0 });

    const { EXIT_FINDINGS } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, ratchet: true },
    });

    expect(writeBaselineMock).not.toHaveBeenCalled();
    expect(exitCode).toBe(EXIT_FINDINGS);
    const output = consoleLogMock.mock.calls.flat().join("\n");
    expect(output).toMatch(/b\/: 1 new finding above baseline/i);
  });

  it("filters findings via existing baseline when --ratchet is not set", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
    readBaselineMock.mockReturnValue({ version: 1, createdAt: "x", findings: [] });
    filterNewFindingsMock.mockReturnValue({ newFindings: [], suppressedCount: 1 });

    const results = await runMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: baseOptions,
    });

    expect(filterNewFindingsMock).toHaveBeenCalled();
    expect(results[0].sorted).toHaveLength(0);
    expect(results[0].suppressedCount).toBe(1);
  });
});

describe("aggregateMultiFolderCompleteness", () => {
  it("pluralizes multiple packument fetch failures", async () => {
    const { formatDiagnosticMessage } = await import("../src/scan/completeness.js");

    expect(formatDiagnosticMessage("PACKUMENT_FETCH_FAILURE", 2))
      .toContain("2 packument fetches failed");
  });

  it("merges diagnostics with the same code", async () => {
    const { aggregateMultiFolderCompleteness } = await import("../src/scan/completeness.js");
    const results = [
      {
        completeness: {
          complete: false,
          diagnostics: [{
            code: "OSV_DETAIL_TRANSIENT_FAILURE" as const,
            severity: "warning" as const,
            message: "1 advisory detail lookup failed.",
            impact: "detection" as const,
            count: 1,
          }],
        },
      },
      {
        completeness: {
          complete: false,
          diagnostics: [{
            code: "OSV_DETAIL_TRANSIENT_FAILURE" as const,
            severity: "warning" as const,
            message: "1 advisory detail lookup failed.",
            impact: "detection" as const,
            count: 1,
          }],
        },
      },
    ] as any;

    const aggregated = aggregateMultiFolderCompleteness(results);

    expect(aggregated.complete).toBe(false);
    expect(aggregated.diagnostics).toHaveLength(1);
    expect(aggregated.diagnostics[0]).toMatchObject({
      code: "OSV_DETAIL_TRANSIENT_FAILURE",
      count: 2,
      message: "2 advisory detail lookups failed with a transient error — re-run to retry.",
    });
  });

  it("sums remediation package counts", async () => {
    const { aggregateMultiFolderCompleteness } = await import("../src/scan/completeness.js");
    const results = [
      {
        completeness: {
          complete: false,
          diagnostics: [{
            code: "REMEDIATION_FAILURE" as const,
            severity: "warning" as const,
            message: "2 remediation attempts failed.",
            impact: "remediation" as const,
            count: 2,
            affectedPackageCount: 1,
          }],
        },
      },
      {
        completeness: {
          complete: false,
          diagnostics: [{
            code: "REMEDIATION_FAILURE" as const,
            severity: "warning" as const,
            message: "1 remediation attempt failed.",
            impact: "remediation" as const,
            count: 1,
            affectedPackageCount: 2,
          }],
        },
      },
    ] as any;

    const [diagnostic] = aggregateMultiFolderCompleteness(results).diagnostics;

    expect(diagnostic).toMatchObject({
      code: "REMEDIATION_FAILURE",
      count: 3,
      affectedPackageCount: 3,
    });
  });
});

describe("handleMultiFolderScan - incomplete-policy", () => {
  const detectionDiagnostic = {
    code: "OSV_DETAIL_TRANSIENT_FAILURE",
    severity: "warning" as const,
    message: "1 advisory detail lookup failed.",
    impact: "detection" as const,
    count: 1,
  };

  const remediationDiagnostic = {
    code: "PACKUMENT_FETCH_FAILURE",
    severity: "warning" as const,
    message: "1 packument fetch failed.",
    impact: "remediation" as const,
    count: 1,
  };

  beforeEach(() => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
    ]);
  });

  it("detection gap + warn => normal exit", async () => {
    scanPackagesMock.mockResolvedValue({
      findings: [],
      completeness: { complete: false, diagnostics: [detectionDiagnostic] },
    });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, incompletePolicy: "warn" },
    });

    expect(exitCode).toBe(EXIT_OK);
  });

  it("detection gap + error => EXIT_ERROR", async () => {
    scanPackagesMock.mockResolvedValue({
      findings: [],
      completeness: { complete: false, diagnostics: [detectionDiagnostic] },
    });

    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, incompletePolicy: "error" },
    });

    expect(exitCode).toBe(EXIT_ERROR);
  });

  it("remediation gap + error => normal exit", async () => {
    scanPackagesMock.mockResolvedValue({
      findings: [],
      completeness: { complete: false, diagnostics: [remediationDiagnostic] },
    });

    const { EXIT_OK } = await import("../src/types.js");
    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, incompletePolicy: "error" },
    });

    expect(exitCode).toBe(EXIT_OK);
  });

  it("detection gap across multiple folders + error => EXIT_ERROR", async () => {
    loadMultiplePackagesMock.mockReturnValue([
      { subfolder: "a", scanInput: makeScanInput() },
      { subfolder: "b", scanInput: makeScanInput() },
    ]);
    scanPackagesMock
      .mockResolvedValueOnce({
        findings: [],
        completeness: { complete: false, diagnostics: [detectionDiagnostic] },
      })
      .mockResolvedValueOnce({
        findings: [],
        completeness: { complete: true, diagnostics: [] },
      });

    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, incompletePolicy: "error" },
    });

    expect(exitCode).toBe(EXIT_ERROR);
  });

  it("ratchet + detection gap + warn still exits EXIT_ERROR", async () => {
    scanPackagesMock.mockResolvedValue({
      findings: [],
      completeness: { complete: false, diagnostics: [detectionDiagnostic] },
    });
    ratchetOutcomeMock.mockReturnValue({ action: "save" });

    const exitCode = await handleMultiFolderScan({
      projectRoot: "/project",
      batchSize: 100,
      options: { ...baseOptions, incompletePolicy: "warn", ratchet: true },
    });

    expect(exitCode).toBe(EXIT_ERROR);
  });
});
