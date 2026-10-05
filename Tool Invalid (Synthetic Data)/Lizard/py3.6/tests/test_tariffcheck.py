"""Exercise the main branches of classification, tier and duty lookup."""

from tariffcheck import classify_shipment, duty_rate, flag_reason, inspection_tier


def test_classify_electronics_heavy_high() -> None:
    result = classify_shipment("electronics", 25, 6000, "XX", [])
    assert result == "EL-HEAVY-HIGH"


def test_classify_textiles_flagged_bulk() -> None:
    result = classify_shipment("textiles", 80, 1000, "ZZ", ["ZZ"])
    assert result == "TX-FLAGGED-BULK"


def test_classify_machinery_high_flagged() -> None:
    result = classify_shipment("machinery", 10, 25000, "ZZ", ["ZZ"])
    assert result == "MA-HIGH-FLAGGED"


def test_classify_general_category() -> None:
    assert classify_shipment("books", 1, 50, "US", []) == "GENERAL"


def test_inspection_tier_flagged_origin_first_time() -> None:
    assert inspection_tier("GENERAL", 0, "ZZ", ["ZZ"]) == 3


def test_inspection_tier_standard() -> None:
    assert inspection_tier("GENERAL", 5, "US", ["ZZ"]) == 1


def test_duty_rate_heavy_high_flagged() -> None:
    assert duty_rate("EL-HEAVY-HIGH", 6000, "ZZ", ["ZZ"]) == 220


def test_duty_rate_default() -> None:
    assert duty_rate("GENERAL", 100, "US", []) == 90


def test_flag_reason_known_and_unknown() -> None:
    assert flag_reason("EL-HEAVY-HIGH") == "heavy high-value electronics"
    assert flag_reason("GENERAL") == "no special reason"
