"""Gateway service -- the HTTP edge that accepts order books.

Taint note: in the microservices branches this is where untrusted input
enters. The domain layer is identical to the monolith branches, so a taint
engine that only recognises a request object as a source will find flows here
and nowhere in the monolith -- which is exactly the difference the corpus is
built to measure.
"""
from typing import Any, Dict

from contracts import error_response, priced_response, validate_order_envelope
from orderlab.models.order_record import OrderRecord
from orderlab.services.order_service import OrderService, PricingFailure

SERVICE_NAME = "gateway-service"

_service = OrderService()


def handle(envelope: Dict[str, Any]) -> Dict[str, Any]:
    """Accept an order book envelope and return priced results."""
    problems = validate_order_envelope(envelope)
    if problems:
        return error_response(str(envelope.get("batch_id", "")), problems)
    results = []
    for raw in envelope["orders"]:
        order = OrderRecord.from_mapping(raw)
        try:
            results.append(priced_response(order.order_id, _service.price(order)))
        except PricingFailure as failure:
            results.append(error_response(order.order_id, failure.problems))
    return {"batch_id": envelope.get("batch_id"), "results": results}


def health() -> Dict[str, Any]:
    return {"service": SERVICE_NAME, "priced": _service.processed_count}
