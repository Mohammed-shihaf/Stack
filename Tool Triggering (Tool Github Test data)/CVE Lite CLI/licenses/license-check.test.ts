import { jest } from "@jest/globals";
import type { LicenseFinding } from "../../src/licenses/types.js";
import type { DetectLicenseIssuesOpts, DetectLicenseIssuesResult } from "../../src/licenses/license-check.js";

const readFileSyncMock = jest.fn<any>();
const fetchPackumentMock = jest.fn<any>();
const runWithConcurrencyMock = jest.fn<any>();

jest.unstable_mockModule("node:fs", () => ({
  readFileSync: readFileSyncMock,
}));

jest.unstable_mockModule("../../src/remediation/npm-registry.js", () => ({
  fetchPackument: fetchPackumentMock,
}));

jest.unstable_mockModule("../../src/utils/array.js", () => ({
  runWithConcurrency: runWithConcurrencyMock,
}));

let isCopyleft: (license: string) => boolean;
let isUnknownLicense: (license: string | null | undefined) => boolean;
let detectNpmLicenses: (rawPackages: Record<string, unknown>) => LicenseFinding[];
let detectLicenseIssues: (opts: DetectLicenseIssuesOpts) => Promise<DetectLicenseIssuesResult>;

beforeAll(async () => {
  const mod = await import("../../src/licenses/license-check.js");
  isCopyleft = mod.isCopyleft;
  isUnknownLicense = mod.isUnknownLicense;
  detectNpmLicenses = mod.detectNpmLicenses;
  detectLicenseIssues = mod.detectLicenseIssues;
});

describe("isCopyleft", () => {
  it("flags GPL-3.0", () => expect(isCopyleft("GPL-3.0")).toBe(true));
  it("flags GPL-2.0-only", () => expect(isCopyleft("GPL-2.0-only")).toBe(true));
  it("flags AGPL-3.0-or-later", () => expect(isCopyleft("AGPL-3.0-or-later")).toBe(true));
  it("AGPL-3.0 is copyleft", () => expect(isCopyleft("AGPL-3.0")).toBe(true));
  it("flags LGPL-2.1", () => expect(isCopyleft("LGPL-2.1")).toBe(true));
  it("flags SPDX expression (GPL-2.0 OR MIT)", () =>
    expect(isCopyleft("(GPL-2.0 OR MIT)")).toBe(true));
  it("treats GPL-2.0+ (legacy + suffix) as copyleft", () => {
    expect(isCopyleft("GPL-2.0+")).toBe(true);
  });
  it("treats GPL-3.0+ (legacy + suffix) as copyleft", () => {
    expect(isCopyleft("GPL-3.0+")).toBe(true);
  });
  it("treats LGPL-2.1+ (legacy + suffix) as copyleft", () => {
    expect(isCopyleft("LGPL-2.1+")).toBe(true);
  });
  it("does not flag MIT", () => expect(isCopyleft("MIT")).toBe(false));
  it("does not flag Apache-2.0", () => expect(isCopyleft("Apache-2.0")).toBe(false));
  it("does not flag BSD-3-Clause", () => expect(isCopyleft("BSD-3-Clause")).toBe(false));
  it("does not flag ISC", () => expect(isCopyleft("ISC")).toBe(false));
});

describe("isUnknownLicense", () => {
  it("flags null", () => expect(isUnknownLicense(null)).toBe(true));
  it("flags undefined", () => expect(isUnknownLicense(undefined)).toBe(true));
  it("flags empty string", () => expect(isUnknownLicense("")).toBe(true));
  it("flags UNLICENSED", () => expect(isUnknownLicense("UNLICENSED")).toBe(true));
  it("flags SEE LICENSE IN LICENSE.md", () =>
    expect(isUnknownLicense("SEE LICENSE IN LICENSE.md")).toBe(true));
  it("does not flag MIT", () => expect(isUnknownLicense("MIT")).toBe(false));
});

describe("detectNpmLicenses", () => {
  it("returns LC001 for GPL-3.0 transitive package", () => {
    const rawPackages = {
      "": { dependencies: { axios: "^0.21.0" } },
      "node_modules/axios": { version: "0.21.1", license: "MIT" },
      "node_modules/bad-lib": { version: "1.0.0", license: "GPL-3.0", dev: false },
    };
    const findings = detectNpmLicenses(rawPackages);
    const lc001 = findings.filter((f) => f.ruleId === "LC001");
    expect(lc001).toHaveLength(1);
    expect(lc001[0]!.package.name).toBe("bad-lib");
    expect(lc001[0]!.severity).toBe("high");
    expect(lc001[0]!.relationship).toBe("transitive");
  });

  it("marks direct deps as direct", () => {
    const rawPackages = {
      "": { dependencies: { "gpl-lib": "^1.0.0" } },
      "node_modules/gpl-lib": { version: "1.0.0", license: "GPL-2.0" },
    };
    const findings = detectNpmLicenses(rawPackages);
    expect(findings[0]!.relationship).toBe("direct");
  });

  it("returns LC002 for package with no license field", () => {
    const rawPackages = {
      "": { dependencies: {} },
      "node_modules/mystery": { version: "0.1.0" },
    };
    const findings = detectNpmLicenses(rawPackages);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe("LC002");
    expect(findings[0]!.severity).toBe("medium");
    expect(findings[0]!.license).toBeNull();
  });

  it("returns LC002 for UNLICENSED package", () => {
    const rawPackages = {
      "": {},
      "node_modules/nolicense": { version: "1.0.0", license: "UNLICENSED" },
    };
    const findings = detectNpmLicenses(rawPackages);
    expect(findings[0]!.ruleId).toBe("LC002");
  });

  it("does not flag MIT packages", () => {
    const rawPackages = {
      "": { dependencies: { axios: "^0.21.0" } },
      "node_modules/axios": { version: "0.21.1", license: "MIT" },
    };
    expect(detectNpmLicenses(rawPackages)).toHaveLength(0);
  });

  it("skips the root package entry (empty string key)", () => {
    const rawPackages = {
      "": { license: "GPL-3.0" },
      "node_modules/axios": { version: "0.21.1", license: "MIT" },
    };
    expect(detectNpmLicenses(rawPackages)).toHaveLength(0);
  });
});

describe("detectLicenseIssues", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("npm path: returns full lockfile findings with limitedToDirectOnly false", async () => {
    const lockfileData = JSON.stringify({
      packages: {
        "": { dependencies: { "gpl-pkg": "^1.0.0", "mit-pkg": "^2.0.0" } },
        "node_modules/gpl-pkg": { version: "1.0.0", license: "GPL-3.0" },
        "node_modules/mit-pkg": { version: "2.0.0", license: "MIT" },
      },
    });
    readFileSyncMock.mockReturnValue(lockfileData);

    const result = await detectLicenseIssues({
      lockfilePath: "/fake/package-lock.json",
      directDeps: [],
      isNpm: true,
      isOffline: false,
    });

    expect(result.limitedToDirectOnly).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.ruleId).toBe("LC001");
    expect(result.findings[0]!.package.name).toBe("gpl-pkg");
  });

  it("offline path: returns empty findings with limitedToDirectOnly true", async () => {
    const result = await detectLicenseIssues({
      lockfilePath: null,
      directDeps: [],
      isNpm: false,
      isOffline: true,
    });

    expect(result.limitedToDirectOnly).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("pnpm online path: fetches packument for direct deps and returns LC001 for copyleft", async () => {
    const directDeps = [
      { name: "gpl-pkg", version: "1.0.0" },
      { name: "mit-pkg", version: "2.0.0" },
    ];

    fetchPackumentMock.mockImplementation(async (name: string) => {
      if (name === "gpl-pkg") return { license: "GPL-3.0" };
      if (name === "mit-pkg") return { license: "MIT" };
      return null;
    });

    runWithConcurrencyMock.mockImplementation(
      async (items: any[], _limit: number, fn: (item: any) => Promise<any>) => {
        return Promise.all(items.map(fn));
      },
    );

    const result = await detectLicenseIssues({
      lockfilePath: null,
      directDeps,
      isNpm: false,
      isOffline: false,
    });

    expect(result.limitedToDirectOnly).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.ruleId).toBe("LC001");
    expect(result.findings[0]!.package.name).toBe("gpl-pkg");
  });
});
