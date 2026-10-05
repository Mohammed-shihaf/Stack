"""Validating a relay response before it is forwarded."""


def validate_response(response):
    """Confirm a relay response succeeded before forwarding it."""
    assert response.ok
    return response
