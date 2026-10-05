import { calculatePathCoverage, formatDependencyPath } from "../../src/utils/path-coverage.js";

describe("calculatePathCoverage", () => {
  it("moves a matching path to coveredPaths and leaves other paths remaining", () => {
    expect(calculatePathCoverage([["root", "left"], ["root", "right"]], ["root", "left"])).toEqual({
      coverage: "partial",
      coveredPaths: [["root", "left"]],
      remainingPaths: [["root", "right"]],
    });
  });

  it("reports complete coverage when the only known path is covered", () => {
    expect(calculatePathCoverage([["root", "only"]], ["root", "only"])).toEqual({
      coverage: "complete",
      coveredPaths: [["root", "only"]],
      remainingPaths: [],
    });
  });

  it.each([null, undefined, []] as const)("leaves every known path uncovered for %p", coveredPath => {
    expect(calculatePathCoverage([["a"], ["b"]], coveredPath)).toEqual({
      coverage: "partial",
      coveredPaths: [],
      remainingPaths: [["a"], ["b"]],
    });
  });

  it("reports complete coverage for an empty known-path set", () => {
    expect(calculatePathCoverage([], undefined)).toEqual({
      coverage: "complete",
      coveredPaths: [],
      remainingPaths: [],
    });
  });

  it("compares paths by ordered elements and length", () => {
    const knownPaths = [["a", "b"], ["b", "a"], ["a"]];

    expect(calculatePathCoverage(knownPaths, ["a", "b"])).toEqual({
      coverage: "partial",
      coveredPaths: [["a", "b"]],
      remainingPaths: [["b", "a"], ["a"]],
    });
  });
});

describe("formatDependencyPath", () => {
  it.each([
    [["a", "b", "c"], "a -> b -> c"],
    [["only"], "only"],
    [[], ""],
  ])("formats %p as %p", (path, formattedPath) => {
    expect(formatDependencyPath(path)).toBe(formattedPath);
  });
});
