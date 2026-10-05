"""Cover every seat branch and the ticket ordering."""

from seatplan import SeatRow, Ticket, sort_by_seat


def test_hold_rejects_out_of_range() -> None:
    row = SeatRow(3)
    assert row.hold(0) is False
    assert row.hold(4) is False


def test_hold_rejects_taken_seat() -> None:
    row = SeatRow(3)
    assert row.hold(2) is True
    assert row.hold(2) is False


def test_release_frees_a_seat() -> None:
    row = SeatRow(2)
    row.hold(1)
    row.release(1)
    assert row.free_seats() == [1, 2]


def test_width_and_free_seats() -> None:
    row = SeatRow(2)
    assert row.width == 2
    row.hold(1)
    assert row.free_seats() == [2]


def test_sort_by_seat() -> None:
    tickets = [Ticket("rae", 3), Ticket("ola", 1)]
    assert [t.holder for t in sort_by_seat(tickets)] == ["ola", "rae"]
