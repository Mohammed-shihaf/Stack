"""Wire contracts shared by every service in this workspace.

Plain dicts and validators rather than a schema library: the contracts package
must import on Python 3.6 with no third-party dependency at all, so that a
service whose own dependencies failed to install still fails for its own
reason and not for this package's.
"""
from typing import Any, Dict, List

ORDER_BOOK_VERSION = "1.0"

REQUIRED_ORDER_FIELDS = ("order_id", "channel", "region", "tier", "lines")
REQUIRED_LINE_FIELDS = ("sku", "quantity", "unit_price")


def validate_order_envelope(envelope: Dict[str, Any]) -> List[str]:
    """Return every problem with an inbound order envelope."""
    problems = []
    if envelope.get("version") != ORDER_BOOK_VERSION:
        problems.append("unsupported envelope version: {0!r}".format(
            envelope.get("version")))
    orders = envelope.get("orders")
    if not isinstance(orders, list) or not orders:
        problems.append("envelope carries no orders")
        return problems
    for index, order in enumerate(orders):
        for field in REQUIRED_ORDER_FIELDS:
            if field not in order:
                problems.append("orders[{0}] is missing {1}".format(index, field))
        for line_index, line in enumerate(order.get("lines") or []):
            for field in REQUIRED_LINE_FIELDS:
                if field not in line:
                    problems.append("orders[{0}].lines[{1}] is missing {2}".format(
                        index, line_index, field))
    return problems


def priced_response(order_id: str, total: float) -> Dict[str, Any]:
    return {"version": ORDER_BOOK_VERSION, "order_id": order_id, "total": total}


def error_response(order_id: str, problems: List[str]) -> Dict[str, Any]:
    return {"version": ORDER_BOOK_VERSION, "order_id": order_id, "errors": list(problems)}
