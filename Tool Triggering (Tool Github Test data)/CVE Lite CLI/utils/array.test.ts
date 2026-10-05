import { chunk, unique, uniquePathArrays } from "../../src/utils/array.js";

describe("chunk", () => {
  it("splits an array into exact multiples of size", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("handles a final short group when length is not evenly divisible", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single chunk when size is larger than the array length", () => {
    expect(chunk(["a", "b"], 5)).toEqual([["a", "b"]]);
  });

  it("returns an empty array when input is empty", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("chunks into single-element arrays when size is 1", () => {
    expect(chunk([10, 20, 30], 1)).toEqual([[10], [20], [30]]);
  });

  it("does not mutate the original array", () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    chunk(original, 2);
    expect(original).toEqual(originalCopy);
  });

  it("works with arrays of objects", () => {
    const objA = { id: 1 };
    const objB = { id: 2 };
    const objC = { id: 3 };
    expect(chunk([objA, objB, objC], 2)).toEqual([[objA, objB], [objC]]);
  });
});

describe("unique", () => {
  it("removes duplicate elements while preserving first-seen order", () => {
    expect(unique([1, 2, 1, 3, 2, 4])).toEqual([1, 2, 3, 4]);
    expect(unique(["b", "a", "b", "c", "a"])).toEqual(["b", "a", "c"]);
  });

  it("returns an identical array when all elements are unique", () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    expect(unique(["x", "y", "z"])).toEqual(["x", "y", "z"]);
  });

  it("returns an empty array when input is empty", () => {
    expect(unique([])).toEqual([]);
  });

  it("reduces an array of identical elements to a single element", () => {
    expect(unique(["dup", "dup", "dup"])).toEqual(["dup"]);
  });

  it("does not mutate the original array", () => {
    const original = [1, 2, 2, 3];
    const originalCopy = [...original];
    unique(original);
    expect(original).toEqual(originalCopy);
  });
});

describe("uniquePathArrays", () => {
  it("drops duplicate path arrays while preserving distinct paths in order", () => {
    const paths = [
      ["root", "pkg-a", "dep-1"],
      ["root", "pkg-b"],
      ["root", "pkg-a", "dep-1"],
      ["root", "pkg-c"],
    ];

    expect(uniquePathArrays(paths)).toEqual([
      ["root", "pkg-a", "dep-1"],
      ["root", "pkg-b"],
      ["root", "pkg-c"],
    ]);
  });

  it("treats path arrays with different ordering as distinct", () => {
    const paths = [
      ["pkg-a", "pkg-b"],
      ["pkg-b", "pkg-a"],
    ];

    expect(uniquePathArrays(paths)).toEqual([
      ["pkg-a", "pkg-b"],
      ["pkg-b", "pkg-a"],
    ]);
  });

  it("treats single-element paths vs multi-element paths distinctly", () => {
    const paths = [["pkg-a"], ["pkg-a", "pkg-b"], ["pkg-a"]];

    expect(uniquePathArrays(paths)).toEqual([["pkg-a"], ["pkg-a", "pkg-b"]]);
  });

  it("returns an empty array when input is empty", () => {
    expect(uniquePathArrays([])).toEqual([]);
  });

  it("deduplicates empty path arrays", () => {
    expect(uniquePathArrays([[], []])).toEqual([[]]);
  });

  it("does not mutate the original array of paths or sub-arrays", () => {
    const original = [["a", "b"], ["a", "b"], ["c"]];
    const originalClone = original.map((sub) => [...sub]);
    uniquePathArrays(original);
    expect(original).toEqual(originalClone);
  });
});
