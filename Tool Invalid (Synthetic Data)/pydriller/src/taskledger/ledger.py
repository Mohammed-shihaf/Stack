"""A ledger recording each accepted transition in order."""

from taskledger.states import next_state


class Ledger:
    """An append-only record of one task's state transitions."""

    def __init__(self) -> None:
        """Begin in the open state with no transitions recorded."""
        self._history: list[str] = ["open"]

    @property
    def state(self) -> str:
        """The current state."""
        return self._history[-1]

    @property
    def history(self) -> list[str]:
        """Every state the task has held, in order."""
        return list(self._history)

    def advance(self, requested: str) -> str:
        """Record a transition to `requested` and return the new state."""
        self._history.append(next_state(self.state, requested))
        return self.state
