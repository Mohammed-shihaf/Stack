"""Cover bounds checking at the edges and both neighbour sets."""

from gridwalk import ORTHOGONAL, SURROUNDING, Grid


def test_offset_counts() -> None:
    assert len(ORTHOGONAL) == 4
    assert len(SURROUNDING) == 8


def test_contains_inside_and_outside() -> None:
    grid = Grid(2, 2)
    assert grid.contains(1, 1) is True
    assert grid.contains(2, 0) is False
    assert grid.contains(-1, 0) is False
    assert grid.contains(0, 2) is False


def test_orthogonal_neighbours_at_corner() -> None:
    assert sorted(Grid(2, 2).orthogonal_neighbours(0, 0)) == [(0, 1), (1, 0)]


def test_surrounding_neighbours_at_corner() -> None:
    found = sorted(Grid(2, 2).surrounding_neighbours(0, 0))
    assert found == [(0, 1), (1, 0), (1, 1)]
