"use strict";
// usage (run from the repository root, where typescript is installed):
//   node trace_crossings.cjs <dir with @tracegraph/trace-js installed> <run dir>
// Compiles src/crossingLog.ts in memory, wraps CrossingLog.record / total with traceFunction() and logs every crossing in
// crossings.json. TraceGraph writes one JSONL event per call (function_call / return / error) into <run dir>.
const fs = require("fs");
const path = require("path");
const [installDir, runDir] = process.argv.slice(2);
fs.mkdirSync(path.resolve(runDir), { recursive: true });
const nm = path.resolve(installDir, "node_modules");
const core = require(path.join(nm, "@tracegraph/trace-core"));
const js = require(path.join(nm, "@tracegraph/trace-js"));

process.env.TRACEGRAPH_ENABLED = "1";
process.env.TRACEGRAPH_RUN_DIR = path.resolve(runDir);
process.env.TRACEGRAPH_TRACE_ID = core.createTraceId();
process.env.TRACEGRAPH_RUN_ID = core.createRunId();
process.env.TRACEGRAPH_SESSION_ID = core.createSessionId();

const ts = require(require.resolve("typescript", { paths: [process.cwd()] }));
const source = fs.readFileSync(path.join(__dirname, "src", "crossingLog.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
const mod = { exports: {} };
new Function("module", "exports", "require", compiled.outputText)(mod, mod.exports, require);
const { CrossingLog } = mod.exports;

CrossingLog.prototype.record = js.traceFunction("CrossingLog.record", CrossingLog.prototype.record);
CrossingLog.prototype.total = js.traceFunction("CrossingLog.total", CrossingLog.prototype.total);

const log = new CrossingLog();
let rejected = 0;
for (const crossing of JSON.parse(fs.readFileSync(path.join(__dirname, "crossings.json"), "utf8"))) {
  try { log.record(crossing); } catch (e) { rejected += 1; }
}
console.log("[tracegraph] total income:", log.total(), "| rejected crossings:", rejected);

const file = path.join(path.resolve(runDir), process.env.TRACEGRAPH_TRACE_ID + ".events.jsonl.tmp");
const events = fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const by = {};
events.forEach((e) => { by[e.type] = (by[e.type] || 0) + 1; });
console.log("[tracegraph] events:", events.length, JSON.stringify(by));
if (events.length === 0) { console.error("[tracegraph] FAIL: no events were written"); process.exit(1); }
