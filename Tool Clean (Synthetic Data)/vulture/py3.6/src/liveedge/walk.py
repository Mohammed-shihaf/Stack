"""Reachability over a graph."""


from typing import List
from liveedge.graph import Graph


def connected_labels(graph: Graph, start: str) -> List[str]:
    """Labels reachable from `start`, including it, in sorted order."""
    seen = {start}
    pending = [start]
    while pending:
        label = pending.pop()
        for neighbour in graph.neighbours(label):
            if neighbour not in seen:
                seen.add(neighbour)
                pending.append(neighbour)
    return sorted(seen)
