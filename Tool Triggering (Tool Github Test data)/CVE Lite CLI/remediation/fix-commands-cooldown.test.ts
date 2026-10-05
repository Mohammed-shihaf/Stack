import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSuggestedFixCommandPlan, findFixTargetForFinding } from "../../src/remediation/fix-commands.js";
import type { Finding, ScanInput } from "../../src/types.js";

function tmpProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix-commands-cooldown-"));
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

function scanInputFor(dir: string): ScanInput {
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

const nowMs = Date.parse("2026-07-20T12:00:00Z");

function findingWithFixPublishedAt(publishedAt: string | null): Finding {
  return {
    pkg: { name: "axios", version: "1.7.7", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-test-1234-5678" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["axios"]],
    relationship: "direct",
    firstFixedVersion: "1.8.0",
    validatedFirstFixedVersion: "1.8.0",
    fixVersionPublishedAt: publishedAt,
  };
}

describe("buildSuggestedFixCommandPlan cooldown annotation", () => {
  it("attaches a cooldownWarning when the fix version falls inside the configured pnpm window", () => {
    const dir = tmpProject({ "pnpm-workspace.yaml": "minimumReleaseAge: 1440\n" });
    const publishedAt = "2026-07-20T06:00:00Z"; // 6h before nowMs, window is 1440min = 24h

    const plan = buildSuggestedFixCommandPlan(
      [findingWithFixPublishedAt(publishedAt)],
      scanInputFor(dir),
      { nowMs },
    );

    expect(plan).not.toBeNull();
    const target = plan!.targets.find(t => t.package === "axios");
    expect(target?.cooldownWarning).toEqual({
      publishedAt,
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    });

    // sections[].targets must reflect the same annotation - confirms sections hold
    // references into the top-level targets array, not copies.
    const sectionTarget = plan!.sections.flatMap(s => s.targets).find(t => t.package === "axios");
    expect(sectionTarget?.cooldownWarning).toEqual(target?.cooldownWarning);
  });

  it("does not attach a cooldownWarning when no cooldown config file is present", () => {
    const dir = tmpProject({});
    const publishedAt = "2026-07-20T06:00:00Z";

    const plan = buildSuggestedFixCommandPlan(
      [findingWithFixPublishedAt(publishedAt)],
      scanInputFor(dir),
      { nowMs },
    );

    expect(plan).not.toBeNull();
    const target = plan!.targets.find(t => t.package === "axios");
    expect(target?.cooldownWarning).toBeFalsy();
  });
});

describe("findFixTargetForFinding", () => {
  it("returns the matching target, including its cooldownWarning", () => {
    const dir = tmpProject({ "pnpm-workspace.yaml": "minimumReleaseAge: 1440\n" });
    const publishedAt = "2026-07-20T06:00:00Z"; // 6h before nowMs, window is 1440min = 24h
    const finding = findingWithFixPublishedAt(publishedAt);

    const plan = buildSuggestedFixCommandPlan([finding], scanInputFor(dir), { nowMs });

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.package).toBe("axios");
    expect(target?.cooldownWarning).toEqual({
      publishedAt,
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    });
  });

  it("returns null when no target matches the finding", () => {
    const dir = tmpProject({});
    const finding = findingWithFixPublishedAt(null);
    // Different package than anything in the plan's targets.
    const unrelatedFinding: Finding = { ...finding, pkg: { ...finding.pkg, name: "left-pad" } };

    const plan = buildSuggestedFixCommandPlan([finding], scanInputFor(dir), { nowMs });

    expect(findFixTargetForFinding(plan!, unrelatedFinding)).toBeNull();
  });
});
