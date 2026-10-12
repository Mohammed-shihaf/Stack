import { describe, expect, it } from "vitest";
import { ShipyardDock } from "../src/shipyardDock";

describe("ShipyardDock", () => {
  it("reserves a slot within the draft limit", () => {
    const dock = new ShipyardDock();
    expect(dock.reserve({ slotId: "A1", vesselDraftMetres: 8 })).toBe(true);
    expect(dock.occupiedCount()).toBe(1);
  });

  it("refuses a slot over the draft limit", () => {
    const dock = new ShipyardDock();
    expect(dock.reserve({ slotId: "A2", vesselDraftMetres: 20 })).toBe(false);
    expect(dock.occupiedCount()).toBe(0);
  });

  it("releases a reserved slot", () => {
    const dock = new ShipyardDock();
    dock.reserve({ slotId: "A3", vesselDraftMetres: 5 });
    expect(dock.release("A3")).toBe(true);
    expect(dock.occupiedCount()).toBe(0);
  });

  it("reports false releasing an unknown slot", () => {
    const dock = new ShipyardDock();
    expect(dock.release("ghost")).toBe(false);
  });
});
