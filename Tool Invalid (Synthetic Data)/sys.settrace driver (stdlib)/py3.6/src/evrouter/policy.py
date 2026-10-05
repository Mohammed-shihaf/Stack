"""A backoff retry policy for handler failures."""

BASE_DELAY_MS = 100
MAX_DELAY_MS = 1600


def retry_delay_ms(attempt):
    """Exponential backoff delay in milliseconds for this attempt number."""
    delay = BASE_DELAY_MS * (2 ** attempt)
    if delay > MAX_DELAY_MS:
        return MAX_DELAY_MS
    return delay


def should_retry(attempt, max_attempts):
    """Whether another attempt is permitted."""
    if attempt >= max_attempts:
        return False
    return True


def classify_attempt(attempt, max_attempts):
    """Label an attempt as first, retry or exhausted."""
    if attempt == 0:
        return "first"
    if attempt < max_attempts:
        return "retry"
    return "exhausted"
