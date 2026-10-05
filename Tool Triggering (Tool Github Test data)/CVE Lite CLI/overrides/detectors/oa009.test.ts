import { detect } from '../../../src/overrides/detectors/oa009-stale-floor.js';
import type { OverrideContext, OverrideEntry, ParentDeclaration } from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(
  entries: OverrideEntry[],
  installed: [string, string][],
  parents: [string, ParentDeclaration[]][],
): OverrideContext {
  return {
    projectPath: '/x',
    packageJson: {},
    packageJsonRaw: '{}',
    packageManager: 'npm',
    overrideEntries: entries,
    lockfilePackageNames: new Set(entries.map(e => e.packageName)),
    installedVersions: new Map(installed),
    installedCopies: new Map(),
    parentDeclarations: new Map(parents),
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

const p = (parentName: string, declaredValue: string): ParentDeclaration => ({
  parentName, parentVersion: '1.0.0', declaredIn: 'dependencies', declaredValue, exactVersion: false,
});

describe('OA009-STALE-FLOOR', () => {
  it('fires when >= floor met by single parent', () => {
    const findings = detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'OA009',
      severity: 'low',
      fix: { type: 'rfc6902' },
    });
  });

  it('fires when ^ floor met by all parents', () => {
    const findings = detect(ctxOf(
      [e('semver', '^7.5.0')],
      [['semver', '7.6.3']],
      [['semver', [p('commander', '^7.6.0'), p('jest', '^7.5.4')]]],
    ));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('OA009');
  });

  it('fires when parent uses exact version >= floor', () => {
    const findings = detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '4.5.0')]]],
    ));
    expect(findings).toHaveLength(1);
  });

  it('fires when parent uses >= range >= floor', () => {
    const findings = detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '>=4.3.0')]]],
    ));
    expect(findings).toHaveLength(1);
  });

  it('does NOT fire when one parent declares a range below the floor', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('safe-lib', '^4.5.0'), p('old-lib', '^4.0.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire when parent declarations is empty', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [],
    ))).toEqual([]);
  });

  it('does NOT fire when installed version absent (node_modules missing for pkg)', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for concrete version pins (OA004 territory)', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for floating tags', () => {
    expect(detect(ctxOf(
      [e('js-yaml', 'latest')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for ~ operator (out of scope v1)', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '~4.2.0')],
      [['js-yaml', '4.2.3']],
      [['js-yaml', [p('some-lib', '~4.2.1')]]],
    ))).toEqual([]);
  });

  it('does NOT fire for > operator (out of scope v1)', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '>4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ))).toEqual([]);
  });

  it('does NOT crash on nested object override values (OA005 territory)', () => {
    const nested: OverrideEntry = {
      key: 'a', packageName: 'a', value: { b: '>=1.0.0' },
      path: ['overrides', 'a'], container: 'overrides',
    };
    expect(detect(ctxOf([nested], [], []))).toEqual([]);
  });

  it('does NOT fire when ^ override and parent are in different major (ranges do not overlap)', () => {
    // Override ^4.2.0 means >=4.2.0 <5.0.0; parent ^5.0.0 means >=5.0.0 <6.0.0.
    // Removing the override would change npm's resolution from 4.x to 5.x.
    expect(detect(ctxOf(
      [e('semver', '^4.2.0')],
      [['semver', '4.6.3']],
      [['semver', [p('some-lib', '^5.0.0')]]],
    ))).toEqual([]);
  });

  it('is conservative when parent declaredValue cannot be parsed as a version', () => {
    expect(detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', 'file:../local')]]],
    ))).toEqual([]);
  });

  it('respects skippedDetectors when OA009 is listed', () => {
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.skippedDetectors = [{ ruleId: 'OA009', reason: 'node_modules missing' }];
    expect(detect(ctx)).toEqual([]);
  });

  it('includes remove fix patch with runnableCommand', () => {
    const findings = detect(ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    ));
    expect(findings[0]!.fix).toMatchObject({
      type: 'rfc6902',
      patch: [{ op: 'remove', path: '/overrides/js-yaml' }],
      runnableCommand: 'cve-lite overrides --fix --rule OA009',
    });
  });

  it('does NOT fire when the override anchors a phantom source import (PD001 guard)', () => {
    // js-yaml is floored by the override, parent meets the floor, BUT js-yaml is
    // imported in source and not declared in dependencies. Removing the override
    // would create a phantom import - OA009 must be suppressed.
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.importedPackageNames = new Map([['js-yaml', ['src/yaml-engine.ts']]]);
    // packageJson has no dependencies declaring js-yaml, so removing the override
    // would make it a phantom import.
    expect(detect(ctx)).toEqual([]);
  });

  it('still fires when the package is both imported AND declared in dependencies (override is redundant, import is safe)', () => {
    // The floor is met, js-yaml IS in source, but it IS also declared in
    // dependencies - so removing the override just removes a redundant pin.
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.importedPackageNames = new Map([['js-yaml', ['src/index.ts']]]);
    ctx.packageJson = { name: 'x', dependencies: { 'js-yaml': '^4.0.0' } };
    const findings = detect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('OA009');
  });

  // #1118: the guard has to answer the declaration question the same way PD001
  // does. PD001 resolves against the nearest enclosing workspace member; if
  // OA009 keeps resolving against the root manifest the two disagree and a
  // genuinely redundant floor is reported by neither.
  it('fires when the import is declared by the owning workspace member, not the root', () => {
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.importedPackageNames = new Map([['js-yaml', ['apps/web/src/index.ts']]]);
    // Declared in the member that owns the importing file, absent from the root.
    ctx.packageJson = { name: 'root' };
    ctx.workspaceMembers = [{ dir: 'apps/web', declared: new Set(['js-yaml']) }];
    const findings = detect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('OA009');
  });

  it('fires when the package is declared only as a peerDependency', () => {
    // OA009 used to carry a private getDeclaredPackages reading only
    // dependencies and devDependencies, so a peer-only declaration looked
    // undeclared and suppressed the rule. The shared helper reads four sections.
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.importedPackageNames = new Map([['js-yaml', ['src/index.ts']]]);
    ctx.packageJson = { name: 'root', peerDependencies: { 'js-yaml': '^4.0.0' } };
    const findings = detect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('OA009');
  });

  it('stays suppressed when a workspace member imports but nothing declares it', () => {
    // The guard still has to hold: no root declaration and the owning member
    // does not declare it either, so removing the override would create a
    // phantom and OA009 must stay quiet.
    const ctx = ctxOf(
      [e('js-yaml', '>=4.2.0')],
      [['js-yaml', '4.5.0']],
      [['js-yaml', [p('some-lib', '^4.5.0')]]],
    );
    ctx.importedPackageNames = new Map([['js-yaml', ['apps/web/src/index.ts']]]);
    ctx.packageJson = { name: 'root' };
    ctx.workspaceMembers = [{ dir: 'apps/web', declared: new Set(['other-pkg']) }];
    expect(detect(ctx)).toEqual([]);
  });
});
