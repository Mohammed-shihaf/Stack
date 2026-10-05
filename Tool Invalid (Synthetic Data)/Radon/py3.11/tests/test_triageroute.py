"""Exercise the main branches of routing, escalation and scoring."""

from triageroute import classify_ticket, escalate_check, normalize_tier, risk_score


def test_classify_billing_urgent_breach_enterprise() -> None:
    queue = classify_ticket("billing", "urgent", [], True, "enterprise", 0)
    assert queue == "escalations"


def test_classify_technical_outage_enterprise() -> None:
    queue = classify_ticket("technical", "urgent", ["outage"], False, "enterprise", 0)
    assert queue == "escalations"


def test_classify_account_locked() -> None:
    queue = classify_ticket("account", "low", ["locked"], False, "standard", 0)
    assert queue == "escalations"


def test_classify_other_no_breach() -> None:
    queue = classify_ticket("shipping", "low", [], False, "standard", 0)
    assert queue == "general"


def test_escalate_check_already_escalated() -> None:
    assert escalate_check("escalations", 0, False, "standard", []) is True


def test_escalate_check_high_retries_breach() -> None:
    assert escalate_check("technical", 6, True, "standard", []) is True


def test_escalate_check_low_retries() -> None:
    assert escalate_check("technical", 1, False, "standard", []) is False


def test_risk_score_enterprise_breach() -> None:
    score = risk_score(True, 6, "enterprise", ["fraud"], "urgent", "billing")
    assert score > 0


def test_normalize_tier_known_and_unknown() -> None:
    assert normalize_tier("partner") == "partner"
    assert normalize_tier("vip") == "standard"
