import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("lighthouse-relay");

export interface RelayMessage {
  readonly fromBeacon: string;
  readonly toBeacon: string;
  readonly payload: string;
}

/**
 * Relays a message between beacons. Real defect: the span is started
 * manually (not via startActiveSpan's callback form) and end() is only
 * called for a "priority" relay -- every ordinary relay leaks its span,
 * so across a batch of relays the closed/opened ratio should land well
 * under 50%.
 */
export function relayMessage(message: RelayMessage, priority: boolean): string {
  const span = tracer.startSpan(`relay:${message.fromBeacon}->${message.toBeacon}`);
  span.setAttribute("relay.from", message.fromBeacon);
  span.setAttribute("relay.to", message.toBeacon);
  span.setAttribute("relay.payload_bytes", message.payload.length);
  const stamped = `[${message.fromBeacon}=>${message.toBeacon}] ${message.payload}`;
  if (priority) {
    span.end();
  }
  // Non-priority relays (the overwhelming majority in normal operation)
  // never call span.end(): the span is opened and leaked.
  return stamped;
}
