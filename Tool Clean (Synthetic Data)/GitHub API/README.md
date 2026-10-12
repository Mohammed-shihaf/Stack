# GitHub API

Synthetic, clean-by-design TypeScript project for **GitHub API**.

Package: GitHub REST API (api.github.com) -- the same endpoints the Octokit client (github.com/octokit/rest.js) wraps

Domain: release watching (ReleaseWatch)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

`upstream.txt` names `octokit/rest.js`, an actively maintained repository with published releases: both endpoints answer and `releases/latest` returns a tag.

## Command

```bash
UPSTREAM_REPO=$(cat upstream.txt) bash "../../Tool Triggering (Synthetic Data)/github-api/run_github_api.sh"   # from this folder inside a corpus branch
```

## Notes

The `Tool Triggering (Synthetic Data)/github-api` runner reads `UPSTREAM_REPO` (an `owner/name`), calls `GET /repos/{repo}` and `GET /repos/{repo}/releases/latest`, and writes stars, forks, open issues and the latest tag. `upstream.txt` is the repository this folder points it at. Not executed in the generating session (the sandbox's GitHub API access is restricted to the session's own repositories), so no response is quoted here.
