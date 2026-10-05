"""Cover entry totals and summary rendering."""

from ledgerbook import LedgerEntry, format_summary, total_for_category


def test_total_for_category_sums_matching_entries():
    entries = [
        LedgerEntry("travel", 1200),
        LedgerEntry("travel", 300),
        LedgerEntry("meals", 500),
    ]
    assert total_for_category(entries, "travel") == 1500


def test_total_for_category_ignores_other_categories():
    entries = [LedgerEntry("travel", 1200), LedgerEntry("meals", 500)]
    assert total_for_category(entries, "meals") == 500


def test_format_summary_renders_each_category():
    entries = [LedgerEntry("travel", 1250), LedgerEntry("meals", 500)]
    summary = format_summary(entries, ["travel", "meals"])
    assert summary == "travel: 12.50\nmeals: 5.00"
