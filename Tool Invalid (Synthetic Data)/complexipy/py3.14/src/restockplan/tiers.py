"""Safety-stock tiering and a flat unit-cost lookup."""


def safety_stock_tier(demand_rate, lead_time_days, is_seasonal, supplier_reliable):
    """Pick a safety-stock tier by nesting demand, lead time and risk."""
    if is_seasonal:
        if demand_rate > 20:
            if lead_time_days > 14:
                if not supplier_reliable:
                    tier = "critical"
                else:
                    tier = "high"
            else:
                tier = "medium"
        else:
            if not supplier_reliable and lead_time_days > 10:
                tier = "high"
            else:
                tier = "low"
    else:
        if lead_time_days > 21 and not supplier_reliable:
            if demand_rate > 15:
                tier = "high"
            else:
                tier = "medium"
        else:
            tier = "low"
    return tier


def lookup_unit_cost(sku_category):
    """Flat per-category unit cost lookup."""
    costs = {
        "fastener": 0.12,
        "bearing": 4.50,
        "gasket": 0.75,
        "motor": 85.00,
    }
    return costs.get(sku_category, 1.00)
