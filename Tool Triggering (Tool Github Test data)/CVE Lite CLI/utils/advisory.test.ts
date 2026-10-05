import type { PackageRef } from "../../src/types.js";
import {
  isPrivateRegistrySource,
  isGitSource,
  hasCommitShaPinning,
} from "../../src/utils/advisory.js";

function makePkg(overrides: Partial<PackageRef> = {}): PackageRef {
  return {
    name: "some-pkg",
    version: "1.0.0",
    ecosystem: "npm",
    ...overrides,
  };
}

describe("isPrivateRegistrySource", () => {
  it("returns true when resolvedUrl points to a private registry", () => {
    const pkg = makePkg({
      resolvedUrl: "https://npm.mycompany.internal/some-pkg/-/some-pkg-1.0.0.tgz",
    });
    expect(isPrivateRegistrySource(pkg)).toBe(true);
  });

  it("returns false when resolvedUrl points to the public npm registry", () => {
    const pkg = makePkg({
      resolvedUrl: "https://registry.npmjs.org/some-pkg/-/some-pkg-1.0.0.tgz",
    });
    expect(isPrivateRegistrySource(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is undefined", () => {
    const pkg = makePkg({ resolvedUrl: undefined });
    expect(isPrivateRegistrySource(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is an empty string", () => {
    const pkg = makePkg({ resolvedUrl: "" });
    expect(isPrivateRegistrySource(pkg)).toBe(false);
  });
});

describe("isGitSource", () => {
  it("returns true when resolvedUrl is a GitHub URL", () => {
    const pkg = makePkg({
      resolvedUrl: "https://github.com/some-org/some-repo",
    });
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns false when resolvedUrl points to the public npm registry", () => {
    const pkg = makePkg({
      resolvedUrl: "https://registry.npmjs.org/some-pkg/-/some-pkg-1.0.0.tgz",
    });
    expect(isGitSource(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is undefined", () => {
    const pkg = makePkg({ resolvedUrl: undefined });
    expect(isGitSource(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is an empty string", () => {
    const pkg = makePkg({ resolvedUrl: "" });
    expect(isGitSource(pkg)).toBe(false);
  });

  it("returns true when resolvedUrl uses the git+https scheme", () => {
    const pkg = makePkg({
      resolvedUrl: "git+https://github.com/some-org/some-repo.git",
    });
    expect(isGitSource(pkg)).toBe(true);
  });

  it("returns true when resolvedUrl uses the git+ssh scheme", () => {
    const pkg = makePkg({
      resolvedUrl: "git+ssh://git@github.com/some-org/some-repo.git",
    });
    expect(isGitSource(pkg)).toBe(true);
  });
});

describe("hasCommitShaPinning", () => {
  it("returns true when resolvedUrl contains a 40-character commit SHA", () => {
    const pkg = makePkg({
      resolvedUrl:
        "git+https://github.com/some-org/some-repo.git#a1b2c3d4e5f6789012345678901234567890abcd",
    });
    expect(hasCommitShaPinning(pkg)).toBe(true);
  });

  it("returns false when resolvedUrl has no commit SHA", () => {
    const pkg = makePkg({
      resolvedUrl: "git+https://github.com/some-org/some-repo.git#main",
    });
    expect(hasCommitShaPinning(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl has a short (abbreviated) commit SHA", () => {
    const pkg = makePkg({
      resolvedUrl: "git+https://github.com/some-org/some-repo.git#a1b2c3d",
    });
    expect(hasCommitShaPinning(pkg)).toBe(false);
  });

  it("returns false when resolvedUrl is undefined", () => {
    const pkg = makePkg({ resolvedUrl: undefined });
    expect(hasCommitShaPinning(pkg)).toBe(false);
  });
});

