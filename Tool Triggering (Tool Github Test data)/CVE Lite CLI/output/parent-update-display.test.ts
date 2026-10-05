import { jest } from "@jest/globals";
import { buildSuggestedFixCommandPlan } from "../../src/remediation/fix-commands.js";
import { printSuggestedFixCommands, printTable } from "../../src/output/printers.js";
import { renderFixPlan } from "../../src/output/html-reporter.js";
import { stripAnsi } from "../../src/utils/chalk.js";
import { isBreakingUpgrade } from "../../src/utils/version.js";
import type { Finding, ScanInput } from "../../src/types.js";

// Renderer coverage for #1152: parent-update targets used to store the child's
// version in targetVersion under the parent's name, so tables, HTML, and
// breaking badges all implied axios was jumping to form-data's version.

function scanInput(): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "package-lock",
    filePath: "/tmp/package-lock.json",
    packages: [
      { name: "axios", version: "1.16.1", ecosystem: "npm" },
      { name: "form-data", version: "4.0.5", ecosystem: "npm" },
      { name: "follow-redirects", version: "1.15.0", ecosystem: "npm" },
    ],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

function withinRangeChildOfAxios(name: string, installed: string, target: string): Finding {
  return {
    pkg: { name, version: installed, ecosystem: "npm" },
    vulnerabilities: [{ id: `GHSA-${name}-0001` }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "axios", name]],
    relationship: "transitive",
    firstFixedVersion: target,
    validatedFirstFixedVersion: target,
    recommendedNpmTransitiveRemediation: {
      kind: "update-parent-within-range",
      package: "axios",
      currentVersion: "1.16.1",
      targetChildVersion: target,
      viaPath: ["project", "axios", name],
      reason: `axios@1.16.1 already allows ${name}@${target} within the current dependency range`,
    },
  };
}

function captureLogs(run: () => void): string {
  const logs: string[] = [];
  const spy = jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(arg => String(arg)).join(" "));
  });
  try {
    run();
  } finally {
    spy.mockRestore();
  }
  return logs.map(line => stripAnsi(line)).join("\n");
}

describe("parent-update target display (#1152)", () => {
  it("does not render a foreign child's version as axios's target (one child)", () => {
    const formData = withinRangeChildOfAxios("form-data", "4.0.5", "4.0.6");
    const plan = buildSuggestedFixCommandPlan([formData], scanInput());
    expect(plan).not.toBeNull();

    const refresh = plan!.targets.find(t => t.kind === "parent-update")!;
    expect(refresh.package).toBe("axios");
    expect(refresh.targetVersion).toBe("1.16.1");
    expect(refresh.childPackage).toBe("form-data");
    expect(refresh.childTargetVersion).toBe("4.0.6");
    expect(isBreakingUpgrade(refresh.currentVersion!, refresh.targetVersion)).toBe(false);

    const terminal = captureLogs(() => {
      printSuggestedFixCommands([formData], scanInput());
    });
    expect(terminal).toContain("axios");
    expect(terminal).toContain("1.16.1");
    expect(terminal).toContain("form-data");
    expect(terminal).toContain("4.0.6");
    expect(terminal).not.toContain("⚠");

    const findingsTable = captureLogs(() => {
      printTable([formData], null, undefined, plan);
    });
    expect(findingsTable).toContain("form-data");
    expect(findingsTable).toContain("4.0.6");

    const html = renderFixPlan(plan);
    expect(html).toContain("axios@1.16.1");
    expect(html).toContain("refresh form-data to 4.0.6");
    expect(html).not.toContain("break-badge");
    expect(html).not.toContain('fix-target-to">4.0.6');
    expect(html).not.toContain("axios@1.16.1</span><span class=\"fix-target-arrow\">");
  });

  it("does not render either child's version as an axios upgrade (two children)", () => {
    const formData = withinRangeChildOfAxios("form-data", "4.0.5", "4.0.6");
    const followRedirects = withinRangeChildOfAxios("follow-redirects", "1.15.0", "1.15.11");
    const plan = buildSuggestedFixCommandPlan([formData, followRedirects], scanInput());
    expect(plan).not.toBeNull();

    const refreshes = plan!.targets.filter(t => t.kind === "parent-update");
    expect(refreshes).toHaveLength(2);
    for (const refresh of refreshes) {
      expect(refresh.package).toBe("axios");
      expect(refresh.currentVersion).toBe("1.16.1");
      expect(refresh.targetVersion).toBe("1.16.1");
      expect(isBreakingUpgrade(refresh.currentVersion!, refresh.targetVersion)).toBe(false);
    }
    expect(refreshes.map(t => t.childPackage).sort()).toEqual(["follow-redirects", "form-data"]);
    expect(refreshes.map(t => t.childTargetVersion).sort()).toEqual(["1.15.11", "4.0.6"]);

    const terminal = captureLogs(() => {
      printSuggestedFixCommands([formData, followRedirects], scanInput());
    });
    expect(terminal).toContain("npm update axios");
    expect(terminal).not.toContain("⚠");
    // 1.15.11 used to render as an axios downgrade from 1.16.1.
    expect(terminal).toContain("follow-redirects");
    expect(terminal).toContain("1.15.11");

    const html = renderFixPlan(plan);
    expect(html).toContain("refresh form-data to 4.0.6");
    expect(html).toContain("refresh follow-redirects to 1.15.11");
    expect(html).not.toContain("break-badge");
    expect(html).not.toContain('fix-target-to">4.0.6');
    expect(html).not.toContain('fix-target-to">1.15.11');
  });
});
