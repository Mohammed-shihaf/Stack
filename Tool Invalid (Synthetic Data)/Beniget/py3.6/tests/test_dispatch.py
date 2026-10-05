"""Each function below has a genuine scoping bug; the tests document it.

beniget's static analysis says each of these reads a name with no live
definition, and every one of them really does raise at call time --
the tool is right, not merely noisy.
"""

import pytest

from liftqueue import audit_trail, close_call, record_request, tally_requests


def test_record_request_raises() -> None:
    """The tag is deleted, then returned: always a real bug."""
    with pytest.raises(UnboundLocalError):
        record_request()


def test_close_call_raises() -> None:
    """The except-clause name is gone by the time it is returned."""
    def failing_trigger() -> None:
        raise RuntimeError("stalled")

    with pytest.raises(UnboundLocalError):
        close_call(failing_trigger)


def test_tally_requests_raises() -> None:
    """The comprehension's loop variable never leaks to this scope."""
    with pytest.raises(NameError):
        tally_requests([3, 5, 7])


def test_audit_trail_raises() -> None:
    """Both chained names are gone by the time the function returns."""
    with pytest.raises(UnboundLocalError):
        audit_trail()
