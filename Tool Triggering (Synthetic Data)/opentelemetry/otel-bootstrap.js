"use strict";
/* OpenTelemetry bootstrap -- @opentelemetry/sdk-node 0.29.2, the newest release
 * whose engines admit Node 12 (>=8.12.0). Spans are collected by an in-process
 * exporter and written to reports/otel-spans.json on exit, so the metric needs
 * no collector endpoint. */
const fs = require("fs");
const path = require("path");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const collected = [];

class CollectingExporter {
  export(spans, resultCallback) {
    for (const span of spans) {
      const [s, ns] = span.duration;
      collected.push({
        name: span.name,
        kind: span.kind,
        durationMs: s * 1000 + ns / 1e6,
        attributes: span.attributes,
        status: span.status && span.status.code,
      });
    }
    resultCallback({ code: 0 });
  }
  shutdown() { return Promise.resolve(); }
}

const sdk = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(new CollectingExporter()),
});

try {
  sdk.start();
} catch (error) {
  console.error("[otel] sdk failed to start:", error.message);
}

process.on("exit", () => {
  fs.mkdirSync(path.join(REPO_ROOT, "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(REPO_ROOT, "reports", "otel-spans.json"),
    JSON.stringify(collected, null, 2),
  );
});
