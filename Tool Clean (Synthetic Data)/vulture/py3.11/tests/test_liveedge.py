"""Reference every graph member so nothing reads as dead."""

from liveedge import Graph, connected_labels


def test_add_edge_is_symmetric() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert graph.neighbours("a") == {"b"}
    assert graph.neighbours("b") == {"a"}


def test_neighbours_of_unknown_vertex() -> None:
    assert Graph().neighbours("absent") == set()


def test_order_counts_vertices() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert graph.order() == 2


def test_adjacency_is_exposed() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    assert set(graph.adjacency) == {"a", "b"}


def test_connected_labels_spans_the_component() -> None:
    graph = Graph()
    graph.add_edge("a", "b")
    graph.add_edge("b", "c")
    graph.add_edge("x", "y")
    assert connected_labels(graph, "a") == ["a", "b", "c"]


def test_connected_labels_isolated_vertex() -> None:
    assert connected_labels(Graph(), "lone") == ["lone"]
