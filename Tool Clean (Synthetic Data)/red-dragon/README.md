# red-dragon

Synthetic, clean-by-design TypeScript project for **red-dragon**.

Package: red-dragon (Python, github.com/avishek-sen-gupta/red-dragon, commit c287bb2)

Domain: pump-room pressure trends (PumpRoom)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

The driver reports dead stores: none, maybe-uninitialised reads: none -- every named variable in the three functions is read after it is written, and each is written before any read.

## Command

```bash
# red-dragon is not on PyPI: clone it, check out the pinned commit, `uv sync` (Python >= 3.13)
uv run --project <red-dragon checkout> python "../../Tool Triggering (Synthetic Data)/red-dragon/dataflow.py" <red-dragon checkout> reports/red-dragon.json src/pumpRoom.ts
```

## Notes

The earlier version of this folder called `red-dragon` a roster defect (a COBOL-only tool with no TypeScript support). That was wrong: upstream's README describes a multi-language pipeline (tree-sitter frontends, an intermediate representation, a CFG, reaching-definitions and def-use analysis), and it has a TypeScript frontend (`interpreter/frontends/typescript`). Checked by running commit c287bb2 on TypeScript source on 2026-10-07: it lowers `src/pumpRoom.ts` to IR, builds the CFG and reports definitions and def-use chains. One limit was found on the way: this commit cannot lower a compound assignment such as `i += 1` (`ValueError: Unknown binary operator: '+='`), so the fixtures here use `i = i + 1`. Needs Python >= 3.13 and `uv`; Node-version-independent, one folder. The driver is `Tool Triggering (Synthetic Data)/red-dragon/dataflow.py`; it counts a named variable that is assigned but never read as a dead store, and a read that an initialiser-less `let x;` can reach as a maybe-uninitialised read.
