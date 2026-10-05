// Jest globalSetup: guarantee dist/index.js is built and fresh before any test
// spawns the real CLI. Also ensures the seeded fixture DB is up to date.

import { execFileSync } from "node:child_process";
import { statSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
    } else if (entry.name.endsWith(".ts")) {
      newest = Math.max(newest, statSync(full).mtimeMs);
    }
  }
  return newest;
}

function newestScenarioMtime(scenariosDir) {
  if (!existsSync(scenariosDir)) return 0;
  let newest = 0;
  for (const entry of readdirSync(scenariosDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const scenarioFile = join(scenariosDir, entry.name, "scenario.json");
    if (existsSync(scenarioFile)) {
      newest = Math.max(newest, statSync(scenarioFile).mtimeMs);
    }
  }
  return newest;
}

export default function build() {
  const distEntry = join(repoRoot, "dist", "index.js");
  const fresh =
    existsSync(distEntry) &&
    statSync(distEntry).mtimeMs >= newestMtime(join(repoRoot, "src"));
  if (!fresh) {
    execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "inherit" });
  }

  const seededDb = join(repoRoot, "tests", "fixtures", "advisories", "seeded.db");
  const scenariosDir = join(repoRoot, "examples", "scenarios");
  const dbFresh =
    existsSync(seededDb) &&
    statSync(seededDb).mtimeMs >= newestScenarioMtime(scenariosDir);
  if (!dbFresh) {
    execFileSync("node", [join(repoRoot, "scripts", "build-fixture-db.mjs")], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
}
