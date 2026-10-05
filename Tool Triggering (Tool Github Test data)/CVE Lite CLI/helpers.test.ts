import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "../src/cli/args.js";
import { maxSeverity, inferSeverity, normalizeSeverity } from "../src/osv/severity.js";
import {
  chooseBestLockfile,
  findFiles,
  findNearestPackageJson,
  relativeOrName,
  safeReadText,
} from "../src/utils/file.js";
import {
  compareVersions,
  getVersionCacheSize,
  isBreakingUpgrade,
  isPreReleaseVersion,
  looksLikeVersion,
  normalizeRawVersion,
  parseExactManifestVersion,
} from "../src/utils/version.js";
import { runWithConcurrency } from "../src/utils/array.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-helper-test-"));
}

function removeDir(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

describe("parseArgs", () => {
  it("returns default options when no arguments are provided", () => {
    const result = parseArgs([]);

    expect(result).toEqual({
      command: "scan",
      options: {
        failOn: "critical",
        incompletePolicy: "warn",
        batchSize: "100",
        searchDepth: "4",
        minSeverity: "medium",
      },
    });
  });

  it("parses flags, inline values, and a project path together", () => {
    const result = parseArgs([
      "--json",
      "--debug",
      "--fix",
      "--verbose",
      "--prod-only",
      "--offline",
      "--offline-db",
      "/tmp/local-advisories.db",
      "--all",
      "--fail-on=high",
      "--batch-size",
      "25",
      "--cache-dir=.cache/test",
      "--osv-url",
      "https://example.com/osv",
      "--search-depth=7",
      "--min-severity",
      "low",
      "./fixture",
    ]);

    expect(result).toEqual({
      command: "scan",
      options: {
        json: true,
        debug: true,
        fix: true,
        verbose: true,
        prodOnly: true,
        offline: true,
        offlineDb: "/tmp/local-advisories.db",
        all: true,
        failOn: "high",
        incompletePolicy: "warn",
        batchSize: "25",
        cacheDir: ".cache/test",
        osvUrl: "https://example.com/osv",
        searchDepth: "7",
        minSeverity: "low",
      },
      projectArg: "./fixture",
    });
  });

  it("parses the advisories sync command and its output path option", () => {
    const result = parseArgs(["advisories", "sync", "--output", "./tmp/advisories.db"]);

    expect(result).toEqual({
      command: "advisories-sync",
      options: {
        failOn: "critical",
        incompletePolicy: "warn",
        batchSize: "100",
        searchDepth: "4",
        minSeverity: "medium",
        output: "./tmp/advisories.db",
      },
    });
  });

  it("parses the advisories init command and its output path option", () => {
    const result = parseArgs(["advisories", "init", "--output", "./tmp/advisories.db"]);

    expect(result).toEqual({
      command: "advisories-init",
      options: {
        failOn: "critical",
        incompletePolicy: "warn",
        batchSize: "100",
        searchDepth: "4",
        minSeverity: "medium",
        output: "./tmp/advisories.db",
      },
    });
  });

  it("parses the scan output directory option in both forms", () => {
    expect(parseArgs([".", "--sarif", "--output", "./reports"]).options.output).toBe("./reports");
    expect(parseArgs([".", "--sarif", "--output=./reports"]).options.output).toBe("./reports");
  });

  it("rejects --output without a directory argument", () => {
    expect(() => parseArgs([".", "--sarif", "--output"])).toThrow("--output requires a directory argument");
    expect(() => parseArgs([".", "--sarif", "--output="])).toThrow("--output requires a directory argument");
  });

  it("rejects --output when the next token is another flag", () => {
    expect(() => parseArgs([".", "--json", "--output", "--sarif"])).toThrow("--output requires a directory argument");
    expect(() => parseArgs([".", "--json", "--output=--sarif"])).toThrow("--output requires a directory argument");
  });

  it("parses the version flag in scan and advisories sync modes", () => {
    expect(parseArgs(["--version"])).toEqual({
      command: "scan",
      options: {
        version: true,
        failOn: "critical",
        incompletePolicy: "warn",
        batchSize: "100",
        searchDepth: "4",
        minSeverity: "medium",
      },
    });

    expect(parseArgs(["advisories", "sync", "--version"])).toEqual({
      command: "advisories-sync",
      options: {
        version: true,
        failOn: "critical",
        incompletePolicy: "warn",
        batchSize: "100",
        searchDepth: "4",
        minSeverity: "medium",
      },
    });
  });

  it("throws on unknown options and unexpected extra arguments", () => {
    expect(() => parseArgs(["--wat"])).toThrow("Unknown option: --wat");
    expect(() => parseArgs(["project-a", "project-b"])).toThrow("Unexpected argument: project-b");
    expect(() => parseArgs(["advisories", "sync", "extra"])).toThrow("Unexpected argument: extra");
    expect(() => parseArgs(["advisories", "init", "extra"])).toThrow("Unexpected argument: extra");
  });

  it("parses install-skill command", () => {
    const result = parseArgs(["install-skill"]);
    expect(result.command).toBe("install-skill");
  });

  it("parses install-skill with --help flag", () => {
    const result = parseArgs(["install-skill", "--help"]);
    expect(result.command).toBe("install-skill");
    expect(result.options.help).toBe(true);
  });

  it("throws on unknown option for install-skill", () => {
    expect(() => parseArgs(["install-skill", "--unknown"])).toThrow("Unknown option: --unknown");
  });

  it("throws on unexpected argument for install-skill", () => {
    expect(() => parseArgs(["install-skill", "extra"])).toThrow("Unexpected argument: extra");
  });

  it("sets cdx option when --cdx is passed", () => {
    const result = parseArgs(["--cdx"]);
    expect(result.options.cdx).toBe(true);
  });

  it("throws when --cdx and --report are combined", () => {
    expect(() => parseArgs(["--cdx", "--report"])).toThrow("cannot combine --cdx and --report");
  });

  it("allows --cdx combined with --json and --sarif", () => {
    const result = parseArgs(["--cdx", "--json", "--sarif"]);
    expect(result.options.cdx).toBe(true);
    expect(result.options.json).toBe(true);
    expect(result.options.sarif).toBe(true);
  });

  it("allows --sarif combined with --report for dual CI output", () => {
    const result = parseArgs(["--sarif", "--report", "./cve-report", "--no-open"]);
    expect(result.options.sarif).toBe(true);
    expect(result.options.report).toBe("./cve-report");
    expect(result.options.noOpen).toBe(true);
  });

  it("parses --ratchet flag", () => {
    const { options } = parseArgs([".", "--ratchet"]);
    expect(options.ratchet).toBe(true);
  });

  it("defaults incompletePolicy to warn", () => {
    const { options } = parseArgs([]);
    expect(options.incompletePolicy).toBe("warn");
  });

  it("parses --incomplete-policy warn", () => {
    const { options } = parseArgs([".", "--incomplete-policy", "warn"]);
    expect(options.incompletePolicy).toBe("warn");
  });

  it("parses --incomplete-policy error", () => {
    const { options } = parseArgs([".", "--incomplete-policy", "error"]);
    expect(options.incompletePolicy).toBe("error");
  });

  it("parses --incomplete-policy=error", () => {
    const { options } = parseArgs([".", "--incomplete-policy=error"]);
    expect(options.incompletePolicy).toBe("error");
  });

  it("parses --incomplete-policy=warn", () => {
    const { options } = parseArgs([".", "--incomplete-policy=warn"]);
    expect(options.incompletePolicy).toBe("warn");
  });

  it("throws on invalid --incomplete-policy value", () => {
    expect(() => parseArgs([".", "--incomplete-policy", "invalid"]))
      .toThrow("--incomplete-policy must be one of: warn, error");
  });

  it("throws on invalid --incomplete-policy=value", () => {
    expect(() => parseArgs([".", "--incomplete-policy=strict"]))
      .toThrow("--incomplete-policy must be one of: warn, error");
  });
});

describe("severity helpers", () => {
  it("infers severity from score ranges and database fallback", () => {
    expect(inferSeverity({ id: "1", severity: [{ score: "9.8" }] })).toBe("critical");
    expect(inferSeverity({ id: "2", severity: [{ score: "7.5" }] })).toBe("high");
    expect(inferSeverity({ id: "3", severity: [{ score: "5.6" }] })).toBe("medium");
    expect(inferSeverity({ id: "4", severity: [{ score: "2.1" }] })).toBe("low");
    expect(inferSeverity({ id: "5", severity: [{ score: "0.0" }] })).toBe("none");
    expect(inferSeverity({ id: "6", database_specific: { severity: "HIGH" } })).toBe("high");
    expect(inferSeverity({ id: "7" })).toBe("unknown");
  });

  it("maps OSV MODERATE label to medium", () => {
    // OSV uses "MODERATE" where our severity label is "medium".
    expect(inferSeverity({ id: "got", database_specific: { severity: "MODERATE" } })).toBe("medium");
    expect(inferSeverity({ id: "got-lower", database_specific: { severity: "moderate" } })).toBe("medium");
    // Combined: CVSS vector falls through to MODERATE db label → medium
    expect(
      inferSeverity({
        id: "got-vector",
        severity: [{ score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L" }],
        database_specific: { severity: "MODERATE" },
      }),
    ).toBe("medium");
  });

  it("falls through to database_specific when score is a CVSS vector string", () => {
    // OSV returns CVSS vector strings in severity[].score (e.g. "CVSS:3.1/AV:N/...").
    // The version number in the prefix (3.1) must not be mistaken for a base score.
    expect(
      inferSeverity({
        id: "crypto-js",
        severity: [{ score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N" }],
        database_specific: { severity: "CRITICAL" },
      }),
    ).toBe("critical");
    expect(
      inferSeverity({
        id: "braces",
        severity: [{ score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H" }],
        database_specific: { severity: "HIGH" },
      }),
    ).toBe("high");
    expect(
      inferSeverity({
        id: "vector-only-no-db",
        severity: [{ score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
      }),
    ).toBe("unknown");
  });

  it("returns the highest severity across multiple vulnerabilities", () => {
    expect(
      maxSeverity([
        { id: "1", severity: [{ score: "3.0" }] },
        { id: "2", severity: [{ score: "9.1" }] },
        { id: "3", database_specific: { severity: "medium" } },
      ]),
    ).toBe("critical");
  });

  it("normalizes valid labels and falls back invalid ones to critical", () => {
    expect(normalizeSeverity("HIGH")).toBe("high");
    expect(normalizeSeverity("unknown")).toBe("unknown");
    expect(normalizeSeverity("not-a-level")).toBe("critical");
  });
});

describe("version helpers", () => {
  it("recognizes supported exact versions", () => {
    expect(looksLikeVersion("1.2.3")).toBe(true);
    expect(looksLikeVersion("1.2.3-beta")).toBe(true);
    expect(looksLikeVersion("1.2")).toBe(false);
    expect(looksLikeVersion("^1.2.3")).toBe(false);
  });

  it("detects breaking upgrades, including 0.x cross-minor bumps", () => {
    expect(isBreakingUpgrade("8.5.1", "9.0.0")).toBe(true);   // major bump 8 to 9
    expect(isBreakingUpgrade("3.6.2", "4.17.21")).toBe(true); // major bump 3 to 4
    expect(isBreakingUpgrade("5.8.4", "5.8.5")).toBe(false);  // patch only
    expect(isBreakingUpgrade("1.2.3", "1.3.0")).toBe(false);  // 1.x minor only, non-breaking
    expect(isBreakingUpgrade("1.0.0", "1.0.0")).toBe(false);  // same
    expect(isBreakingUpgrade("not-a-ver", "9.0.0")).toBe(false); // unparseable from
    expect(isBreakingUpgrade("8.0.0", "not-a-ver")).toBe(false); // unparseable to
    // 0.x: semver treats the minor as the breaking position.
    expect(isBreakingUpgrade("0.21.1", "0.33.0")).toBe(true);  // 0.x cross-minor, breaking
    expect(isBreakingUpgrade("0.21.1", "0.21.5")).toBe(false); // 0.x patch only, non-breaking
    expect(isBreakingUpgrade("0.5.0", "1.0.0")).toBe(true);    // 0.x to 1.x major
  });

  it("detects pre-release versions", () => {
    expect(isPreReleaseVersion("22.0.0-next.0")).toBe(true);
    expect(isPreReleaseVersion("1.0.0-beta.1")).toBe(true);
    expect(isPreReleaseVersion("1.0.0-alpha")).toBe(true);
    expect(isPreReleaseVersion("1.0.0-rc.1")).toBe(true);
    expect(isPreReleaseVersion("22.7.0-beta.8")).toBe(true);
    expect(isPreReleaseVersion("1.0.0-0")).toBe(true);
    expect(isPreReleaseVersion("1.0.0-canary.1")).toBe(true);
    expect(isPreReleaseVersion("1.0.0")).toBe(false);
    expect(isPreReleaseVersion("22.0.0")).toBe(false);
    expect(isPreReleaseVersion("4.17.21")).toBe(false);
    expect(isPreReleaseVersion("3.9.2")).toBe(false);
    expect(isPreReleaseVersion("1.0.0-beta GARBAGE")).toBe(false);
    expect(isPreReleaseVersion("1.0.0-")).toBe(false);
  });

  it("compares versions numerically and with suffix segments", () => {
    expect(compareVersions("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3-beta", "1.2.3-alpha")).toBeGreaterThan(0);
  });

  it("ignores build metadata when comparing versions (semver 10)", () => {
    // Build metadata carries no precedence: equal to the bare release.
    expect(compareVersions("1.2.3+build", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3-beta+a", "1.2.3-beta+b")).toBe(0);
  });

  it("ranks a pre-release below its associated release (semver 11.3)", () => {
    expect(compareVersions("1.2.3-beta.1", "1.2.3")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.3-beta.1")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0-rc.1", "2.0.0")).toBeLessThan(0);
  });

  it("compares pre-release identifiers per semver 11.4", () => {
    // Numeric identifiers compare by value, not lexically.
    expect(compareVersions("1.2.3-alpha.2", "1.2.3-alpha.10")).toBeLessThan(0);
    // Numeric identifiers always have lower precedence than alphanumeric ones.
    expect(compareVersions("1.2.3-1", "1.2.3-alpha")).toBeLessThan(0);
    // A longer identifier list outranks a shorter one when the shared prefix is equal.
    expect(compareVersions("1.2.3-beta.1", "1.2.3-beta")).toBeGreaterThan(0);
  });

  it("admits every pre-release character looksLikeVersion accepts (no bug-inversion via the fallback path)", () => {
    // looksLikeVersion accepts any non-'/' suffix after the first '-'; the semver-aware
    // parser must accept the same set, or an underscore (etc.) silently routes both
    // operands to the legacy fallback comparator and reintroduces the ranking-inversion
    // bug this file fixes (see issue #1077 and its adversarial review finding).
    expect(looksLikeVersion("1.2.3-beta_1")).toBe(true);
    expect(compareVersions("1.2.3-beta_1", "1.2.3")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.3-beta_1")).toBeGreaterThan(0);
  });

  it("reports a pre-release install as vulnerable when the fix landed in the release (issue #1077)", () => {
    const introduced = "1.0.0";
    const fixed = "1.2.3";
    const lastAffected: string | null = null;
    const versionMatchesRange = (version: string): boolean => {
      if (introduced !== "0" && compareVersions(version, introduced) < 0) return false;
      if (fixed && compareVersions(version, fixed) >= 0) return false;
      if (lastAffected && compareVersions(version, lastAffected) > 0) return false;
      return true;
    };

    expect(versionMatchesRange("1.2.2")).toBe(true);
    expect(versionMatchesRange("1.2.3-beta.1")).toBe(true);
    expect(versionMatchesRange("1.2.3-rc.2")).toBe(true);
    expect(versionMatchesRange("1.2.3")).toBe(false);
  });

  it("falls back to flat-token comparison when either operand isn't a well-formed version (KTD3)", () => {
    // ">=1.2.3" fails VERSION_SHAPE, so both operands route through the legacy
    // flat-token comparator: tuple [1,2,3,"beta",1] vs [">=1",2,3] disagrees at
    // the first segment (1 vs ">=1"), settled by localeCompare -- exact parity
    // with the pre-fix behavior for malformed input, not a thrown error.
    expect(compareVersions("1.2.3-beta.1", ">=1.2.3")).toBe(1);
    expect(compareVersions("not-a-version", "1.2.3")).toBe(1);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("caches parsed version tuples so identical strings are only parsed once", () => {
    const a = "99.88.77-cache-test-a.10";
    const b = "99.88.77-cache-test-b.2";

    const sizeBefore = getVersionCacheSize();
    compareVersions(a, b);
    const sizeAfterFirst = getVersionCacheSize();
    expect(sizeAfterFirst).toBe(sizeBefore + 2);

    compareVersions(a, b);
    expect(getVersionCacheSize()).toBe(sizeAfterFirst);
  });

  it("parses exact manifest versions and normalizes raw versions", () => {
    expect(parseExactManifestVersion("1.2.3")).toBe("1.2.3");
    expect(parseExactManifestVersion(" npm:1.2.3 ")).toBe("1.2.3");
    expect(parseExactManifestVersion("^1.2.3")).toBeNull();

    expect(normalizeRawVersion("workspace:1.2.3")).toBe("1.2.3");
    expect(normalizeRawVersion("npm:4.5.6")).toBe("4.5.6");
    expect(normalizeRawVersion("../local-package")).toBeNull();
    expect(normalizeRawVersion(42)).toBeNull();
  });
});

describe("file helpers", () => {
  it("safely reads files and returns an empty string for missing paths", () => {
    const tempDir = createTempDir();
    const filePath = path.join(tempDir, "note.txt");
    fs.writeFileSync(filePath, "hello", "utf8");

    try {
      expect(safeReadText(filePath)).toBe("hello");
      expect(safeReadText(path.join(tempDir, "missing.txt"))).toBe("");
    } finally {
      removeDir(tempDir);
    }
  });

  it("returns relative paths when possible and falls back to the file name", () => {
    const rootDir = "/tmp/project";
    expect(relativeOrName(rootDir, "/tmp/project/src/index.ts")).toBe(path.join("src", "index.ts"));
    expect(relativeOrName(rootDir, rootDir)).toBe("project");
  });

  it("finds matching files by depth while skipping excluded directories", () => {
    const tempDir = createTempDir();
    const nestedDir = path.join(tempDir, "packages", "app");
    const gitDir = path.join(tempDir, ".git", "hooks");
    const nodeModulesDir = path.join(tempDir, "node_modules", "left-pad");

    fs.mkdirSync(nestedDir, { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });
    fs.mkdirSync(nodeModulesDir, { recursive: true });

    const rootLock = path.join(tempDir, "package-lock.json");
    const nestedLock = path.join(nestedDir, "yarn.lock");
    const ignoredLock = path.join(nodeModulesDir, "package-lock.json");

    fs.writeFileSync(rootLock, "{}", "utf8");
    fs.writeFileSync(nestedLock, "content", "utf8");
    fs.writeFileSync(ignoredLock, "{}", "utf8");

    try {
      const files = findFiles(tempDir, ["package-lock.json", "yarn.lock"], 3);
      expect(files).toEqual([rootLock, nestedLock]);
    } finally {
      removeDir(tempDir);
    }
  });

  it("finds the nearest package.json and chooses the preferred lockfile", () => {
    const tempDir = createTempDir();
    const nestedDir = path.join(tempDir, "packages", "app");
    fs.mkdirSync(nestedDir, { recursive: true });

    try {
      expect(findNearestPackageJson(tempDir, 3)).toBeNull();

      const nestedPackageJson = path.join(nestedDir, "package.json");
      fs.writeFileSync(nestedPackageJson, "{}", "utf8");
      expect(findNearestPackageJson(tempDir, 3)).toBe(nestedPackageJson);

      const rootPackageJson = path.join(tempDir, "package.json");
      fs.writeFileSync(rootPackageJson, "{}", "utf8");
      expect(findNearestPackageJson(tempDir, 3)).toBe(rootPackageJson);

      expect(
        chooseBestLockfile([
          path.join(tempDir, "packages", "app", "yarn.lock"),
          path.join(tempDir, "pnpm-lock.yaml"),
          path.join(tempDir, "package-lock.json"),
        ]),
      ).toBe(path.join(tempDir, "package-lock.json"));
    } finally {
      removeDir(tempDir);
    }
  });
});

describe("runWithConcurrency", () => {
  it("returns results in input order regardless of completion order", async () => {
    const order: number[] = [];
    const results = await runWithConcurrency([30, 10, 20], 3, async (ms) => {
      await new Promise(r => setTimeout(r, ms));
      order.push(ms);
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40]);
    expect(order).toEqual([10, 20, 30]);
  });

  it("runs at most `limit` tasks concurrently", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 10));
      concurrent--;
    });
    expect(maxConcurrent).toBe(2);
  });

  it("handles an empty input array", async () => {
    const results = await runWithConcurrency([], 3, async (x: number) => x);
    expect(results).toEqual([]);
  });

  it("propagates errors from individual tasks", async () => {
    await expect(
      runWithConcurrency([1, 2, 3], 3, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      })
    ).rejects.toThrow("boom");
  });
});
