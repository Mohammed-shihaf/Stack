"""Cover permitted and rejected transitions, and the ledger record."""

import pytest

from taskledger import Ledger, STATES, next_state


def test_state_names() -> None:
    assert STATES == ("open", "active", "blocked", "done")


def test_permitted_transition() -> None:
    assert next_state("open", "active") == "active"


def test_rejected_transition() -> None:
    with pytest.raises(ValueError):
        next_state("done", "active")


def test_ledger_records_history() -> None:
    ledger = Ledger()
    assert ledger.state == "open"
    ledger.advance("active")
    ledger.advance("done")
    assert ledger.history == ["open", "active", "done"]
