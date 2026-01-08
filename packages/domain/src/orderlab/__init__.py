"""orderlab -- a small order-pricing domain used as tool-evaluation fixture."""

__version__ = "1.0.0"

from .models.order_record import OrderLine, OrderRecord
from .models.tax_table import TaxTable
from .services.order_service import OrderService, PricingFailure
from .services.pricing_rules import PricingRules

__all__ = [
    "OrderLine",
    "OrderRecord",
    "TaxTable",
    "OrderService",
    "PricingFailure",
    "PricingRules",
]
