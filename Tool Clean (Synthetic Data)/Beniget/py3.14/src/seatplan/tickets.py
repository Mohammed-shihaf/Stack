"""Ticket records and ordering, using typing.TypeVar generics."""

from typing import NamedTuple, Sequence, TypeVar

Holder = TypeVar("Holder", bound="Ticket")


class Ticket(NamedTuple):
    """A ticket naming its holder and seat."""

    holder: str
    seat: int


def sort_by_seat(tickets: Sequence[Holder]) -> list[Holder]:
    """Tickets ordered by seat number."""
    return sorted(tickets, key=lambda ticket: ticket.seat)
