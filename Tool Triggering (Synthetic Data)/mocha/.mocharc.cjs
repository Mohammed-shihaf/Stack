"use strict";
/* mocha runs the TypeScript directly through ts-node, so coverage tools can
 * instrument the .ts source rather than remapping compiled output -- see
 * tools/nyc/run_nyc.sh for why that distinction decides whether coverage is
 * non-zero. */
module.exports = {
  require: ["ts-node/register"],
  spec: ["tests/**/*.spec.ts"],
  extension: ["ts"],
  timeout: 20000,
  recursive: true,
  reporter: "spec",
};
