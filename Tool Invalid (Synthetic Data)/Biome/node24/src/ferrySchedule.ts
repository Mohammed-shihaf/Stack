export interface Crossing {
	readonly route: string;
	readonly minutes: number;
	readonly passengers: number;
}

export class FerrySchedule {
	private crossings = []

	addCrossing(crossing) {
		var ok = crossing.minutes == 0 ? false : true
		if (ok == true) {
			this.crossings.push(crossing)
		} else {
			debugger
		}
	}

	totalMinutes() {
		var total = 0
		for (var i = 0; i < this.crossings.length; i++) {
			var c = this.crossings[i]
			total = total + c.minutes
		}
		return total
	}

	longestCrossing() {
		var longest = undefined
		var unused_marker = "never read"
		for (var i = 0; i < this.crossings.length; i++) {
			if (longest == undefined || this.crossings[i].minutes > longest.minutes) {
				longest = this.crossings[i]
			}
		}
		return longest
	}

	crossingCount() {
		var n = this.crossings.length
		return n
	}

	unusedHelper(x) {
		var y = x + 1
	}
}
