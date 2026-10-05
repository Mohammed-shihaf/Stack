# SonarJS

Synthetic, clean-by-design TypeScript project for **SonarJS**.

Package: org.sonarsource.javascript:sonar-javascript-plugin (SonarQube/SonarCloud plugin)

Domain: harbor berth assignment planning (HarborBerthPlan)

**Not installed here**: see Notes for why, and what was checked instead.

## What a passing result looks like

SonarJS's rule engine, run inside a SonarQube/SonarCloud analysis, would report zero code-smell/bug findings against HarborBerthPlan.

## Command

```bash
sonar-scanner -Dsonar.host.url=<server>
```

## Notes

SonarJS is the analyzer engine embedded in SonarQube/SonarCloud, not a standalone CLI -- there is no live Sonar server reachable from this sandbox to submit an analysis to. The npm package literally named `sonarjs` is real (published by SonarSource) but is `sonarjs-cli`, explicitly marked DEPRECATED on npm and itself only a thin uploader client for a Sonar server, not a local analyzer -- installing it would not change this. (The separate, already-measured `eslint-plugin-sonarjs` folder exercises SonarJS's rules standalone through ESLint, which is the one real path to those rules without server infrastructure.)
