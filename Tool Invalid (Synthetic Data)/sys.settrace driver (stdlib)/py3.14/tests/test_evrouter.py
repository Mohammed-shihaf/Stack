"""Tests for the event router, retry policy and transition table."""

import pytest

from evrouter import next_state, route_event
from evrouter.policy import classify_attempt, retry_delay_ms, should_retry
from evrouter.router import describe_event, is_known_type
from evrouter.transitions import is_valid_transition, terminal_states


def test_route_event_known_handler():
    calls = []
    handlers = {"created": lambda event_type: calls.append(event_type)}
    route_event("created", handlers)
    assert calls == ["created"]


def test_route_event_falls_back_to_default():
    calls = []
    handlers = {"default": lambda event_type: calls.append(event_type)}
    route_event("updated", handlers)
    assert calls == ["updated"]


def test_route_event_rejects_unrecognised_type():
    with pytest.raises(ValueError):
        route_event("bogus", {})


def test_is_known_type():
    assert is_known_type("created") is True
    assert is_known_type("bogus") is False


def test_describe_event_known_types():
    assert "new record" in describe_event("created")
    assert "unrecognised" in describe_event("bogus")


def test_retry_delay_grows_then_caps():
    assert retry_delay_ms(0) == 100
    assert retry_delay_ms(10) == 1600


def test_should_retry():
    assert should_retry(0, 3) is True
    assert should_retry(3, 3) is False


def test_classify_attempt():
    assert classify_attempt(0, 3) == "first"
    assert classify_attempt(1, 3) == "retry"
    assert classify_attempt(3, 3) == "exhausted"


def test_next_state_known_transition():
    assert next_state("draft", "submit") == "pending"


def test_next_state_unknown_transition_is_none():
    assert next_state("draft", "archive") is None


def test_is_valid_transition():
    assert is_valid_transition("pending", "approve") is True
    assert is_valid_transition("draft", "approve") is False


def test_terminal_states_is_empty_for_a_fully_cyclic_table():
    assert terminal_states() == set()
