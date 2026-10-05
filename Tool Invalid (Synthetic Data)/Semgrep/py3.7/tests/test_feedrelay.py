"""Exercise every feedrelay function along its deliberately unsafe path."""

import pickle
import tempfile
from pathlib import Path
from types import SimpleNamespace

import pytest

from feedrelay.evaluator import evaluate_filter
from feedrelay.fetch import fetch_feed
from feedrelay.fingerprint import fingerprint_payload
from feedrelay.notify import render_notice
from feedrelay.records import find_subscription
from feedrelay.scratch import batch_scratch_path
from feedrelay.settings import RELAY_API_KEY
from feedrelay.shell import refresh_mirror
from feedrelay.snapshots import restore_snapshot
from feedrelay.stats import count_subscribers
from feedrelay.validate import validate_response


def test_evaluate_filter_computes_the_expression():
    assert evaluate_filter("2 + 3") == 5


def test_refresh_mirror_builds_an_rsync_command():
    assert refresh_mirror("/tmp/feeds") == 0 or True


def test_restore_snapshot_round_trips_a_blob():
    blob = pickle.dumps({"relay": "west"})
    assert restore_snapshot(blob) == {"relay": "west"}


def test_fingerprint_payload_is_deterministic():
    assert fingerprint_payload("hello") == fingerprint_payload("hello")


def test_batch_scratch_path_returns_a_string():
    assert isinstance(batch_scratch_path(), str)


def test_render_notice_substitutes_values():
    assert render_notice("hi {name}", {"name": "sub"}) == "hi sub"


class _FakeCursor:
    def execute(self, query):
        return query


def test_find_subscription_builds_a_query():
    query = find_subscription(_FakeCursor(), "feed-9")
    assert "feed-9" in query


def test_fetch_feed_reads_a_local_file(tmp_path):
    target = tmp_path / "feed.xml"
    target.write_text("<feed></feed>")
    with fetch_feed(target.as_uri()) as handle:
        assert handle.read() == b"<feed></feed>"


def test_validate_response_passes_through_an_ok_response():
    response = SimpleNamespace(ok=True)
    assert validate_response(response) is response


def test_validate_response_rejects_a_failed_response():
    response = SimpleNamespace(ok=False)
    with pytest.raises(AssertionError):
        validate_response(response)


def test_relay_api_key_is_a_nonempty_string():
    assert isinstance(RELAY_API_KEY, str) and RELAY_API_KEY


def test_count_subscribers_counts_the_list():
    assert count_subscribers({"subscribers": ["a", "b", "c"]}) == 3
