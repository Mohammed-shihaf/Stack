import { expect } from "chai";

/**
 * Runtime lock. Every branch in this repository targets Node 12, so this suite
 * asserts the interpreter and the language level the branch is actually built
 * for. It is the analogue of the Python family's version-feature test, adapted
 * to a corpus where the Node version is held constant and the packaging varies.
 */
describe("runtime environment", () => {
  it("runs on Node 12", () => {
    const major = Number(process.versions.node.split(".")[0]);
    expect(major, `expected Node 12, got ${process.version}`).to.equal(12);
  });

  it("supports the ES2019 features this branch compiles to", () => {
    expect([[1, 2], [3]].flat()).to.deep.equal([1, 2, 3]);
    expect(Object.fromEntries([["a", 1]])).to.deep.equal({ a: 1 });
    expect("  padded ".trimStart().trimEnd()).to.equal("padded");
    expect([1, 2].flatMap((n) => [n, n * 2])).to.deep.equal([1, 2, 2, 4]);
  });

  it("does not rely on syntax newer than the target", () => {
    // Optional chaining and nullish coalescing arrived in V8 8.0 / Node 14.
    // TypeScript downlevels them, but source is kept ES2019-idiomatic so that
    // token-based tools see what the runtime would see.
    const v8Major = Number(process.versions.v8.split(".")[0]);
    expect(v8Major).to.be.lessThan(8);
  });
});
