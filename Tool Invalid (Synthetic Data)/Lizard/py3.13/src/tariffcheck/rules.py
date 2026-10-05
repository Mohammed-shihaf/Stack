"""Duty rate lookup and a flat flag-reason check."""


def duty_rate(tariff_class, declared_value, origin_country, flagged_countries):
    """Duty rate in parts per thousand, branching on class and origin."""
    if tariff_class == "EL-HEAVY-HIGH":
        if origin_country in flagged_countries:
            rate = 220
        else:
            rate = 180
    elif tariff_class == "EL-HEAVY-LOW" or tariff_class == "EL-LIGHT-HIGH":
        if declared_value > 8000:
            rate = 150
        else:
            rate = 120
    elif tariff_class == "TX-FLAGGED-BULK":
        rate = 260
    elif tariff_class == "MA-HIGH-FLAGGED":
        rate = 240
    else:
        rate = 90
    return rate


def flag_reason(tariff_class):
    """Human-readable reason for a tariff class; a flat lookup."""
    reasons = {
        "EL-HEAVY-HIGH": "heavy high-value electronics",
        "TX-FLAGGED-BULK": "bulk textiles from a flagged origin",
        "MA-HIGH-FLAGGED": "high-value machinery from a flagged origin",
    }
    return reasons.get(tariff_class, "no special reason")
