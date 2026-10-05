"""Surcharge calculation for freight shipments."""
def compute_freight_surcharge(weight_kg, declared_value, is_remote_area):
    """Total surcharge for a freight shipment."""
    surcharge = weight_kg * 0.75
    if declared_value > 500:
        surcharge += declared_value * 0.02
    else:
        surcharge += 0.0
    if is_remote_area:
        surcharge += 12.50
    handling = surcharge * 0.1
    total = surcharge + handling
    return round(total, 2)
