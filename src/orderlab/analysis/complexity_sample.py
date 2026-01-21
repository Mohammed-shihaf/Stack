"""High-complexity fixture.

`classify_shipment` is deliberately over the McCabe limit of 10. Radon should
score it E or F; Lizard should agree on the count; complexipy and the
cognitive-ast runner should both put it far above a cognitive threshold of 15.

The nesting is real branch structure, not a chain of `if True`, because a
tokeniser and a real CFG builder must agree on it for the cross-check to mean
anything.
"""
from typing import Dict, List, Optional


def classify_shipment(order, region, tier, weight_kg, hazardous, express,
                      customs_value, destination_zone, promo=None):
    """Return a shipping class for an order. Intentionally complex."""
    band = "unknown"
    surcharge = 0.0
    if weight_kg <= 0:
        return {"band": "invalid", "surcharge": 0.0, "reason": "non-positive weight"}
    if hazardous:
        if region == "EU":
            if weight_kg > 30:
                band = "haz-heavy-eu"
                surcharge = 48.0
            elif weight_kg > 5:
                band = "haz-mid-eu"
                surcharge = 26.0
            else:
                band = "haz-light-eu"
                surcharge = 14.0
        elif region == "US":
            if destination_zone in (7, 8, 9):
                band = "haz-remote-us"
                surcharge = 55.0
            elif weight_kg > 20:
                band = "haz-heavy-us"
                surcharge = 39.0
            else:
                band = "haz-std-us"
                surcharge = 21.0
        else:
            band = "haz-intl"
            surcharge = 62.0
    else:
        if express:
            if tier == "gold":
                surcharge = 9.0
            elif tier == "silver":
                surcharge = 13.0
            else:
                surcharge = 18.0
            band = "express-" + region.lower()
        else:
            if weight_kg > 50:
                band = "freight"
                surcharge = 34.0
            elif weight_kg > 10:
                band = "parcel-heavy"
                surcharge = 11.0
            else:
                band = "parcel"
                surcharge = 4.5

    if customs_value > 1000 and region != "US":
        surcharge += 25.0
    if promo and promo.upper() == "FREESHIP" and not hazardous:
        surcharge = 0.0
    if destination_zone > 6 and band != "freight":
        surcharge += 7.5

    return {"band": band, "surcharge": round(surcharge, 2), "reason": "classified"}


def summarise_bands(rows: List[Dict[str, object]], minimum: Optional[float] = None):
    """A second, milder branch structure so the file is not a single outlier."""
    totals = {}
    for row in rows:
        band = str(row.get("band", "unknown"))
        value = float(row.get("surcharge", 0.0))
        if minimum is not None and value < minimum:
            continue
        if band not in totals:
            totals[band] = 0.0
        totals[band] = round(totals[band] + value, 2)
    return totals
