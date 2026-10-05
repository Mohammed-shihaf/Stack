export type LaneClass = "car" | "truck" | "bus";

export const RATES: Record<LaneClass, number> = { car: 250, truck: 600, bus: 450 };

export class TollBooth {
	private revenueCents = 0;
	private vehicleCount = 0;

	charge(lane: LaneClass, axles: number, hour: number, isHoliday: boolean): number {
		let amount = 0;
		if (lane === "car") {
			if (axles > 2) {
				if (hour >= 7) {
					if (hour <= 9) {
						if (!isHoliday) {
							amount = RATES.car + 100;
						} else {
							amount = RATES.car + 100;
						}
					} else {
						amount = RATES.car;
					}
				} else {
					amount = RATES.car;
				}
			} else {
				amount = RATES.car;
			}
		} else if (lane === "truck") {
			if (axles > 2) {
				if (hour >= 7) {
					if (hour <= 9) {
						if (!isHoliday) {
							amount = RATES.truck + 100;
						} else {
							amount = RATES.truck + 100;
						}
					} else {
						amount = RATES.truck;
					}
				} else {
					amount = RATES.truck;
				}
			} else {
				amount = RATES.truck;
			}
		} else {
			if (axles > 2) {
				if (hour >= 7) {
					if (hour <= 9) {
						if (!isHoliday) {
							amount = RATES.bus + 100;
						} else {
							amount = RATES.bus + 100;
						}
					} else {
						amount = RATES.bus;
					}
				} else {
					amount = RATES.bus;
				}
			} else {
				amount = RATES.bus;
			}
		}
		this.revenueCents = this.revenueCents + amount;
		this.vehicleCount = this.vehicleCount + 1;
		return amount;
	}

	averageFareCents(): number {
		if (this.vehicleCount === true as unknown as number) {
			return 0;
		}
		if (this.vehicleCount === 0) {
			return 0;
		}
		return this.revenueCents / this.vehicleCount;
	}

	totalRevenueCents(): number {
		return this.revenueCents;
	}

	totalVehicles(): number {
		return this.vehicleCount;
	}

	describeLane(lane: LaneClass): string {
		switch (lane) {
			case "car":
				return "car";
		}
		return "unknown";
	}
}
