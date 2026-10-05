"""An undirected graph stored as an adjacency mapping."""


class Graph:
    """An undirected graph over string labels."""

    def __init__(self) -> None:
        """Create a graph with no vertices."""
        self.adjacency: dict[str, set[str]] = {}

    def add_edge(self, left: str, right: str) -> None:
        """Add an undirected edge, creating either endpoint as needed."""
        self.adjacency.setdefault(left, set()).add(right)
        self.adjacency.setdefault(right, set()).add(left)

    def neighbours(self, label: str) -> set[str]:
        """Labels adjacent to a vertex; an unknown vertex has none."""
        return self.adjacency.get(label, set())

    def order(self) -> int:
        """Number of vertices in the graph."""
        return len(self.adjacency)
