import { expect } from "chai";

/**
 * Runtime lock. Every branch here targets Node 16, so this suite asserts
 * the interpreter and the language level the branch is actually built for.
 * In this corpus the Node version is held constant and the packaging varies,
 * so this is the analogue of the Python family's version-feature test.
 */
describe("runtime environment", () => {
  it("runs on Node 16", () => {
    const major = Number(process.versions.node.split(".")[0]);
    expect(major, `expected Node 16, got ${process.version}`).to.equal(16);
  });

  it("supports the ES2021 features this branch compiles to", () => {
    // Optional chaining and nullish coalescing: V8 8.0 / Node 14.
    const box: { inner?: { value?: number } } = { inner: {} };
    expect(box.inner?.value ?? 41).to.equal(41);
    expect(typeof globalThis).to.equal("object");

    // ES2021, i.e. Node 15+: these are what lock this branch above Node 14.
    expect("a-b-c".replaceAll("-", "+")).to.equal("a+b+c");
    let counter: number | null = null;
    counter ??= 7;
    expect(counter).to.equal(7);
    expect(1_000_000).to.equal(1000000);
  });

  it("supports Promise.any, added in ES2021", async () => {
    const first = await Promise.any([
      Promise.reject(new Error("slow")),
      Promise.resolve("fast"),
    ]);
    expect(first).to.equal("fast");
  });

  it("supports Promise.allSettled", async () => {
    const results = await Promise.allSettled([
      Promise.resolve("ok"),
      Promise.reject(new Error("nope")),
    ]);
    expect(results.map((r) => r.status)).to.deep.equal(["fulfilled", "rejected"]);
  });

  it("runs on a V8 new enough for the target", () => {
    expect(Number(process.versions.v8.split(".")[0])).to.be.at.least(9);
  });
});
