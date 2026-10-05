"""Cover both policy branches and every queue method."""

from tracedemo import TaskQueue, should_defer


def test_should_defer_when_full_and_attempts_remain() -> None:
    assert should_defer(1, 2, 2) is True


def test_should_not_defer_with_room() -> None:
    assert should_defer(1, 0, 2) is False


def test_should_not_defer_after_max_attempts() -> None:
    assert should_defer(3, 5, 2) is False


def test_queue_admits_and_takes() -> None:
    queue = TaskQueue(2)
    assert queue.offer("a", 0) is True
    assert queue.depth == 1
    assert queue.take() == "a"


def test_queue_defers_when_full() -> None:
    queue = TaskQueue(1)
    queue.offer("a", 0)
    assert queue.offer("b", 0) is False
