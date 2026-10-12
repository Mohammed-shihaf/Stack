# DepScout

Synthetic, clean-by-design TypeScript project for **DepScout**.

Package: deps-scout 1.0.0 (npm, github.com/FreddyMartinez/deps-scout)

Domain: door-lock service tracking (LockKeeper)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

Every dependency is current and actively released: `zod` 4.6.5, `typescript` 5.9.3 and `@types/node` 26.6.3. deps-scout raises no release-age alert for any of them.

## Command

```bash
# scout reads package.json and scout.config.json from the current directory; Enter accepts "javascript" and "console"
printf '\n'; sleep 1; printf '\n'  |  scout
```

## Notes

deps-scout is a pure-JavaScript CLI, so it is installed on demand and is **not** a `package.json` dependency here (a new dependency would change the lockfile of every branch). It prompts twice (language, output); the command above answers both with Enter. It queries the npm registry (release dates, downloads) and the GitHub API (stars, issues, forks, health); without a token the GitHub API rate limit (60 requests per hour per address) is reached quickly, which leaves the GitHub-derived indicators empty -- the release-age indicators come from the npm registry and are unaffected. Requires Node >= 14 (it uses optional-call syntax), so there is no Node 12 run. The folder has no lockfile on purpose. Measured 2026-10-07 with deps-scout 1.0.0.
