export interface Crossing {
	readonly departurePort: string;
	readonly arrivalPort: string;
	readonly minutes: number;
}

export class FerrySchedule {
	private readonly crossings: Crossing[] = [];

	addCrossing(crossing: Crossing): void {
		if (crossing.minutes <= 0) {
			throw new RangeError("crossing duration must be positive");
		}
		this.crossings.push(crossing);
	}

	totalMinutes(): number {
		return this.crossings.reduce((sum, crossing) => sum + crossing.minutes, 0);
	}

	longestCrossing(): Crossing | undefined {
		return this.crossings.reduce<Crossing | undefined>((longest, crossing) => {
			if (!longest || crossing.minutes > longest.minutes) {
				return crossing;
			}
			return longest;
		}, undefined);
	}

	crossingCount(): number {
		return this.crossings.length;
	}
}
