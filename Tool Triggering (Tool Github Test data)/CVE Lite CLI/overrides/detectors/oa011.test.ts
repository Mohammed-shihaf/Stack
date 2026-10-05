import { detect } from '../../../src/overrides/detectors/oa011-exceeds-range.js';
import type { OverrideContext, OverrideEntry, ParentDeclaration } from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(
  entries: OverrideEntry[],
  parents: [string, ParentDeclaration[]][] = [],
): OverrideContext {
  return {
    projectPath: '/x',
    packageJson: {},
    packageJsonRaw: '{}',
    packageManager: 'pnpm',
    overrideEntries: entries,
    lockfilePackageNames: new Set(entries.map(e => e.packageName)),
    installedVersions: new Map(),
    installedCopies: new Map(),
    parentDeclarations: new Map(parents),
    registryDistTags: new Map(),
    admittedVersions: new Map(),
    admittedVulnerable: new Map(),
    skippedDetectors: [],
    importedPackageNames: new Map(),
    auditLog: NULL_AUDIT_LOG,
    logger: noopLogger,
  };
}

const e = (name: string, value: string): OverrideEntry => ({
  key: name, packageName: name, value, path: ['pnpm', 'overrides', name], container: 'pnpm.overrides',
});

const p = (parentName: string, declaredValue: string): ParentDeclaration => ({
  parentName, parentVersion: '1.0.0', declaredIn: 'dependencies', declaredValue, exactVersion: false,
});

describe('OA011-EXCEEDS-RANGE', () => {
  it('fires: unbounded floor admits a major no parent declares (CopilotKit/hono case)', () => {
    const findings = detect(ctxOf(
      [e('@hono/node-server', '>=1.19.13')],
      [['@hono/node-server', [
        p('packages/runtime', '^1.13.5'),
        p('examples/v2/node', '^1.13.6'),
      ]]],
    ));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'OA011', severity: 'medium' });
    expect(findings[0]!.fix).toBeUndefined();
    expect(findings[0]!.details).toContain('>=1.19.13');
    expect(findings[0]!.details).toContain('major 1');
  });

  it('does NOT fire: bounded floor sits inside a parent range that caps at the same major (hono contrast)', () => {
    expect(detect(ctxOf(
      [e('hono', '>=4.13.5 <5')],
      [['hono', [p('packages/runtime', '^4.11.4')]]],
    ))).toEqual([]);
  });

  it('does NOT fire when no parent declares the package', () => {
    expect(detect(ctxOf(
      [e('left-pad', '>=2.0.0')],
      [],
    ))).toEqual([]);
  });

  it('does NOT fire when a single parent already permits the override\'s full range', () => {
    expect(detect(ctxOf(
      [e('semver', '^7.5.0')],
      [['semver', [p('a', '^6.0.0'), p('b', '>=7.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire when a parent declaration cannot be reduced to a major (conservative)', () => {
    expect(detect(ctxOf(
      [e('pkg', '>=2.0.0')],
      [['pkg', [p('a', '^1.0.0'), p('b', 'workspace:*')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for a concrete version pin (OA004/OA008 territory)', () => {
    expect(detect(ctxOf(
      [e('pkg', '2.0.0')],
      [['pkg', [p('a', '^1.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for a floating tag', () => {
    expect(detect(ctxOf(
      [e('pkg', 'latest')],
      [['pkg', [p('a', '^1.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for a workspace:/file:/link: protocol value', () => {
    expect(detect(ctxOf(
      [e('pkg', 'workspace:*')],
      [['pkg', [p('a', '^1.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for ~ (out of scope, same boundary as OA009)', () => {
    expect(detect(ctxOf(
      [e('pkg', '~2.0.0')],
      [['pkg', [p('a', '^1.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT crash on nested object override values (OA005 territory)', () => {
    const nested: OverrideEntry = {
      key: 'a', packageName: 'a', value: { b: '>=1.0.0' },
      path: ['overrides', 'a'], container: 'overrides',
    };
    expect(detect(ctxOf([nested], []))).toEqual([]);
  });

  it('respects skippedDetectors when OA011 is listed', () => {
    const ctx = ctxOf(
      [e('@hono/node-server', '>=1.19.13')],
      [['@hono/node-server', [p('a', '^1.13.5')]]],
    );
    ctx.skippedDetectors = [{ ruleId: 'OA011', reason: 'test' }];
    expect(detect(ctx)).toEqual([]);
  });

  it('fires when the override is a bare caret above every parent\'s major', () => {
    const findings = detect(ctxOf(
      [e('widget', '^3.0.0')],
      [['widget', [p('a', '^2.5.0'), p('b', '^2.0.0')]]],
    ));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.package.name).toBe('widget');
  });

  it('emits no fix (suggest-only)', () => {
    const findings = detect(ctxOf(
      [e('@hono/node-server', '>=1.19.13')],
      [['@hono/node-server', [p('a', '^1.13.5')]]],
    ));
    expect(findings[0]!.fix).toBeUndefined();
  });
});
