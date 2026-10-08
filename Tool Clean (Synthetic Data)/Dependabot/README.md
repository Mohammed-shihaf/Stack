# Dependabot

Synthetic, clean-by-design TypeScript project for **Dependabot**.

Package: Dependabot -- github.com/dependabot/dependabot-core (Ruby) and its CLI github.com/dependabot/cli

Domain: dock-lock scheduling (LockSchedule)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

The manifest pins the same current versions as the other Clean folders (`typescript` 5.9.3, `@types/node` 26.6.3), so a Dependabot run proposes no update. ("Current" is a statement about the pin when the corpus was built; it cannot stay true forever, which is why the Invalid twin uses pins that are old for good.)

## Command

```bash
dependabot update npm_and_yarn <owner>/<repo> --local .      # Dependabot CLI (github.com/dependabot/cli)
```

## Notes

Dependabot's npm updater reads `package.json` and, when present, a lockfile. The folder deliberately has **no lockfile** (a `package-lock.json` in a sub-folder makes Testable treat the folder as its own project), so only the manifest and `.github/dependabot.yml` are inputs. Not executed in the generating session: Dependabot needs a repository on GitHub (or the Dependabot CLI and a container runtime) and neither was available; the versions below were checked against the npm registry on 2026-10-07.
