"""The deferral policy applied before a task is admitted."""

MAX_ATTEMPTS = 3


def should_defer(attempts: int, queue_depth: int, capacity: int) -> bool:
    """Whether a task should wait rather than be admitted now."""
    if attempts >= MAX_ATTEMPTS:
        return False
    return queue_depth >= capacity
