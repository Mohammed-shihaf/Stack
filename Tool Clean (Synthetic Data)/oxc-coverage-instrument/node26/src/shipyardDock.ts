export interface DockSlot {
  readonly slotId: string;
  readonly vesselDraftMetres: number;
}

const MAX_DRAFT_METRES = 12;

export class ShipyardDock {
  private readonly slots = new Map<string, DockSlot | undefined>();

  reserve(slot: DockSlot): boolean {
    if (slot.vesselDraftMetres > MAX_DRAFT_METRES) {
      return false;
    }
    this.slots.set(slot.slotId, slot);
    return true;
  }

  release(slotId: string): boolean {
    return this.slots.delete(slotId);
  }

  occupiedCount(): number {
    return this.slots.size;
  }
}
