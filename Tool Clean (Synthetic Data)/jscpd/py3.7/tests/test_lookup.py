"""Length lookup, both branches."""

import pytest

from unitcast import to_millimetres


def test_known_unit() -> None:
    assert to_millimetres(2.0, "cm") == 20.0


def test_unknown_unit() -> None:
    with pytest.raises(KeyError):
        to_millimetres(1.0, "league")
