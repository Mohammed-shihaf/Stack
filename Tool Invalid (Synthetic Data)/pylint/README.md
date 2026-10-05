# pylint

Boundary-version matrix for **pylint**, inverted: the `Python-Tools-Invalid`
counterpart to Clean's `pylint` folder. Where Clean's fixture scores
10.00/10, this one is engineered so the real, printed score drops well below
half. Each `py3.X/` subfolder is a complete, independent project; see its
own README for the exact command and the real measured result. No
`# pylint: disable` comment appears anywhere -- every message below is a
real, unsuppressed finding.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED WRONG |
| py3.13 | MEASURED WRONG |
| py3.14 | MEASURED WRONG |

## What "wrong" means here

`pylint src/deskqueue --fail-under=10` against `src/deskqueue/`: **the
printed score is 4.86/10**, comfortably under the 5.00 bar (and under
Clean's own 10.00/10). The source is identical across all five version
folders: none of pylint's checks here are Python-version-sensitive.

## Why it is wrong

Docstrings are omitted everywhere (deliberately -- this is the one hygiene
rule the brief calls out as fair game for pylint's own fixture) alongside a
pile of genuine, unsuppressed findings: unused imports and variables, a bare
`except:`, a too-broad `except Exception`, non-`snake_case` names, a
function with 7 arguments and 15 branches, `eval()` use, an unclosed `open()`
with no encoding, a `global` statement, a mutable default argument, and a
function redefined later in the same module (pylint's own `function-redefined`
error). 34 messages total -- 1 error, 11 warning, 4 refactor, 18 convention --
over 74 analysed statements is what pulls the score under half.
