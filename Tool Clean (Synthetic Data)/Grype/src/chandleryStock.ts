export interface StockItem {
  readonly sku: string;
  readonly pinnedVersion: string;
  readonly quantity: number;
}

export class ChandleryStock {
  private readonly items = new Map<string, StockItem>();

  stock(item: StockItem): void {
    if (item.quantity < 0) {
      throw new RangeError(`sku ${item.sku} cannot have negative quantity`);
    }
    this.items.set(item.sku, item);
  }

  quantityOf(sku: string): number {
    return this.items.get(sku)?.quantity ?? 0;
  }

  skuCount(): number {
    return this.items.size;
  }
}
