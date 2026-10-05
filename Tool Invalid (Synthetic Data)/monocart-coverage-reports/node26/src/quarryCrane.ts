export interface LiftRequest {
  readonly blockTonnes: number;
  readonly craneCapacityTonnes: number;
}

export function canLift(request: LiftRequest): boolean {
  return request.blockTonnes <= request.craneCapacityTonnes;
}

export function safetyMarginTonnes(request: LiftRequest): number {
  const margin = request.craneCapacityTonnes - request.blockTonnes;
  return margin > 0 ? margin : 0;
}

// Everything below is real, reachable code that driver.ts never calls --
// it exists purely to drag real-v8 statement/branch coverage for this
// family well under 50%.
export interface SwingPlan {
  readonly startDegrees: number;
  readonly endDegrees: number;
}

export function swingArcDegrees(plan: SwingPlan): number {
  if (plan.endDegrees >= plan.startDegrees) {
    return plan.endDegrees - plan.startDegrees;
  }
  return 360 - plan.startDegrees + plan.endDegrees;
}

export function isOverSwingLimit(plan: SwingPlan, limitDegrees: number): boolean {
  return swingArcDegrees(plan) > limitDegrees;
}

export function craneUtilization(request: LiftRequest): number {
  if (request.craneCapacityTonnes <= 0) {
    return 0;
  }
  return request.blockTonnes / request.craneCapacityTonnes;
}

export function recommendedCrewSize(request: LiftRequest): number {
  if (request.blockTonnes > 50) {
    return 6;
  }
  if (request.blockTonnes > 20) {
    return 4;
  }
  if (request.blockTonnes > 5) {
    return 3;
  }
  return 2;
}

export function describeLift(request: LiftRequest): string {
  if (!canLift(request)) {
    return "REJECTED: over capacity";
  }
  const margin = safetyMarginTonnes(request);
  if (margin < 1) {
    return "CAUTION: minimal margin";
  }
  return "APPROVED";
}
