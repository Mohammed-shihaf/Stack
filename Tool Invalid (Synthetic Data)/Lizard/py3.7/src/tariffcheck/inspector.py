"""Shipment classification and inspection-tier assignment.

Every input (category, weight, declared value, origin country, flag list,
prior inspection count) gets its own nested branch, so the decision count
piles up the way the project README calls out as the failure mode.
"""


def classify_shipment(category, weight_kg, declared_value, origin_country, flagged_countries):
    """Assign a tariff class by nested category/weight/value/origin checks."""
    if category == "electronics":
        if weight_kg > 20:
            if declared_value > 5000:
                tariff_class = "EL-HEAVY-HIGH"
            else:
                tariff_class = "EL-HEAVY-LOW"
        else:
            if declared_value > 5000:
                tariff_class = "EL-LIGHT-HIGH"
            else:
                tariff_class = "EL-LIGHT-LOW"
    elif category == "textiles":
        if origin_country in flagged_countries:
            if weight_kg > 50:
                tariff_class = "TX-FLAGGED-BULK"
            else:
                tariff_class = "TX-FLAGGED"
        else:
            tariff_class = "TX-STANDARD"
    elif category == "machinery":
        if declared_value > 20000:
            if origin_country in flagged_countries:
                tariff_class = "MA-HIGH-FLAGGED"
            else:
                tariff_class = "MA-HIGH"
        else:
            tariff_class = "MA-STANDARD"
    else:
        tariff_class = "GENERAL"
    return tariff_class


def inspection_tier(tariff_class, prior_inspection_count, origin_country, flagged_countries):
    """Pick an inspection tier from the tariff class and prior history."""
    if origin_country in flagged_countries:
        if prior_inspection_count == 0:
            tier = 3
        elif prior_inspection_count < 3:
            tier = 2
        else:
            tier = 1
    elif "FLAGGED" in tariff_class or "HIGH" in tariff_class:
        if prior_inspection_count == 0:
            tier = 2
        else:
            tier = 1
    else:
        tier = 1
    return tier
