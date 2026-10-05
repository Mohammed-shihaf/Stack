import { jest } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadPackages } from "../../src/parsers/index.js";
import { loadFromBunLock } from "../../src/parsers/bun-lock.js";
import { loadNpmLockGraph } from "../../src/parsers/npm-lock-graph.js";
import { loadFromPackageJson } from "../../src/parsers/package-json.js";
import { loadFromPackageLock } from "../../src/parsers/package-lock.js";
import { loadFromPnpmLock, buildPnpmWorkspaceMap } from "../../src/parsers/pnpm-lock.js";
import { loadFromYarnLock } from "../../src/parsers/yarn-lock.js";
import { removeDir } from "../test-utils.js";

function createTempProjectDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-parser-test-"));
}

describe("pnpm-lock parser", () => {
  it("loads importer and package graph relationships", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `
lockfileVersion: '6.0'
importers:
  .:
    dependencies:
      react:
        version: 18.2.0
    devDependencies:
      jest:
        version: 30.3.0
packages:
  /react/18.2.0:
    dependencies:
      loose-envify: 1.4.0
  /loose-envify/1.4.0: {}
  /jest/30.3.0:
    dev: true
`,
      "utf8",
    );

    try {
      const allPackages = loadFromPnpmLock(lockPath, false);
      const prodPackages = loadFromPnpmLock(lockPath, true);

      expect(allPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "react", version: "18.2.0", paths: [["project", "react"]] }),
          expect.objectContaining({
            name: "loose-envify",
            version: "1.4.0",
            paths: [["project", "react", "loose-envify"]],
          }),
          expect.objectContaining({ name: "jest", version: "30.3.0", dev: true }),
        ]),
      );
      expect(prodPackages).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "jest" })]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("parses v9 lockfiles using snapshots section and name@version keys", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      react:
        specifier: ^18.0.0
        version: 18.2.0
      '@scope/lib':
        specifier: ^1.0.0
        version: 1.0.0
    devDependencies:
      jest:
        specifier: ^30.0.0
        version: 30.3.0
snapshots:
  react@18.2.0:
    dependencies:
      loose-envify: 1.4.0
      handlebars: 4.7.8(foo@1.0.0)
  loose-envify@1.4.0: {}
  'handlebars@4.7.8(foo@1.0.0)': {}
  '@scope/lib@1.0.0': {}
  jest@30.3.0:
    dev: true
`,
      "utf8",
    );

    try {
      const allPackages = loadFromPnpmLock(lockPath, false);
      const prodPackages = loadFromPnpmLock(lockPath, true);

      expect(allPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "react", version: "18.2.0", paths: [["project", "react"]] }),
          expect.objectContaining({
            name: "loose-envify",
            version: "1.4.0",
            paths: [["project", "react", "loose-envify"]],
          }),
          expect.objectContaining({ name: "handlebars", version: "4.7.8" }),
          expect.objectContaining({ name: "@scope/lib", version: "1.0.0", paths: [["project", "@scope/lib"]] }),
          expect.objectContaining({ name: "jest", version: "30.3.0", dev: true }),
        ]),
      );
      expect(prodPackages).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "jest" })]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("resolves transitive paths through pnpm v9 aliased dependencies", () => {
    // Reproduces the formisch/vm2 bug: a deep transitive package gets paths: []
    // when an intermediate node uses a pnpm alias (depName differs from real package name).
    // lockfile entry: '@remix-run/dev': '@vercel/remix-run-dev@1.16.1' — the value is not a
    // bare version string, so normalizePnpmDepRefV9 must handle it via lastIndexOf('@').
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      vercel:
        specifier: ^32.0.0
        version: 32.0.0
snapshots:
  vercel@32.0.0:
    dependencies:
      '@vercel/remix-builder': 2.0.0
  '@vercel/remix-builder@2.0.0':
    dependencies:
      '@remix-run/dev': '@vercel/remix-run-dev@1.16.1'
  '@vercel/remix-run-dev@1.16.1':
    dependencies:
      vm2: 3.9.19
  vm2@3.9.19: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const vm2 = packages.find(p => p.name === "vm2" && p.version === "3.9.19");

      expect(vm2).toBeDefined();
      expect(vm2?.paths).toEqual(
        expect.arrayContaining([
          ["project", "vercel", "@vercel/remix-builder", "@vercel/remix-run-dev", "vm2"],
        ]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("preserves multiple v9 paths to the same package version", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `
lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      lint-staged:
        specifier: ^16.4.0
        version: 16.4.0
      vite:
        specifier: ^7.3.2
        version: 7.3.2
      vitest:
        specifier: ^4.1.5
        version: 4.1.5
snapshots:
  lint-staged@16.4.0:
    dependencies:
      picomatch: 4.0.3
  vite@7.3.2:
    dependencies:
      picomatch: 4.0.3
      tinyglobby: 0.2.15
  vitest@4.1.5:
    dependencies:
      picomatch: 4.0.3
      vite: 7.3.2
  tinyglobby@0.2.15:
    dependencies:
      picomatch: 4.0.3
  picomatch@4.0.3: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const picomatch = packages.find(pkg => pkg.name === "picomatch" && pkg.version === "4.0.3");

      expect(picomatch?.paths).toEqual([
        ["project", "lint-staged", "picomatch"],
        ["project", "vite", "picomatch"],
        ["project", "vitest", "picomatch"],
        ["project", "vite", "tinyglobby", "picomatch"],
        ["project", "vitest", "vite", "picomatch"],
      ]);
    } finally {
      removeDir(projectDir);
    }
  });

  it("marks packages reachable only from devDependencies as dev in pnpm v9 lockfiles", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      axios:
        specifier: 0.21.1
        version: 0.21.1
    devDependencies:
      jest:
        specifier: ^29.0.0
        version: 29.0.0

snapshots:
  axios@0.21.1:
    dependencies:
      follow-redirects: 1.14.0

  follow-redirects@1.14.0: {}

  jest@29.0.0: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const axios = packages.find(p => p.name === "axios");
      const jest = packages.find(p => p.name === "jest");
      const followRedirects = packages.find(p => p.name === "follow-redirects");

      expect(axios?.dev).not.toBe(true);
      expect(jest?.dev).toBe(true);
      expect(followRedirects?.dev).not.toBe(true); // reachable from prod (axios) too
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark a v9 dependency dev when one workspace uses it as devDependency and another as production", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    // lodash is a devDependency in 'web' but a production dependency in 'api'. Modern v9
    // snapshots carry no per-package `dev:` field, so classification comes from importer
    // reachability. lodash must stay production because 'api' uses it in production.
    fs.writeFileSync(
      lockPath,
      `lockfileVersion: '9.0'

importers:

  packages/web:
    devDependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21

  packages/api:
    dependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21

packages:

  lodash@4.17.21:
    resolution: {integrity: sha512-a}

snapshots:

  lodash@4.17.21: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const lodash = packages.find(p => p.name === "lodash");

      expect(lodash?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark a v9 production transitive dev when its parent is dev in one workspace and production in another", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    // 'shared' is a devDependency in 'web' and a production dependency in 'api'; it pulls in
    // a transitive 'deep'. Because 'api' depends on 'shared' in production, both 'shared' and
    // 'deep' are reachable from a production root and must not be marked dev.
    fs.writeFileSync(
      lockPath,
      `lockfileVersion: '9.0'

importers:

  packages/web:
    devDependencies:
      shared:
        specifier: ^1.0.0
        version: 1.0.0

  packages/api:
    dependencies:
      shared:
        specifier: ^1.0.0
        version: 1.0.0

packages:

  shared@1.0.0:
    resolution: {integrity: sha512-a}
  deep@2.0.0:
    resolution: {integrity: sha512-b}

snapshots:

  shared@1.0.0:
    dependencies:
      deep: 2.0.0
  deep@2.0.0: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const shared = packages.find(p => p.name === "shared");
      const deep = packages.find(p => p.name === "deep");

      expect(shared?.dev).not.toBe(true);
      expect(deep?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("marks a v9 package dev when it is reachable only through devDependency importers", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    // eslint is a devDependency in both workspaces and reached from no production root, so it
    // (and its transitive) must be classified dev.
    fs.writeFileSync(
      lockPath,
      `lockfileVersion: '9.0'

importers:

  packages/web:
    devDependencies:
      eslint:
        specifier: ^9.0.0
        version: 9.0.0

  packages/api:
    devDependencies:
      eslint:
        specifier: ^9.0.0
        version: 9.0.0

packages:

  eslint@9.0.0:
    resolution: {integrity: sha512-a}
  eslint-dep@1.0.0:
    resolution: {integrity: sha512-b}

snapshots:

  eslint@9.0.0:
    dependencies:
      eslint-dep: 1.0.0
  eslint-dep@1.0.0: {}
`,
      "utf8",
    );

    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const eslint = packages.find(p => p.name === "eslint");
      const eslintDep = packages.find(p => p.name === "eslint-dep");

      expect(eslint?.dev).toBe(true);
      expect(eslintDep?.dev).toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("captures resolvedUrl from pnpm legacy lockfile resolution.tarball", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { "node-ipc": "9.2.3" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `lockfileVersion: 6.0\n\nimporters:\n  .:\n    dependencies:\n      node-ipc:\n        specifier: 9.2.3\n        version: /node-ipc/9.2.3\n\npackages:\n\n  /node-ipc/9.2.3:\n    resolution: {tarball: 'https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz'}\n    dev: false\n`,
      "utf8",
    );
    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const nodeIpc = packages.find(p => p.name === "node-ipc");
      expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    } finally {
      removeDir(projectDir);
    }
  });

  it("captures resolvedUrl from pnpm v9 lockfile resolution.tarball", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { "node-ipc": "9.2.3" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `lockfileVersion: '9.0'\n\nimporters:\n  .:\n    dependencies:\n      node-ipc:\n        specifier: 9.2.3\n        version: 9.2.3\n\npackages:\n  node-ipc@9.2.3:\n    resolution: {tarball: 'https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz'}\n\nsnapshots:\n  node-ipc@9.2.3: {}\n`,
      "utf8",
    );
    try {
      const packages = loadFromPnpmLock(lockPath, false);
      const nodeIpc = packages.find(p => p.name === "node-ipc");
      expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    } finally {
      removeDir(projectDir);
    }
  });

  it("loads the project lockfile from dual-document pnpm v9 files", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `---
lockfileVersion: '9.0'

importers:
  .:
    packageManagerDependencies:
      pnpm:
        specifier: 11.1.3
        version: 11.1.3

packages:
  pnpm@11.1.3: {}

---
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      left-pad:
        specifier: 1.0.1
        version: 1.0.1
    devDependencies:
      chalk:
        specifier: 5.6.2
        version: 5.6.2

packages:
  left-pad@1.0.1: {}
  chalk@5.6.2:
    dev: true

snapshots:
  left-pad@1.0.1: {}
  chalk@5.6.2:
    dev: true
`,
      "utf8",
    );

    try {
      const allPackages = loadFromPnpmLock(lockPath, false);
      const prodPackages = loadFromPnpmLock(lockPath, true);

      expect(allPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "left-pad", version: "1.0.1" }),
          expect.objectContaining({ name: "chalk", version: "5.6.2", dev: true }),
        ]),
      );
      expect(prodPackages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "left-pad", version: "1.0.1" })]),
      );
      expect(prodPackages.some(pkg => pkg.name === "chalk")).toBe(false);
      expect(allPackages.some(pkg => pkg.name === "pnpm")).toBe(false);
    } finally {
      removeDir(projectDir);
    }
  });

  it("throws when dual-document lockfiles have no identifiable project section", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `---
lockfileVersion: '9.0'
packages:
  foo@1.0.0: {}
---
lockfileVersion: '9.0'
packages:
  bar@2.0.0: {}
`,
      "utf8",
    );

    try {
      expect(() => loadFromPnpmLock(lockPath, false)).toThrow(
        /none could be identified as the project lockfile/,
      );
    } finally {
      removeDir(projectDir);
    }
  });

});

describe("pnpm-lock parse cache", () => {
  const LOCK = `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      react:
        specifier: 18.2.0
        version: 18.2.0
packages:
  react@18.2.0: {}
snapshots:
  react@18.2.0: {}
`;

  it("reads and parses an unchanged lockfile only once across multiple loader calls", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");
    fs.writeFileSync(lockPath, LOCK, "utf8");

    const spy = jest.spyOn(fs, "readFileSync");
    try {
      // Three loader calls that each used to read + parse the lockfile independently.
      loadFromPnpmLock(lockPath, false);
      buildPnpmWorkspaceMap(lockPath);
      loadFromPnpmLock(lockPath, false);

      const lockReads = spy.mock.calls.filter(call => call[0] === lockPath).length;
      expect(lockReads).toBe(1);
    } finally {
      spy.mockRestore();
      removeDir(projectDir);
    }
  });

  it("re-parses after the lockfile changes on disk (mtime cache-key invalidation)", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");
    fs.writeFileSync(lockPath, LOCK, "utf8");

    const first = loadFromPnpmLock(lockPath, false);
    expect(first.find(pkg => pkg.name === "react")?.version).toBe("18.2.0");

    // Same-length version bump keeps the file size identical, so only the mtime component
    // of the cache key can invalidate it. Force a clearly newer mtime to exercise that path.
    fs.writeFileSync(lockPath, LOCK.replace(/18\.2\.0/g, "18.3.1"), "utf8");
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(lockPath, future, future);

    try {
      const second = loadFromPnpmLock(lockPath, false);
      expect(second.find(pkg => pkg.name === "react")?.version).toBe("18.3.1");
    } finally {
      removeDir(projectDir);
    }
  });

  it("strips leading slashes in pnpm v9 package keys", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "pnpm-lock.yaml");

    fs.writeFileSync(
      lockPath,
      `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      '@babel/core':
        specifier: ^7.20.0
        version: 7.20.0
      express:
        specifier: ^4.18.2
        version: 4.18.2
snapshots:
  '/@babel/core@7.20.0': {}
  '/express@4.18.2': {}
  'express@4.18.2': {}
`,
      "utf8",
    );

    try {
      const pkgs = loadFromPnpmLock(lockPath, false);
      expect(pkgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "@babel/core", version: "7.20.0" }),
          expect.objectContaining({ name: "express", version: "4.18.2" }),
        ]),
      );
      expect(pkgs.find(pkg => pkg.name.startsWith("/"))).toBeUndefined();
    } finally {
      removeDir(projectDir);
    }
  });
});
