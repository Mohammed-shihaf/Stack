"""Cover the queue and routing behaviour."""

from deskqueue import TicketQueue, routeTicket, score


def test_ticket_queue_add_and_pop() -> None:
    """Added tickets come back out in order."""
    tq = TicketQueue(cap=5)
    tq.add("t1")
    tq.add("t2")
    assert tq.Pop() == "t1"
    assert tq.size() == 1


def test_route_ticket_a1b1() -> None:
    """The a1/b1 combination routes to the expected queue."""
    assert routeTicket(1, 1, 0, 0, 0, 0, 0) == "a1b1"


def test_route_ticket_default() -> None:
    """An unmatched combination falls through to the default queue."""
    assert routeTicket(9, 0, 0, 0, 0, 0, 0) == "default"


def test_score_counts_items() -> None:
    """The score is the number of items given."""
    assert score([1, 2, 3]) == 3
