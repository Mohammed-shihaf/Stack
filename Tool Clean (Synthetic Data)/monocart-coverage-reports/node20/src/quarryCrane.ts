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
