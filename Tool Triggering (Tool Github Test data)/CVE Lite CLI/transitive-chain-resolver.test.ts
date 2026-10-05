import { jest } from "@jest/globals";
import type { Finding } from "../src/types.js";
import { resolveChainFix } from "../src/remediation/transitive-chain-resolver.js";
import { clearPackumentCache } from "../src/remediation/npm-registry.js";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "mime-types", version: "1.0.0", ecosystem: "npm" },
    vulnerabilities: [],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["root", "express", "send", "mime-types"]],
    relationship: "transitive",
    firstFixedVersion: "2.0.0",
    validatedFirstFixedVersion: "2.0.0",
    ...overrides,
  } as Finding;
}

beforeEach(() => {
  fetchMock.mockReset();
  clearPackumentCache();
});

describe("resolveChainFix", () => {
  it("returns null when offline", async () => {
    const result = await resolveChainFix(
      makeFinding(),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: true },
    );
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when finding is not transitive", async () => {
    const result = await resolveChainFix(
      makeFinding({ relationship: "direct" }),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: false },
    );
    expect(result).toBeNull();
  });

  it("returns null when direct dep is not in installedVersions", async () => {
    const result = await resolveChainFix(
      makeFinding(),
      new Map(),
      "npm",
      { offline: false },
    );
    expect(result).toBeNull();
  });

  it("returns null when fetchPackument returns 404 for direct dep", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const result = await resolveChainFix(
      makeFinding(),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: false },
    );
    expect(result).toBeNull();
  });

  it("resolves a 2-hop chain: root -> express -> mime-types (direct parent)", async () => {
    // Path is 3 elements: root, express, mime-types
    // express is the direct dep, mime-types is the vulnerable package (one hop away)
    fetchMock.mockImplementation(async (url: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes("/express")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "4.17.0": { dependencies: { "mime-types": "~1.x" } },
              "4.19.0": { dependencies: { "mime-types": "^2.1.0" } },
            },
          }),
        };
      }
      if (urlStr.includes("/mime-types")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "1.0.0": { dependencies: {} },
              "2.1.35": { dependencies: {} },
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const result = await resolveChainFix(
      makeFinding({
        dependencyPaths: [["root", "express", "mime-types"]],
      }),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: false },
    );

    expect(result).not.toBeNull();
    expect(result!.directDep).toBe("express");
    expect(result!.directDepCurrentVersion).toBe("4.17.0");
    expect(result!.targetVersion).toBe("4.19.0");
    expect(result!.chain).toEqual([]);
    expect(result!.safeVersion).toBe("2.1.35");
    expect(result!.command).toBe("npm install express@4.19.0");
    expect(result!.coveredPaths).toBe(1);
    expect(result!.totalPaths).toBe(1);
  });

  it("resolves a 3-hop chain: root -> express -> send -> mime-types", async () => {
    fetchMock.mockImplementation(async (url: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes("/express")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "4.17.0": { dependencies: { send: "0.17.0" } },
              "4.19.0": { dependencies: { send: "^0.18.0" } },
            },
          }),
        };
      }
      if (urlStr.endsWith("/send") || urlStr.includes("/send?") || urlStr.includes("registry.npmjs.org/send")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "0.17.0": { dependencies: { "mime-types": "~1.x" } },
              "0.18.0": { dependencies: { "mime-types": "^2.1.0" } },
            },
          }),
        };
      }
      if (urlStr.includes("/mime-types")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "1.0.0": { dependencies: {} },
              "2.1.35": { dependencies: {} },
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const result = await resolveChainFix(
      makeFinding(),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: false },
    );

    expect(result).not.toBeNull();
    expect(result!.directDep).toBe("express");
    expect(result!.targetVersion).toBe("4.19.0");
    expect(result!.chain).toEqual([{ name: "send", version: "0.18.0" }]);
    expect(result!.safeVersion).toBe("2.1.35");
    expect(result!.command).toBe("npm install express@4.19.0");
  });

  it("returns null when no express version resolves the chain (mime-types still vulnerable)", async () => {
    fetchMock.mockImplementation(async (url: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes("/express")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "4.17.0": { dependencies: { send: "0.17.0" } },
              "4.19.0": { dependencies: { send: "~0.17.0" } },
            },
          }),
        };
      }
      if (urlStr.includes("registry.npmjs.org/send")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "0.17.0": { dependencies: { "mime-types": "~1.x" } },
              "0.17.9": { dependencies: { "mime-types": "~1.x" } },
            },
          }),
        };
      }
      if (urlStr.includes("/mime-types")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "1.0.0": {},
              "1.9.9": {},
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const result = await resolveChainFix(
      makeFinding(),
      new Map([["express", "4.17.0"]]),
      "npm",
      { offline: false },
    );
    expect(result).toBeNull();
  });

  it("builds pnpm add command for pnpm package manager", async () => {
    fetchMock.mockImplementation(async (url: unknown) => {
      const urlStr = String(url);
      if (urlStr.includes("/express")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "4.17.0": { dependencies: { "mime-types": "~1.x" } },
              "4.19.0": { dependencies: { "mime-types": "^2.0.0" } },
            },
          }),
        };
      }
      if (urlStr.includes("/mime-types")) {
        return {
          ok: true,
          json: async () => ({
            versions: {
              "1.0.0": {},
              "2.1.35": {},
            },
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const result = await resolveChainFix(
      makeFinding({ dependencyPaths: [["root", "express", "mime-types"]] }),
      new Map([["express", "4.17.0"]]),
      "pnpm",
      { offline: false },
    );

    expect(result!.command).toBe("pnpm add express@4.19.0");
  });
});
