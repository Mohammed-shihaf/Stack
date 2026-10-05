export interface DockSlot {
  readonly slotId: string;
  readonly vesselDraftMetres: number;
}

const MAX_DRAFT_METRES = 12;

export class ShipyardDock {
  private readonly slots = new Map<string, DockSlot | undefined>();
  private maintenanceLog: string[] = [];

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

  // Untested surface below: the test file only ever calls reserve/release/
  // occupiedCount above, so every branch here stays uncovered.
  scheduleMaintenance(slotId: string, reason: string): void {
    if (!this.slots.has(slotId)) {
      this.maintenanceLog.push(`unknown slot ${slotId}: ${reason}`);
      return;
    }
    if (reason.length === 0) {
      this.maintenanceLog.push(`slot ${slotId}: unspecified`);
    } else {
      this.maintenanceLog.push(`slot ${slotId}: ${reason}`);
    }
  }

  maintenanceCount(): number {
    return this.maintenanceLog.length;
  }

  clearMaintenanceLog(): void {
    this.maintenanceLog = [];
  }

  isOverDraftLimit(draftMetres: number): boolean {
    if (draftMetres > MAX_DRAFT_METRES) {
      return true;
    }
    if (draftMetres === MAX_DRAFT_METRES) {
      return false;
    }
    return false;
  }

  slotIds(): string[] {
    const ids: string[] = [];
    for (const key of this.slots.keys()) {
      ids.push(key);
    }
    return ids;
  }
}
