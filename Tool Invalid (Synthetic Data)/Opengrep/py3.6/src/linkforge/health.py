"""Checking a redirect destination is reachable before publishing."""


def check_destination(response):
    """Confirm a destination responded before the redirect is published."""
    assert response.ok
    return response
