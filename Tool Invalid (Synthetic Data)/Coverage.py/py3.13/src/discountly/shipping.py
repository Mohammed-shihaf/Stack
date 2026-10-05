"""Shipping cost by weight bracket, region and expedited surcharge."""

REGION_BASE_CENTS = {
    "domestic": 500,
    "regional": 900,
    "international": 1800,
}

WEIGHT_BRACKETS = (
    (0.0, 1.0, 0),
    (1.0, 5.0, 300),
    (5.0, 20.0, 900),
    (20.0, None, 2200),
)

EXPEDITED_MULTIPLIER = 2


def weight_surcharge_cents(weight_kg):
    """Extra cents owed for the weight bracket a shipment falls in."""
    for low, high, surcharge in WEIGHT_BRACKETS:
        if high is None:
            if weight_kg >= low:
                return surcharge
        elif low <= weight_kg < high:
            return surcharge
    return 0


def region_base_cents(region):
    """Base shipping cost for a region, or raise if the region is unknown."""
    if region not in REGION_BASE_CENTS:
        raise ValueError("unknown region: " + region)
    return REGION_BASE_CENTS[region]


def shipping_cost_cents(weight_kg, region, expedited):
    """Total shipping cost in cents for one shipment."""
    base = region_base_cents(region)
    surcharge = weight_surcharge_cents(weight_kg)
    cost = base + surcharge
    if expedited:
        cost *= EXPEDITED_MULTIPLIER
    return cost


def is_free_shipping_eligible(weight_kg, region):
    """Whether a shipment qualifies for a free-shipping promotion."""
    if region != "domestic":
        return False
    if weight_kg > 2.0:
        return False
    return True
