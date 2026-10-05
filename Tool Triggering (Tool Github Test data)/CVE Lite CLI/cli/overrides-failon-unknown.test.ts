import { jest } from "@jest/globals";
import type { OverrideFinding } from "../../src/overrides/index.js";

const auditMock = jest.fn();
const buildOverrideContextMock = jest.fn();

jest.unstable_mockModule("../../src/overrides/index.js", () => ({
  buildOverrideContext: buildOverrideContextMock,
  audit: auditMock,
  applyFix: jest.fn(),
}));
jest.unstable_mockModule("../../src/audit-log/index.js", () => ({
  createAuditLog: jest.fn().mockReturnValue({
    emit: jest.fn(),
    close: jest.fn(),
  }),
}));
jest.unstable_mockModule("../../src/output/override-findings-terminal.js", () => ({
  renderOverrideFindings: jest.fn().mockReturnValue(""),
}));

let runOverrides: typeof import("../../src/cli/overrides.js").runOverrides;
let EXIT_FINDINGS: number;
let EXIT_OK: number;

beforeAll(async () => {
  ({ runOverrides } = await import("../../src/cli/overrides.js"));
  ({ EXIT_FINDINGS, EXIT_OK } = await import("../../src/types.js"));
});

describe("runOverrides fail-on severity handling", () => {
  const finding: OverrideFinding = {
    ruleId: "OA001",
    severity: "unknown",
    package: { name: "example" },
    location: { file: "package.json", jsonPath: "/overrides/example" },
    message: "Example unknown severity finding",
  };

  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    buildOverrideContextMock.mockReturnValue({});
    auditMock.mockResolvedValue({ findings: [finding] });
    writeSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  const callOverrides = (failOn: "low" | "medium") =>
    runOverrides({
      projectArg: ".",
      options: { failOn, json: true },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      auditLog: {
        emit: jest.fn(),
        close: jest.fn(),
      },
    });

  it("returns EXIT_FINDINGS for --fail-on low when an override finding has unknown severity", async () => {
    expect(await callOverrides("low")).toBe(EXIT_FINDINGS);
  });

  it("returns EXIT_OK for --fail-on medium when an override finding has unknown severity", async () => {
    expect(await callOverrides("medium")).toBe(EXIT_OK);
  });
});
