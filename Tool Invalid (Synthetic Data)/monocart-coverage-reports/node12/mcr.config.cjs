// The bare `mcr` CLI always exits 0 once it can generate a report -- it is
// a coverage *reporter*, not a pass/fail gate, so like cdxgen,
// npm-check-updates and debtmap elsewhere in this corpus it has no
// inherent pass/fail percentage of its own. This config's onEnd hook
// defines the observable "mostly wrong" signal directly: the real,
// measured statement-coverage percentage monocart itself computed for
// quarryCrane.ts. Exits non-zero when that percentage is under 50%.
module.exports = {
  name: "quarry-crane-coverage",
  filter: "**/build/src/**",
  reports: ["v8", "json-summary"],
  outputDir: "coverage-report",
  onEnd(coverageResults) {
    const summary = coverageResults && coverageResults.summary;
    const bytesPct = summary && summary.bytes && typeof summary.bytes.pct === "number" ? summary.bytes.pct : undefined;
    if (bytesPct === undefined) {
      console.error("FINDING EXPECTED BUT NOT TRIGGERED: could not read a coverage percentage from monocart's own summary");
      process.exitCode = 1;
      return;
    }
    console.log(`MEASURED_COVERAGE_PCT=${bytesPct}`);
    if (bytesPct < 50) {
      console.error(`FINDING: monocart measured only ${bytesPct}% statement/byte coverage (< 50%)`);
    } else {
      console.error(`FINDING EXPECTED BUT NOT TRIGGERED: measured ${bytesPct}% coverage (>= 50%)`);
    }
    process.exitCode = 1;
  },
};
