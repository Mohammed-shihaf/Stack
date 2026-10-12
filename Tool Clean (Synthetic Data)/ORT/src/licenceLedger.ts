/** A licence the ledger tracks, by SPDX identifier. */
export interface LicenceEntry {
  readonly packageName: string;
  readonly spdx: string;
}

const PERMISSIVE = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0"]);

/** True when every entry carries a permissive licence. */
export function allPermissive(entries: readonly LicenceEntry[]): boolean {
  return entries.every((entry) => PERMISSIVE.has(entry.spdx));
}

/** The entries that are not permissive. */
export function nonPermissive(entries: readonly LicenceEntry[]): LicenceEntry[] {
  return entries.filter((entry) => !PERMISSIVE.has(entry.spdx));
}
