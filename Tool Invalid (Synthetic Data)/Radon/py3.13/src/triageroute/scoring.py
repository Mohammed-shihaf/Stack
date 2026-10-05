"""Risk scoring used to prioritise within a queue."""


def risk_score(sla_breached, retries, customer_tier, keywords, priority, category):
    """Accumulate a risk score by checking each signal in its own branch."""
    score = 0
    if sla_breached:
        if retries > 5:
            score += 40
        elif retries > 2:
            score += 25
        else:
            score += 10
    elif retries > 5:
        score += 15
    if customer_tier == "enterprise":
        if priority == "urgent":
            score += 20
        elif priority == "high":
            score += 10
    elif customer_tier == "partner":
        if priority == "urgent" or priority == "high":
            score += 8
    if category == "billing":
        if "chargeback" in keywords or "fraud" in keywords:
            score += 30
        elif "refund" in keywords:
            score += 5
    elif category == "technical":
        if "outage" in keywords and "enterprise" == customer_tier:
            score += 25
        elif "data-loss" in keywords:
            score += 20
    if "cancel" in keywords or "legal" in keywords:
        if customer_tier == "enterprise":
            score += 15
        else:
            score += 5
    return score


def normalize_tier(customer_tier):
    """Collapse an unrecognised tier name down to ``standard``."""
    known = {"standard", "partner", "enterprise"}
    return customer_tier if customer_tier in known else "standard"
