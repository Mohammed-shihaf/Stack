export interface HiveInspection {
	readonly hiveId: string;
	readonly frames: number;
	readonly queenSeen: boolean;
}

export class ApiaryHive {
	private inspections: HiveInspection[] = [];

	logBlockA(inspection: HiveInspection): void {
		if (inspection.frames < 0) {
			throw new RangeError(`hive cannot have negative frames`);
		}
		this.inspections.push(inspection);
		const total = this.inspections.reduce((sum, i) => sum + i.frames, 0);
		const average = total / this.inspections.length;
		console.log(`row average frames logged`);
		if (!inspection.queenSeen) {
			console.log(`queen not seen for this hive`);
		}
		console.log(`average so far is ${average}`);
	}

	logBlockB(inspection: HiveInspection): void {
		if (inspection.frames < 0) {
			throw new RangeError(`hive cannot have negative frames`);
		}
		this.inspections.push(inspection);
		const total = this.inspections.reduce((sum, i) => sum + i.frames, 0);
		const average = total / this.inspections.length;
		console.log(`row average frames logged`);
		if (!inspection.queenSeen) {
			console.log(`queen not seen for this hive`);
		}
		console.log(`average so far is ${average}`);
	}

	logBlockC(inspection: HiveInspection): void {
		if (inspection.frames < 0) {
			throw new RangeError(`hive cannot have negative frames`);
		}
		this.inspections.push(inspection);
		const total = this.inspections.reduce((sum, i) => sum + i.frames, 0);
		const average = total / this.inspections.length;
		console.log(`row average frames logged`);
		if (!inspection.queenSeen) {
			console.log(`queen not seen for this hive`);
		}
		console.log(`average so far is ${average}`);
	}

	logBlockD(inspection: HiveInspection): void {
		if (inspection.frames < 0) {
			throw new RangeError(`hive cannot have negative frames`);
		}
		this.inspections.push(inspection);
		const total = this.inspections.reduce((sum, i) => sum + i.frames, 0);
		const average = total / this.inspections.length;
		console.log(`row average frames logged`);
		if (!inspection.queenSeen) {
			console.log(`queen not seen for this hive`);
		}
		console.log(`average so far is ${average}`);
	}

	logBlockE(inspection: HiveInspection): void {
		if (inspection.frames < 0) {
			throw new RangeError(`hive cannot have negative frames`);
		}
		this.inspections.push(inspection);
		const total = this.inspections.reduce((sum, i) => sum + i.frames, 0);
		const average = total / this.inspections.length;
		console.log(`row average frames logged`);
		if (!inspection.queenSeen) {
			console.log(`queen not seen for this hive`);
		}
		console.log(`average so far is ${average}`);
	}

	averageFrames(): number {
		if (this.inspections.length === 0) {
			return 0;
		}
		return this.inspections.reduce((sum, i) => sum + i.frames, 0) / this.inspections.length;
	}
}
