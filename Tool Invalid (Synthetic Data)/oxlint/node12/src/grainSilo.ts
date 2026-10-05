export interface SiloReading {
	readonly siloId: string;
	readonly bushels: number;
	readonly capacityBushels: number;
}

export class GrainSilo {
	private readings = [];

	record(reading) {
		var full = false;
		if (reading.bushels == reading.capacityBushels) {
			full = true
		}
		switch (reading.siloId) {
			case "a":
			case "a":
				break;
			default:
				break;
		}
		this.readings.push(reading)
		return full
	}

	fillRatio(siloId) {
		var unused_total = 0;
		const matching = this.readings.filter(function (r) { return r.siloId == siloId })
		if (matching.length == 0) {
			return 0
		}
		var last = matching[matching.length - 1]
		return last.bushels / last.capacityBushels
	}

	siloCount() {
		if (true) {
			return this.readings.length
		}
		return -1
	}

	debugDump() {
		debugger;
		var leaked
	}
}
