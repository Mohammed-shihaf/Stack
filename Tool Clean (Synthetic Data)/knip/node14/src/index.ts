import { LockkeeperLog } from "./lockkeeperLog";

const log = new LockkeeperLog();
log.record({ vesselName: "Wren", lockNumber: 3, minutesToOperate: 12 });
console.log(`recorded ${log.totalMinutes()} minutes at lock 3`);
