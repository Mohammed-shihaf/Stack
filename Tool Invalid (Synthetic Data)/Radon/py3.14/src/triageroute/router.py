"""Queue assignment for incoming support tickets.

Every signal (category, priority, keywords, breach state, customer tier,
retry count) is checked by its own nested branch rather than through a
lookup table, so the branching accumulates instead of staying flat.
"""


def classify_ticket(category, priority, keywords, sla_breached, customer_tier, retries):
    """Pick a routing queue by walking every signal as a separate branch."""
    if category == "billing":
        if priority == "urgent":
            if sla_breached and customer_tier == "enterprise":
                queue = "escalations"
            elif sla_breached or customer_tier == "enterprise":
                queue = "priority-billing"
            else:
                queue = "billing"
        elif priority == "high":
            if "refund" in keywords or "chargeback" in keywords:
                queue = "priority-billing"
            else:
                queue = "billing"
        else:
            queue = "billing-backlog"
    elif category == "technical":
        if priority == "urgent" or sla_breached:
            if retries > 3:
                queue = "escalations"
            elif "outage" in keywords and customer_tier == "enterprise":
                queue = "escalations"
            else:
                queue = "technical-priority"
        elif priority == "high":
            if "data-loss" in keywords or "security" in keywords:
                queue = "escalations"
            else:
                queue = "technical"
        else:
            queue = "technical-backlog"
    elif category == "account":
        if "locked" in keywords or "fraud" in keywords:
            queue = "escalations"
        elif priority == "urgent" and sla_breached:
            queue = "priority-account"
        else:
            queue = "account"
    else:
        if sla_breached:
            queue = "general-priority"
        else:
            queue = "general"
    return queue


def escalate_check(queue, retries, sla_breached, customer_tier, keywords):
    """Decide whether an already-routed ticket should jump to escalations."""
    if queue == "escalations":
        return True
    if retries > 5:
        if sla_breached:
            return True
        elif customer_tier == "enterprise":
            if "angry" in keywords or "cancel" in keywords:
                return True
            else:
                return False
        else:
            return False
    elif retries > 2:
        if sla_breached and customer_tier == "enterprise":
            return True
        elif "cancel" in keywords or "legal" in keywords:
            if customer_tier == "enterprise":
                return True
            else:
                return False
        else:
            return False
    else:
        return False
