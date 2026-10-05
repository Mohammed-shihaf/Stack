"""Exercise the main branches of routing, queue scanning and headroom."""

from dispatchsim import assign_parcel_to_route, carrier_headroom, scan_pending_queue


def test_assign_parcel_local_express() -> None:
    route = assign_parcel_to_route("local", 10, False, False, True, "same-day", 10)
    assert route == "local-express"


def test_assign_parcel_local_hazmat() -> None:
    route = assign_parcel_to_route("local", 10, False, True, True, "standard", 0)
    assert route == "local-hazmat"


def test_assign_parcel_regional_queued() -> None:
    route = assign_parcel_to_route("regional", 10, False, False, False, "standard", 0)
    assert route == "regional-queued"


def test_assign_parcel_national() -> None:
    route = assign_parcel_to_route("international", 10, False, False, True, "standard", 0)
    assert route == "national-freight"


def test_scan_pending_queue_assigns_local() -> None:
    parcels = [{"zone": "local", "weight_kg": 5}]
    assigned = scan_pending_queue(parcels, True, 0)
    assert len(assigned) == 1


def test_scan_pending_queue_skips_heavy_local() -> None:
    parcels = [{"zone": "local", "weight_kg": 200}]
    assert scan_pending_queue(parcels, True, 0) == []


def test_scan_pending_queue_stops_on_heavy_regional() -> None:
    parcels = [{"zone": "regional", "weight_kg": 600}]
    assert scan_pending_queue(parcels, True, 0) == []


def test_carrier_headroom_positive_and_zero() -> None:
    assert carrier_headroom(100, 40) == 60
    assert carrier_headroom(50, 80) == 0
