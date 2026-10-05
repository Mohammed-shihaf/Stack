"""A bounded first-in, first-out task queue."""

from tracedemo.policy import should_defer


class TaskQueue:
    """A queue that admits tasks up to a fixed capacity."""

    def __init__(self, capacity: int) -> None:
        """Create an empty queue with the given capacity."""
        self.capacity = capacity
        self._waiting: list[str] = []

    @property
    def depth(self) -> int:
        """Number of tasks currently queued."""
        return len(self._waiting)

    def offer(self, name: str, attempts: int) -> bool:
        """Admit a task unless the policy says to defer it."""
        if should_defer(attempts, self.depth, self.capacity):
            return False
        self._waiting.append(name)
        return True

    def take(self) -> str:
        """Remove and return the oldest queued task."""
        return self._waiting.pop(0)
