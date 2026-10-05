import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadPackages } from "../../src/parsers/index.js";
import { loadFromBunLock } from "../../src/parsers/bun-lock.js";
import { loadNpmLockGraph } from "../../src/parsers/npm-lock-graph.js";
import { loadFromPackageJson } from "../../src/parsers/package-json.js";
import { loadFromPackageLock } from "../../src/parsers/package-lock.js";
import { loadFromPnpmLock } from "../../src/parsers/pnpm-lock.js";
import { loadFromYarnLock } from "../../src/parsers/yarn-lock.js";
import { removeDir } from "../test-utils.js";

function createTempProjectDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-parser-test-"));
}

describe("yarn.lock parser", () => {
  it("extracts package names and resolved versions from yarn classic lockfiles", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { chalk: "^5.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
chalk@^5.0.0:
  version "5.4.1"
  resolved "https://registry.yarnpkg.com/chalk/-/chalk-5.4.1.tgz"

"@babel/code-frame@^7.0.0":
  version "7.24.0"
  resolved "https://registry.yarnpkg.com/@babel/code-frame/-/code-frame-7.24.0.tgz"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);

      expect(packages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "chalk", version: "5.4.1", paths: [["project", "chalk"]] }),
          expect.objectContaining({ name: "@babel/code-frame", version: "7.24.0" }),
        ]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("reconstructs transitive dependency paths from yarn classic lockfiles", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { axios: "0.21.1" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
axios@0.21.1:
  version "0.21.1"
  dependencies:
    follow-redirects "^1.10.0"

follow-redirects@^1.10.0:
  version "1.14.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const axios = packages.find(pkg => pkg.name === "axios");
      const followRedirects = packages.find(pkg => pkg.name === "follow-redirects");

      expect(axios?.paths).toEqual([["project", "axios"]]);
      expect(followRedirects?.paths).toEqual([["project", "axios", "follow-redirects"]]);
    } finally {
      removeDir(projectDir);
    }
  });

  it("reconstructs parents for transitives pulled in through a workspace (dev)dependency", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "root", private: true, workspaces: ["packages/app"] }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "app"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "packages", "app", "package.json"),
      JSON.stringify({ name: "app", devDependencies: { "build-tool": "^1.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
build-tool@^1.0.0:
  version "1.0.0"
  dependencies:
    vuln-lib "^2.0.0"

vuln-lib@^2.0.0:
  version "2.1.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const vulnLib = packages.find(pkg => pkg.name === "vuln-lib");
      const buildTool = packages.find(pkg => pkg.name === "build-tool");

      expect(vulnLib?.paths).toEqual([["project", "app", "build-tool", "vuln-lib"]]);
      // The chain descends from a workspace devDependency, so both nodes are dev.
      expect(buildTool?.dev).toBe(true);
      expect(vulnLib?.dev).toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark a root production dependency dev when a workspace declares a same-named devDependency", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/app"],
        dependencies: { "shared-lib": "^1.0.0" },
      }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "app"), { recursive: true });
    // Workspace declares shared-lib as a devDependency at a version not in the lockfile,
    // so the only resolved path to shared-lib@1.0.0 is the root production one.
    fs.writeFileSync(
      path.join(projectDir, "packages", "app", "package.json"),
      JSON.stringify({ name: "app", devDependencies: { "shared-lib": "2.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
shared-lib@^1.0.0:
  version "1.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const sharedLib = packages.find(pkg => pkg.name === "shared-lib" && pkg.version === "1.0.0");

      // Reached as a root production dependency, so it must not be dev even though a
      // workspace happens to declare a devDependency by the same name.
      expect(sharedLib?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark a production transitive dev when a root dependency name collides with a workspace name", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    // "foo" is BOTH a workspace name and an ordinary root production dependency.
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/foo"],
        dependencies: { foo: "^1.0.0" },
      }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "foo"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "packages", "foo", "package.json"),
      JSON.stringify({ name: "foo", devDependencies: { "sub-dep": "^1.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
foo@^1.0.0:
  version "1.0.0"
  dependencies:
    sub-dep "^2.0.0"

sub-dep@^2.0.0:
  version "2.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const subDep = packages.find(pkg => pkg.name === "sub-dep" && pkg.version === "2.0.0");

      // sub-dep@2.0.0 is a transitive of the PRODUCTION root dependency "foo"; it must not
      // be dev just because a same-named workspace has a devDependency called "sub-dep".
      expect(subDep?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("keeps a production direct dependency production even when a dev package also depends on it", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    // "name" is a production direct dep, pinned exactly so it resolves via the fallback path;
    // it is ALSO pulled in by a devDependency ("other-pkg"). It must stay production.
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "root",
        dependencies: { name: "1.0.0" },
        devDependencies: { "other-pkg": "^1.0.0" },
      }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
name@^1.0.0:
  version "1.0.0"

other-pkg@^1.0.0:
  version "1.0.0"
  dependencies:
    name "^1.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const name = packages.find(pkg => pkg.name === "name" && pkg.version === "1.0.0");

      expect(name?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark a package reachable only via optionalDependencies as dev", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ optionalDependencies: { "opt-pkg": "^1.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
opt-pkg@^1.0.0:
  version "1.0.0"
  dependencies:
    opt-transitive "^1.0.0"

opt-transitive@^1.0.0:
  version "1.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const optTransitive = packages.find(pkg => pkg.name === "opt-transitive");

      expect(optTransitive?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("reconstructs workspace-scoped transitive paths from a Yarn Berry lockfile", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "root", private: true, workspaces: ["packages/app"] }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "app"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "packages", "app", "package.json"),
      JSON.stringify({ name: "app", devDependencies: { "build-tool": "^1.0.0" } }),
      "utf8",
    );
    const lockContent = [
      "__metadata:",
      "  version: 8",
      "",
      '"build-tool@npm:^1.0.0":',
      "  version: 1.0.0",
      '  resolution: "build-tool@npm:1.0.0"',
      "  dependencies:",
      "    vuln-lib: ^2.0.0",
      "",
      '"vuln-lib@npm:^2.0.0":',
      "  version: 2.1.0",
      '  resolution: "vuln-lib@npm:2.1.0"',
      "",
    ].join("\n");
    fs.writeFileSync(lockPath, lockContent, "utf8");

    try {
      const packages = loadFromYarnLock(lockPath);
      const vulnLib = packages.find(pkg => pkg.name === "vuln-lib");

      expect(vulnLib?.paths).toEqual([["project", "app", "build-tool", "vuln-lib"]]);
      expect(vulnLib?.dev).toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("attributes workspace transitives when workspaces use a glob pattern", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "root", private: true, workspaces: ["packages/*"] }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "web"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "packages", "web", "package.json"),
      JSON.stringify({ name: "web", dependencies: { "ui-lib": "^1.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
ui-lib@^1.0.0:
  version "1.0.0"
  dependencies:
    vuln-dep "^3.0.0"

vuln-dep@^3.0.0:
  version "3.2.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const vulnDep = packages.find(pkg => pkg.name === "vuln-dep");

      expect(vulnDep?.paths).toEqual([["project", "web", "ui-lib", "vuln-dep"]]);
    } finally {
      removeDir(projectDir);
    }
  });

  it("keeps a package production when reachable from a production root even if its displayed paths are all dev", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    // victim is pulled in by 5 root devDependencies (filling the 5-path display cap with dev
    // paths, which are seeded before workspace deps) AND by a production dependency p1 in a
    // workspace. The workspace prod path is recorded after the cap is full, so classification
    // must reflect the production reachability, not just the retained (capped) display paths.
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/api"],
        devDependencies: { d1: "^1.0.0", d2: "^1.0.0", d3: "^1.0.0", d4: "^1.0.0", d5: "^1.0.0" },
      }),
      "utf8",
    );
    fs.mkdirSync(path.join(projectDir, "packages", "api"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "packages", "api", "package.json"),
      JSON.stringify({ name: "api", dependencies: { p1: "^1.0.0" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
p1@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

d1@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

d2@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

d3@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

d4@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

d5@^1.0.0:
  version "1.0.0"
  dependencies:
    victim "^2.0.0"

victim@^2.0.0:
  version "2.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const victim = packages.find(pkg => pkg.name === "victim");

      expect(victim?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("preserves deep transitive paths needed for within-range remediation", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ devDependencies: { "aws-amplify": "6.16.3" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
aws-amplify@6.16.3:
  version "6.16.3"
  dependencies:
    "@aws-amplify/core" "6.16.1"

"@aws-amplify/core@6.16.1, @aws-amplify/core@^6.1.0":
  version "6.16.1"
  dependencies:
    js-cookie "^3.0.5"

js-cookie@^3.0.5:
  version "3.0.6"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const jsCookie = packages.find(pkg => pkg.name === "js-cookie" && pkg.version === "3.0.6");

      expect(jsCookie?.paths).toEqual([
        ["project", "aws-amplify", "@aws-amplify/core", "js-cookie"],
      ]);
    } finally {
      removeDir(projectDir);
    }
  });

  it("parses Yarn Berry (v2+) lockfiles using the resolution field", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { lodash: "^4.17.0" } }),
      "utf8",
    );

    const lockContent = [
      '__metadata:',
      '  version: 8',
      '  cacheKey: 10c0',
      '',
      '"lodash@npm:^4.17.0, lodash@npm:^4.17.21":',
      '  version: 4.17.21',
      '  resolution: "lodash@npm:4.17.21"',
      '  checksum: 10c0/abc123',
      '  languageName: node',
      '  linkType: hard',
      '',
      '"@babel/core@npm:^7.0.0":',
      '  version: 7.23.5',
      '  resolution: "@babel/core@npm:7.23.5"',
      '  languageName: node',
      '  linkType: hard',
      '',
      '"workspace-only@workspace:.":',
      '  version: 0.0.0-use.local',
      '  resolution: "workspace-only@workspace:."',
      '  languageName: unknown',
      '  linkType: soft',
    ].join('\n');

    fs.writeFileSync(lockPath, lockContent, 'utf8');

    try {
      const packages = loadFromYarnLock(lockPath);

      expect(packages).toHaveLength(2);
      expect(packages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'lodash', version: '4.17.21', paths: [['project', 'lodash']] }),
          expect.objectContaining({ name: '@babel/core', version: '7.23.5' }),
        ]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("marks packages reachable only from devDependencies as dev", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        dependencies: { axios: "0.21.1" },
        devDependencies: { jest: "^29.0.0" },
      }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
axios@0.21.1:
  version "0.21.1"

jest@^29.0.0:
  version "29.0.0"
  dependencies:
    jest-runner "^29.0.0"

jest-runner@^29.0.0:
  version "29.0.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const axios = packages.find(p => p.name === "axios");
      const jest = packages.find(p => p.name === "jest");
      const jestRunner = packages.find(p => p.name === "jest-runner");

      expect(axios?.dev).not.toBe(true);
      expect(jest?.dev).toBe(true);
      expect(jestRunner?.dev).toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("does not mark as dev when package is reachable from both prod and dev roots", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        dependencies: { axios: "0.21.1" },
        devDependencies: { "test-lib": "^1.0.0" },
      }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `
axios@0.21.1:
  version "0.21.1"
  dependencies:
    follow-redirects "^1.10.0"

"test-lib@^1.0.0":
  version "1.0.0"
  dependencies:
    follow-redirects "^1.10.0"

follow-redirects@^1.10.0:
  version "1.14.0"
`,
      "utf8",
    );

    try {
      const packages = loadFromYarnLock(lockPath);
      const followRedirects = packages.find(p => p.name === "follow-redirects");
      expect(followRedirects?.dev).not.toBe(true);
    } finally {
      removeDir(projectDir);
    }
  });

  it("reconstructs transitive paths in Yarn Berry when dep ref lacks npm: prefix", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { axios: "0.21.1" } }),
      "utf8",
    );

    // Berry lockfile: block header uses npm: prefix, but dependency entry inside the block does not.
    // This is the real format Yarn Berry emits and was the source of the regression.
    const lockContent = [
      "__metadata:",
      "  version: 8",
      "  cacheKey: 10c0",
      "",
      '"axios@npm:0.21.1":',
      "  version: 0.21.1",
      '  resolution: "axios@npm:0.21.1"',
      "  dependencies:",
      "    follow-redirects: ^1.10.0",
      "  languageName: node",
      "  linkType: hard",
      "",
      '"follow-redirects@npm:^1.10.0":',
      "  version: 1.14.0",
      '  resolution: "follow-redirects@npm:1.14.0"',
      "  languageName: node",
      "  linkType: hard",
    ].join("\n");

    fs.writeFileSync(lockPath, lockContent, "utf8");

    try {
      const packages = loadFromYarnLock(lockPath);
      const followRedirects = packages.find(p => p.name === "follow-redirects");

      expect(followRedirects?.paths).toEqual([["project", "axios", "follow-redirects"]]);
    } finally {
      removeDir(projectDir);
    }
  });

  it("captures resolvedUrl from Yarn Classic lockfile resolved field", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "yarn.lock");
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { "node-ipc": "9.2.3" } }),
      "utf8",
    );
    fs.writeFileSync(
      lockPath,
      `# yarn lockfile v1\n\n\nnode-ipc@9.2.3:\n  version "9.2.3"\n  resolved "https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz"\n`,
      "utf8",
    );
    try {
      const packages = loadFromYarnLock(lockPath);
      const nodeIpc = packages.find(p => p.name === "node-ipc");
      expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    } finally {
      removeDir(projectDir);
    }
  });

});
