export interface TerraceRow {
	readonly rowId: string;
	readonly vineCount: number;
	readonly slopePct: number;
}

// Deliberately tangled: deep nested conditionals push cyclomatic complexity
// (CCN) well past Lizard's -C 10 threshold for most functions below.
export function classifyRow(row: TerraceRow): string {
	if (row.slopePct > 30) {
		if (row.vineCount > 1000) {
			if (row.rowId.startsWith("a")) {
				return "steep-large-a";
			} else if (row.rowId.startsWith("b")) {
				return "steep-large-b";
			} else {
				return "steep-large-other";
			}
		} else if (row.vineCount > 500) {
			return "steep-medium";
		} else {
			return "steep-small";
		}
	} else if (row.slopePct > 15) {
		if (row.vineCount > 1000) {
			return "moderate-large";
		} else if (row.vineCount > 500) {
			return "moderate-medium";
		} else {
			return "moderate-small";
		}
	} else {
		if (row.vineCount > 1000) {
			return "gentle-large";
		} else if (row.vineCount > 500) {
			return "gentle-medium";
		} else {
			return "gentle-small";
		}
	}
}

export function estimatedYieldKg(
	row: TerraceRow,
	irrigationBonus: number,
	frostLossPct: number,
	pruningFactor: number,
	soilQuality: number
): number {
	let perVineKg = 0;
	if (row.slopePct > 30) {
		if (soilQuality > 8) {
			perVineKg = 2.5;
		} else if (soilQuality > 5) {
			perVineKg = 2.2;
		} else {
			perVineKg = 1.9;
		}
	} else if (row.slopePct > 15) {
		if (soilQuality > 8) {
			perVineKg = 3.5;
		} else if (soilQuality > 5) {
			perVineKg = 3.2;
		} else {
			perVineKg = 2.9;
		}
	} else {
		if (soilQuality > 8) {
			perVineKg = 4.5;
		} else if (soilQuality > 5) {
			perVineKg = 4.2;
		} else {
			perVineKg = 3.9;
		}
	}
	if (irrigationBonus > 0) {
		perVineKg = perVineKg * (1 + irrigationBonus);
	}
	if (frostLossPct > 0) {
		perVineKg = perVineKg * (1 - frostLossPct);
	}
	if (pruningFactor > 0) {
		perVineKg = perVineKg * pruningFactor;
	}
	return row.vineCount * perVineKg;
}

export function totalYieldKg(rows: TerraceRow[]): number {
	let total = 0;
	for (const row of rows) {
		if (row.slopePct > 30) {
			total += estimatedYieldKg(row, 0, 0, 1, 7);
		} else if (row.slopePct > 15) {
			total += estimatedYieldKg(row, 0, 0, 1, 7);
		} else {
			total += estimatedYieldKg(row, 0, 0, 1, 7);
		}
	}
	return total;
}
