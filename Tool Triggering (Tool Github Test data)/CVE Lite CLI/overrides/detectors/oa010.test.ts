import { detect } from '../../../src/overrides/detectors/oa010-vulnerable-floor.js';
import type {
  AdmittedVulnerability,
  OverrideContext,
  OverrideEntry,
} from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(entries: OverrideEntry[]): OverrideContext {
  return {
    projectPath: '/x',
    packageJson: {},
    packageJsonRaw: '{}',
    packageManager: 'pnpm',
    overrideEntries: entries,
    lockfilePackageNames: new Set(),
    installedVersions: new Map(),
    installedCopies: new Map(),
    parentDeclarations: new Map(),
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
  key: name,
  packageName: name,
  value,
  path: ['pnpm', 'overrides', name],
  container: 'pnpm.overrides',
});

const vuln = (
  version: string,
  severity: AdmittedVulnerability['severity'],
  firstPatched?: string,
): AdmittedVulnerability => ({
  version,
  advisoryId: 'GHSA-8r6m-32jq-jx6q',
  severity,
  firstPatched,
});

/**
 * The real case this rule exists for: CopilotKit#7167. fast-xml-parser@5.5.8 was
 * installed, so the scan correctly recommended 5.7.0 (the first patched version
 * for `< 5.7.0`). Written as a FLOOR, `>=5.7.0 <6` still admits 5.9.3 and
 * 5.10.0, which carry a later high-severity advisory patched in 5.10.1.
 */
const FXP_ADMITTED = [
  '5.7.0', '5.7.1', '5.8.0', '5.9.0', '5.9.1', '5.9.2',
  '5.9.3', '5.10.0', '5.10.1', '5.11.0', '5.11.1',
];

describe('OA010-VULNERABLE-FLOOR', () => {
  it('flags a floor whose admitted range contains a vulnerable version', () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);
    ctx.admittedVersions.set('fast-xml-parser@>=5.7.0 <6', FXP_ADMITTED);
    ctx.admittedVulnerable.set('fast-xml-parser@>=5.7.0 <6', [
      vuln('5.9.3', 'high', '5.10.1'),
      vuln('5.10.0', 'high', '5.10.1'),
    ]);

    const findings = detect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'OA010', severity: 'high' });
    expect(findings[0]!.details).toContain('5.9.3');
    expect(findings[0]!.details).toContain('5.10.0');
    expect(findings[0]!.details).toContain('GHSA-8r6m-32jq-jx6q');
  });

  it('raises the floor to the lowest clean admitted version, keeping the ceiling', () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);
    ctx.admittedVersions.set('fast-xml-parser@>=5.7.0 <6', FXP_ADMITTED);
    ctx.admittedVulnerable.set('fast-xml-parser@>=5.7.0 <6', [
      vuln('5.9.3', 'high', '5.10.1'),
      vuln('5.10.0', 'high', '5.10.1'),
    ]);

    const finding = detect(ctx)[0]!;
    expect(finding.fix?.type).toBe('rfc6902');
    expect(finding.fix?.patch).toEqual([
      {
        op: 'replace',
        path: '/pnpm/overrides/fast-xml-parser',
        value: '>=5.10.1 <6',
      },
    ]);
  });

  it('does not fire when no admitted version is vulnerable', () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.10.1 <6')]);
    ctx.admittedVersions.set('fast-xml-parser@>=5.10.1 <6', ['5.10.1', '5.11.0', '5.11.1']);

    expect(detect(ctx)).toHaveLength(0);
  });

  it('no-ops entirely when the network maps are empty (offline / no --check-network)', () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);

    expect(detect(ctx)).toHaveLength(0);
  });

  it('skips exact pins, which admit exactly one version by construction', () => {
    const ctx = ctxOf([e('fast-xml-parser', '5.9.3')]);
    ctx.admittedVersions.set('fast-xml-parser@5.9.3', ['5.9.3']);
    ctx.admittedVulnerable.set('fast-xml-parser@5.9.3', [vuln('5.9.3', 'high', '5.10.1')]);

    expect(detect(ctx)).toHaveLength(0);
  });

  it('reports the highest severity among the admitted advisories', () => {
    const ctx = ctxOf([e('langsmith', '>=0.6.0 <1')]);
    ctx.admittedVersions.set('langsmith@>=0.6.0 <1', ['0.6.0', '0.6.1', '0.6.2', '0.6.3']);
    ctx.admittedVulnerable.set('langsmith@>=0.6.0 <1', [
      vuln('0.6.0', 'low', '0.6.3'),
      vuln('0.6.1', 'critical', '0.6.3'),
      vuln('0.6.2', 'medium', '0.6.3'),
    ]);

    expect(detect(ctx)[0]).toMatchObject({ severity: 'critical' });
  });

  it('reports without a fix when every admitted version is vulnerable', () => {
    const ctx = ctxOf([e('left-pad', '>=1.0.0 <2')]);
    ctx.admittedVersions.set('left-pad@>=1.0.0 <2', ['1.0.0', '1.1.0']);
    ctx.admittedVulnerable.set('left-pad@>=1.0.0 <2', [
      vuln('1.0.0', 'high'),
      vuln('1.1.0', 'high'),
    ]);

    const finding = detect(ctx)[0]!;
    expect(finding.ruleId).toBe('OA010');
    expect(finding.fix).toBeUndefined();
    expect(finding.details).toContain('no clean version');
  });

  it('keeps two overrides of the same package independent', () => {
    // pnpm allows a bare key and a selector key for one package. Keying the
    // admitted maps by name alone let the second overwrite the first, so both
    // findings were computed against whichever range was processed last.
    const wide = e('minimatch', '>=9.0.6');
    const narrow: OverrideEntry = {
      key: 'minimatch@>=10.0.0 <10.2.1',
      packageName: 'minimatch',
      value: '>=10.2.1',
      path: ['pnpm', 'overrides', 'minimatch@>=10.0.0 <10.2.1'],
      container: 'pnpm.overrides',
    };
    const ctx = ctxOf([wide, narrow]);

    ctx.admittedVersions.set('minimatch@>=9.0.6', ['9.0.6', '9.0.7', '10.2.1']);
    ctx.admittedVulnerable.set('minimatch@>=9.0.6', [vuln('9.0.6', 'high', '9.0.7')]);
    ctx.admittedVersions.set('minimatch@>=10.2.1', ['10.2.1', '10.3.0']);

    const findings = detect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.location.jsonPath).toBe('/pnpm/overrides/minimatch');
    expect(findings[0]!.fix?.patch[0]?.value).toBe('>=9.0.7');
  });

  it('honours a pre-emptive skip', () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);
    ctx.admittedVersions.set('fast-xml-parser@>=5.7.0 <6', FXP_ADMITTED);
    ctx.admittedVulnerable.set('fast-xml-parser@>=5.7.0 <6', [vuln('5.9.3', 'high', '5.10.1')]);
    ctx.skippedDetectors.push({ ruleId: 'OA010', reason: 'registry calls failed' });

    expect(detect(ctx)).toHaveLength(0);
  });
});
