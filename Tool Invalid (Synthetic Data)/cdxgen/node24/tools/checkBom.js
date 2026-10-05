#!/usr/bin/env node
// cdxgen itself (`cdxgen -t js -o bom.json .`) always exits 0 once it can
// enumerate the manifest -- it is an SBOM *generator*, not a pass/fail
// scanner, so it has no inherent pass/fail percentage of its own (the same
// situation this corpus's README documents for opentelemetry-sdk-node).
// This script defines the observable "mostly wrong" signal directly: of
// THIS package's own declared production "dependencies" (the real
// components cdxgen's SBOM should attribute to this project, as opposed
// to cdxgen's own tool-internal devDependency tree, which it also
// enumerates but which says nothing about this fixture), what fraction
// carry a license outside a small allow-list. Exits non-zero when that
// fraction is at or above 50%.
const fs = require("fs");

const ALLOWED = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD"]);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const ownDeps = new Set(Object.keys(pkg.dependencies || {}));

const bom = JSON.parse(fs.readFileSync("bom.json", "utf8"));
const components = (bom.components || []).filter((c) => c.type === "library" && ownDeps.has(c.name));

if (components.length === 0) {
  console.error("FINDING EXPECTED BUT NOT TRIGGERED: bom.json lists none of this project's own declared dependencies as components");
  process.exitCode = 1;
  return;
}

let disallowed = 0;
const details = [];
for (const c of components) {
  const licenseIds = (c.licenses || [])
    .map((l) => (l.license && (l.license.id || l.license.name)) || null)
    .filter(Boolean);
  const ok = licenseIds.length > 0 && licenseIds.every((id) => ALLOWED.has(id));
  if (!ok) {
    disallowed += 1;
    details.push(`${c.name}@${c.version}: ${licenseIds.join("/") || "(no license)"}`);
  }
}

const pct = (disallowed / components.length) * 100;
console.log(`OWN_COMPONENTS=${components.length} DISALLOWED_OR_UNKNOWN=${disallowed} PCT=${pct.toFixed(1)}`);
for (const d of details) {
  console.log(`  - ${d}`);
}

if (pct >= 50) {
  console.error(`FINDING: ${pct.toFixed(1)}% of this project's own declared dependencies carry a disallowed/unknown license (>= 50%)`);
  process.exitCode = 1;
} else {
  console.error(`FINDING EXPECTED BUT NOT TRIGGERED: only ${pct.toFixed(1)}% disallowed (< 50%)`);
  process.exitCode = 1;
}
