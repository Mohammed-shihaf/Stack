"""Parcel-to-route assignment and queue scanning.

Both functions nest their checks rather than flattening them, and the queue
scanner adds a nested loop with its own break/continue control flow on top,
so the cognitive-complexity score piles up from nesting depth, boolean
sequences and loop control all at once.
"""


def assign_parcel_to_route(zone, weight_kg, is_fragile, is_hazmat, carrier_available, time_window, backlog_level):
    """Pick a route by nesting every parcel attribute as its own check."""
    route = "unassigned"
    if zone == "local":
        if weight_kg <= 30:
            if not is_fragile:
                if not is_hazmat:
                    if carrier_available:
                        if backlog_level < 5 or time_window == "same-day":
                            route = "local-express"
                        else:
                            route = "local-standard"
                    else:
                        route = "local-queued"
                else:
                    route = "local-hazmat"
            else:
                route = "local-fragile"
        else:
            route = "local-freight"
    elif zone == "regional":
        if carrier_available and not is_hazmat:
            if weight_kg <= 50 and not is_fragile:
                route = "regional-express"
            else:
                route = "regional-standard"
        else:
            route = "regional-queued"
    else:
        route = "national-freight"
    return route


def scan_pending_queue(parcels, carrier_available, backlog_level):
    """Walk the pending queue, skipping and stopping under nested conditions."""
    assigned = []
    for parcel in parcels:
        zone = parcel.get("zone")
        weight_kg = parcel.get("weight_kg", 0)
        if zone == "local":
            if weight_kg > 100:
                continue
            else:
                if carrier_available:
                    for attempt in range(3):
                        if backlog_level < attempt:
                            assigned.append(parcel)
                            break
                        else:
                            continue
                else:
                    continue
        elif zone == "regional" or zone == "national":
            if weight_kg > 500:
                break
            else:
                assigned.append(parcel)
        else:
            continue
    return assigned
