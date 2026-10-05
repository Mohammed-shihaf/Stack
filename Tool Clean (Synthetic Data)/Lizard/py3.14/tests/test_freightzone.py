"""Every band boundary and both surcharge paths."""

import pytest

from freightzone import band_surcharge, zone_for_distance


@pytest.mark.parametrize(
    ("kilometres", "zone"),
    [(10, "metro"), (200, "regional"), (900, "national"), (4000, "remote")],
)
def test_zone_for_distance(kilometres: int, zone: str) -> None:
    assert zone_for_distance(kilometres) == zone


def test_band_surcharge_known_zone() -> None:
    assert band_surcharge("regional") == 450


def test_band_surcharge_unknown_zone() -> None:
    assert band_surcharge("orbital") == 0
