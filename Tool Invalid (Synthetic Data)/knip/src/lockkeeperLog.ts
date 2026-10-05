export interface LockPass {
  readonly vesselName: string;
  readonly lockNumber: number;
  readonly minutesToOperate: number;
}

export class LockkeeperLog {
  private readonly passes: LockPass[] = [];

  record(pass: LockPass): void {
    if (pass.minutesToOperate <= 0) {
      throw new RangeError(`pass through lock ${pass.lockNumber} needs positive duration`);
    }
    this.passes.push(pass);
  }

  totalMinutes(): number {
    return this.passes.reduce((sum, pass) => sum + pass.minutesToOperate, 0);
  }

  passesThroughLock(lockNumber: number): number {
    return this.passes.filter((pass) => pass.lockNumber === lockNumber).length;
  }
}

// Unused exports below: never imported by src/index.ts (the only knip
// entry point) or by anything else in this tiny project, so knip's
// unused-exports detector should flag the majority of this file's surface.
export interface GateSchedule {
  readonly lockNumber: number;
  readonly openMinute: number;
  readonly closeMinute: number;
}

export function isGateOpen(schedule: GateSchedule, minute: number): boolean {
  return minute >= schedule.openMinute && minute < schedule.closeMinute;
}

export function describeGate(schedule: GateSchedule): string {
  return `lock ${schedule.lockNumber}: ${schedule.openMinute}-${schedule.closeMinute}`;
}

export class SilentBasinLedger {
  private levels: number[] = [];

  recordLevel(level: number): void {
    this.levels.push(level);
  }

  averageLevel(): number {
    if (this.levels.length === 0) {
      return 0;
    }
    return this.levels.reduce((a, b) => a + b, 0) / this.levels.length;
  }
}

export const DEFAULT_GATE_SCHEDULE: GateSchedule = {
  lockNumber: 1,
  openMinute: 0,
  closeMinute: 60,
};
