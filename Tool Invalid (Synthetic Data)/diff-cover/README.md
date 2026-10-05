# diff-cover

Synthetic, clean-by-design TypeScript project for **diff-cover**.

Package: diff_cover 10.6.0 (PyPI)

Domain: cooperage stave yield tracking (CooperageYield)

**Measured**: installed (or built from real source) and actually invoked in the build environment; the result below is real, not asserted.

## What a passing result looks like

`diff-cover` reports 100% coverage on every line changed on the `feature` branch, read from a real vitest v8/cobertura coverage report over real git history.

## Command

```bash
diff-cover coverage/cobertura-coverage.xml --compare-branch main
```

## Notes

Same package already used in the Python/JavaScript/Java corpora; reads vitest's own cobertura reporter output over a real `main`/`feature` git history.
