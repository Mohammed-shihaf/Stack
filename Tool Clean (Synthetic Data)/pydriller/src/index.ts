import { MillpondHistory } from "./millpondHistory";

const history = new MillpondHistory();
history.record({ pondId: "east", centimetres: 142 });
console.log(`recorded ${history.readingCount()} readings`);
