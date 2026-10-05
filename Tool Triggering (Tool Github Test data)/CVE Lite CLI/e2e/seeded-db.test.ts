/**
 * Deterministic e2e tests backed by the seeded fixture DB. These tests never
 * touch the live OSV network and never drift when new CVEs land. All packages
 * used here are fictional (cve-lite-scenario-*) and exist only in the seeded DB.
 *
 * The seeded DB is built by scripts/build-fixture-db.mjs from the advisory
 * entries in each scenario directory under examples/scenarios. It is regenerated
 * automatically by the Jest globalSetup when any scenario.json is newer than the DB.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runCli, mkProject, rmProject, npmProject, SEEDED_DB, SCENARIOS } from "./harness.js";

const CI_ENV = { CI: "1" } as const;

function seededArgs(scenarioPath: string): string[] {
  return [scenarioPath, "--offline-db", SEEDED_DB];
}

function readJsonOutput(cwd: string): any {
  const files = readdirSync(cwd).filter(
    (f: string) => f.startsWith("cve-lite-scan-") && f.endsWith(".json"),
  );
  expect(files).toHaveLength(1);
  return JSON.parse(readFileSync(join(cwd, files[0]!), "utf8"));
}

describe("seeded fixture DB - direct-high scenario", () => {
  it("detects a high-severity direct finding and exits non-zero with --fail-on high", () => {
    const scenario = join(SCENARIOS, "direct-high");
    if (!existsSync(scenario)) {
      console.log("skip: examples/scenarios/direct-high absent");
      return;
    }
    const r = runCli([...seededArgs(scenario), "--fail-on", "high"], { env: CI_ENV });
    expect(r.status).not.toBe(0);
    expect(r.stdout).toMatch(/high/i);
  });

  it("reports exactly one finding (cve-lite-scenario-vuln-high)", () => {
    const scenario = join(SCENARIOS, "direct-high");
    if (!existsSync(scenario)) {
      console.log("skip: examples/scenarios/direct-high absent");
      return;
    }
    const cwd = mkProject({});
    try {
      runCli([...seededArgs(scenario), "--json"], { cwd, env: CI_ENV });
      const payload = readJsonOutput(cwd);
      expect(payload.findingCount).toBe(1);
      expect(payload.findings[0].package).toBe("cve-lite-scenario-vuln-high");
      expect(payload.findings[0].severity).toBe("high");
      expect(payload.findings[0].relationship).toBe("direct");
    } finally {
      rmProject(cwd);
    }
  });
});

describe("seeded fixture DB - transitive-only scenario", () => {
  it("detects a medium-severity transitive finding", () => {
    const scenario = join(SCENARIOS, "transitive-only");
    if (!existsSync(scenario)) {
      console.log("skip: examples/scenarios/transitive-only absent");
      return;
    }
    const cwd = mkProject({});
    try {
      runCli([...seededArgs(scenario), "--json"], { cwd, env: CI_ENV });
      const payload = readJsonOutput(cwd);
      expect(payload.findingCount).toBe(1);
      expect(payload.findings[0].package).toBe("cve-lite-scenario-transitive-vuln");
      expect(payload.findings[0].severity).toBe("medium");
      expect(payload.findings[0].relationship).toBe("transitive");
    } finally {
      rmProject(cwd);
    }
  });
});

describe("seeded fixture DB - no-findings scenario", () => {
  it("reports no findings and exits 0", () => {
    const scenario = join(SCENARIOS, "no-findings");
    if (!existsSync(scenario)) {
      console.log("skip: examples/scenarios/no-findings absent");
      return;
    }
    const r = runCli(seededArgs(scenario), { env: CI_ENV });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("No known vulnerabilities");
  });
});

describe("seeded fixture DB - synthetic project (harness)", () => {
  it("a project using cve-lite-scenario-vuln-high@1.0.0 fires with the seeded DB", () => {
    if (!existsSync(SEEDED_DB)) {
      console.log("skip: seeded DB absent");
      return;
    }
    const dir = mkProject(
      npmProject(
        { name: "x", dependencies: { "cve-lite-scenario-vuln-high": "1.0.0" } },
        { "cve-lite-scenario-vuln-high": "1.0.0" },
      ),
    );
    const cwd = mkProject({});
    try {
      const r = runCli([dir, "--offline-db", SEEDED_DB, "--fail-on", "high"], { cwd, env: CI_ENV });
      expect(r.status).not.toBe(0);
      expect(r.stdout).toMatch(/cve-lite-scenario-vuln-high/);
    } finally {
      rmProject(dir);
      rmProject(cwd);
    }
  });

  it("a project using cve-lite-scenario-clean@1.0.0 is clean with the seeded DB", () => {
    if (!existsSync(SEEDED_DB)) {
      console.log("skip: seeded DB absent");
      return;
    }
    const dir = mkProject(
      npmProject(
        { name: "y", dependencies: { "cve-lite-scenario-clean": "1.0.0" } },
        { "cve-lite-scenario-clean": "1.0.0" },
      ),
    );
    const cwd = mkProject({});
    try {
      const r = runCli([dir, "--offline-db", SEEDED_DB], { cwd, env: CI_ENV });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("No known vulnerabilities");
    } finally {
      rmProject(dir);
      rmProject(cwd);
    }
  });
});
