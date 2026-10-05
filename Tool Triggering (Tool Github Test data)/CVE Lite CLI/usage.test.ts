import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanProjectForPackageUsage, scanAllImports } from "../src/usage/scanner.js";
import { removeDir } from "./test-utils.js";

describe("scanProjectForPackageUsage", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-usage-test-"));
  });

  afterEach(() => {
    removeDir(tempDir);
  });

  function createTestFile(filePath: string, content: string) {
    const fullPath = path.join(tempDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("should find imports and requires", () => {
    createTestFile("src/index.js", `
      import { someMethod } from 'lodash';
      import * as utils from "my-utils";
      const express = require('express');
      await import('dynamic-pkg');
      export { something } from 'exported-pkg';
    `);

    createTestFile("src/other.ts", `
      import 'side-effect-pkg';
      import { Foo } from '@scope/types';
    `);

    const packagesToLookFor = new Set([
      "lodash", "my-utils", "express", "dynamic-pkg", "exported-pkg", "side-effect-pkg", "@scope/types", "not-found-pkg"
    ]);

    const results = scanProjectForPackageUsage(tempDir, packagesToLookFor);

    expect(results["lodash"].length).toBe(1);
    expect(results["lodash"][0]).toMatch(/src.index\.js/);

    expect(results["my-utils"].length).toBe(1);
    expect(results["express"].length).toBe(1);
    expect(results["dynamic-pkg"].length).toBe(1);
    expect(results["exported-pkg"].length).toBe(1);
    
    expect(results["side-effect-pkg"].length).toBe(1);
    expect(results["side-effect-pkg"][0]).toMatch(/src.other\.ts/);
    
    expect(results["@scope/types"].length).toBe(1);

    expect(results["not-found-pkg"].length).toBe(0);
  });

  it("does not count type-only imports or commented-out imports as usage (#966)", () => {
    createTestFile("src/types.ts", `
      import type { Foo } from 'type-only-pkg';
      import { type A, type B } from 'inline-type-only-pkg';
      export type { Bar } from 'reexported-type-pkg';
      import Runtime, { type Shape } from 'mixed-default-pkg';
      import { type Shape2, helper } from 'mixed-named-pkg';
      // import legacy from 'line-commented-pkg';
      /* const old = require('block-commented-pkg'); */
      const url = 'https://example.com'; import live from 'after-string-pkg';
    `);
    createTestFile("postcss.config.mjs", `
      /** @type {import('postcss-load-config').Config} */
      const config = { plugins: {} };
      export default config;
    `);

    const results = scanProjectForPackageUsage(tempDir, new Set([
      "type-only-pkg", "inline-type-only-pkg", "reexported-type-pkg", "mixed-default-pkg",
      "mixed-named-pkg", "line-commented-pkg", "block-commented-pkg", "after-string-pkg",
      "postcss-load-config",
    ]));

    expect(results["type-only-pkg"]).toHaveLength(0);
    expect(results["inline-type-only-pkg"]).toHaveLength(0);
    expect(results["reexported-type-pkg"]).toHaveLength(0);
    expect(results["line-commented-pkg"]).toHaveLength(0);
    expect(results["block-commented-pkg"]).toHaveLength(0);
    expect(results["postcss-load-config"]).toHaveLength(0);

    // A default or a non-type named specifier still loads the module.
    expect(results["mixed-default-pkg"]).toHaveLength(1);
    expect(results["mixed-named-pkg"]).toHaveLength(1);
    // `//` inside a string literal is not a comment.
    expect(results["after-string-pkg"]).toHaveLength(1);
  });

  it("should ignore node_modules and other configured directories", () => {
    createTestFile("node_modules/bad-pkg/index.js", "import 'lodash';");
    createTestFile(".git/hooks/pre-commit", "import 'lodash';");
    createTestFile("dist/bundle.js", "require('lodash');");
    createTestFile("build/index.js", "require('lodash');");
    createTestFile("src/index.js", "import 'lodash';");

    const results = scanProjectForPackageUsage(tempDir, new Set(["lodash"]));
    
    expect(results["lodash"].length).toBe(1);
    expect(results["lodash"][0]).toMatch(/src.index\.js/);
  });

  it("keeps example, test, and fixture imports for usage filtering", () => {
    createTestFile("examples/demo/src/index.ts", "import yaml from 'js-yaml';");
    createTestFile("tests/usage.test.ts", "const fixture = `import yaml from 'js-yaml';`;");
    createTestFile("fixtures/project/src/index.ts", "require('js-yaml');");
    createTestFile("src/index.ts", "import yaml from 'js-yaml';");

    const results = scanProjectForPackageUsage(tempDir, new Set(["js-yaml"]));

    expect(results["js-yaml"]).toHaveLength(4);
    expect(results["js-yaml"]).toEqual(expect.arrayContaining([
      expect.stringMatching(/examples.demo.src.index\.ts/),
      expect.stringMatching(/tests.usage\.test\.ts/),
      expect.stringMatching(/fixtures.project.src.index\.ts/),
      expect.stringMatching(/src.index\.ts/),
    ]));
  });

  it("should extract bare module names correctly", () => {
    createTestFile("src/index.js", `
      import { x } from 'lodash/fp/map';
      require('@scope/pkg/submodule/file.js');
      import './local-file.js';
      import '../parent.js';
      import '/absolute/path.js';
    `);

    const packages = new Set(["lodash", "@scope/pkg", "local-file"]);
    const results = scanProjectForPackageUsage(tempDir, packages);

    expect(results["lodash"].length).toBe(1);
    expect(results["@scope/pkg"].length).toBe(1);
    expect(results["local-file"].length).toBe(0); // Because relative paths return ""
  });
});

describe("scanAllImports", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-scan-all-"));
  });

  afterEach(() => {
    removeDir(tempDir);
  });

  function createFile(filePath: string, content: string) {
    const fullPath = path.join(tempDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  it("returns all bare module names found in source files", () => {
    createFile("src/index.ts", `
      import yaml from 'js-yaml';
      import { parse } from 'semver';
      import './local-file';
    `);
    createFile("src/utils.ts", `
      import yaml from 'js-yaml';
      const x = require('lodash');
    `);

    const result = scanAllImports(tempDir);

    expect(result.has("js-yaml")).toBe(true);
    expect(result.has("semver")).toBe(true);
    expect(result.has("lodash")).toBe(true);
    expect(result.has("./local-file")).toBe(false); // relative imports excluded
  });

  it("returns file paths for each import", () => {
    createFile("src/index.ts", `import yaml from 'js-yaml';`);
    createFile("src/other.ts", `import yaml from 'js-yaml';`);

    const result = scanAllImports(tempDir);

    const files = result.get("js-yaml") ?? [];
    expect(files).toHaveLength(2);
    expect(files.some((f) => f.includes("index.ts"))).toBe(true);
    expect(files.some((f) => f.includes("other.ts"))).toBe(true);
  });

  it("returns empty map when no source files exist", () => {
    const result = scanAllImports(tempDir);
    expect(result.size).toBe(0);
  });

  it("excludes node_modules", () => {
    createFile("node_modules/some-pkg/index.js", `import foo from 'bar';`);
    const result = scanAllImports(tempDir);
    expect(result.has("bar")).toBe(false);
  });

  it("ignores JSDoc import() type annotations and type-only imports (#966)", () => {
    // Stock create-next-app + Tailwind 3 postcss config: the only reference to
    // postcss-load-config in the repo, and it is erased at compile time.
    createFile("postcss.config.mjs", [
      "/** @type {import('postcss-load-config').Config} */",
      "const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };",
      "export default config;",
    ].join("\n"));
    createFile("src/types.ts", [
      "import type { Options } from 'type-only-pkg';",
      "import { type Config } from 'inline-type-only-pkg';",
      "export type { Result } from 'reexported-type-pkg';",
      "import { parse } from 'runtime-pkg';",
      "import type from 'default-named-type-pkg';",
    ].join("\n"));

    const result = scanAllImports(tempDir);

    expect(result.has("postcss-load-config")).toBe(false);
    expect(result.has("type-only-pkg")).toBe(false);
    expect(result.has("inline-type-only-pkg")).toBe(false);
    expect(result.has("reexported-type-pkg")).toBe(false);
    expect(result.get("runtime-pkg")).toEqual([expect.stringMatching(/src.types\.ts/)]);
    // A default import that happens to be called `type` is a real import.
    expect(result.get("default-named-type-pkg")).toEqual([expect.stringMatching(/src.types\.ts/)]);
  });

  it("does not treat // inside string literals as a comment", () => {
    createFile("src/index.ts", [
      "const base = 'https://registry.example.com'; import a from 'pkg-a';",
      "const tpl = `//not-a-comment`; import b from 'pkg-b';",
      "// import c from 'pkg-c';",
      "/* import d from 'pkg-d'; */ import e from 'pkg-e';",
    ].join("\n"));

    const result = scanAllImports(tempDir);

    expect(result.has("pkg-a")).toBe(true);
    expect(result.has("pkg-b")).toBe(true);
    expect(result.has("pkg-c")).toBe(false);
    expect(result.has("pkg-d")).toBe(false);
    expect(result.has("pkg-e")).toBe(true);
  });

  it("does not treat a slash inside a regex literal as a comment", () => {
    createFile("src/index.ts", [
      // The character class contains both `/` and `*`. Without regex-literal
      // tracking the `/*` opens a block comment that runs to end of file and
      // blanks every import below it.
      "const sep = /[/*]/;",
      "import a from 'pkg-a';",
      "const esc = /a\\/b/;",
      "import b from 'pkg-b';",
      "function f(s) { return /x/.test(s); }",
      "import c from 'pkg-c';",
      // Division must still be division, not the start of a regex that eats
      // the rest of the line.
      "const ratio = total / count; import d from 'pkg-d';",
    ].join("\n"));

    const result = scanAllImports(tempDir);

    expect(result.has("pkg-a")).toBe(true);
    expect(result.has("pkg-b")).toBe(true);
    expect(result.has("pkg-c")).toBe(true);
    expect(result.has("pkg-d")).toBe(true);
  });

  it("excludes example, test, and fixture imports", () => {
    createFile("examples/pd001-override-phantom/src/index.ts", `import yaml from 'js-yaml';`);
    createFile("tests/usage.test.ts", `const fixture = \`import yaml from 'js-yaml';\`;`);
    createFile("fixtures/project/src/index.ts", `require('js-yaml');`);
    createFile("src/index.ts", `import { parse } from 'semver';`);

    const result = scanAllImports(tempDir);

    expect(result.has("js-yaml")).toBe(false);
    expect(result.get("semver")).toEqual([expect.stringMatching(/src.index\.ts/)]);
  });
});
