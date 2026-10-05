import { strict as assert } from "assert";
import { NodeTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { relayMessage } from "../src/lighthouseRelay";

/**
 * node20/node24/node26 variant. Invalid-corpus twin of the clean driver:
 * drives relayMessage() across a realistic batch of relays (1 priority, 9
 * ordinary) and measures the real closed-vs-opened span ratio, since
 * opentelemetry-sdk-node has no inherent pass/fail percentage of its own.
 * Exits non-zero whenever that ratio is at or above 50%, so a genuinely
 * leak-free build would be caught as a false negative too.
 */
async function main(): Promise<void> {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();

  const relays: Array<{ from: string; to: string; priority: boolean }> = [
    { from: "north", to: "south", priority: true },
    { from: "south", to: "east", priority: false },
    { from: "east", to: "west", priority: false },
    { from: "west", to: "north", priority: false },
    { from: "north", to: "east", priority: false },
    { from: "south", to: "west", priority: false },
    { from: "east", to: "north", priority: false },
    { from: "west", to: "south", priority: false },
    { from: "north", to: "west", priority: false },
    { from: "south", to: "north", priority: false },
  ];

  let opened = 0;
  for (const relay of relays) {
    relayMessage({ fromBeacon: relay.from, toBeacon: relay.to, payload: "all-clear" }, relay.priority);
    opened += 1;
  }

  await new Promise((resolve) => setTimeout(resolve, 10));
  const closed = exporter.getFinishedSpans().length;
  const closedPct = (closed / opened) * 100;

  assert.equal(opened, 10, `expected 10 relays attempted, got ${opened}`);
  console.log(`SPANS_OPENED=${opened} SPANS_CLOSED=${closed} CLOSED_PCT=${closedPct.toFixed(1)}`);

  if (closedPct < 50) {
    console.error(`FINDING: only ${closedPct.toFixed(1)}% of opened spans were ever closed/exported (< 50%)`);
  } else {
    console.error(`FINDING EXPECTED BUT NOT TRIGGERED: closed/opened = ${closedPct.toFixed(1)}% (>= 50%)`);
  }
  process.exitCode = 1;

  await provider.shutdown();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
