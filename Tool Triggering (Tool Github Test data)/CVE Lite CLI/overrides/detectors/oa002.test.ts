import { detect } from '../../../src/overrides/detectors/oa002-floating-tag.js';
import type { OverrideContext, OverrideEntry } from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(entries: OverrideEntry[], installed: [string, string][] = []): OverrideContext {
  return {
    projectPath: '/x',
    packageJson: {},
    packageJsonRaw: '{}',
    packageManager: 'npm',
    overrideEntries: entries,
    lockfilePackageNames: new Set(entries.map(e => e.packageName)),
    installedVersions: new Map(installed),
    installedCopies: new Map(),
    parentDeclarations: new Map(),
    registryDistTags: new Map(),
    skippedDetectors: [],
    importedPackageNames: new Map(),
    auditLog: NULL_AUDIT_LOG,
    logger: noopLogger,
  };
}

const e = (name: string, value: string): OverrideEntry => ({
  key: name, packageName: name, value, path: ['overrides', name], container: 'overrides',
});

describe('OA002-FLOATING-TAG', () => {
  it.each(['latest', 'next', '*', 'x', ''])('flags pin value %j', (v) => {
    const findings = detect(ctxOf([e('@esbuild/linux-x64', v)]));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('OA002');
    expect(findings[0]!.severity).toBe('medium');
  });

  it('does NOT flag valid semver ranges', () => {
    expect(detect(ctxOf([e('postcss', '^8.0.0')]))).toEqual([]);
    expect(detect(ctxOf([e('postcss', '8.5.15')]))).toEqual([]);
    expect(detect(ctxOf([e('postcss', '>=8.5.0')]))).toEqual([]);
  });

  it('skips workspace: and file: protocol values', () => {
    expect(detect(ctxOf([e('local', 'workspace:*')]))).toEqual([]);
    expect(detect(ctxOf([e('local', 'file:../local')]))).toEqual([]);
    expect(detect(ctxOf([e('local', 'link:../local')]))).toEqual([]);
  });

  it('skips npm: protocol aliases', () => {
    const entries = [
      e('lodash', 'npm:lodash@4.17.21'),
    ];
    const installed = [['lodash', '4.17.21']];
    expect(detect(ctxOf(entries, installed))).toEqual([]);
  });

  it('skips nested-object override values (OA005 handles those)', () => {
    const nested: OverrideEntry = {
      key: 'a', packageName: 'a', value: { b: 'latest' },
      path: ['overrides', 'a'], container: 'overrides',
    };
    expect(detect(ctxOf([nested]))).toEqual([]);
  });

  it('suggests >=installed when node_modules version is known', () => {
    const findings = detect(ctxOf([e('@esbuild/linux-x64', 'latest')], [['@esbuild/linux-x64', '0.25.12']]));
    expect(findings[0]!.fix?.type).toBe('rfc6902');
    expect(findings[0]!.fix?.patch).toEqual([{
      op: 'replace',
      path: '/overrides/@esbuild~1linux-x64',
      value: '>=0.25.12',
    }]);
  });

  it('has no fix when installed version is unknown', () => {
    const findings = detect(ctxOf([e('@esbuild/linux-x64', 'latest')]));
    expect(findings[0]!.fix).toBeUndefined();
  });
});

// #1216: OA002 treats "not a valid range" as a floating tag, and isValidRange
// modelled a single comparator only. Every bounded override therefore reported
// as though it were pinned to `latest`. Measured on a real external repository:
// twelve correct overrides, twelve false findings. These are the shapes a
// maintainer actually writes, and none of them were covered before, because our
// own package.json carries no overrides at all.
describe('OA002-FLOATING-TAG does not flag legitimate ranges (#1216)', () => {
  const legitimate: [string, string][] = [
    ['bounded compound', '>=1.18.0 <2'],
    ['bounded to a major', '>=7.5.21 <8'],
    ['bounded below 1.0', '>=0.28.1 <0.29'],
    ['spaced operators', '> 1.0.0 < 2.0.0'],
    ['union', '^1.0.0 || ^2.0.0'],
    ['wildcard minor', '1.x'],
    ['wildcard patch', '1.2.x'],
    ['hyphen range', '1.2.3 - 2.3.4'],
    ['bare partial', '1.2'],
  ];

  it.each(legitimate)('does not flag a %s override (%j)', (_label, value) => {
    expect(detect(ctxOf([e('axios', value)]))).toHaveLength(0);
  });

  it('still flags a genuine floating tag alongside a bounded one', () => {
    const findings = detect(ctxOf([
      e('axios', '>=1.18.0 <2'),
      e('tar', 'latest'),
    ]));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.package.name).toBe('tar');
  });
});
