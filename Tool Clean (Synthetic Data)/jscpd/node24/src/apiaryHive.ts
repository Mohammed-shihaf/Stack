export interface HiveInspection {
  readonly hiveId: string;
  readonly frameCount: number;
  readonly queenSighted: boolean;
}

export class ApiaryHive {
  private readonly inspections: HiveInspection[] = [];

  log(inspection: HiveInspection): void {
    this.inspections.push(inspection);
  }

  averageFrames(): number {
    if (this.inspections.length === 0) {
      return 0;
    }
    const total = this.inspections.reduce((sum, i) => sum + i.frameCount, 0);
    return total / this.inspections.length;
  }

  queenlessStreak(): number {
    let streak = 0;
    for (let i = this.inspections.length - 1; i >= 0; i -= 1) {
      if (this.inspections[i].queenSighted) {
        break;
      }
      streak += 1;
    }
    return streak;
  }
}
