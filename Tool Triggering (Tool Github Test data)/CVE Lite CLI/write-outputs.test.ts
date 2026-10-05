import { jest } from "@jest/globals";
import path from "node:path";
import type { Finding, PackageRef, ParsedOptions, ScanInput } from "../src/types.js";
import type { ScanState } from "../src/output/write-outputs.js";
import type { MaintenanceFinding } from "../src/maintenance/types.js";

const writeFileSyncMock = jest.fn<any>();
const mkdirSyncMock = jest.fn<any>();
const existsSyncMock = jest.fn<any>(() => false);
const readFileSyncMock = jest.fn<any>(() => JSON.stringify({ name: "my-project", version: "1.0.0" }));

const writeSarifReportMock = jest.fn<any>(() => "cve-lite-scan-test.sarif");
const deriveLockfileUriMock = jest.fn<any>(() => "package-lock.json");

const writeCycloneDxReportMock = jest.fn<any>(() => "cve-lite-scan-test.cdx.json");

jest.unstable_mockModule("node:fs", () => ({
  default: {
    writeFileSync: writeFileSyncMock,
    mkdirSync: mkdirSyncMock,
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
  },
  writeFileSync: writeFileSyncMock,
  mkdirSync: mkdirSyncMock,
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
}));

jest.unstable_mockModule("../src/output/sarif.js", () => ({
  writeSarifReport: writeSarifReportMock,
  deriveLockfileUri: deriveLockfileUriMock,
}));

jest.unstable_mockModule("../src/output/cyclonedx.js", () => ({
  writeCycloneDxReport: writeCycloneDxReportMock,
}));

let writeOutputs: (
  options: ParsedOptions,
  scanState: ScanState,
  scanInput: ScanInput,
  projectPath: string,
) => Promise<void>;

beforeAll(async () => {
  const mod = await import("../src/output/write-outputs.js");
  writeOutputs = mod.writeOutputs;
});

beforeEach(() => {
  jest.clearAllMocks();
  writeSarifReportMock.mockReturnValue("cve-lite-scan-test.sarif");
  writeCycloneDxReportMock.mockReturnValue("cve-lite-scan-test.cdx.json");
  readFileSyncMock.mockReturnValue(JSON.stringify({ name: "my-project", version: "1.0.0" }));
  existsSyncMock.mockReturnValue(true);
});

const mockScanState = {
  sorted: [] as Finding[],
  allPackages: [] as PackageRef[],
  suggestedFixCommands: null,
  coverage: [],
  minSeverity: "medium" as const,
  tableFindings: [],
  completeness: { complete: true, diagnostics: [] },
};

const mockScanInput: ScanInput = {
  mode: "resolved-lockfile",
  source: "package-lock",
  filePath: "/tmp/project/package-lock.json",
  packages: [],
  notes: [],
  warnings: [],
  skippedDependencies: [],
};

function makeOptions(overrides: Partial<ParsedOptions> = {}): ParsedOptions {
  return { failOn: "critical", batchSize: "100", ...overrides };
}

describe("writeOutputs", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls writeSarifReport when sarif: true", async () => {
    await writeOutputs(makeOptions({ sarif: true }), mockScanState, mockScanInput, "/tmp/project");
    expect(writeSarifReportMock).toHaveBeenCalledTimes(1);
  });

  it("passes maintenance findings into writeSarifReport when provided", async () => {
    const withMaintenance = {
      ...mockScanState,
      maintenanceFindings: [
        {
          ruleId: "DM001",
          severity: "high",
          package: { name: "react", version: "17.0.0" },
          message: "Constrains react-dom below fix",
        } as MaintenanceFinding,
      ],
    };
    await writeOutputs(makeOptions({ sarif: true }), withMaintenance, mockScanInput, "/tmp/project");
    expect(writeSarifReportMock).toHaveBeenCalledWith(
      expect.any(Array),
      "package-lock.json",
      null,
      undefined,
      withMaintenance.maintenanceFindings,
      undefined,
      process.cwd(),
    );
  });

  it("calls writeCycloneDxReport when cdx: true", async () => {
    await writeOutputs(makeOptions({ cdx: true }), mockScanState, mockScanInput, "/tmp/project");
    expect(writeCycloneDxReportMock).toHaveBeenCalledTimes(1);
  });

  it("calls writeFileSync when json: true", async () => {
    await writeOutputs(makeOptions({ json: true }), mockScanState, mockScanInput, "/tmp/project");
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const [, jsonContent] = writeFileSyncMock.mock.calls[0] as [string, string];
    const parsed = JSON.parse(jsonContent);
    expect(parsed).toMatchObject({
      projectPath: expect.any(String),
      mode: expect.any(String),
      source: expect.any(String),
      packageCount: expect.any(Number),
      findingCount: expect.any(Number),
      findings: expect.any(Array),
    });
  });

  it("logs the saved filename to stdout when json: true", async () => {
    await writeOutputs(makeOptions({ json: true }), mockScanState, mockScanInput, "/tmp/project");
    const logged = consoleSpy.mock.calls.map(call => call.join(" ")).join("\n");
    expect(logged).toContain("JSON saved to");
    expect(logged).toMatch(/cve-lite-scan-.*\.json/);
  });

  it("writes JSON into the working directory without creating anything when --output is not set", async () => {
    await writeOutputs(makeOptions({ json: true }), mockScanState, mockScanInput, "/tmp/project");
    expect(mkdirSyncMock).not.toHaveBeenCalled();
    const [jsonPath] = writeFileSyncMock.mock.calls[0] as [string, string];
    expect(path.dirname(jsonPath)).toBe(process.cwd());
  });

  it("creates the --output directory, writes JSON into it and logs the relative path", async () => {
    await writeOutputs(makeOptions({ json: true, output: "reports" }), mockScanState, mockScanInput, "/tmp/project");
    const outputDir = path.resolve(process.cwd(), "reports");
    expect(mkdirSyncMock).toHaveBeenCalledWith(outputDir, { recursive: true });
    const [jsonPath] = writeFileSyncMock.mock.calls[0] as [string, string];
    expect(path.dirname(jsonPath)).toBe(outputDir);
    const logged = consoleSpy.mock.calls.map(call => call.join(" ")).join("\n");
    expect(logged).toMatch(/JSON saved to.*reports[\\/]cve-lite-scan-.*\.json/);
  });

  it("passes the resolved --output directory to the report writers", async () => {
    const outputDir = path.resolve(process.cwd(), "reports");
    await writeOutputs(makeOptions({ sarif: true, cdx: true, output: "reports" }), mockScanState, mockScanInput, "/tmp/project");
    expect(writeSarifReportMock.mock.calls[0]).toHaveLength(7);
    expect((writeSarifReportMock.mock.calls[0] as unknown[])[6]).toBe(outputDir);
    expect((writeCycloneDxReportMock.mock.calls[0] as unknown[])[4]).toBe(outputDir);
  });

  it("does NOT call writeSarifReport when sarif is not set", async () => {
    await writeOutputs(makeOptions(), mockScanState, mockScanInput, "/tmp/project");
    expect(writeSarifReportMock).not.toHaveBeenCalled();
  });

  it("does NOT call writeCycloneDxReport when cdx is not set", async () => {
    await writeOutputs(makeOptions(), mockScanState, mockScanInput, "/tmp/project");
    expect(writeCycloneDxReportMock).not.toHaveBeenCalled();
  });

  describe("readProjectMeta (via cdx path)", () => {
    it("passes null projectMeta when package.json does not exist", async () => {
      existsSyncMock.mockReturnValueOnce(false);
      await writeOutputs(makeOptions({ cdx: true }), mockScanState, mockScanInput, "/project");
      const [,, planArg, metaArg] = writeCycloneDxReportMock.mock.calls[0] as any[];
      expect(metaArg).toBeNull();
    });

    it("passes null projectMeta when package.json has invalid JSON", async () => {
      existsSyncMock.mockReturnValueOnce(true);
      readFileSyncMock.mockReturnValueOnce("not valid json");
      await writeOutputs(makeOptions({ cdx: true }), mockScanState, mockScanInput, "/project");
      const [,, planArg, metaArg] = writeCycloneDxReportMock.mock.calls[0] as any[];
      expect(metaArg).toBeNull();
    });

    it("passes null projectMeta when package.json has no name field", async () => {
      existsSyncMock.mockReturnValueOnce(true);
      readFileSyncMock.mockReturnValueOnce(JSON.stringify({ version: "1.0.0" }));
      await writeOutputs(makeOptions({ cdx: true }), mockScanState, mockScanInput, "/project");
      const [,, planArg, metaArg] = writeCycloneDxReportMock.mock.calls[0] as any[];
      expect(metaArg).toBeNull();
    });
  });

  describe("scan completeness JSON fields", () => {
    it("includes complete:true and empty diagnostics for a healthy scan", async () => {
      await writeOutputs(makeOptions({ json: true }), mockScanState, mockScanInput, "/tmp/project");
      const [, jsonContent] = writeFileSyncMock.mock.calls[writeFileSyncMock.mock.calls.length - 1] as [string, string];
      const parsed = JSON.parse(jsonContent);
      expect(parsed.status).toBe("ok");
      expect(parsed.complete).toBe(true);
      expect(parsed.diagnostics).toEqual([]);
    });

    it("includes complete:false and diagnostics when completeness indicates a partial scan", async () => {
      const partialState = {
        ...mockScanState,
        completeness: {
          complete: false,
          diagnostics: [
            {
              code: "OSV_DETAIL_TRANSIENT_FAILURE" as const,
              severity: "warning" as const,
              message: "5 advisory detail lookups failed with a transient error",
              impact: "detection" as const,
              count: 5,
            },
            {
              code: "PACKUMENT_FETCH_FAILURE" as const,
              severity: "warning" as const,
              message: "2 packument fetches failed",
              impact: "remediation" as const,
              count: 2,
            },
          ],
        },
      };
      await writeOutputs(makeOptions({ json: true }), partialState, mockScanInput, "/tmp/project");
      const [, jsonContent] = writeFileSyncMock.mock.calls[writeFileSyncMock.mock.calls.length - 1] as [string, string];
      const parsed = JSON.parse(jsonContent);
      expect(parsed.status).toBe("partial");
      expect(parsed.complete).toBe(false);
      expect(parsed.diagnostics).toEqual([
        expect.objectContaining({ code: "OSV_DETAIL_TRANSIENT_FAILURE", impact: "detection" }),
        expect.objectContaining({ code: "PACKUMENT_FETCH_FAILURE", impact: "remediation" }),
      ]);
    });
  });
});
