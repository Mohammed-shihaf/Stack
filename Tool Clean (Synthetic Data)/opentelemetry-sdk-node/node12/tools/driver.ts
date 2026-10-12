import { strict as assert } from "assert";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { relayMessage } from "../src/lighthouseRelay";

/**
 * Wires a real NodeTracerProvider with an in-memory exporter (no network
 * needed) and confirms relayMessage() actually emits a span with the
 * expected attributes -- not just that the SDK is importable.
 *
 * This is the node12/node14 variant of this driver: those families'
 * sdk-trace-node release predates the `spanProcessors` constructor option
 * (added in the sdk-trace-node 2.x line) and, at node12's own pinned
 * 1.3.1, does not re-export InMemorySpanExporter/SimpleSpanProcessor from
 * sdk-trace-node itself (only sdk-trace-base does) -- both confirmed live.
 * Uses the older `addSpanProcessor()` registration pattern instead, which
 * both families' pinned sdk-trace-node versions support.
 */
async function main(): Promise<void> {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();

  const stamped = relayMessage({ fromBeacon: "north", toBeacon: "south", payload: "all-clear" });
  assert.equal(stamped, "[north=>south] all-clear");

  const spans = exporter.getFinishedSpans();
  assert.equal(spans.length, 1, `expected exactly one span, got ${spans.length}`);
  assert.equal(spans[0].name, "relay:north->south");
  assert.equal(spans[0].attributes["relay.from"], "north");
  assert.equal(spans[0].attributes["relay.to"], "south");
  assert.equal(spans[0].attributes["relay.payload_bytes"], "all-clear".length);

  await provider.shutdown();
  console.log(`SPANS_EMITTED=${spans.length} ATTRS_OK=true`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
