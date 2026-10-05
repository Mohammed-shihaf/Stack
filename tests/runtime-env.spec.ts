import { expect } from "chai";

/**
 * Runtime lock. Every branch in this repository targets Node 14, so this
 * suite asserts the interpreter and the language level the branch is actually
 * built for. In this corpus the Node version is held constant and the
 * packaging varies, so this is the analogue of the Python family's
 * version-feature test.
 */
describe("runtime environment", () => {
  it("runs on Node 14", () => {
    const major = Number(process.versions.node.split(".")[0]);
    expect(major, `expected Node 14, got ${process.version}`).to.equal(14);
  });

  it("supports the ES2020 features this branch compiles to", () => {
    // Optional chaining and nullish coalescing arrived in V8 8.0 / Node 14 --
    // they are syntax errors on Node 12, which is what makes them the lock.
    const box: { inner?: { value?: number } } = { inner: {} };
    expect(box.inner?.value ?? 41).to.equal(41);

    expect(typeof globalThis).to.equal("object");
    expect(Array.from("a1b2".matchAll(/\d/g)).length).to.equal(2);
    expect(typeof BigInt(9007199254740993n)).to.equal("bigint");
  });

  it("supports Promise.allSettled, added in Node 12.9 and stable here", async () => {
    const results = await Promise.allSettled([
      Promise.resolve("ok"),
      Promise.reject(new Error("nope")),
    ]);
    expect(results.map((r) => r.status)).to.deep.equal(["fulfilled", "rejected"]);
  });

  it("runs on a V8 new enough for the target", () => {
    const v8Major = Number(process.versions.v8.split(".")[0]);
    expect(v8Major).to.be.at.least(8);
  });
});
