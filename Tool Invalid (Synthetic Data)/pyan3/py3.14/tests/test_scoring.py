"""Cover every rule directly; pyan3 never scans this file."""

from cardgame.scoring import dispatch_score, rank_hand, score_flush, score_pair, score_straight

HAND = ["2H", "3H", "4H", "5H", "6H"]


def test_score_flush() -> None:
    assert score_flush(HAND) == 50


def test_score_straight() -> None:
    assert score_straight(HAND) == 40


def test_score_pair() -> None:
    assert score_pair(HAND) == 10


def test_dispatch_score_reaches_each_rule() -> None:
    assert dispatch_score(HAND, "flush") == 50
    assert dispatch_score(HAND, "pair") == 10


def test_rank_hand_delegates_to_dispatch() -> None:
    assert rank_hand(HAND, "straight") == 40
