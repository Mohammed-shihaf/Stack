import { walkInstalledTree } from '../../../src/overrides/parsing/installed-tree.js';
import { join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const F = (n: string) => join(process.cwd(), 'tests', 'fixtures', n);

describe('walkInstalledTree', () => {
  it('finds all copies of a package across the tree (top + nested)', () => {
    const { installedCopies } = walkInstalledTree(F('tree-walker'));
    const esbuildBin = installedCopies.get('@esbuild/linux-x64');
    expect(esbuildBin).toBeDefined();
    expect(esbuildBin!.length).toBe(2);
    const versions = esbuildBin!.map(c => c.version).sort();
    expect(versions).toEqual(['0.25.12', '0.28.0']);
  });

  it('records parent declarations with exact-version flag', () => {
    const { parentDeclarations } = walkInstalledTree(F('tree-walker'));
    const parents = parentDeclarations.get('@esbuild/linux-x64');
    expect(parents).toBeDefined();
    // Two parents: esbuild@0.25.12 and esbuild@0.28.0 (nested under tsx)
    expect(parents!.length).toBe(2);
    const exactPins = parents!.filter(p => p.exactVersion);
    expect(exactPins.length).toBe(2);
    expect(exactPins.map(p => p.declaredValue).sort()).toEqual(['0.25.12', '0.28.0']);
    expect(exactPins.every(p => p.declaredIn === 'optionalDependencies')).toBe(true);
    expect(exactPins.every(p => p.parentName === 'esbuild')).toBe(true);
  });

  it('treats ranges (^, ~, >=) as non-exact', () => {
    const { parentDeclarations } = walkInstalledTree(F('tree-walker'));
    const esbuildParents = parentDeclarations.get('esbuild');
    expect(esbuildParents).toBeDefined();
    // tsx declares "esbuild": "^0.28.0" — should be non-exact
    const tsx = esbuildParents!.find(p => p.parentName === 'tsx');
    expect(tsx?.exactVersion).toBe(false);
    expect(tsx?.declaredValue).toBe('^0.28.0');
  });

  it('returns empty maps when node_modules is missing', () => {
    const { installedCopies, parentDeclarations } = walkInstalledTree(F('nm-missing'));
    expect(installedCopies.size).toBe(0);
    expect(parentDeclarations.size).toBe(0);
  });

  describe('pnpm virtual store (.pnpm)', () => {
    it('collects copies of transitive-only packages from the .pnpm store', () => {
      const { installedCopies } = walkInstalledTree(F('pnpm-store'));
      const postcss = installedCopies.get('postcss');
      expect(postcss).toBeDefined();
      expect(postcss!.map(c => c.version)).toEqual(['8.5.15']);
    });

    it('decodes scoped packages from the .pnpm store (@scope+pkg → @scope/pkg)', () => {
      const { installedCopies } = walkInstalledTree(F('pnpm-store'));
      const scoped = installedCopies.get('@scope/pkg');
      expect(scoped).toBeDefined();
      expect(scoped!.map(c => c.version)).toEqual(['1.0.0']);
    });

    it('records parent declarations from packages in the .pnpm store', () => {
      const { parentDeclarations } = walkInstalledTree(F('pnpm-store'));
      const parents = parentDeclarations.get('postcss');
      expect(parents).toBeDefined();
      const next = parents!.find(p => p.parentName === 'next');
      expect(next?.exactVersion).toBe(true);
      expect(next?.declaredValue).toBe('8.4.31');
    });

    it('does not double-count a direct dep symlinked from top-level into .pnpm', () => {
      // Real pnpm: node_modules/<dep> is a symlink into .pnpm/<dep>@<ver>/node_modules/<dep>.
      // Walking both the symlink and the store must count the package exactly once.
      const root = mkdtempSync(join(tmpdir(), 'cve-lite-pnpm-'));
      try {
        const storePkg = join(root, 'node_modules', '.pnpm', 'lodash@4.17.21', 'node_modules', 'lodash');
        mkdirSync(storePkg, { recursive: true });
        writeFileSync(join(storePkg, 'package.json'), JSON.stringify({ name: 'lodash', version: '4.17.21' }));
        // top-level symlink, as pnpm creates for a direct dependency
        symlinkSync(storePkg, join(root, 'node_modules', 'lodash'), 'dir');

        const { installedCopies } = walkInstalledTree(root);
        const lodash = installedCopies.get('lodash');
        expect(lodash).toBeDefined();
        expect(lodash!.length).toBe(1);
        expect(lodash![0].version).toBe('4.17.21');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
