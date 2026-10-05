#!/usr/bin/env node
// `ncu` alone (the command verify_live.py runs) always exits 0 -- it is
// informational by default (no --errorLevel 2), so it has no inherent
// pass/fail percentage of its own. This script defines the observable
// "mostly wrong" signal directly: of the real devDependencies ncu itself
// reports as upgradable (via --jsonUpgraded), what fraction of this
// project's own total devDependencies they represent. Exits non-zero when
// that stale fraction is at or above 50%.
const fs = require("fs");
const { execSync } = require("child_process");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const totalDeps = Object.keys(pkg.devDependencies || {}).length;

let upgraded = {};
try {
  const out = execSync("npx --no-install ncu --jsonUpgraded", { encoding: "utf8" });
  upgraded = JSON.parse(out || "{}");
} catch (err) {
  // ncu --jsonUpgraded exits 0 normally; if this throws, surface it rather
  // than silently reporting zero stale deps.
  console.error("ncu invocation failed:", err.message);
  process.exitCode = 1;
  return;
}

const staleCount = Object.keys(upgraded).length;
const pct = totalDeps === 0 ? 0 : (staleCount / totalDeps) * 100;

console.log(`TOTAL_DEVDEPS=${totalDeps} STALE=${staleCount} PCT=${pct.toFixed(1)}`);
console.log(JSON.stringify(upgraded, null, 2));

if (pct >= 50) {
  console.error(`FINDING: ${pct.toFixed(1)}% of devDependencies have an available upgrade (>= 50%)`);
  process.exitCode = 1;
} else {
  console.error(`FINDING EXPECTED BUT NOT TRIGGERED: only ${pct.toFixed(1)}% stale (< 50%)`);
  process.exitCode = 1;
}
