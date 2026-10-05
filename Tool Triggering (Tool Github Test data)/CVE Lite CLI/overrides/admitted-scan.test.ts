import { populateAdmittedVersions } from '../../src/overrides/admitted-scan.js';
import type { OverrideContext, OverrideEntry } from '../../src/overrides/context.js';
import type { AdvisorySource, AdvisoryResult } from '../../src/advisory/advisory-source.js';
import type { PackageRef } from '../../src/types.js';
import { NULL_AUDIT_LOG } from '../../src/audit-log/index.js';

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

/** Registry stub serving an abbreviated packument for the named packages. */
function fetchStub(versionsByPkg: Record<string, string[]>) {
  return async (url: string): Promise<any> => {
    const name = decodeURIComponent(url.split('/').slice(3).join('/'));
    const versions = versionsByPkg[name];
    if (!versions) return { ok: false, status: 404, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        versions: Object.fromEntries(versions.map((v) => [v, {}])),
      }),
    };
  };
}

function advisoryStub(
  vulnByVersion: Record<string, any[]>,
  detailsById: Record<string, any> = {},
): AdvisorySource {
  return {
    async queryBatch(packages: PackageRef[]): Promise<AdvisoryResult[]> {
      return packages.map((p) => ({
        package: p.name,
        version: p.version,
        vulnerabilities: vulnByVersion[p.version] ?? [],
      }));
    },
    async getVuln(id: string) {
      return (detailsById[id] ?? { id }) as any;
    },
  };
}

const registry = (versionsByPkg: Record<string, string[]>) => ({
  baseUrl: 'https://registry.test',
  fetchImpl: fetchStub(versionsByPkg) as any,
});

describe('populateAdmittedVersions', () => {
  it('records every published version the range admits, excluding prereleases', async () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);

    await populateAdmittedVersions(ctx, {
      registry: registry({
        'fast-xml-parser': ['5.5.8', '5.7.0', '5.9.3', '5.10.0', '5.10.1', '6.0.0'],
      }),
      advisorySource: advisoryStub({}),
    });

    expect(ctx.admittedVersions.get('fast-xml-parser@>=5.7.0 <6')).toEqual([
      '5.7.0', '5.9.3', '5.10.0', '5.10.1',
    ]);
    expect(ctx.admittedVulnerable.size).toBe(0);
  });

  it('marks the admitted versions the advisory source reports as vulnerable', async () => {
    const ctx = ctxOf([e('fast-xml-parser', '>=5.7.0 <6')]);

    await populateAdmittedVersions(ctx, {
      registry: registry({
        'fast-xml-parser': ['5.7.0', '5.9.3', '5.10.0', '5.10.1'],
      }),
      // The batch endpoint answers with { id, modified } only; severity and
      // affected ranges live on the detail record, so the stub splits them the
      // same way the real API does.
      advisorySource: advisoryStub(
        {
          '5.9.3': [{ id: 'GHSA-8r6m-32jq-jx6q' }],
          '5.10.0': [{ id: 'GHSA-8r6m-32jq-jx6q' }],
        },
        {
          // Shaped from the real GHSA-8r6m-32jq-jx6q record: the CVSS vector is
          // deliberately ignored by inferSeverity, which reads
          // database_specific.severity instead.
          'GHSA-8r6m-32jq-jx6q': {
            id: 'GHSA-8r6m-32jq-jx6q',
            severity: [{ type: 'CVSS_V4', score: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N' }],
            database_specific: { severity: 'HIGH' },
            affected: [{
              package: { ecosystem: 'npm', name: 'fast-xml-parser' },
              ranges: [{ type: 'SEMVER', events: [{ introduced: '5.9.3' }, { fixed: '5.10.1' }] }],
            }],
          },
        },
      ),
    });

    const hits = ctx.admittedVulnerable.get('fast-xml-parser@>=5.7.0 <6')!;
    expect(hits.map((h) => h.version)).toEqual(['5.9.3', '5.10.0']);
    expect(hits.every((h) => h.advisoryId === 'GHSA-8r6m-32jq-jx6q')).toBe(true);
    // Regression: the batch result alone graded everything "unknown".
    expect(hits.every((h) => h.severity === 'high')).toBe(true);
    expect(hits.every((h) => h.firstPatched === '5.10.1')).toBe(true);
  });

  it('takes first-patched only from the npm entry, never a sibling ecosystem', async () => {
    const ctx = ctxOf([e('langsmith', '>=0.6.0 <1')]);

    // GHSA-3644-q5cj-c5c7 really does carry pip at <0.8.0 and npm at <0.6.0.
    // Borrowing the pip range here would produce a floor of 0.8.0 for npm.
    await populateAdmittedVersions(ctx, {
      registry: registry({ langsmith: ['0.6.0', '0.7.0'] }),
      advisorySource: advisoryStub(
        { '0.6.0': [{ id: 'GHSA-3644-q5cj-c5c7' }] },
        {
          'GHSA-3644-q5cj-c5c7': {
            id: 'GHSA-3644-q5cj-c5c7',
            affected: [
              { package: { ecosystem: 'pip', name: 'langsmith' }, ranges: [{ events: [{ fixed: '0.8.0' }] }] },
              { package: { ecosystem: 'npm', name: 'langsmith' }, ranges: [{ events: [{ fixed: '0.6.0' }] }] },
            ],
          },
        },
      ),
    });

    expect(ctx.admittedVulnerable.get('langsmith@>=0.6.0 <1')![0]!.firstPatched).toBe('0.6.0');
  });

  it('skips exact pins, which are OA008 territory', async () => {
    const ctx = ctxOf([e('fast-xml-parser', '5.9.3')]);

    await populateAdmittedVersions(ctx, {
      registry: registry({ 'fast-xml-parser': ['5.9.3'] }),
      advisorySource: advisoryStub({ '5.9.3': [{ id: 'GHSA-x' }] }),
    });

    expect(ctx.admittedVersions.size).toBe(0);
    expect(ctx.admittedVulnerable.size).toBe(0);
  });

  it('leaves the maps empty when the registry has nothing for the package', async () => {
    const ctx = ctxOf([e('does-not-exist', '>=1.0.0')]);

    await populateAdmittedVersions(ctx, {
      registry: registry({}),
      advisorySource: advisoryStub({}),
    });

    expect(ctx.admittedVersions.size).toBe(0);
    expect(ctx.admittedVulnerable.size).toBe(0);
  });

  it('skips the rule rather than issuing queries when the admitted set is huge', async () => {
    const ctx = ctxOf([e('wide', '>=1.0.0')]);
    const many = Array.from({ length: 2100 }, (_, i) => `1.0.${i}`);

    let queried = false;
    await populateAdmittedVersions(ctx, {
      registry: registry({ wide: many }),
      advisorySource: {
        async queryBatch() { queried = true; return []; },
        async getVuln() { throw new Error('not used'); },
      },
    });

    expect(queried).toBe(false);
    expect(ctx.skippedDetectors.some((s) => s.ruleId === 'OA010')).toBe(true);
  });
});
