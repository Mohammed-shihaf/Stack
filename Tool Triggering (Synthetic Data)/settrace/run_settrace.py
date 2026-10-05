#!/usr/bin/env python
"""sys.settrace driver -- executed-line evidence from the stdlib alone.

The alternative tool for "Reporting Validation / Audit Trail Verification".
It exists so that at least one coverage-shaped measurement is available on an
interpreter where Coverage.py and SlipCover both refuse to install: it needs
nothing but the standard library, so it runs wherever Python runs.

Written 3.6-clean.
"""
from __future__ import print_function

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, *"packages/domain/src".split("/"))
PKG = "orderlab"

if SRC not in sys.path:
    sys.path.insert(0, SRC)

EXECUTED = {}


def tracer(frame, event, arg):
    filename = frame.f_code.co_filename
    if filename.startswith(SRC):
        rel = os.path.relpath(filename, SRC).replace(os.sep, "/")
        EXECUTED.setdefault(rel, set()).add(frame.f_lineno)
    return tracer


def exercise():
    from orderlab.models.order_record import OrderRecord
    from orderlab.services.order_service import OrderService
    from orderlab.services.retail_order_processor import RetailOrderProcessor
    from orderlab.services.wholesale_order_processor import WholesaleOrderProcessor

    orders = [
        OrderRecord.from_mapping({
            "order_id": "S-1", "channel": "retail", "region": "US", "tier": "gold",
            "promo_code": "SPRING10",
            "lines": [{"sku": "A", "quantity": 40, "unit_price": 10.0}]}),
        OrderRecord.from_mapping({
            "order_id": "S-2", "channel": "wholesale", "region": "EU",
            "tier": "silver",
            "lines": [{"sku": "B", "quantity": 600, "unit_price": 2.0}]}),
    ]
    service = OrderService()
    service.price_all(orders)
    RetailOrderProcessor().process_all(orders)
    WholesaleOrderProcessor().process_all(orders)


def statement_lines(path):
    import ast
    with open(path) as handle:
        try:
            tree = ast.parse(handle.read(), path)
        except SyntaxError:
            return set()
    return set(n.lineno for n in ast.walk(tree)
               if hasattr(n, "lineno") and not isinstance(n, (ast.Load, ast.Store)))


def main():
    sys.settrace(tracer)
    try:
        exercise()
    finally:
        sys.settrace(None)

    rows = []
    for dirpath, dirnames, filenames in os.walk(os.path.join(SRC, PKG)):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for name in sorted(filenames):
            if not name.endswith(".py"):
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, SRC).replace(os.sep, "/")
            total = statement_lines(full)
            hit = EXECUTED.get(rel, set()) & total
            rows.append({
                "file": rel,
                "statements": len(total),
                "executed": len(hit),
                "percent": round(100.0 * len(hit) / len(total), 2) if total else 0.0,
            })

    total_stmt = sum(r["statements"] for r in rows)
    total_hit = sum(r["executed"] for r in rows)
    report = {
        "tool": "sys.settrace driver (stdlib)",
        "interpreter": "%d.%d.%d" % sys.version_info[:3],
        "statements": total_stmt,
        "executed": total_hit,
        "percent": round(100.0 * total_hit / total_stmt, 2) if total_stmt else 0.0,
        "files": sorted(rows, key=lambda r: r["file"]),
    }
    outdir = os.path.join(ROOT, "reports")
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    with open(os.path.join(outdir, "settrace.json"), "w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
    print("settrace: %d/%d statements executed (%.2f%%)"
          % (total_hit, total_stmt, report["percent"]))
    if total_hit == 0:
        print("WARNING: zero executed lines. The tracer did not attach.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
