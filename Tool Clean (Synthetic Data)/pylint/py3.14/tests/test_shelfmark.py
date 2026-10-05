"""Cover availability, lookup, filtering and the total."""

from shelfmark import BookRecord, Catalogue


def test_is_available_both_ways() -> None:
    assert BookRecord("A1", "Tides", 1).is_available() is True
    assert BookRecord("A2", "Kilns", 0).is_available() is False


def test_add_and_find() -> None:
    catalogue = Catalogue()
    record = BookRecord("B1", "Ferns", 2)
    catalogue.add(record)
    assert catalogue.find("B1") is record


def test_available_skips_empty_shelves() -> None:
    catalogue = Catalogue()
    catalogue.add(BookRecord("C1", "Loams", 0))
    catalogue.add(BookRecord("C2", "Reeds", 3))
    assert [r.shelfmark for r in catalogue.available()] == ["C2"]


def test_total_copies() -> None:
    catalogue = Catalogue()
    catalogue.add(BookRecord("D1", "Marls", 2))
    catalogue.add(BookRecord("D2", "Silts", 5))
    assert catalogue.total_copies() == 7
