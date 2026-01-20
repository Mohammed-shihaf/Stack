"""Console entry point: price the sample order book and print a summary."""
import json
import sys

from .models.order_record import OrderRecord
from .services.order_service import OrderService

SAMPLE_ORDERS = [
    {"order_id": "A-1001", "channel": "retail", "region": "US", "tier": "gold",
     "promo_code": "SPRING10",
     "lines": [{"sku": "SKU-1", "quantity": 40, "unit_price": 12.5},
               {"sku": "SKU-2", "quantity": 8, "unit_price": 99.0}]},
    {"order_id": "A-1002", "channel": "wholesale", "region": "EU", "tier": "silver",
     "lines": [{"sku": "SKU-3", "quantity": 250, "unit_price": 3.75}]},
    {"order_id": "A-1003", "channel": "marketplace", "region": "APAC", "tier": "standard",
     "lines": [{"sku": "SKU-4", "quantity": 6, "unit_price": 45.0,
                "discountable": False}]},
]


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    service = OrderService()
    orders = [OrderRecord.from_mapping(raw) for raw in SAMPLE_ORDERS]
    priced, failures = service.price_all(orders)
    report = {
        "priced": [{"order_id": o.order_id, "total": t}
                   for o, t in zip(orders, priced)],
        "failed": [f.order_id for f in failures],
        "processed": service.processed_count,
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())
