"""Shared fixtures.

Adds the branch's source root to sys.path so the suite runs against the working
tree whether or not the package has been installed. That matters here: on the
uv branches nothing can be installed at all, and the suite must still be
runnable by `python -m pytest` directly.
"""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, *"src".split("/"))
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from orderlab.models.order_record import OrderRecord      # noqa: E402
from orderlab.services.order_service import OrderService  # noqa: E402
from orderlab.services.pricing_rules import PricingRules  # noqa: E402


@pytest.fixture
def rules():
    return PricingRules()


@pytest.fixture
def service():
    return OrderService()


@pytest.fixture
def gold_order():
    return OrderRecord.from_mapping({
        "order_id": "T-1", "channel": "retail", "region": "US", "tier": "gold",
        "lines": [{"sku": "S-1", "quantity": 40, "unit_price": 10.0}],
    })


@pytest.fixture
def bulk_order():
    return OrderRecord.from_mapping({
        "order_id": "T-2", "channel": "wholesale", "region": "EU", "tier": "silver",
        "lines": [{"sku": "S-2", "quantity": 600, "unit_price": 2.0}],
    })
