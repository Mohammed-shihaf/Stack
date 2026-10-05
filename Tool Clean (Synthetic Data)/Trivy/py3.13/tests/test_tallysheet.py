"""Cover parsing and every summary branch."""

from tallysheet import parse_rows, summarise_column

CSV = "name,score\nola,3\nrae,5\nbo,\nzed,nine\n"


def test_parse_rows() -> None:
    rows = parse_rows(CSV)
    assert len(rows) == 4
    assert rows[0]["name"] == "ola"


def test_summarise_column_skips_blank_and_non_numeric() -> None:
    summary = summarise_column(parse_rows(CSV), "score")
    assert summary.count == 2
    assert summary.total == 8.0
    assert summary.mean == 4.0


def test_summarise_column_missing_column() -> None:
    assert summarise_column(parse_rows(CSV), "absent").count == 0
