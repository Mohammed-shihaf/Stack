# jscpd

jscpd is an npm package that runs on Node, not on the project interpreter, so
the branch's Python version does not constrain it. It is the primary tool for
the seven Code Duplication metrics and it is one of the few primaries that
actually fires on a Python 3.7 branch.

```
node --version      # 18+ is enough
npx --yes jscpd@5.1.1 --version
```

Verified in-session against these sources: it reports the
`retail_order_processor.py` / `wholesale_order_processor.py` pair as one clone.
