/** A single toll lane's vehicle class pricing, in cents. */
export type LaneClass = "car" | "motorcycle" | "truck";

const RATES: Record<LaneClass, number> = {
  motorcycle: 150,
  car: 300,
  truck: 750,
};

/** Tracks one toll lane: vehicles passed and revenue collected. */
export class TollBooth {
  private vehicleCount = 0;
  private revenueCents = 0;

  charge(laneClass: LaneClass): number {
    const rate = RATES[laneClass];
    this.vehicleCount += 1;
    this.revenueCents += rate;
    return rate;
  }

  averageFareCents(): number {
    if (this.vehicleCount === 0) {
      return 0;
    }
    return Math.round(this.revenueCents / this.vehicleCount);
  }

  totalRevenueCents(): number {
    return this.revenueCents;
  }

  totalVehicles(): number {
    return this.vehicleCount;
  }
}
