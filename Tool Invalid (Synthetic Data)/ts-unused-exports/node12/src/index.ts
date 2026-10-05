import { HarborTariff, tariffCents, type Berth } from "./harborTariff";

const berth: Berth = { berthId: "B4", lengthMetres: 42 };
const tariff = new HarborTariff();
tariff.addBerth(berth);
console.log(`B4 base rate: ${tariffCents(berth, 1)}`);
console.log(`B4 three hours: ${tariff.chargeFor("B4", 3)}`);
