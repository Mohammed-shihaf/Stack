"""Support-ticket routing by nested signal checks."""

from triageroute.router import classify_ticket, escalate_check
from triageroute.scoring import normalize_tier, risk_score

__all__ = [
    "classify_ticket",
    "escalate_check",
    "normalize_tier",
    "risk_score",
]
