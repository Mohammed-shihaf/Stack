import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("lighthouse-relay");

export interface RelayMessage {
  readonly fromBeacon: string;
  readonly toBeacon: string;
  readonly payload: string;
}

/** Relays a message between beacons, emitting a real span for the hop. */
export function relayMessage(message: RelayMessage): string {
  return tracer.startActiveSpan(`relay:${message.fromBeacon}->${message.toBeacon}`, (span) => {
    span.setAttribute("relay.from", message.fromBeacon);
    span.setAttribute("relay.to", message.toBeacon);
    span.setAttribute("relay.payload_bytes", message.payload.length);
    const stamped = `[${message.fromBeacon}=>${message.toBeacon}] ${message.payload}`;
    span.end();
    return stamped;
  });
}
