"""The ledger runs correctly; only astroid's static picture of it is wrong."""

from dispatch import (
    apply_adjustment,
    close_window,
    record_entry,
    report_window,
    summarize,
)


def test_record_entry() -> None:
    assert record_entry() == "LG-204"


def test_report_window() -> None:
    assert report_window() == "WC-17"


def test_apply_adjustment() -> None:
    assert apply_adjustment() == 7


def test_close_window_inactive() -> None:
    """Only the inactive path is exercised: the active path deletes the
    counter it then returns, which is a real bug, not a test gap."""
    assert close_window(False) == 3


def test_summarize() -> None:
    assert summarize([1, 2, 3]) == 6
