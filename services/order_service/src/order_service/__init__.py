"""Order service -- applies the domain pricing pipeline to a batch."""
from typing import Any, Dict, List

from contracts import priced_response
from orderlab.models.order_record import OrderRecord
from orderlab.services.order_service import OrderService

SERVICE_NAME = "order-service"

_service = OrderService()


def price_batch(raw_orders: List[Dict[str, Any]]) -> Dict[str, Any]:
    orders = [OrderRecord.from_mapping(raw) for raw in raw_orders]
    priced, failures = _service.price_all(orders)
    return {
        "service": SERVICE_NAME,
        "priced": [priced_response(o.order_id, t) for o, t in zip(orders, priced)],
        "failed": [f.order_id for f in failures],
    }


def health() -> Dict[str, Any]:
    return {"service": SERVICE_NAME, "priced": _service.processed_count}
