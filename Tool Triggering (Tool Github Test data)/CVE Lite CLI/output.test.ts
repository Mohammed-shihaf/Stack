import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";
import { getPrimaryParent, getRootDependencies, isUnconfirmedFix } from "../src/utils/finding.js";
import {
  countUniqueAdvisories,
  countProdFindings,
  getRecommendedAction,
  logInfo,
  logWarn,
  printCacheSummary,
  serializeFinding,
  sortFindingsForOutput,
  summarizeNextAction,
  summarizeRisk,
  formatRelLabel,
  formatRootDependencySummary,
  formatHintLines,
  formatFixCommandWithPublishDates,
  formatFixVersionPublishDate,
  formatCooldownWarning,
} from "../src/output/formatters.js";
import { buildSuggestedFixCommandPlan, findSuggestedCommandForFinding } from "../src/remediation/fix-commands.js";
import type { SuggestedFixCommandPlan } from "../src/remediation/fix-commands.js";
import {
  printActionSummary,
  printCompactOutput,
  printFinalStatus,
  printIncompleteDiagnostics,
  printOverrideHint,
  printSuggestedFixCommands,
  printSuggestedFixCommandSkips,
  printSummary,
  printTable,
} from "../src/output/printers.js";
import { chalk, stripAnsi } from "../src/utils/chalk.js";
import { createDebugLogger } from "../src/output/debug.js";
import { createSpinner } from "../src/output/spinner.js";
import type { Finding, OsvVuln, ScanInput } from "../src/types.js";

function createFinding(overrides?: Partial<Finding>): Finding {
  const vuln: OsvVuln = {
    id: "OSV-123",
    aliases: ["CVE-2026-0001"],
    summary: "Prototype pollution",
    severity: [{ score: "9.8" }],
  };

  return {
    pkg: {
      name: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      paths: [["project", "app", "lodash"]],
    },
    vulnerabilities: [vuln],
    severity: "critical",
    cveAliases: ["CVE-2026-0001"],
    dependencyPaths: [["project", "app", "lodash"]],
    relationship: "transitive",
    firstFixedVersion: "4.17.21",
    recommendedParentUpgrade: {
      package: "app",
      currentVersion: "1.0.0",
      targetVersion: "1.1.0",
      viaPath: ["project", "app", "lodash"],
      vulnerablePackage: "lodash",
      confidence: "verified",
      reason: "app@1.1.0 no longer allows lodash@4.17.20",
    },
    recommendedNpmTransitiveRemediation: undefined,
    ...overrides,
  };
}

function createScanInput(mode: ScanInput["mode"] = "resolved-lockfile"): ScanInput {
  return {
    mode,
    source: mode === "manifest-fallback" ? "package-json" : "package-lock",
    filePath: "/tmp/package-lock.json",
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

function createScanInputForSource(source: ScanInput["source"]): ScanInput {
  return {
    mode: "resolved-lockfile",
    source,
    filePath:
      source === "package-lock"
        ? "/tmp/package-lock.json"
        : source === "pnpm-lock"
          ? "/tmp/pnpm-lock.yaml"
          : source === "yarn-lock"
            ? "/tmp/yarn.lock"
            : null,
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

function captureLogs(run: () => void): string[] {
  const logs: string[] = [];
  const spy = jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(arg => String(arg)).join(" "));
  });

  try {
    run();
  } finally {
    spy.mockRestore();
  }

  return logs.map(line => stripAnsi(line));
}

function captureErrors(run: () => void): string[] {
  const logs: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(arg => String(arg)).join(" "));
  });

  try {
    run();
  } finally {
    spy.mockRestore();
  }

  return logs;
}

describe("output formatters", () => {
  it("announces debug log file path to stderr when enabled", () => {
    const disabledLines = captureErrors(() => {
      const debug = createDebugLogger(false);
      debug.log("should not print");
      debug.announcePath();
    });

    const appendSpy = jest.spyOn(fs, "appendFileSync").mockImplementation(() => undefined);
    try {
      const enabledLines = captureErrors(() => {
        const debug = createDebugLogger(true);
        debug.log("cache hit");
        debug.log("request", { url: "https://api.osv.dev/v1/querybatch" });
        debug.announcePath();
      });

      expect(disabledLines).toEqual([]);
      expect(enabledLines[0]).toContain("[debug] Writing debug log to ./cve-lite-debug-");
      expect(appendSpy).toHaveBeenCalled();
    } finally {
      appendSpy.mockRestore();
      for (const entry of fs.readdirSync(process.cwd())) {
        if (entry.startsWith("cve-lite-debug-") && entry.endsWith(".log")) {
          fs.unlinkSync(path.join(process.cwd(), entry));
        }
      }
    }
  });

  it("close is callable for enabled and disabled debug sessions", () => {
    expect(createDebugLogger(false).close()).toBeUndefined();
    expect(createDebugLogger(true).close()).toBeUndefined();
  });

  it("formats empty hint lines as empty output", () => {
    expect(formatHintLines([])).toEqual([]);
  });

  it("formats the first hint line before gray detail lines", () => {
    const lines = formatHintLines(["Hint: retry later", "Run: cve-lite . --offline"]);

    expect(lines.map(line => stripAnsi(line))).toEqual([
      "Hint: retry later",
      "Run: cve-lite . --offline",
    ]);
    expect(lines[0]).toContain("Hint: retry later");
    expect(lines[1]).toContain("Run: cve-lite . --offline");
  });

  it("getPrimaryParent returns null for paths shorter than 3 nodes", () => {
    const shortPath = createFinding({
      dependencyPaths: [["project", "lodash"]],
    });
    expect(getPrimaryParent(shortPath)).toBeNull();
  });

  it("getPrimaryParent returns null for empty paths", () => {
    const noPath = createFinding({ dependencyPaths: [] });
    expect(getPrimaryParent(noPath)).toBeNull();
  });

  it("distinguishes an unconfirmed direct fix from an unset fix", () => {
    expect(isUnconfirmedFix(createFinding({
      relationship: "direct",
      validatedFirstFixedVersion: null,
      fixVersionValidationNote: "Safety could not be confirmed.",
    }))).toBe(true);
    expect(isUnconfirmedFix(createFinding({
      relationship: "direct",
      validatedFirstFixedVersion: null,
      fixVersionValidationNote: null,
    }))).toBe(false);
  });

  it("getRootDependencies returns the unique root dependency for a single path", () => {
    const finding = createFinding({ dependencyPaths: [["project", "app", "lodash"]] });
    expect(getRootDependencies(finding)).toEqual(["app"]);
  });

  it("getRootDependencies returns unique roots in first-seen order across multiple paths", () => {
    const finding = createFinding({
      dependencyPaths: [
        ["project", "express", "app", "lodash"],
        ["project", "koa", "lodash"],
        ["project", "express", "other", "lodash"],
      ],
    });
    expect(getRootDependencies(finding)).toEqual(["express", "koa"]);
  });

  it("getRootDependencies excludes degenerate (direct-dependency) paths", () => {
    const finding = createFinding({ dependencyPaths: [["project", "lodash"]] });
    expect(getRootDependencies(finding)).toEqual([]);
  });

  it("getRootDependencies returns no roots when the package is classified direct, even if a transitive path also resolves to it", () => {
    // Same resolved version reachable both as a direct dependency and via
    // another root's chain (e.g. commander pinned directly, but also a dep of
    // express) dedupes into one PackageRef with both paths attached.
    // classifyRelationship marks this "direct", so the root should not
    // contradict that by naming "express" as a root dependency.
    const finding = createFinding({
      relationship: "direct",
      dependencyPaths: [
        ["project", "commander"],
        ["project", "express", "commander"],
      ],
    });
    expect(getRootDependencies(finding)).toEqual([]);
  });

  it("getRootDependencies returns an empty array for empty paths", () => {
    const finding = createFinding({ dependencyPaths: [] });
    expect(getRootDependencies(finding)).toEqual([]);
  });

  it("formatRootDependencySummary shows the name alone for a single root", () => {
    const finding = createFinding({ dependencyPaths: [["project", "app", "lodash"]] });
    expect(formatRootDependencySummary(finding)).toBe("app");
  });

  it("formatRootDependencySummary shows the first root plus a count for multiple roots", () => {
    const finding = createFinding({
      dependencyPaths: [
        ["project", "express", "lodash"],
        ["project", "koa", "lodash"],
        ["project", "fastify", "lodash"],
      ],
    });
    expect(formatRootDependencySummary(finding)).toBe("express +2");
  });

  it("formatRootDependencySummary shows a dash when no root is identifiable", () => {
    const finding = createFinding({ dependencyPaths: [] });
    expect(formatRootDependencySummary(finding)).toBe("-");
  });

  it("formatRootDependencySummary shows a dash for a direct dependency that also has a transitive path", () => {
    const finding = createFinding({
      relationship: "direct",
      dependencyPaths: [
        ["project", "commander"],
        ["project", "express", "commander"],
      ],
    });
    expect(formatRootDependencySummary(finding)).toBe("-");
  });

  it("derives the primary parent and recommendation text from findings", () => {
    const finding = createFinding();

    expect(getPrimaryParent(finding)).toBe("app");
    expect(getRecommendedAction(finding)).toContain("Upgrade app from 1.0.0 to 1.1.0");
    expect(summarizeRisk(finding)).toContain("specific parent upgrade target");
    expect(summarizeNextAction(finding)).toBe("Upgrade app 1.0.0 -> 1.1.0.");
  });

  it("serializes findings with inferred vulnerability severity", () => {
    const finding = createFinding();
    const serialized = serializeFinding(finding);

    expect(serialized).toMatchObject({
      package: "lodash",
      version: "4.17.20",
      severity: "critical",
      relationship: "transitive",
      firstFixedVersion: "4.17.21",
      primaryParent: "app",
      rootDependencies: ["app"],
      cves: ["CVE-2026-0001"],
    });
    expect(serialized.vulnerabilities[0]).toMatchObject({
      id: "OSV-123",
      severity: "critical",
    });
    expect(serialized).not.toHaveProperty("riskSummary");
    expect(serialized).not.toHaveProperty("nextAction");
  });

  it("includes cvssScore in serialized vulnerability when CVSS severity entry is present", () => {
    const finding = createFinding({
      vulnerabilities: [{
        id: "OSV-123",
        aliases: ["CVE-2026-0001"],
        summary: "Prototype pollution",
        severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
      }],
    });
    const serialized = serializeFinding(finding);

    expect(serialized.vulnerabilities[0]?.cvssScore).toBe("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
  });

  it("sets cvssScore to null in serialized vulnerability when no CVSS severity entry is present", () => {
    const finding = createFinding({
      vulnerabilities: [{
        id: "OSV-123",
        aliases: ["CVE-2026-0001"],
        summary: "Prototype pollution",
        severity: [{ score: "9.8" }],
      }],
    });
    const serialized = serializeFinding(finding);

    expect(serialized.vulnerabilities[0]?.cvssScore).toBeNull();
  });

  it("serializes unresolved advisory IDs", () => {
    const finding = createFinding({ unresolvedAdvisoryIds: ["OSV-MISSING"] });

    expect(serializeFinding(finding).unresolvedAdvisoryIds).toEqual(["OSV-MISSING"]);
  });

  it("sets prioritySignal to null when no EPSS scores", () => {
    const finding = createFinding({ epssScores: null });
    expect(serializeFinding(finding).prioritySignal).toBeNull();
  });

  it("sets prioritySignal to fix_now for critical severity with high EPSS percentile", () => {
    const finding = createFinding({
      severity: "critical",
      epssScores: [{ cve: "CVE-2026-0001", epss: 0.009, percentile: 0.96 }],
    });
    expect(serializeFinding(finding).prioritySignal).toBe("fix_now");
  });

  it("sets prioritySignal to fix_soon for critical severity with low EPSS percentile", () => {
    const finding = createFinding({
      severity: "critical",
      epssScores: [{ cve: "CVE-2026-0001", epss: 0.001, percentile: 0.50 }],
    });
    expect(serializeFinding(finding).prioritySignal).toBe("fix_soon");
  });

  it("sets prioritySignal to monitor for medium severity with high EPSS percentile", () => {
    const finding = createFinding({
      severity: "medium",
      epssScores: [{ cve: "CVE-2026-0001", epss: 0.005, percentile: 0.93 }],
    });
    expect(serializeFinding(finding).prioritySignal).toBe("monitor");
  });

  it("includes contextualSignals with heuristic labels and null usage without --usage", () => {
    const serialized = serializeFinding(createFinding());

    expect(serialized.contextualSignals.usage).toBeNull();
    expect(serialized.contextualSignals.reachabilityHint).toEqual({
      value: "path_depth_2",
      heuristic: true,
      basis: expect.stringMatching(/heuristic prioritization hint/i),
    });
    expect(serialized.contextualSignals.exposure).toEqual({
      value: "not_indicated",
      heuristic: true,
      basis: expect.stringMatching(/heuristic path-name indicator/i),
    });
    expect(JSON.stringify(serialized.contextualSignals).toLowerCase()).not.toMatch(
      /exploitable|reachable at runtime|safe because unused/,
    );
  });

  it("serializes usage and exposure contextualSignals when data is present", () => {
    const serialized = serializeFinding(createFinding({
      pkg: { name: "body-parser", version: "1.20.0", ecosystem: "npm" },
      relationship: "direct",
      dependencyPaths: [["project", "express", "body-parser"]],
      usage: { imported: true, files: ["src/app.ts"] },
    }));

    expect(serialized.contextualSignals.usage).toMatchObject({
      value: "imported",
      heuristic: true,
    });
    expect(serialized.contextualSignals.reachabilityHint).toMatchObject({
      value: "direct_dependency",
      heuristic: true,
    });
    expect(serialized.contextualSignals.exposure).toMatchObject({
      value: "request_facing_path",
      heuristic: true,
    });
    expect(serialized.contextualSignals.exposure!.basis).toMatch(/express/);
  });

  it("serializes not_imported usage when the usage scan found nothing", () => {
    const serialized = serializeFinding(createFinding({
      usage: { imported: false, files: [] },
    }));

    expect(serialized.contextualSignals.usage).toMatchObject({
      value: "not_imported",
      heuristic: true,
    });
    expect(serialized.contextualSignals.usage!.basis.toLowerCase()).toMatch(/not proof of non-exploitability/);
  });

  it("includes dev:true in serialized finding when pkg.dev is true", () => {
    const finding = createFinding({
      pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", dev: true },
    });
    const serialized = serializeFinding(finding);

    expect(serialized.dev).toBe(true);
  });

  it("includes dev:false in serialized finding when pkg.dev is false", () => {
    const finding = createFinding({
      pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", dev: false },
    });
    const serialized = serializeFinding(finding);

    expect(serialized.dev).toBe(false);
  });

  it("includes dev:false in serialized finding when pkg.dev is undefined", () => {
    const finding = createFinding({
      pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    });
    const serialized = serializeFinding(finding);

    expect(serialized.dev).toBe(false);
  });

  it("sorts findings by severity and then package name", () => {
    const findings = [
      createFinding({ pkg: { name: "zlib", version: "1.0.0", ecosystem: "npm" }, severity: "medium" }),
      createFinding({ pkg: { name: "axios", version: "1.0.0", ecosystem: "npm" }, severity: "medium" }),
      createFinding({ pkg: { name: "chalk", version: "1.0.0", ecosystem: "npm" }, severity: "high" }),
    ];

    const sorted = sortFindingsForOutput(findings);
    expect(sorted.map(item => `${item.severity}:${item.pkg.name}`)).toEqual([
      "high:chalk",
      "medium:axios",
      "medium:zlib",
    ]);
  });

  it("prints cache and info/warn lines when output is not json", () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-output-cache-"));
    fs.writeFileSync(
      path.join(cacheDir, "osv-vulns.json"),
      JSON.stringify({
        version: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        entries: { "OSV-123": { id: "OSV-123" }, "OSV-404": null },
        queryEntries: { "npm:lodash@4.17.20": ["OSV-123"] },
      }),
      "utf8",
    );

    try {
      const lines = captureLogs(() => {
        printCacheSummary(cacheDir);
        logInfo("hello");
        logWarn("careful");
      });

      expect(lines[0]).toContain("Cache: 1 package match record, 1 advisory detail record, 1 empty lookup");
      expect(lines[1]).toBe("hello");
      expect(lines[2]).toBe("careful");
    } finally {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("suppresses logInfo, logWarn, and printCacheSummary when json: true", () => {
    const logs = captureLogs(() => {
      logInfo("should not appear", { json: true });
      logWarn("should not appear either", { json: true });
      printCacheSummary(undefined, { json: true });
    });
    expect(logs).toHaveLength(0);
  });

  it("builds a package-manager-aware fix command plan for urgent findings", () => {
    const findings = [
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "critical",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", paths: [["project", "app", "lodash"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "app", "lodash"]],
        severity: "high",
        recommendedParentUpgrade: {
          package: "app",
          currentVersion: "1.0.0",
          targetVersion: "1.1.0",
          viaPath: ["project", "app", "lodash"],
          vulnerablePackage: "lodash",
          confidence: "verified",
          reason: "app@1.1.0 no longer allows lodash@4.17.20",
        },
      }),
      createFinding({
        pkg: { name: "marsdb", version: "0.6.11", ecosystem: "npm", paths: [["project", "marsdb"]] },
        relationship: "direct",
        dependencyPaths: [["project", "marsdb"]],
        severity: "critical",
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const npmPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));
    const pnpmPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("pnpm-lock"));
    const yarnPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("yarn-lock"));
    const bunPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("bun-lock"));

    expect(npmPlan?.command).toBe("npm install minimist@1.2.8 app@1.1.0");
    expect(pnpmPlan?.command).toBe("pnpm add minimist@1.2.8 app@1.1.0");
    expect(yarnPlan?.command).toBe("yarn add minimist@1.2.8 app@1.1.0");
    expect(bunPlan?.command).toBe("bun add minimist@1.2.8 app@1.1.0");
    expect(npmPlan?.sections).toEqual([
      expect.objectContaining({
        key: "urgent:critical",
        severity: "critical",
        command: "npm install minimist@1.2.8",
      }),
      expect.objectContaining({
        key: "urgent:high",
        severity: "high",
        command: "npm install app@1.1.0",
      }),
    ]);
    expect(npmPlan?.skipped).toEqual([
      expect.objectContaining({
        package: "marsdb",
        reason: "No safe upgrade target is known for this urgent direct dependency.",
      }),
    ]);
  });

  it("includes additional direct and parent upgrade commands beyond urgent findings", () => {
    const findings = [
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "high",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "tar", version: "6.2.1", ecosystem: "npm", paths: [["project", "tar"]] },
        relationship: "direct",
        dependencyPaths: [["project", "tar"]],
        severity: "medium",
        firstFixedVersion: "7.5.3",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "diff", version: "2.2.3", ecosystem: "npm", paths: [["project", "gulp-diff", "diff"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "gulp-diff", "diff"]],
        severity: "medium",
        firstFixedVersion: "3.5.0",
        recommendedParentUpgrade: {
          package: "gulp-diff",
          currentVersion: "5.2.1",
          targetVersion: "6.0.0",
          viaPath: ["project", "gulp-diff", "diff"],
          vulnerablePackage: "diff",
          confidence: "verified",
          reason: "gulp-diff@6.0.0 no longer pulls vulnerable diff",
        },
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([
      expect.objectContaining({
        key: "urgent:high",
        title: "High severity direct fixes",
        command: "npm install minimist@1.2.8",
      }),
      expect.objectContaining({
        key: "direct:medium",
        title: "Medium severity direct fixes",
        command: "npm install tar@7.5.3",
      }),
      expect.objectContaining({
        key: "parent-upgrade:medium",
        title: "Medium severity parent upgrades",
        command: "npm install gulp-diff@6.0.0",
      }),
    ]);
  });

  it("builds an npm update command for transitive findings resolvable within the current parent range", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "5.0.0", ecosystem: "npm", paths: [["project", "mocha", "diff"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "mocha", "diff"]],
        severity: "high",
        firstFixedVersion: "5.0.1",
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: {
          kind: "update-parent-within-range",
          package: "mocha",
          currentVersion: "10.0.0",
          targetChildVersion: "5.1.0",
          viaPath: ["project", "mocha", "diff"],
          reason: "mocha@10.0.0 already allows diff@5.1.0 within the current dependency range",
        },
      }),
    ];

    const npmPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));
    const pnpmPlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("pnpm-lock"));

    expect(npmPlan?.command).toBe("npm update mocha");
    expect(npmPlan?.sections).toEqual([
      expect.objectContaining({
        key: "parent-update:high",
        command: "npm update mocha",
        targets: [
          expect.objectContaining({
            package: "mocha",
            currentVersion: "10.0.0",
            targetVersion: "10.0.0",
            childPackage: "diff",
            childTargetVersion: "5.1.0",
            kind: "parent-update",
          }),
        ],
      }),
    ]);
    expect(pnpmPlan?.command).toBe("pnpm update --recursive --no-save diff");
    expect(pnpmPlan?.sections).toEqual([
      expect.objectContaining({
        key: "parent-update:high",
        command: "pnpm update --recursive --no-save diff",
        targets: [
          expect.objectContaining({
            package: "diff",
            currentVersion: "5.0.0",
            targetVersion: "5.1.0",
            kind: "parent-update",
          }),
        ],
      }),
    ]);
    expect(pnpmPlan?.skipped).toEqual([]);
  });

  it("renders the resolved version in the Target column, not a command", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "5.0.0", ecosystem: "npm", paths: [["project", "mocha", "diff"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "mocha", "diff"]],
        severity: "high",
        firstFixedVersion: "5.0.1",
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: {
          kind: "update-parent-within-range",
          package: "mocha",
          currentVersion: "10.0.0",
          targetChildVersion: "5.1.0",
          viaPath: ["project", "mocha", "diff"],
          reason: "mocha@10.0.0 already allows diff@5.1.0 within the current dependency range",
        },
      }),
    ];

    const output = captureLogs(() =>
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock")),
    ).join("\n");

    expect(output).toContain("Target");
    // mocha is not being upgraded; Target is mocha's own version. diff's 5.1.0
    // is the child destination, shown in Context rather than as mocha's Target.
    expect(output).toContain("10.0.0");
    expect(output).toContain("5.1.0");
    // Regression: the column must show the version, never the literal command (issue #989).
    expect(output).not.toContain("npm install");
  });

  it("skips fixed-version hints that are not real upgrades", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "4.0.2", ecosystem: "npm", paths: [["project", "diff"]] },
        relationship: "direct",
        dependencyPaths: [["project", "diff"]],
        severity: "medium",
        firstFixedVersion: "3.5.1",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([]);
    expect(plan?.skipped).toEqual([
      expect.objectContaining({
        package: "diff",
        reason: "Fixed-version hint 3.5.1 is not an upgrade from installed 4.0.2.",
      }),
    ]);
  });

  it("keeps exact published fixed versions in the normal direct section", () => {
    const findings = [
      createFinding({
        pkg: { name: "tar", version: "7.5.4", ecosystem: "npm", paths: [["project", "tar"]] },
        relationship: "direct",
        dependencyPaths: [["project", "tar"]],
        severity: "medium",
        firstFixedVersion: "7.5.7",
        validatedFirstFixedVersion: "7.5.7",
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([
      expect.objectContaining({
        key: "direct:medium",
        title: "Medium severity direct fixes",
        command: "npm install tar@7.5.7",
      }),
    ]);
    expect(plan?.sections.find(section => section.kind === "direct-adjusted")).toBeUndefined();
  });

  it("moves nearest-published fallbacks into the registry-adjusted section with notes", () => {
    const findings = [
      createFinding({
        pkg: { name: "lodash.template", version: "3.6.2", ecosystem: "npm", paths: [["project", "lodash.template"]] },
        relationship: "direct",
        dependencyPaths: [["project", "lodash.template"]],
        severity: "low",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
        fixVersionValidationNote:
          "Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([
      expect.objectContaining({
        key: "direct-adjusted:low",
        title: "Low severity direct fixes (registry-adjusted)",
        command: "npm install lodash.template@4.18.0",
        targets: [
          expect.objectContaining({
            package: "lodash.template",
            targetVersion: "4.18.0",
            adjusted: true,
            adjustmentNote:
              "Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
          }),
        ],
      }),
    ]);
  });

  it("keeps normal direct fixes separate from registry-adjusted fixes", () => {
    const findings = [
      createFinding({
        pkg: { name: "serialize-javascript", version: "7.0.3", ecosystem: "npm", paths: [["project", "serialize-javascript"]] },
        relationship: "direct",
        dependencyPaths: [["project", "serialize-javascript"]],
        severity: "low",
        firstFixedVersion: "7.0.5",
        validatedFirstFixedVersion: "7.0.5",
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "lodash.template", version: "3.6.2", ecosystem: "npm", paths: [["project", "lodash.template"]] },
        relationship: "direct",
        dependencyPaths: [["project", "lodash.template"]],
        severity: "low",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
        fixVersionValidationNote:
          "Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([
      expect.objectContaining({
        key: "direct:low",
        command: "npm install serialize-javascript@7.0.5",
        targets: [
          expect.objectContaining({
            package: "serialize-javascript",
            adjusted: false,
          }),
        ],
      }),
      expect.objectContaining({
        key: "direct-adjusted:low",
        command: "npm install lodash.template@4.18.0",
        targets: [
          expect.objectContaining({
            package: "lodash.template",
            adjusted: true,
          }),
        ],
      }),
    ]);
  });

  it("falls back to firstFixedVersion for direct upgrades in offline mode", () => {
    // In offline mode validateDirectFixTargets does not run, so
    // validatedFirstFixedVersion stays null. The plan must still emit a fix
    // command using the advisory hint instead of dropping the target.
    const findings = [
      createFinding({
        pkg: { name: "@angular/compiler", version: "19.2.19", ecosystem: "npm", paths: [["project", "@angular/compiler"]] },
        relationship: "direct",
        dependencyPaths: [["project", "@angular/compiler"]],
        severity: "high",
        firstFixedVersion: "19.2.20",
        validatedFirstFixedVersion: null,
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const offlinePlan = buildSuggestedFixCommandPlan(
      findings,
      createScanInputForSource("package-lock"),
      { offline: true },
    );

    expect(offlinePlan?.command).toBe("npm install @angular/compiler@19.2.20");
    expect(offlinePlan?.sections).toEqual([
      expect.objectContaining({
        key: "urgent:high",
        command: "npm install @angular/compiler@19.2.20",
        targets: [
          expect.objectContaining({
            package: "@angular/compiler",
            currentVersion: "19.2.19",
            targetVersion: "19.2.20",
            kind: "direct",
          }),
        ],
      }),
    ]);
    expect(offlinePlan?.skipped).toEqual([]);
  });

  it("still skips direct findings in online mode when validation cleared validatedFirstFixedVersion", () => {
    // Online mode treats a null validatedFirstFixedVersion as a confirmed
    // validation failure (no safe target was found on npm), so the finding
    // must be skipped — not pushed back into the plan with the advisory hint.
    const findings = [
      createFinding({
        pkg: { name: "@angular/compiler", version: "19.2.19", ecosystem: "npm", paths: [["project", "@angular/compiler"]] },
        relationship: "direct",
        dependencyPaths: [["project", "@angular/compiler"]],
        severity: "high",
        firstFixedVersion: "19.2.20",
        validatedFirstFixedVersion: null,
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const onlinePlan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(onlinePlan?.sections).toEqual([]);
    expect(onlinePlan?.skipped).toEqual([
      expect.objectContaining({
        package: "@angular/compiler",
        version: "19.2.19",
      }),
    ]);
  });

  it("getRecommendedAction Tier 2: names the parent and is honest about no known safe version", () => {
    const finding = createFinding({
      relationship: "transitive",
      dependencyPaths: [["project", "app", "lodash"]],
      recommendedParentUpgrade: undefined,
      firstFixedVersion: "4.17.21",
    });
    const action = getRecommendedAction(finding);
    expect(action).toContain("Upgrade app");
    expect(action).toContain("no safe version was identified automatically");
    expect(action).toContain("4.17.21");
  });

  it("getRecommendedAction Tier 3: honest message when no parent can be identified", () => {
    const finding = createFinding({
      relationship: "transitive",
      dependencyPaths: [],
      recommendedParentUpgrade: undefined,
      firstFixedVersion: "4.17.21",
    });
    const action = getRecommendedAction(finding);
    expect(action).toContain("No parent dependency was identified for lodash");
    expect(action).toContain("npm ls lodash");
    expect(action).toContain("4.17.21");
    expect(action).not.toContain("Upgrade the parent dependency chain");
  });

  it("summarizeNextAction Tier 2: names the parent when path is available", () => {
    const finding = createFinding({
      relationship: "transitive",
      dependencyPaths: [["project", "app", "lodash"]],
      recommendedParentUpgrade: undefined,
      firstFixedVersion: "4.17.21",
    });
    const summary = summarizeNextAction(finding);
    expect(summary).toContain("Upgrade app");
    expect(summary).toContain("no safe version identified");
    expect(summary).toContain("4.17.21");
  });

  it("summarizeNextAction Tier 3: honest message when no parent can be identified", () => {
    const finding = createFinding({
      relationship: "transitive",
      dependencyPaths: [],
      recommendedParentUpgrade: undefined,
      firstFixedVersion: "4.17.21",
    });
    const summary = summarizeNextAction(finding);
    expect(summary).toContain("No parent identified in the lockfile");
    expect(summary).toContain("npm ls lodash");
    expect(summary).toContain("4.17.21");
    expect(summary).not.toContain("Upgrade the parent dependency chain");
  });

  it("getRecommendedAction prefers the registry-validated target over the raw advisory hint for direct findings (#302)", () => {
    // Online scans validate the advisory hint against the npm registry and may
    // pick a higher version than the hint when intermediate versions are still
    // vulnerable. The recommendation prose must agree with the fix-command
    // table — both should reference the validated target.
    const finding = createFinding({
      pkg: { name: "axios", version: "0.21.1", ecosystem: "npm", paths: [["project", "axios"]] },
      relationship: "direct",
      dependencyPaths: [["project", "axios"]],
      firstFixedVersion: "0.21.2",
      validatedFirstFixedVersion: "0.31.0",
    });
    const action = getRecommendedAction(finding);
    expect(action).toContain("0.31.0");
    expect(action).not.toContain("0.21.2");
  });

  it("summarizeNextAction prefers the registry-validated target over the raw advisory hint for direct findings (#302)", () => {
    const finding = createFinding({
      pkg: { name: "axios", version: "0.21.1", ecosystem: "npm", paths: [["project", "axios"]] },
      relationship: "direct",
      dependencyPaths: [["project", "axios"]],
      firstFixedVersion: "0.21.2",
      validatedFirstFixedVersion: "0.31.0",
    });
    const summary = summarizeNextAction(finding);
    expect(summary).toContain("0.31.0");
    expect(summary).not.toContain("0.21.2");
  });

  it("getRecommendedAction does not claim the path is missing when only a degenerate (length 2) lockfile path is available (#301)", () => {
    // For npm v7+ hoisted layouts, a transitive package can end up at
    // top-level node_modules with a path of [project, vulnerable]. The
    // primary parent isn't identifiable from that path, but the path itself
    // exists. The previous "No dependency path found" wording contradicted
    // the dependency-path section that displayed the same path.
    const finding = createFinding({
      pkg: { name: "micromatch", version: "4.0.5", ecosystem: "npm", paths: [["project", "micromatch"]] },
      relationship: "transitive",
      dependencyPaths: [["project", "micromatch"]],
      recommendedParentUpgrade: undefined,
      firstFixedVersion: "4.0.8",
    });
    const action = getRecommendedAction(finding);
    expect(action).not.toContain("No dependency path found");
    expect(action).toContain("npm ls micromatch");
    expect(action).toContain("4.0.8");
  });

  it("skips Tier 2 transitive finding with parent-aware reason", () => {
    const findings = [
      createFinding({
        pkg: { name: "picomatch", version: "2.2.1", ecosystem: "npm", paths: [["project", "lint-staged", "picomatch"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "lint-staged", "picomatch"]],
        severity: "high",
        firstFixedVersion: "2.3.1",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.skipped).toEqual([
      expect.objectContaining({
        package: "picomatch",
        reason: expect.stringContaining("lint-staged"),
      }),
    ]);
    expect(plan?.skipped[0].reason).toContain("2.3.1");
    expect(plan?.skipped[0].reason).not.toBe("No specific parent upgrade target was found for this transitive issue.");
  });

  it("skips Tier 3 transitive finding with honest no-path reason", () => {
    const findings = [
      createFinding({
        pkg: { name: "picomatch", version: "2.2.1", ecosystem: "npm", paths: [] },
        relationship: "transitive",
        dependencyPaths: [],
        severity: "high",
        firstFixedVersion: "2.3.1",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.skipped).toEqual([
      expect.objectContaining({
        package: "picomatch",
        reason: expect.stringContaining("No dependency path available"),
      }),
    ]);
  });

  describe("dev dependency fix commands", () => {
    function createDirectFinding(name: string, version: string, fixedVersion: string, dev: boolean): Finding {
      return createFinding({
        pkg: { name, version, ecosystem: "npm", dev, paths: [["project", name]] },
        relationship: "direct",
        dependencyPaths: [["project", name]],
        severity: "high",
        firstFixedVersion: fixedVersion,
        validatedFirstFixedVersion: fixedVersion,
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: undefined,
      });
    }

    function scanInputWithPackages(source: "package-lock" | "pnpm-lock" | "yarn-lock" | "bun-lock", packages: { name: string; version: string; dev: boolean }[]): ScanInput {
      return {
        mode: "resolved-lockfile",
        source,
        filePath: source === "package-lock" ? "/tmp/package-lock.json"
          : source === "pnpm-lock" ? "/tmp/pnpm-lock.yaml"
          : source === "yarn-lock" ? "/tmp/yarn.lock"
          : null,
        packages: packages.map(p => ({ name: p.name, version: p.version, ecosystem: "npm", dev: p.dev })),
        notes: [],
        warnings: [],
        skippedDependencies: [],
      };
    }

    it("adds -D to npm install command for a direct dev dependency", () => {
      const findings = [createDirectFinding("jest", "30.3.0", "30.4.0", true)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("npm install -D jest@30.4.0");
    });

    it("does not add -D for a direct prod dependency", () => {
      const findings = [createDirectFinding("lodash", "4.17.20", "4.17.21", false)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [{ name: "lodash", version: "4.17.20", dev: false }]));
      expect(plan?.command).toBe("npm install lodash@4.17.21");
    });

    it("splits mixed dev and prod targets into two commands", () => {
      const findings = [
        createDirectFinding("jest", "30.3.0", "30.4.0", true),
        createDirectFinding("lodash", "4.17.20", "4.17.21", false),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [
        { name: "jest", version: "30.3.0", dev: true },
        { name: "lodash", version: "4.17.20", dev: false },
      ]));
      expect(plan?.command).toBe("npm install lodash@4.17.21 && npm install -D jest@30.4.0");
    });

    it("adds -D for pnpm dev dependency", () => {
      const findings = [createDirectFinding("jest", "30.3.0", "30.4.0", true)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("pnpm-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("pnpm add -D jest@30.4.0");
    });

    it("adds -D for yarn dev dependency", () => {
      const findings = [createDirectFinding("jest", "30.3.0", "30.4.0", true)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("yarn-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("yarn add -D jest@30.4.0");
    });

    it("adds --dev for bun dev dependency", () => {
      const findings = [createDirectFinding("jest", "30.3.0", "30.4.0", true)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("bun-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("bun add --dev jest@30.4.0");
    });

    it("splits mixed dev and prod targets into two commands for pnpm", () => {
      const findings = [
        createDirectFinding("jest", "30.3.0", "30.4.0", true),
        createDirectFinding("lodash", "4.17.20", "4.17.21", false),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("pnpm-lock", [
        { name: "jest", version: "30.3.0", dev: true },
        { name: "lodash", version: "4.17.20", dev: false },
      ]));
      expect(plan?.command).toBe("pnpm add lodash@4.17.21 && pnpm add -D jest@30.4.0");
    });

    it("splits mixed dev and prod targets into two commands for yarn", () => {
      const findings = [
        createDirectFinding("jest", "30.3.0", "30.4.0", true),
        createDirectFinding("lodash", "4.17.20", "4.17.21", false),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("yarn-lock", [
        { name: "jest", version: "30.3.0", dev: true },
        { name: "lodash", version: "4.17.20", dev: false },
      ]));
      expect(plan?.command).toBe("yarn add lodash@4.17.21 && yarn add -D jest@30.4.0");
    });

    it("splits mixed dev and prod targets into two commands for bun", () => {
      const findings = [
        createDirectFinding("jest", "30.3.0", "30.4.0", true),
        createDirectFinding("lodash", "4.17.20", "4.17.21", false),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("bun-lock", [
        { name: "jest", version: "30.3.0", dev: true },
        { name: "lodash", version: "4.17.20", dev: false },
      ]));
      expect(plan?.command).toBe("bun add lodash@4.17.21 && bun add --dev jest@30.4.0");
    });

    it("adds -D for parent upgrade targeting a dev dependency for pnpm", () => {
      const findings = [
        createFinding({
          pkg: { name: "js-yaml", version: "3.14.2", ecosystem: "npm", dev: true, paths: [["project", "jest", "js-yaml"]] },
          relationship: "transitive",
          dependencyPaths: [["project", "jest", "js-yaml"]],
          severity: "medium",
          firstFixedVersion: "4.0.0",
          recommendedParentUpgrade: {
            package: "jest",
            currentVersion: "30.3.0",
            targetVersion: "30.4.0",
            viaPath: ["project", "jest", "js-yaml"],
            vulnerablePackage: "js-yaml",
            confidence: "verified",
            reason: "jest@30.4.0 no longer pulls vulnerable js-yaml",
          },
          recommendedNpmTransitiveRemediation: undefined,
        }),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("pnpm-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("pnpm add -D jest@30.4.0");
    });

    it("adds -D for parent upgrade targeting a dev dependency for yarn", () => {
      const findings = [
        createFinding({
          pkg: { name: "js-yaml", version: "3.14.2", ecosystem: "npm", dev: true, paths: [["project", "jest", "js-yaml"]] },
          relationship: "transitive",
          dependencyPaths: [["project", "jest", "js-yaml"]],
          severity: "medium",
          firstFixedVersion: "4.0.0",
          recommendedParentUpgrade: {
            package: "jest",
            currentVersion: "30.3.0",
            targetVersion: "30.4.0",
            viaPath: ["project", "jest", "js-yaml"],
            vulnerablePackage: "js-yaml",
            confidence: "verified",
            reason: "jest@30.4.0 no longer pulls vulnerable js-yaml",
          },
          recommendedNpmTransitiveRemediation: undefined,
        }),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("yarn-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("yarn add -D jest@30.4.0");
    });

    it("adds --dev for parent upgrade targeting a dev dependency for bun", () => {
      const findings = [
        createFinding({
          pkg: { name: "js-yaml", version: "3.14.2", ecosystem: "npm", dev: true, paths: [["project", "jest", "js-yaml"]] },
          relationship: "transitive",
          dependencyPaths: [["project", "jest", "js-yaml"]],
          severity: "medium",
          firstFixedVersion: "4.0.0",
          recommendedParentUpgrade: {
            package: "jest",
            currentVersion: "30.3.0",
            targetVersion: "30.4.0",
            viaPath: ["project", "jest", "js-yaml"],
            vulnerablePackage: "js-yaml",
            confidence: "verified",
            reason: "jest@30.4.0 no longer pulls vulnerable js-yaml",
          },
          recommendedNpmTransitiveRemediation: undefined,
        }),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("bun-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("bun add --dev jest@30.4.0");
    });

    it("adds -D for parent upgrade targeting a dev dependency", () => {
      const findings = [
        createFinding({
          pkg: { name: "js-yaml", version: "3.14.2", ecosystem: "npm", dev: true, paths: [["project", "jest", "js-yaml"]] },
          relationship: "transitive",
          dependencyPaths: [["project", "jest", "js-yaml"]],
          severity: "medium",
          firstFixedVersion: "4.0.0",
          recommendedParentUpgrade: {
            package: "jest",
            currentVersion: "30.3.0",
            targetVersion: "30.4.0",
            viaPath: ["project", "jest", "js-yaml"],
            vulnerablePackage: "js-yaml",
            confidence: "verified",
            reason: "jest@30.4.0 no longer pulls vulnerable js-yaml",
          },
          recommendedNpmTransitiveRemediation: undefined,
        }),
      ];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      expect(plan?.command).toBe("npm install -D jest@30.4.0");
    });

    it("findSuggestedCommandForFinding returns -D command for dev dependency target", () => {
      const findings = [createDirectFinding("jest", "30.3.0", "30.4.0", true)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [{ name: "jest", version: "30.3.0", dev: true }]));
      const command = findSuggestedCommandForFinding(plan!, findings[0]!);
      expect(command).toBe("npm install -D jest@30.4.0");
    });

    it("findSuggestedCommandForFinding returns command without -D for prod dependency target", () => {
      const findings = [createDirectFinding("lodash", "4.17.20", "4.17.21", false)];
      const plan = buildSuggestedFixCommandPlan(findings, scanInputWithPackages("package-lock", [{ name: "lodash", version: "4.17.20", dev: false }]));
      const command = findSuggestedCommandForFinding(plan!, findings[0]!);
      expect(command).toBe("npm install lodash@4.17.21");
    });
  });

  describe("malicious advisory messages", () => {
    function createMaliciousFinding(overrides?: Partial<Finding>): Finding {
      return createFinding({
        relationship: "direct",
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: undefined,
        vulnerabilities: [{
          id: "MAL-2025-21003",
          aliases: [],
          summary: "Malicious code in fs (npm)",
          severity: [],
        }],
        ...overrides,
      });
    }

    it("getRecommendedAction: direct malicious finding returns remove message", () => {
      const finding = createMaliciousFinding({ relationship: "direct" });
      expect(getRecommendedAction(finding)).toBe(
        "This package has a malicious code advisory. Remove it from your dependencies."
      );
    });

    it("getRecommendedAction: transitive malicious finding returns upgrade/remove parent message", () => {
      const finding = createMaliciousFinding({
        relationship: "transitive",
        dependencyPaths: [["project", "parent", "lodash"]],
      });
      expect(getRecommendedAction(finding)).toBe(
        "This package has a malicious code advisory. Upgrade or remove the parent package that pulls it in."
      );
    });

    it("summarizeNextAction: direct malicious finding returns remove message", () => {
      const finding = createMaliciousFinding({ relationship: "direct" });
      expect(summarizeNextAction(finding)).toBe(
        "This package has a malicious code advisory. Remove it from your dependencies."
      );
    });

    it("summarizeNextAction: transitive malicious finding returns upgrade/remove parent message", () => {
      const finding = createMaliciousFinding({
        relationship: "transitive",
        dependencyPaths: [["project", "parent", "lodash"]],
      });
      expect(summarizeNextAction(finding)).toBe(
        "This package has a malicious code advisory. Upgrade or remove the parent package that pulls it in."
      );
    });

    it("non-MAL advisory is not treated as malicious", () => {
      const finding = createFinding({
        relationship: "direct",
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: undefined,
        vulnerabilities: [{
          id: "GHSA-abc1-2345-6789",
          aliases: [],
          summary: "Some vulnerability",
          severity: [],
        }],
      });
      expect(getRecommendedAction(finding)).toContain("Consider replacing");
    });

    it("getRecommendedAction returns unverifiable message for private registry MAL- finding", () => {
      const finding = createMaliciousFinding({
        pkg: { name: "evil-pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://private.registry.com/evil-pkg-1.0.0.tgz" },
        maliciousUnverifiable: true,
      });
      const action = getRecommendedAction(finding);
      expect(action).toContain("private registry");
      expect(action).toContain("unverifiable");
    });
  });

  it("moves unpublishable fixed-version hints out of runnable commands", () => {
    const findings = [
      createFinding({
        pkg: { name: "request", version: "2.88.2", ecosystem: "npm", paths: [["project", "request"]] },
        relationship: "direct",
        dependencyPaths: [["project", "request"]],
        severity: "low",
        firstFixedVersion: "3.0.0",
        validatedFirstFixedVersion: null,
        fixVersionValidationNote:
          "Advisory fixed-version hint 3.0.0 is not published on npm for request, and no published version >= 3.0.0 was found.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const plan = buildSuggestedFixCommandPlan(findings, createScanInputForSource("package-lock"));

    expect(plan?.sections).toEqual([]);
    expect(plan?.skipped).toEqual([
      expect.objectContaining({
        package: "request",
        reason:
          "Advisory fixed-version hint 3.0.0 is not published on npm for request, and no published version >= 3.0.0 was found.",
      }),
    ]);
  });

  it("keeps an unconfirmed published hint as guidance without a runnable command", () => {
    const note = "Advisory range data for tar is incomplete, so a lowest known non-vulnerable version could not be confirmed.";
    const findings = [createFinding({
      pkg: { name: "tar", version: "2.0.0", ecosystem: "npm", paths: [["project", "tar"]] },
      relationship: "direct",
      dependencyPaths: [["project", "tar"]],
      firstFixedVersion: "2.0.1",
      validatedFirstFixedVersion: null,
      fixVersionValidationNote: note,
      recommendedParentUpgrade: undefined,
    })];

    const scanInput = createScanInputForSource("package-lock");
    const plan = buildSuggestedFixCommandPlan(findings, scanInput);
    expect(plan?.sections).toEqual([]);
    expect(plan?.skipped).toEqual([expect.objectContaining({ package: "tar", reason: note })]);
    expect(serializeFinding(findings[0]!).validatedFirstFixedVersion).toBeNull();
    expect(getRecommendedAction(findings[0]!)).toContain("Verify a safe version");

    const output = captureLogs(() => {
      printSuggestedFixCommands(findings, scanInput);
      printSuggestedFixCommandSkips(findings, scanInput);
    }).join("\n");
    expect(output).not.toContain("npm install tar@2.0.1");
    expect(output).toContain(`tar@2.0.0: ${note}`);
  });
});

describe("output printers", () => {
  it("prints an empty summary for clean manifest fallback scans", () => {
    const lines = captureLogs(() => {
      printSummary([], 2, createScanInput("manifest-fallback"));
    });

    expect(lines).toEqual([
      "✓ No known OSV matches found for manifest fallback packages (2 exact direct dependencies checked)",
    ]);
  });

  it("prints a finding summary and action summary for vulnerable packages", () => {
    const findings = [
      createFinding(),
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "high",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
        vulnerabilities: [{ id: "OSV-456", severity: [{ score: "7.5" }] }],
      }),
    ];

    const lines = captureLogs(() => {
      printSummary(findings, 25, createScanInput());
      printActionSummary(findings);
    });

    expect(lines[0]).toContain("✗ Found 2 packages (2 CVEs) with known OSV matches from package-lock");
    expect(lines.join("\n")).toContain("Quick take");
    expect(lines.join("\n")).toContain("1 vulnerable package looks directly fixable in this project.");
    expect(lines.join("\n")).toContain("1 issue comes through other dependencies.");
  });

  it("counts unique packages not advisory rows in the header", () => {
    const samePkg = { name: "browserslist", version: "4.28.2", ecosystem: "npm" as const, paths: [["project", "browserslist"]] };
    const findings = [
      createFinding({ pkg: samePkg, vulnerabilities: [{ id: "GHSA-73wf-gq98-2v4g", severity: [] }] }),
      createFinding({ pkg: samePkg, vulnerabilities: [{ id: "NPM-1153171", severity: [] }] }),
    ];

    const lines = captureLogs(() => printSummary(findings, 10, createScanInput()));

    expect(lines[0]).toContain("✗ Found 1 package");
  });

  it("keeps plural verbs in the action summary", () => {
    const findings = [
      createFinding({ relationship: "direct" }),
      createFinding({ relationship: "direct" }),
      createFinding(),
      createFinding(),
    ];

    const output = captureLogs(() => printActionSummary(findings)).join("\n");

    expect(output).toContain("2 vulnerable packages look directly fixable in this project.");
    expect(output).toContain("2 issues come through other dependencies.");
  });

  // The findings table decorates each row by hardcoded column index. Adding a
  // column to `headers` without updating that pass silently shifts every cell
  // after it, which the rest of the suite does not notice: a 12-column header
  // with a 10-cell row body passed 1853 tests. This pins the two together.
  it("keeps every findings-table row aligned with its header", () => {
    const findings = [
      createFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
        severity: "high",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
        fixVersionPublishedAt: "2026-03-31T00:00:00.000Z",
      }),
    ];

    const lines = captureLogs(() => {
      printTable(findings, null);
    });

    const pipeRows = lines.flatMap(l => l.split("\n")).filter(l => l.startsWith("│"));
    expect(pipeRows.length).toBeGreaterThan(1);
    const headerCells = (pipeRows[0]!.match(/│/g) ?? []).length;
    for (const row of pipeRows) {
      expect((row.match(/│/g) ?? []).length).toBe(headerCells);
    }

    const output = lines.join("\n");
    expect(output).toContain("Advisory");
    expect(output).toContain("4.17.21");
    expect(output).toContain("4.18.0");
    // The publish date is deliberately not a column here: the cooldown warning
    // surfaces it when it matters, and it stays in JSON, SARIF, CycloneDX and HTML.
    expect(output).not.toContain("Published");
    expect(output).not.toContain("2026-03-31");
  });

  // Advisory ids were a column showing one id plus a "+N" suffix, too narrow to read
  // and too narrow to copy. They stay in --verbose, JSON, SARIF, CycloneDX and HTML.
  it("does not carry an advisory-id column in the findings table", () => {
    const findings = [createFinding()];

    const lines = captureLogs(() => {
      printTable(findings, null);
    });

    const output = stripAnsi(lines.join("\n"));
    const header = output.split("\n").find(line => line.includes("Package"))!;
    expect(header).not.toContain("IDs");
    expect(output).not.toContain("OSV-123");
  });

  // The Type cell used to force a newline before "· dev", which spent a whole extra
  // row on every dev finding: 61 of 68 on examples/nest, 14 of 14 on lint-staged.
  // The marker is unchanged, it just no longer wraps.
  it("keeps a dev finding on one row with the dev marker inline", () => {
    const findings = [
      createFinding({
        pkg: {
          name: "lodash",
          version: "4.17.20",
          ecosystem: "npm",
          dev: true,
          paths: [["project", "app", "lodash"]],
        },
      }),
    ];

    const lines = captureLogs(() => {
      printTable(findings, null);
    });

    const output = stripAnsi(lines.join("\n"));
    expect(output).toContain("transitive · dev");

    const packageRows = output.split("\n").filter(line => line.startsWith("│") && line.includes("lodash"));
    expect(packageRows).toHaveLength(1);
    // A continuation row would carry the marker with an empty Package cell beside it.
    expect(output).not.toMatch(/^│ +│.*· dev/m);
  });

  it("prints a table and final status for findings", () => {
    const findings = [createFinding()];

    const lines = captureLogs(() => {
      printTable(findings, "high");
      printFinalStatus(findings);
    });

    expect(lines.join("\n")).toContain("Vulnerability findings (high+)");
    expect(lines.join("\n")).toContain("Package");
    expect(lines.join("\n")).toContain("lodash");
    expect(lines.join("\n")).toContain("4.17.21");
    // Advisory ids are not a table column. They stay in the verbose blocks and JSON.
    expect(lines.join("\n")).not.toContain("OSV-123");
    expect(lines.join("\n")).toContain("✖ Scan complete. 1 vulnerable package, 1 urgent (1 critical).");
  });

  it("shows ⚠ no fix in the Fixed column when firstFixedVersion is null", () => {
    const finding = createFinding({
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
    });

    const lines = captureLogs(() => {
      printTable([finding], null);
    });

    const output = lines.join("\n");
    expect(output).toContain("⚠ no fix");
  });

  it("shows ⚠ Malicious in the Fixed column for malicious advisory findings", () => {
    const finding = createFinding({
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      vulnerabilities: [{
        id: "MAL-2025-21003",
        aliases: [],
        summary: "Malicious code in fs (npm)",
        severity: [],
      }],
    });

    const lines = captureLogs(() => {
      printTable([finding], null);
    });

    const output = lines.join("\n");
    expect(output).toContain("⚠ Malicious");
    expect(output).not.toContain("⚠ no fix");
  });

  it("prints malicious package legend after table for MAL-* findings", () => {
    const direct = createFinding({
      pkg: { name: "fs", version: "0.0.1-security", ecosystem: "npm", paths: [["project", "fs"]] },
      relationship: "direct",
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      vulnerabilities: [{
        id: "MAL-2025-21003",
        aliases: [],
        summary: "Malicious code in fs (npm)",
        severity: [],
      }],
    });

    const lines = captureLogs(() => {
      printTable([direct], null);
    });

    const output = lines.join("\n");
    expect(output).toContain("⚠ Malicious package advisory:");
    expect(output).toContain("fs@0.0.1-security");
    expect(output).toContain("Remove it from your dependencies immediately.");
  });

  it("prints transitive malicious package legend with parent upgrade message", () => {
    const transitive = createFinding({
      pkg: { name: "bad-pkg", version: "1.0.0", ecosystem: "npm", paths: [["project", "parent", "bad-pkg"]] },
      relationship: "transitive",
      dependencyPaths: [["project", "parent", "bad-pkg"]],
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      vulnerabilities: [{
        id: "MAL-2024-99999",
        aliases: [],
        summary: "Malicious code in bad-pkg",
        severity: [],
      }],
    });

    const lines = captureLogs(() => {
      printTable([transitive], null);
    });

    const output = lines.join("\n");
    expect(output).toContain("⚠ Malicious package advisory:");
    expect(output).toContain("bad-pkg@1.0.0");
    expect(output).toContain("Upgrade or remove the parent package that pulls it in.");
  });

  it("does not print malicious legend when no malicious findings present", () => {
    const finding = createFinding({ firstFixedVersion: "1.2.3" });

    const lines = captureLogs(() => {
      printTable([finding], null);
    });

    const output = lines.join("\n");
    expect(output).not.toContain("⚠ Malicious package advisory:");
  });

  it("prints heuristic prioritization signals after the findings table", () => {
    const finding = createFinding({
      usage: { imported: false, files: [] },
    });

    const lines = captureLogs(() => {
      printTable([finding], null);
    });
    const output = lines.join("\n");

    expect(output).toContain("Prioritization signals (heuristic)");
    expect(output).toContain("Triage hints only");
    expect(output).toContain("lodash@4.17.20");
    expect(output).toContain("usage=not_imported");
    expect(output).toContain("reachability=path_depth_2");
    expect(output).toContain("exposure=not_indicated");
    expect(output.toLowerCase()).not.toContain("exploitable");
    expect(output.toLowerCase()).not.toContain("reachable at runtime");
  });

  it("prints suggested fix commands for verbose output", () => {
    const findings = [
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "critical",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "tar", version: "6.2.1", ecosystem: "npm", paths: [["project", "tar"]] },
        relationship: "direct",
        dependencyPaths: [["project", "tar"]],
        severity: "medium",
        firstFixedVersion: "7.5.3",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "marsdb", version: "0.6.11", ecosystem: "npm", paths: [["project", "marsdb"]] },
        relationship: "direct",
        dependencyPaths: [["project", "marsdb"]],
        severity: "critical",
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });

    expect(lines.join("\n")).toContain("Suggested Fix Commands");
    expect(lines.join("\n")).toContain("2 command groups ready across 2 packages");
    expect(lines.join("\n")).toContain("Critical severity direct fixes");
    expect(lines.join("\n")).toContain("> npm install minimist@1.2.8");
    expect(lines.join("\n")).toContain("npm install minimist@1.2.8");
    expect(lines.join("\n")).toContain("Medium severity direct fixes");
    expect(lines.join("\n")).toContain("npm install tar@7.5.3");
  });

  it("keeps the publish date on the command now that no table has a Published column", () => {
    const findings = [
      createFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", paths: [["project", "lodash"]] },
        relationship: "direct",
        dependencyPaths: [["project", "lodash"]],
        severity: "high",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.17.21",
        fixVersionPublishedAt: "2021-02-20T19:00:00.000Z",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    // Published was briefly a table column. Once it was dropped for width, the date
    // had to go back on the command or verbose output would have shown it nowhere.
    expect(output).not.toContain("Published");
    expect(output).toContain("> npm install lodash@4.17.21");
    expect(output).toContain("(published 2021-02-20)");
    expect(formatFixVersionPublishDate("2021-02-20T19:00:00.000Z")).toBe("2021-02-20");
    expect(
      formatFixCommandWithPublishDates("npm install lodash@4.17.21", [
        {
          package: "lodash",
          targetVersion: "4.17.21",
          kind: "direct",
          urgent: true,
          severity: "high",
          adjusted: false,
          reason: "Direct upgrade target",
          fixVersionPublishedAt: "2021-02-20T19:00:00.000Z",
        },
      ]),
    ).toBe("npm install lodash@4.17.21   (published 2021-02-20)");
  });

  it("appends multiple publish dates to fix command callout for multi-package suffix", () => {
    expect(
      formatFixCommandWithPublishDates("npm install lodash@4.17.21 ms@2.1.3", [
        {
          package: "lodash",
          targetVersion: "4.17.21",
          kind: "direct",
          urgent: true,
          severity: "high",
          adjusted: false,
          reason: "Direct upgrade target",
          fixVersionPublishedAt: "2021-02-20T19:00:00.000Z",
        },
        {
          package: "ms",
          targetVersion: "2.1.3",
          kind: "direct",
          urgent: true,
          severity: "high",
          adjusted: false,
          reason: "Direct upgrade target",
          fixVersionPublishedAt: "2020-05-15T12:00:00.000Z",
        },
      ]),
    ).toBe("npm install lodash@4.17.21 ms@2.1.3   (lodash published 2021-02-20, ms published 2020-05-15)");
  });

  it("prints a parent-upgrade table before the command callout when transitive targets are actionable", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "7.0.0", ecosystem: "npm", paths: [["project", "mocha", "diff"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "mocha", "diff"]],
        severity: "medium",
        firstFixedVersion: "3.5.1",
        recommendedParentUpgrade: {
          package: "mocha",
          currentVersion: "11.7.5",
          targetVersion: "12.0.0-beta-4",
          viaPath: ["project", "mocha", "diff"],
          vulnerablePackage: "diff",
          confidence: "verified",
          reason: "mocha@12.0.0-beta-4 no longer allows diff@7.0.0",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("Medium severity parent upgrades");
    expect(output).toContain("Package");
    expect(output).toContain("Version");
    expect(output).toContain("Target");
    expect(output).toContain("Context");
    expect(output).toContain("mocha");
    expect(output).toContain("11.7.5");
    expect(output).toContain("12.0.0-beta-4");
    expect(output).toContain("Parent upgrade for");
    expect(output).toContain("diff@7.0.0");
    expect(output.indexOf("Context")).toBeLessThan(output.indexOf("> npm install mocha@12.0.0-beta-4"));
  });

  it("prints npm update commands for in-range transitive remediation outcomes", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "5.0.0", ecosystem: "npm", paths: [["project", "mocha", "diff"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "mocha", "diff"]],
        severity: "high",
        firstFixedVersion: "5.0.1",
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: {
          kind: "update-parent-within-range",
          package: "mocha",
          currentVersion: "10.0.0",
          targetChildVersion: "5.1.0",
          viaPath: ["project", "mocha", "diff"],
          reason: "mocha@10.0.0 already allows diff@5.1.0 within the current dependency range",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
      printCompactOutput(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("High severity parent updates within range");
    expect(output).toContain("npm install");
    expect(output).toContain("> npm update mocha");
    expect(output).toContain("npm update mocha");
    expect(output).toContain("already permits");
    expect(output).not.toContain("npm install mocha@5.1.0");
  });

  it("prints registry-adjusted notes before the adjusted command", () => {
    const findings = [
      createFinding({
        pkg: { name: "serialize-javascript", version: "7.0.3", ecosystem: "npm", paths: [["project", "serialize-javascript"]] },
        relationship: "direct",
        dependencyPaths: [["project", "serialize-javascript"]],
        severity: "low",
        firstFixedVersion: "7.0.5",
        validatedFirstFixedVersion: "7.0.5",
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "lodash.template", version: "3.6.2", ecosystem: "npm", paths: [["project", "lodash.template"]] },
        relationship: "direct",
        dependencyPaths: [["project", "lodash.template"]],
        severity: "low",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
        fixVersionValidationNote:
          "Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("Low severity direct fixes");
    expect(output).toContain("> npm install serialize-javascript@7.0.5");
    expect(output).toContain("Low severity direct fixes (registry-adjusted)");
    expect(output).toContain("Package");
    expect(output).toContain("Version");
    expect(output).toContain("Target");
    expect(output).toContain("Scanned");
    expect(output).toContain("vulnerable");
    expect(output).toContain("lodash.template");
    expect(output).toContain("3.6.2");
    expect(output).toContain("4.18.0");
    expect(output).toContain(
      "Note: Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
    );
    expect(output).toContain("> npm install lodash.template@4.18.0");
    expect(output.indexOf("Low severity direct fixes")).toBeLessThan(output.indexOf("Low severity direct fixes (registry-adjusted)"));
    expect(output.indexOf("lodash.template")).toBeLessThan(
      output.indexOf("Note: Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0."),
    );
    expect(output.indexOf("Note: Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.")).toBeLessThan(
      output.indexOf("> npm install lodash.template@4.18.0"),
    );
  });

  it("prints a validation summary for adjusted targets that include candidate-evaluation counts", () => {
    const findings = [
      createFinding({
        pkg: { name: "diff", version: "3.5.1", ecosystem: "npm", paths: [["project", "diff"]] },
        relationship: "direct",
        dependencyPaths: [["project", "diff"]],
        severity: "medium",
        firstFixedVersion: "3.5.1",
        validatedFirstFixedVersion: "4.0.4",
        validatedTargetScannedVersions: 2,
        validatedTargetKnownVulnerableVersions: 1,
        fixVersionValidationNote:
          "Advisory fixed-version hint 3.5.1 is still known vulnerable for diff; scanned 2 package versions above current version (1 still known vulnerable); using lowest known non-vulnerable version 4.0.4.",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "tar", version: "7.5.3", ecosystem: "npm", paths: [["project", "tar"]] },
        relationship: "direct",
        dependencyPaths: [["project", "tar"]],
        severity: "medium",
        firstFixedVersion: "7.5.3",
        validatedFirstFixedVersion: "7.5.11",
        validatedTargetScannedVersions: 22,
        validatedTargetKnownVulnerableVersions: 21,
        fixVersionValidationNote:
          "Advisory fixed-version hint 7.5.3 is still known vulnerable for tar; scanned 22 package versions above current version (21 still known vulnerable); using lowest known non-vulnerable version 7.5.11.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("Package");
    expect(output).toContain("Version");
    expect(output).toContain("Target");
    expect(output).toContain("Scanned");
    expect(output).toContain("vulnerable");
    expect(output).toContain("diff");
    expect(output).toContain("3.5.1");
    expect(output).toContain("4.0.4");
    expect(output).toContain("2");
    expect(output).toContain("1");
    expect(output).toContain("tar");
    expect(output).toContain("7.5.3");
    expect(output).toContain("7.5.11");
    expect(output).toContain("22");
    expect(output).toContain("21");
    expect(output).toContain("Total");
    expect(output).toContain("24");
    expect(output).toContain("22");
    expect(output).not.toContain("Note: Advisory fixed-version hint 3.5.1 is still known vulnerable for diff;");
    expect(output).not.toContain("Note: Advisory fixed-version hint 7.5.3 is still known vulnerable for tar;");
  });

  it("shows Breaking? column with ⚠ for major-version bumps and blank for patch bumps", () => {
    const findings = [
      createFinding({
        pkg: { name: "jsonwebtoken", version: "8.5.1", ecosystem: "npm", paths: [["project", "jsonwebtoken"]] },
        relationship: "direct",
        dependencyPaths: [["project", "jsonwebtoken"]],
        severity: "high",
        firstFixedVersion: "9.0.0",
        validatedFirstFixedVersion: "9.0.0",
        validatedTargetScannedVersions: 1,
        validatedTargetKnownVulnerableVersions: 0,
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "fastify", version: "5.8.4", ecosystem: "npm", paths: [["project", "fastify"]] },
        relationship: "direct",
        dependencyPaths: [["project", "fastify"]],
        severity: "medium",
        firstFixedVersion: "5.8.5",
        validatedFirstFixedVersion: "5.8.5",
        validatedTargetScannedVersions: 1,
        validatedTargetKnownVulnerableVersions: 0,
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    // Breaking? column header is present
    expect(output).toContain("Breaking?");
    // Target version appears without inline annotation
    expect(output).toContain("9.0.0");
    expect(output).not.toContain("9.0.0 (breaking change)");
    // ⚠ icon appears for major-version bump (jsonwebtoken 8→9)
    expect(output).toContain("⚠");
    // Patch bump (fastify 5.8.4→5.8.5) does not trigger the icon
    expect(output).not.toContain("5.8.5 (breaking change)");
    // Column alignment: Package, Current, Advisory, Target, Published, Usage,
    // Scanned, Still vulnerable, Breaking?
    // Derived from the header rather than pinned to a literal. Every column change
    // otherwise means editing this number, and the path of least resistance is to
    // bump it rather than check the table is actually aligned.
    const tableRows = lines.flatMap(l => l.split("\n")).filter(l => l.startsWith("│"));
    expect(tableRows.length).toBeGreaterThan(1);
    const headerPipes = (tableRows[0]!.match(/│/g) ?? []).length;
    for (const row of tableRows) {
      expect((row.match(/│/g) ?? []).length).toBe(headerPipes);
    }
  });

  it("renders the validation table for urgent (high/critical) direct fix sections", () => {
    // Before the fix, urgent sections skipped the table because the printer only
    // checked for kind === "direct". After reclassifying CVSS vectors, direct
    // deps like jsonwebtoken jump from low → high (urgent) and must still show
    // Package/Current/Advisory/Target/Published/Usage/Scanned/Still vulnerable/Breaking?.
    const findings = [
      createFinding({
        pkg: { name: "jsonwebtoken", version: "8.5.1", ecosystem: "npm", paths: [["project", "jsonwebtoken"]] },
        relationship: "direct",
        dependencyPaths: [["project", "jsonwebtoken"]],
        severity: "high",
        firstFixedVersion: "9.0.0",
        validatedFirstFixedVersion: "9.0.0",
        validatedTargetScannedVersions: 1,
        validatedTargetKnownVulnerableVersions: 0,
        fixVersionValidationNote: null,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("High severity direct fixes");
    expect(output).toContain("Package");
    expect(output).toContain("Target");
    expect(output).toContain("Scanned");
    expect(output).toContain("jsonwebtoken");
    expect(output).toContain("9.0.0");
    // Table must appear before the command callout
    expect(output.indexOf("Target")).toBeLessThan(output.indexOf("> npm install jsonwebtoken@9.0.0"));
  });

  it("excludes transitive skips from the no-auto-fix section and only shows direct ones", () => {
    // Transitive findings without a parent upgrade path are already covered by
    // printFixPlan step 2, so repeating them in "no auto-fix" creates duplication.
    // Only direct deps with no confident fix command should appear there.
    const findings = [
      createFinding({
        pkg: { name: "marsdb", version: "0.6.11", ecosystem: "npm", paths: [["project", "marsdb"]] },
        relationship: "direct",
        dependencyPaths: [["project", "marsdb"]],
        severity: "critical",
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "braces", version: "2.3.2", ecosystem: "npm", paths: [["project", "check-dependencies", "braces"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "check-dependencies", "braces"]],
        severity: "high",
        firstFixedVersion: "3.0.3",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommandSkips(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("No auto-fix command available for these direct dependencies:");
    expect(output).toContain("marsdb@0.6.11");
    // transitive must not appear in this section
    expect(output).not.toContain("braces@2.3.2");
  });

  it("prints unpublishable fixed-version hints separately from runnable commands", () => {
    const findings = [
      createFinding({
        pkg: { name: "request", version: "2.88.2", ecosystem: "npm", paths: [["project", "request"]] },
        relationship: "direct",
        dependencyPaths: [["project", "request"]],
        severity: "low",
        firstFixedVersion: "3.0.0",
        validatedFirstFixedVersion: null,
        fixVersionValidationNote:
          "Advisory fixed-version hint 3.0.0 is not published on npm for request, and no published version >= 3.0.0 was found.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
      printSuggestedFixCommandSkips(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).not.toContain("Copy And Run These Fix Commands");
    expect(output).toContain("Unpublishable fixed-version hints:");
    expect(output).toContain(
      "request@2.88.2: Advisory fixed-version hint 3.0.0 is not published on npm for request, and no published version >= 3.0.0 was found.",
    );
  });

  it("renders a severity table in printSummary when findings exist", () => {
    const findings = [
      createFinding({ severity: "critical" }),
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm" },
        severity: "high",
      }),
      createFinding({
        pkg: { name: "tar", version: "6.0.0", ecosystem: "npm" },
        severity: "high",
      }),
    ];

    const lines = captureLogs(() => {
      printSummary(findings, 10, createScanInput());
    });
    const output = lines.join("\n");

    expect(output).toContain("┌");
    expect(output).toContain("Critical");
    expect(output).toContain("High");
    expect(output).toContain("Medium");
    expect(output).toContain("Low");
    expect(output).toContain("Unknown");
    // flat "critical: 1" format must not appear
    expect(output).not.toMatch(/critical:\s*1/);
  });

  it("drops the threshold suffix and the --all tip when printTable threshold is null", () => {
    const findings = [createFinding()];

    const linesWithThreshold = captureLogs(() => {
      printTable(findings, "medium");
    });
    const linesWithNull = captureLogs(() => {
      printTable(findings, null);
    });

    // Filtered, the title carries the threshold and a tip offers --all. Unfiltered,
    // the title stands alone: the threshold suffix and the tip both disappear.
    expect(linesWithThreshold.join("\n")).toContain("Vulnerability findings (medium+)");
    expect(linesWithThreshold.join("\n")).toContain("Use --all to show every finding.");
    expect(linesWithThreshold.join("\n")).toContain("Tip: use --all to include low findings");
    expect(linesWithNull.join("\n")).toContain("Vulnerability findings");
    expect(linesWithNull.join("\n")).not.toContain("(medium+)");
    expect(linesWithNull.join("\n")).not.toContain("Use --all to show every finding.");
    expect(linesWithNull.join("\n")).not.toContain("Tip: use --all to include low findings");
  });

  it("shows the full findings table in compact output when all option is true", () => {
    const findings = [
      createFinding({ severity: "critical" }),
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm" },
        severity: "low",
        relationship: "direct",
      }),
    ];

    const linesAll = captureLogs(() => {
      printCompactOutput(findings, createScanInputForSource("package-lock"), { all: true });
    });
    const linesDefault = captureLogs(() => {
      printCompactOutput(findings, createScanInputForSource("package-lock"));
    });
    const outputAll = linesAll.join("\n");
    const outputDefault = linesDefault.join("\n");

    // --all: table present, tip suppressed, --verbose hint suppressed
    expect(outputAll).toContain("Package");
    expect(outputAll).toContain("Severity");
    expect(outputAll).toContain("lodash");
    expect(outputAll).toContain("minimist");
    expect(outputAll).not.toContain("Tip: use --all to include low findings");
    expect(outputAll).not.toContain("Run with --verbose");

    // default: no table, --verbose hint shown
    expect(outputDefault).not.toContain("│ Package");
    expect(outputDefault).toContain("Run with --verbose for fix plan");
  });

  it("shows malicious advisory inline hint and legend in compact output", () => {
    const finding = createFinding({
      pkg: { name: "fs", version: "0.0.1-security", ecosystem: "npm", paths: [["project", "fs"]] },
      severity: "unknown",
      relationship: "direct",
      dependencyPaths: [["project", "fs"]],
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      recommendedNpmTransitiveRemediation: undefined,
      vulnerabilities: [{ id: "MAL-2025-21003", aliases: [], summary: "Malicious code in fs (npm)", severity: [] }],
    });
    const lines = captureLogs(() => {
      printCompactOutput([finding], createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");
    expect(output).toContain("fs");
    expect(output).toContain("UNKNOWN");
    expect(output).toContain("⚠ Malicious: Remove this package from your dependencies immediately.");
    expect(output).toContain("⚠ Malicious package advisory:");
    expect(output).toContain("fs@0.0.1-security - Remove it from your dependencies immediately.");
  });

  it("prints heuristic prioritization signals on compact finding lines", () => {
    const finding = createFinding({
      pkg: { name: "express", version: "4.18.2", ecosystem: "npm" },
      relationship: "direct",
      dependencyPaths: [["project", "express"]],
      usage: { imported: true, files: ["src/server.ts"] },
    });
    const lines = captureLogs(() => {
      printCompactOutput([finding], createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");
    expect(output).toContain("Prioritization signals (heuristic): usage=imported; reachability=direct_dependency; exposure=request_facing_path");
    expect(output.toLowerCase()).not.toContain("exploitable");
  });

  it("shows unverifiable inline hint and legend in compact output for private registry MAL- finding", () => {
    const finding = createFinding({
      pkg: { name: "node-ipc", version: "9.2.3", ecosystem: "npm", paths: [["project", "node-ipc"]], resolvedUrl: "https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz" },
      severity: "unknown",
      relationship: "direct",
      dependencyPaths: [["project", "node-ipc"]],
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      recommendedNpmTransitiveRemediation: undefined,
      vulnerabilities: [{ id: "MAL-2026-3744", aliases: [], summary: "Malicious code in node-ipc", severity: [] }],
      maliciousUnverifiable: true,
    });
    const lines = captureLogs(() => {
      printCompactOutput([finding], createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");
    expect(output).toContain("⚠ Unverifiable (private source) - MAL- advisory could not be confirmed for this artifact.");
    expect(output).toContain("node-ipc@9.2.3 - Unverifiable (private source) - verify artifact source manually");
    expect(output).not.toContain("⚠ Malicious: Remove");
    expect(output).not.toContain("Remove it from your dependencies immediately.");
  });

  it("does not show malicious legend in compact output when --all is set (printTable shows it instead)", () => {
    const finding = createFinding({
      pkg: { name: "fs", version: "0.0.1-security", ecosystem: "npm", paths: [["project", "fs"]] },
      severity: "unknown",
      relationship: "direct",
      dependencyPaths: [["project", "fs"]],
      firstFixedVersion: null,
      recommendedParentUpgrade: undefined,
      recommendedNpmTransitiveRemediation: undefined,
      vulnerabilities: [{ id: "MAL-2025-21003", aliases: [], summary: "Malicious code in fs (npm)", severity: [] }],
    });
    const lines = captureLogs(() => {
      printCompactOutput([finding], createScanInputForSource("package-lock"), { all: true });
    });
    const output = lines.join("\n");
    // legend appears exactly once — from printTable, not from the compact legend block
    const legendCount = (output.match(/⚠ Malicious package advisory:/g) ?? []).length;
    expect(legendCount).toBe(1);
  });

  it("prints compact output for urgent findings and a clean final line for empty scans", () => {
    const linesWithFinding = captureLogs(() => {
      printCompactOutput([createFinding()], createScanInputForSource("package-lock"));
    });
    const emptyLines = captureLogs(() => {
      printCompactOutput([], createScanInputForSource("package-lock"));
    });

    expect(linesWithFinding.join("\n")).toContain("📦 Vulnerabilities found");
    expect(linesWithFinding.join("\n")).toContain("🛠  Suggested Fix Commands");
    expect(linesWithFinding.join("\n")).toContain("1 command group ready across 1 package");
    expect(linesWithFinding.join("\n")).toContain("> npm install app@1.1.0");
    expect(linesWithFinding.join("\n")).toContain("npm install app@1.1.0");
    expect(emptyLines).toContain("✔ Scan complete. No known vulnerabilities found.");
  });

  it("keeps direct unknown-severity findings visible in compact output even when urgent slots are full", () => {
    const findings = [
      createFinding({
        pkg: { name: "critical-a", version: "1.0.0", ecosystem: "npm", paths: [["project", "critical-a"]] },
        severity: "critical",
        relationship: "direct",
        dependencyPaths: [["project", "critical-a"]],
      }),
      createFinding({
        pkg: { name: "critical-b", version: "1.0.0", ecosystem: "npm", paths: [["project", "critical-b"]] },
        severity: "critical",
        relationship: "direct",
        dependencyPaths: [["project", "critical-b"]],
      }),
      createFinding({
        pkg: { name: "high-c", version: "1.0.0", ecosystem: "npm", paths: [["project", "high-c"]] },
        severity: "high",
        relationship: "direct",
        dependencyPaths: [["project", "high-c"]],
      }),
      createFinding({
        pkg: { name: "fs", version: "0.0.1-security", ecosystem: "npm", paths: [["project", "fs"]] },
        severity: "unknown",
        relationship: "direct",
        dependencyPaths: [["project", "fs"]],
        firstFixedVersion: null,
        recommendedParentUpgrade: undefined,
        recommendedNpmTransitiveRemediation: undefined,
        vulnerabilities: [{ id: "MAL-2025-21003", aliases: [], summary: "Malicious code in fs (npm)", severity: [] }],
      }),
    ];

    const lines = captureLogs(() => {
      printCompactOutput(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("critical-a@1.0.0");
    expect(output).toContain("critical-b@1.0.0");
    expect(output).toContain("high-c@1.0.0");
    expect(output).toContain("fs@0.0.1-security");
    expect(output).toContain("⚠ Malicious: Remove this package from your dependencies immediately.");
  });

  it("renders Context column for parent-upgrade targets in urgent sections", () => {
    const findings = [
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "critical",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", paths: [["project", "app", "lodash"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "app", "lodash"]],
        severity: "critical",
        firstFixedVersion: "4.17.21",
        recommendedParentUpgrade: {
          package: "app",
          currentVersion: "1.0.0",
          targetVersion: "1.1.0",
          viaPath: ["project", "app", "lodash"],
          vulnerablePackage: "lodash",
          confidence: "verified",
          reason: "app@1.1.0 no longer allows lodash@4.17.20",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("Context");
    expect(output).toContain("Parent upgrade for");
    expect(output).toContain("lodash@4.17.20");
    expect(output).toContain("> npm install minimist@1.2.8 app@1.1.0");
  });

  it("renders Context column for urgent sections containing only parent-upgrade targets", () => {
    const findings = [
      createFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", paths: [["project", "app", "lodash"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "app", "lodash"]],
        severity: "critical",
        firstFixedVersion: "4.17.21",
        recommendedParentUpgrade: {
          package: "app",
          currentVersion: "1.0.0",
          targetVersion: "1.1.0",
          viaPath: ["project", "app", "lodash"],
          vulnerablePackage: "lodash",
          confidence: "verified",
          reason: "app@1.1.0 no longer allows lodash@4.17.20",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("Context");
    expect(output).toContain("Parent upgrade for");
    expect(output).toContain("lodash@4.17.20");
    // "Scanned" and "Breaking?" used to distinguish the direct-fix table from the
    // parent-upgrade one. Both tables now carry the same columns so the sections
    // read as filtered views of the findings table, and Context is the only column
    // unique to a parent upgrade. The direct table's Total row is the other marker.
    expect(output).not.toContain("Total");
    expect(output).toContain("> npm install app@1.1.0");
  });

  it("marks parent-upgrade targets as partial when other known paths remain and wraps the full context", () => {
    const finding = createFinding({
      pkg: {
        name: "picomatch",
        version: "4.0.3",
        ecosystem: "npm",
        paths: [
          ["project", "lint-staged", "picomatch"],
          ["project", "vite", "picomatch"],
        ],
      },
      relationship: "transitive",
      dependencyPaths: [
        ["project", "lint-staged", "picomatch"],
        ["project", "vite", "picomatch"],
      ],
      severity: "high",
      firstFixedVersion: "4.0.4",
      recommendedParentUpgrade: {
        package: "lint-staged",
        currentVersion: "16.4.0",
        targetVersion: "17.0.0",
        viaPath: ["project", "lint-staged", "picomatch"],
        vulnerablePackage: "picomatch",
        confidence: "verified",
        reason: "lint-staged@17.0.0 no longer allows picomatch@4.0.3",
      },
    });

    const plan = buildSuggestedFixCommandPlan([finding], createScanInputForSource("pnpm-lock"));

    expect(plan?.targets[0]).toEqual(
      expect.objectContaining({
        coverage: "partial",
        coveredPaths: [["project", "lint-staged", "picomatch"]],
        remainingPaths: [["project", "vite", "picomatch"]],
        reason:
          "Path-specific parent upgrade for project -> lint-staged -> picomatch (picomatch@4.0.3); run this command, then rescan. 1 other known path may still need separate parent upgrades.",
      }),
    );

    const lines = captureLogs(() => {
      printSuggestedFixCommands([finding], createScanInputForSource("pnpm-lock"));
    });
    const output = lines.join("\n");

    // The Context cell wraps on word boundaries now, so the sentence is present
    // but split across table rows. This test is about the full reason surviving
    // rather than being truncated, so strip the table framing and rejoin before
    // asserting, instead of pinning the assertion to a particular wrap width.
    const contextText = output
      .split("\n")
      .filter(l => l.startsWith("│"))
      .map(l => l.split("│").slice(1, -1).pop() ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    expect(contextText).toContain(
      "Path-specific parent upgrade for project -> lint-staged -> picomatch (picomatch@4.0.3); run this command, then rescan. 1 other known path may still need separate parent upgrades.",
    );
    expect(output).not.toContain("…");
  });

  it("prints compact validation summary when scanned-version metrics are available", () => {
    const lines = captureLogs(() => {
      printCompactOutput(
        [
          createFinding({
            pkg: { name: "tar", version: "7.5.3", ecosystem: "npm", paths: [["project", "tar"]] },
            relationship: "direct",
            dependencyPaths: [["project", "tar"]],
            severity: "medium",
            firstFixedVersion: "7.5.3",
            validatedFirstFixedVersion: "7.5.11",
            validatedTargetScannedVersions: 22,
            validatedTargetKnownVulnerableVersions: 21,
            fixVersionValidationNote:
              "Advisory fixed-version hint 7.5.3 is still known vulnerable for tar; scanned 22 package versions above current version (21 still known vulnerable); using lowest known non-vulnerable version 7.5.11.",
            recommendedParentUpgrade: undefined,
          }),
        ],
        createScanInputForSource("package-lock"),
      );
    });

    const output = lines.join("\n");
    expect(output).toContain("Validation: scanned 22 package versions; 21 are still known vulnerable.");
  });
});

describe("printSummary CVE count", () => {
  it("includes CVE count in the found line", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [
      createFinding({
        vulnerabilities: [
          { id: "OSV-001", aliases: ["CVE-2026-0001"], summary: "A", severity: [] },
          { id: "OSV-002", aliases: ["CVE-2026-0002"], summary: "B", severity: [] },
        ],
      }),
      createFinding({
        pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
        vulnerabilities: [
          { id: "OSV-003", aliases: [], summary: "C", severity: [] },
        ],
      }),
    ];
    printSummary(findings, 100, createScanInput());
    const allOutput = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(allOutput).toContain("2 packages (3 CVEs)");
    consoleSpy.mockRestore();
  });

  it("uses singular package and CVE when counts are 1", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [createFinding()]; // 1 package, 1 CVE (OSV-123)
    printSummary(findings, 100, createScanInput());
    const allOutput = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(allOutput).toContain("1 package (1 CVE)");
    consoleSpy.mockRestore();
  });
});

describe("printActionSummary CVE count", () => {
  it("prints CVEs label instead of unique advisories", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [
      createFinding({
        vulnerabilities: [
          { id: "OSV-001", aliases: [], summary: "A", severity: [] },
          { id: "OSV-002", aliases: [], summary: "B", severity: [] },
        ],
      }),
    ];
    printActionSummary(findings);
    const allOutput = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(allOutput).toContain("2 CVEs matched overall");
    expect(allOutput).not.toContain("unique advisories");
    consoleSpy.mockRestore();
  });
});

describe("printCompactOutput CVE count", () => {
  it("shows packages and CVE count on the count line", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [
      createFinding({
        vulnerabilities: [
          { id: "OSV-001", aliases: [], summary: "A", severity: [] },
          { id: "OSV-002", aliases: [], summary: "B", severity: [] },
        ],
      }),
      createFinding({
        pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
        vulnerabilities: [
          { id: "OSV-003", aliases: [], summary: "C", severity: [] },
        ],
      }),
    ];
    printCompactOutput(findings, createScanInput(), {});
    const allOutput = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(allOutput).toContain("2 packages");
    expect(allOutput).toContain("3 CVEs");
    expect(allOutput.split("\n").find(l => l.includes("3 CVEs")) ?? "").not.toContain("vulnerable packages");
    consoleSpy.mockRestore();
  });
});

describe("countUniqueAdvisories", () => {
  it("returns 0 for empty findings", () => {
    expect(countUniqueAdvisories([])).toBe(0);
  });

  it("counts one advisory for a single-vuln finding", () => {
    const f = createFinding(); // has one vulnerability: OSV-123
    expect(countUniqueAdvisories([f])).toBe(1);
  });

  it("counts multiple advisories on one finding", () => {
    const f = createFinding({
      vulnerabilities: [
        { id: "OSV-001", aliases: ["CVE-2026-0001"], summary: "A", severity: [] },
        { id: "OSV-002", aliases: ["CVE-2026-0002"], summary: "B", severity: [] },
      ],
    });
    expect(countUniqueAdvisories([f])).toBe(2);
  });

  it("deduplicates the same advisory ID appearing in multiple findings", () => {
    const sharedVuln = { id: "OSV-001", aliases: [], summary: "X", severity: [] };
    const f1 = createFinding({ vulnerabilities: [sharedVuln] });
    const f2 = createFinding({
      pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
      vulnerabilities: [sharedVuln],
    });
    expect(countUniqueAdvisories([f1, f2])).toBe(1);
  });

  it("sums distinct advisories across multiple findings", () => {
    const f1 = createFinding({
      vulnerabilities: [
        { id: "OSV-001", aliases: [], summary: "A", severity: [] },
        { id: "OSV-002", aliases: [], summary: "B", severity: [] },
      ],
    });
    const f2 = createFinding({
      pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
      vulnerabilities: [
        { id: "OSV-003", aliases: [], summary: "C", severity: [] },
      ],
    });
    expect(countUniqueAdvisories([f1, f2])).toBe(3);
  });
});

describe("createSpinner", () => {
  let isTTYDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
  });

  afterEach(() => {
    if (isTTYDescriptor) {
      Object.defineProperty(process.stdout, "isTTY", isTTYDescriptor);
    } else {
      Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    }
  });

  it("succeed() prints to stdout when not in json mode", () => {
    const logs = captureLogs(() => {
      const spinner = createSpinner("Loading...");
      spinner.stop();
      spinner.succeed("Done");
    });
    expect(logs.some(l => l.includes("Done"))).toBe(true);
  });

  it("succeed() is suppressed when json: true even in a TTY", () => {
    const logs = captureLogs(() => {
      const spinner = createSpinner("Loading...", { json: true });
      spinner.succeed("Done");
    });
    expect(logs).toHaveLength(0);
  });

  it("fail() is suppressed when json: true", () => {
    const logs = captureLogs(() => {
      const spinner = createSpinner("Loading...", { json: true });
      spinner.fail("Error");
    });
    expect(logs).toHaveLength(0);
  });
});

import { isGitSource, hasCommitShaPinning } from "../src/utils/advisory.js";

describe("isGitSource", () => {
  it("returns true for GitHub codeload URL", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://codeload.github.com/org/repo/tar.gz/abc123" };
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns true for github.com URL", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://github.com/org/repo/archive/abc123.tar.gz" };
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns true for gitlab.com URL", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://gitlab.com/org/repo/-/archive/abc123/repo.tar.gz" };
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns true for git+https protocol", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "git+https://github.com/org/repo.git" };
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns false for npm registry URL", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz" };
    expect(isGitSource(pkg)).toBe(false);
  });

  it("returns false for private npm registry URL", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://npm.internal.example.com/pkg/-/pkg-1.0.0.tgz" };
    expect(isGitSource(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is undefined", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm" };
    expect(isGitSource(pkg)).toBe(false);
  });
});

describe("hasCommitShaPinning", () => {
  it("returns true when URL contains a 40-char hex SHA", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://codeload.github.com/org/repo/tar.gz/9af9b3c49515b85598cd88de3e8cc20c7a98efbb" };
    expect(hasCommitShaPinning(pkg)).toBe(true);
  });

  it("returns false when URL has no SHA (short ref or tag)", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm", resolvedUrl: "https://github.com/org/repo/archive/main.tar.gz" };
    expect(hasCommitShaPinning(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is undefined", () => {
    const pkg = { name: "pkg", version: "1.0.0", ecosystem: "npm" };
    expect(hasCommitShaPinning(pkg)).toBe(false);
  });
});

describe("serializeFinding - git source MAL", () => {
  it("includes maliciousGitSource:true when finding has maliciousGitSource set", () => {
    const finding = createFinding({
      pkg: { name: "node-ipc", version: "9.2.3", ecosystem: "npm", resolvedUrl: "https://codeload.github.com/org/repo/tar.gz/9af9b3c49515b85598cd88de3e8cc20c7a98efbb" },
      vulnerabilities: [{ id: "MAL-2022-1000", summary: "Malicious package", aliases: [], severity: [] }],
    });
    finding.maliciousGitSource = true;
    finding.maliciousGitSourcePinned = true;
    const result = serializeFinding(finding);
    expect(result.maliciousGitSource).toBe(true);
    expect(result.maliciousGitSourcePinned).toBe(true);
  });

  it("includes maliciousGitSource:false when not set", () => {
    const finding = createFinding({
      pkg: { name: "node-ipc", version: "9.2.3", ecosystem: "npm" },
    });
    const result = serializeFinding(finding);
    expect(result.maliciousGitSource).toBe(false);
    expect(result.maliciousGitSourcePinned).toBe(false);
  });
});

describe("formatRelLabel", () => {
  it("returns 'direct' for a prod direct finding", () => {
    const finding = { relationship: "direct", pkg: { name: "axios", version: "0.21.1", ecosystem: "npm", dev: false } };
    expect(formatRelLabel(finding)).toBe("direct");
  });

  it("returns 'direct · dev' for a dev direct finding", () => {
    const finding = { relationship: "direct", pkg: { name: "jest", version: "29.0.0", ecosystem: "npm", dev: true } };
    expect(formatRelLabel(finding)).toBe("direct · dev");
  });

  it("returns 'transitive · dev' for a dev transitive finding", () => {
    const finding = { relationship: "transitive", pkg: { name: "jest-runner", version: "29.0.0", ecosystem: "npm", dev: true } };
    expect(formatRelLabel(finding)).toBe("transitive · dev");
  });

  it("returns 'transitive' when dev is undefined", () => {
    const finding = { relationship: "transitive", pkg: { name: "axios", version: "0.21.1", ecosystem: "npm" } };
    expect(formatRelLabel(finding)).toBe("transitive");
  });
});

describe("printActionSummary - override count", () => {
  it("shows override hygiene message when overrideCount > 0", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printActionSummary([], 2);
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("2 override hygiene issues found");
    consoleSpy.mockRestore();
  });

  it("omits override hygiene message when overrideCount is 0", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printActionSummary([createFinding()], 0);
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).not.toContain("override hygiene");
    consoleSpy.mockRestore();
  });

  it("shows package manager when provided", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printActionSummary([createFinding()], 0, "npm (package-lock.json)");
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("Package manager:");
    expect(out).toContain("npm (package-lock.json)");
    consoleSpy.mockRestore();
  });
});

describe("printFinalStatus - override count", () => {
  it("includes override count in status when overrides exist but no vulns", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printFinalStatus([], 3);
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("No known vulnerabilities found");
    expect(out).toContain("3 override hygiene issues");
    consoleSpy.mockRestore();
  });

  it("appends override count to vuln status line when both exist", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printFinalStatus([createFinding()], 2);
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("1 vulnerable package");
    expect(out).toContain("2 override hygiene issues");
    consoleSpy.mockRestore();
  });

  it("does not mention overrides when overrideCount is 0", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printFinalStatus([createFinding()], 0);
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).not.toContain("override hygiene");
    consoleSpy.mockRestore();
  });
});

describe("printSuggestedFixCommands - override count", () => {
  it("appends override attention line when overrideCount > 0", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [createFinding({ firstFixedVersion: "1.0.0" })];
    printSuggestedFixCommands(findings, createScanInputForSource("package-lock"), { overrideCount: 1 });
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("override hygiene");
    consoleSpy.mockRestore();
  });

  it("omits override attention line when overrideCount is 0", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const findings = [createFinding({ firstFixedVersion: "1.0.0" })];
    printSuggestedFixCommands(findings, createScanInputForSource("package-lock"), { overrideCount: 0 });
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).not.toContain("override hygiene");
    consoleSpy.mockRestore();
  });
});

describe("printCompactOutput - packageManager option", () => {
  it("shows package manager line when packageManager option is provided", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printCompactOutput([createFinding()], createScanInput(), { packageManager: "pnpm (pnpm-lock.yaml)" });
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("Package manager:");
    expect(out).toContain("pnpm (pnpm-lock.yaml)");
    consoleSpy.mockRestore();
  });

  it("omits package manager line when packageManager option is absent", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printCompactOutput([createFinding()], createScanInput(), {});
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).not.toContain("Package manager:");
    consoleSpy.mockRestore();
  });
});

describe("printOverrideHint", () => {
  it("prints the hint line", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    printOverrideHint();
    const out = consoleSpy.mock.calls.map(c => stripAnsi(String(c[0]))).join("\n");
    expect(out).toContain("--check-overrides");
    expect(out).toContain("override entries detected");
    consoleSpy.mockRestore();
  });
});

describe("formatCooldownWarning", () => {
  it("formats the cooldown warning message with an absolute publish date", () => {
    const message = formatCooldownWarning({
      publishedAt: "2026-07-19T10:00:00.000Z",
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    });

    expect(message).toBe(
      "Published 2026-07-19, newer than your configured 1440 min release cooldown (pnpm-workspace.yaml); your package manager would hold this version - validate before overriding.",
    );
  });

  it("uses formatFixVersionPublishDate for the date portion (absolute date, not a relative age)", () => {
    const message = formatCooldownWarning({
      publishedAt: "2026-01-05T23:59:59.000Z",
      windowLabel: "30 day",
      sourceFile: ".npmrc",
    });

    expect(message).toContain(`Published ${formatFixVersionPublishDate("2026-01-05T23:59:59.000Z")},`);
    expect(message).not.toContain("ago");
    expect(message).not.toContain("—");
  });
});

describe("serializeFinding - cooldownWarning", () => {
  function axiosFinding(): Finding {
    return createFinding({
      pkg: { name: "axios", version: "1.7.7", ecosystem: "npm" },
      relationship: "direct",
      dependencyPaths: [["project", "axios"]],
      severity: "high",
      firstFixedVersion: "1.8.0",
      validatedFirstFixedVersion: "1.8.0",
      recommendedParentUpgrade: undefined,
    });
  }

  function planWithCooldownTarget(
    cooldownWarning: SuggestedFixCommandPlan["targets"][number]["cooldownWarning"],
  ): SuggestedFixCommandPlan {
    return {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install axios@1.8.0",
      sections: [],
      targets: [
        {
          package: "axios",
          currentVersion: "1.7.7",
          targetVersion: "1.8.0",
          kind: "direct",
          urgent: true,
          severity: "high",
          adjusted: false,
          reason: "Direct upgrade target",
          cooldownWarning,
        },
      ],
      skipped: [],
      coveredFindingCount: 1,
      totalFindingCount: 1,
    };
  }

  it("includes the matched target's cooldownWarning when present", () => {
    const cooldownWarning = {
      publishedAt: "2026-07-19T10:00:00.000Z",
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    };
    const plan = planWithCooldownTarget(cooldownWarning);

    const serialized = serializeFinding(axiosFinding(), plan);
    expect(serialized.cooldownWarning).toEqual(cooldownWarning);
  });

  it("is null when the matched target has no cooldownWarning", () => {
    const plan = planWithCooldownTarget(null);

    const serialized = serializeFinding(axiosFinding(), plan);
    expect(serialized.cooldownWarning).toBeNull();
  });

  it("is null when no plan is provided", () => {
    const serialized = serializeFinding(axiosFinding());
    expect(serialized.cooldownWarning).toBeNull();
  });
});

describe("printCompactOutput - cooldown warning", () => {
  function tmpCooldownProject(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-output-cooldown-"));
    for (const [rel, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, rel), content);
    }
    return dir;
  }

  function cooldownScanInput(dir: string): ScanInput {
    return {
      mode: "resolved-lockfile",
      source: "pnpm-lock",
      filePath: path.join(dir, "pnpm-lock.yaml"),
      packages: [],
      notes: [],
      warnings: [],
      skippedDependencies: [],
    };
  }

  it("prints the cooldown warning for a target whose fix version falls inside the configured window", () => {
    // Window is intentionally huge (30 days) and publishedAt is "now" so the
    // assertion does not depend on wall-clock drift between writing and running the test.
    const dir = tmpCooldownProject({ "pnpm-workspace.yaml": "minimumReleaseAge: 43200\n" });
    const publishedAt = new Date().toISOString();
    const findings = [
      createFinding({
        pkg: { name: "axios", version: "1.7.7", ecosystem: "npm", paths: [["project", "axios"]] },
        relationship: "direct",
        dependencyPaths: [["project", "axios"]],
        severity: "high",
        firstFixedVersion: "1.8.0",
        validatedFirstFixedVersion: "1.8.0",
        fixVersionPublishedAt: publishedAt,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printCompactOutput(findings, cooldownScanInput(dir));
    });
    const output = lines.join("\n");

    expect(output).toContain(
      formatCooldownWarning({ publishedAt, windowLabel: "43200 min", sourceFile: "pnpm-workspace.yaml" }),
    );
  });

  it("prints nothing cooldown-related when no cooldown config file is present", () => {
    const dir = tmpCooldownProject({});
    const publishedAt = new Date().toISOString();
    const findings = [
      createFinding({
        pkg: { name: "axios", version: "1.7.7", ecosystem: "npm", paths: [["project", "axios"]] },
        relationship: "direct",
        dependencyPaths: [["project", "axios"]],
        severity: "high",
        firstFixedVersion: "1.8.0",
        validatedFirstFixedVersion: "1.8.0",
        fixVersionPublishedAt: publishedAt,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printCompactOutput(findings, cooldownScanInput(dir));
    });
    const output = lines.join("\n");

    expect(output).not.toContain("release cooldown");
  });

  it("still prints a registry-adjusted Note for a target with no cooldownWarning, and no cooldown line", () => {
    // Regression guard: the previous render loop only visited targets inside
    // "direct-adjusted" sections (`if (section.kind === "direct-adjusted") { ... }`),
    // so a cooldownWarning on a target in any other section kind (e.g. "urgent")
    // would silently never render. This case has no cooldown config at all, so it
    // also confirms the Note rendering path is unaffected by the cooldown addition.
    const dir = tmpCooldownProject({});
    const findings = [
      createFinding({
        pkg: { name: "lodash.template", version: "3.6.2", ecosystem: "npm", paths: [["project", "lodash.template"]] },
        relationship: "direct",
        dependencyPaths: [["project", "lodash.template"]],
        severity: "low",
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
        fixVersionValidationNote:
          "Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printCompactOutput(findings, cooldownScanInput(dir));
    });
    const output = lines.join("\n");

    expect(output).toContain(
      "Note: Advisory fixed-version hint 4.17.21 is not published on npm for lodash.template; using nearest published version 4.18.0.",
    );
    expect(output).not.toContain("release cooldown");
  });
});

describe("printSuggestedFixCommands - cooldown warning", () => {
  function tmpCooldownProject(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-output-cooldown-verbose-"));
    for (const [rel, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, rel), content);
    }
    return dir;
  }

  function cooldownScanInput(dir: string): ScanInput {
    return {
      mode: "resolved-lockfile",
      source: "pnpm-lock",
      filePath: path.join(dir, "pnpm-lock.yaml"),
      packages: [],
      notes: [],
      warnings: [],
      skippedDependencies: [],
    };
  }

  it("prints the cooldown warning for a target whose fix version falls inside the configured window", () => {
    const dir = tmpCooldownProject({ "pnpm-workspace.yaml": "minimumReleaseAge: 43200\n" });
    const publishedAt = new Date().toISOString();
    const findings = [
      createFinding({
        pkg: { name: "axios", version: "1.7.7", ecosystem: "npm", paths: [["project", "axios"]] },
        relationship: "direct",
        dependencyPaths: [["project", "axios"]],
        severity: "high",
        firstFixedVersion: "1.8.0",
        validatedFirstFixedVersion: "1.8.0",
        fixVersionPublishedAt: publishedAt,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, cooldownScanInput(dir));
    });
    const output = lines.join("\n");

    expect(output).toContain(
      formatCooldownWarning({ publishedAt, windowLabel: "43200 min", sourceFile: "pnpm-workspace.yaml" }),
    );
  });

  it("prints nothing cooldown-related when no cooldown config file is present", () => {
    const dir = tmpCooldownProject({});
    const publishedAt = new Date().toISOString();
    const findings = [
      createFinding({
        pkg: { name: "axios", version: "1.7.7", ecosystem: "npm", paths: [["project", "axios"]] },
        relationship: "direct",
        dependencyPaths: [["project", "axios"]],
        severity: "high",
        firstFixedVersion: "1.8.0",
        validatedFirstFixedVersion: "1.8.0",
        fixVersionPublishedAt: publishedAt,
        recommendedParentUpgrade: undefined,
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, cooldownScanInput(dir));
    });
    const output = lines.join("\n");

    expect(output).not.toContain("release cooldown");
  });
});

describe("printSuggestedFixCommands - unverified parent upgrade", () => {
  it("prints an unverified marker and excludes it from the fix-all claim", () => {
    const findings = [
      createFinding({
        pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm", paths: [["project", "minimist"]] },
        relationship: "direct",
        dependencyPaths: [["project", "minimist"]],
        severity: "critical",
        firstFixedVersion: "1.2.8",
        recommendedParentUpgrade: undefined,
      }),
      createFinding({
        pkg: { name: "brace-expansion", version: "2.1.2", ecosystem: "npm", paths: [["project", "jest", "brace-expansion"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "jest", "brace-expansion"]],
        severity: "high",
        firstFixedVersion: "5.0.8",
        recommendedParentUpgrade: {
          package: "jest",
          currentVersion: "30.4.1",
          targetVersion: "30.4.2",
          viaPath: ["project", "jest", "brace-expansion"],
          vulnerablePackage: "brace-expansion",
          confidence: "unverified",
          reason: "jest@30.4.2 may resolve brace-expansion, but this could not be verified; rescan after upgrading to confirm",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).toContain("unverified - rescan after upgrading to confirm this resolves the finding");
    expect(output).toContain("should fix 1 of 2 vulnerability findings.");
    expect(output).not.toContain("should fix all");
  });

  it("does not print an unverified marker for a verified parent upgrade", () => {
    const findings = [
      createFinding({
        pkg: { name: "brace-expansion", version: "2.1.2", ecosystem: "npm", paths: [["project", "jest", "brace-expansion"]] },
        relationship: "transitive",
        dependencyPaths: [["project", "jest", "brace-expansion"]],
        severity: "high",
        firstFixedVersion: "5.0.8",
        recommendedParentUpgrade: {
          package: "jest",
          currentVersion: "30.4.1",
          targetVersion: "30.4.2",
          viaPath: ["project", "jest", "brace-expansion"],
          vulnerablePackage: "brace-expansion",
          confidence: "verified",
          reason: "jest@30.4.2 resolves brace-expansion to 5.0.8, at or above the fix 5.0.8",
        },
      }),
    ];

    const lines = captureLogs(() => {
      printSuggestedFixCommands(findings, createScanInputForSource("package-lock"));
    });
    const output = lines.join("\n");

    expect(output).not.toContain("unverified");
    expect(output).toContain("should fix all 1 vulnerability finding.");
  });
});

describe("serializeFinding - recommendedParentUpgrade confidence", () => {
  it("includes confidence: unverified in the serialized recommendedParentUpgrade", () => {
    const finding = createFinding({
      relationship: "transitive",
      recommendedParentUpgrade: {
        package: "jest",
        currentVersion: "30.4.1",
        targetVersion: "30.4.2",
        viaPath: ["project", "jest", "brace-expansion"],
        vulnerablePackage: "brace-expansion",
        confidence: "unverified",
        reason: "jest@30.4.2 may resolve brace-expansion, but this could not be verified; rescan after upgrading to confirm",
      },
    });

    const serialized = serializeFinding(finding);
    expect(serialized.recommendedParentUpgrade?.confidence).toBe("unverified");
  });

  it("includes confidence: verified in the serialized recommendedParentUpgrade", () => {
    const finding = createFinding();
    expect(finding.recommendedParentUpgrade?.confidence).toBe("verified");

    const serialized = serializeFinding(finding);
    expect(serialized.recommendedParentUpgrade?.confidence).toBe("verified");
  });
});

describe("printIncompleteDiagnostics", () => {
  it("prints nothing when completeness is undefined", () => {
    const lines = captureLogs(() => {
      printIncompleteDiagnostics(undefined);
    });
    expect(lines.join("\n")).not.toContain("Scan data is incomplete");
  });

  it("prints nothing for a complete scan", () => {
    const lines = captureLogs(() => {
      printIncompleteDiagnostics({ complete: true, diagnostics: [] });
    });
    expect(lines.join("\n")).not.toContain("Scan data is incomplete");
  });

  it("prints diagnostics without a duplicate title for an incomplete scan", () => {
    const lines = captureLogs(() => {
      printIncompleteDiagnostics({
        complete: false,
        diagnostics: [
          { code: "OSV_DETAIL_TRANSIENT_FAILURE", severity: "warning", message: "3 lookups failed", impact: "detection", count: 3 },
          { code: "PACKUMENT_FETCH_FAILURE", severity: "warning", message: "1 packument fetch failed", impact: "remediation", count: 1 },
        ],
      });
    });
    const output = lines.join("\n");
    expect(output).not.toContain("Scan data is incomplete");
    expect(output).toContain("3 lookups failed");
    expect(output).toContain("1 packument fetch failed");
    expect(output).toContain("Resolve the issues above and re-run the scan.");
  });
});

describe("incomplete scan output integration", () => {
  const incompleteCompleteness = {
    complete: false,
    diagnostics: [{
      code: "OSV_DETAIL_TRANSIENT_FAILURE" as const,
      severity: "warning" as const,
      message: "2 advisory detail lookups failed",
      impact: "detection" as const,
      count: 2,
    }],
  };

  const remediationOnlyCompleteness = {
    complete: false,
    diagnostics: [{
      code: "PACKUMENT_FETCH_FAILURE" as const,
      severity: "warning" as const,
      message: "1 packument fetch failed",
      impact: "remediation" as const,
      count: 1,
    }],
  };

  it("shows diagnostics in verbose output", () => {
    const lines = captureLogs(() => {
      printFinalStatus([createFinding()], 0, incompleteCompleteness);
    });
    const output = lines.join("\n");
    expect(output).toContain("Partial scan");
    expect(output).toContain("1 vulnerable package");
    expect(output).not.toContain("resolved");
    expect(output).not.toContain("Scan complete");
    expect(output).toContain("2 advisory detail lookups failed");
  });

  it("shows diagnostics in compact output", () => {
    const lines = captureLogs(() => {
      printCompactOutput([], createScanInput(), { completeness: incompleteCompleteness });
    });
    const output = lines.join("\n");
    expect(output).toContain("Partial scan");
    expect(output).toContain("vulnerability findings may be incomplete");
    expect(output).not.toContain("resolved");
    expect(output).toContain("2 advisory detail lookups failed");
    expect(output).not.toContain("Scan complete");
  });

  it("uses found for partial compact output with findings", () => {
    const redSpy = jest.spyOn(chalk, "redBright");
    const yellowSpy = jest.spyOn(chalk, "yellow");
    const lines = captureLogs(() => {
      printCompactOutput([createFinding()], createScanInput(), { completeness: incompleteCompleteness });
    });
    const output = lines.join("\n");

    expect(output).toContain("Partial scan");
    expect(output).toContain("found");
    expect(output).not.toContain("resolved");
    expect(redSpy.mock.calls.some(([text]) => text.includes("⚠ Partial scan"))).toBe(true);
    expect(yellowSpy.mock.calls.some(([text]) => text.includes("⚠ Partial scan"))).toBe(false);
    redSpy.mockRestore();
    yellowSpy.mockRestore();
  });

  it("keeps a clean scan complete when only remediation guidance is incomplete", () => {
    const lines = captureLogs(() => {
      printFinalStatus([], 0, remediationOnlyCompleteness);
    });
    const output = lines.join("\n");

    expect(output).toContain("✔ Scan complete. No known vulnerabilities found.");
    expect(output).toContain("⚠ Remediation guidance is incomplete.");
    expect(output).not.toContain("Partial scan");
  });

  it("keeps urgent findings red when only remediation guidance is incomplete", () => {
    const redSpy = jest.spyOn(chalk, "redBright");
    const lines = captureLogs(() => {
      printFinalStatus([createFinding()], 0, remediationOnlyCompleteness);
    });
    const output = lines.join("\n");

    expect(output).toContain("✖ Scan complete.");
    expect(output).toContain("⚠ Remediation guidance is incomplete.");
    expect(output).not.toContain("Partial scan");
    expect(redSpy.mock.calls.some(([text]) => text.includes("✖ Scan complete"))).toBe(true);
    redSpy.mockRestore();
  });

  it("includes override hygiene counts for an incomplete scan without findings", () => {
    const lines = captureLogs(() => {
      printFinalStatus([], 2, incompleteCompleteness);
    });
    const output = lines.join("\n");

    expect(output).toContain("Partial scan");
    expect(output).toContain("vulnerability findings may be incomplete");
    expect(output).toContain("2 override hygiene issues detected");
  });

  it("uses singular grammar for one override hygiene issue", () => {
    const lines = captureLogs(() => {
      printFinalStatus([], 1, incompleteCompleteness);
    });

    expect(lines.join("\n")).toContain("1 override hygiene issue detected");
  });
});

describe("countProdFindings", () => {
  it("returns null when no finding has pkg.dev defined", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm" }, severity: "critical", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    expect(countProdFindings(findings)).toBeNull();
  });

  it("returns null when all findings are prod (dev !== true)", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    expect(countProdFindings(findings)).toBeNull();
  });

  it("returns split counts when some findings are dev-only", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
      { pkg: { name: "b", version: "1.0.0", ecosystem: "npm", dev: true }, severity: "high", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    expect(countProdFindings(findings)).toEqual({ prodTotal: 1, devTotal: 1, total: 2 });
  });

  it("returns split when dev flag defined on at least one finding as true, undefined on others", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm" }, severity: "critical", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
      { pkg: { name: "b", version: "1.0.0", ecosystem: "npm", dev: true }, severity: "high", vulnerabilities: [], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const result = countProdFindings(findings);
    expect(result).not.toBeNull();
    expect(result?.devTotal).toBe(1);
    expect(result?.prodTotal).toBe(1);
  });
});

describe("printCompactOutput - prod/dev split line", () => {
  it("prints prod split line when some findings are dev-only", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
      { pkg: { name: "b", version: "1.0.0", ecosystem: "npm", dev: true }, severity: "high", vulnerabilities: [{ id: "GHSA-2" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printCompactOutput(findings, createScanInputForSource("package-lock")));
    expect(lines.join("\n")).toMatch(/1 of 2.*prod/i);
  });

  it("omits prod split line when all findings are prod", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printCompactOutput(findings, createScanInputForSource("package-lock")));
    expect(lines.join("\n")).not.toMatch(/prod dependencies/i);
  });

  it("omits prod split line when dev flag is unavailable", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm" }, severity: "high", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printCompactOutput(findings, createScanInputForSource("package-lock")));
    expect(lines.join("\n")).not.toMatch(/prod dependencies/i);
  });
});

describe("printSummary - prod/dev split line", () => {
  it("prints prod split line when some findings are dev-only", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
      { pkg: { name: "b", version: "1.0.0", ecosystem: "npm", dev: true }, severity: "high", vulnerabilities: [{ id: "GHSA-2" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printSummary(findings, 10, createScanInput()));
    const allOutput = lines.join("\n");
    expect(allOutput).toMatch(/1 of 2.*prod/i);
  });

  it("omits prod split line when all findings are prod", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false }, severity: "critical", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printSummary(findings, 10, createScanInput()));
    const allOutput = lines.join("\n");
    expect(allOutput).not.toMatch(/prod dependencies/i);
  });

  it("omits prod split line when dev flag is unavailable on all findings", () => {
    const findings = [
      { pkg: { name: "a", version: "1.0.0", ecosystem: "npm" }, severity: "high", vulnerabilities: [{ id: "GHSA-1" }], cveAliases: [], dependencyPaths: [], relationship: "direct", firstFixedVersion: null },
    ] as unknown as Finding[];
    const lines = captureLogs(() => printSummary(findings, 10, createScanInput()));
    const allOutput = lines.join("\n");
    expect(allOutput).not.toMatch(/prod dependencies/i);
  });
});
