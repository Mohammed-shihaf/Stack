/** A patient intake record. No field here is ever written to a log. */
export interface IntakeRecord {
  readonly patientId: string;
  readonly redactedNotes: string;
}

/** Redacts free-text notes down to a length-only summary before storage. */
export function redactNotes(rawNotes: string): string {
  return `[${rawNotes.length} chars redacted]`;
}

export class IntakeForm {
  private readonly records = new Map<string, IntakeRecord>();

  submit(patientId: string, rawNotes: string): void {
    this.records.set(patientId, { patientId, redactedNotes: redactNotes(rawNotes) });
  }

  recordCount(): number {
    return this.records.size;
  }
}
