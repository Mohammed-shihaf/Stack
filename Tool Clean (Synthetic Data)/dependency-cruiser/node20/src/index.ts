import { SpiceMarketLedger } from "./ledger";

const ledger = new SpiceMarketLedger();
ledger.record({ spiceName: "cardamom", kilograms: 4, pricePerKiloCents: 1899 });
console.log(`market value: ${ledger.totalValueCents()}`);
