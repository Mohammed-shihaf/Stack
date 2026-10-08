/** A repository the release watcher follows, as "owner/name". */
export interface WatchedRepo {
  readonly fullName: string;
}

/** The GitHub REST URLs the watcher reads for one repository. */
export function urlsFor(repo: WatchedRepo): { readonly repo: string; readonly latestRelease: string } {
  return {
    repo: `https://api.github.com/repos/${repo.fullName}`,
    latestRelease: `https://api.github.com/repos/${repo.fullName}/releases/latest`,
  };
}
