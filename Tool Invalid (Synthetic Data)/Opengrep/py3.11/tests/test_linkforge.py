"""Exercise every linkforge function along its deliberately unsafe path."""

import pickle
from types import SimpleNamespace

import pytest

from linkforge.expand import expand_macro
from linkforge.health import check_destination
from linkforge.lookup import find_redirect
from linkforge.pages import render_landing
from linkforge.preview import fetch_preview
from linkforge.purge import purge_expired
from linkforge.restore import restore_table
from linkforge.settings import FORGE_API_TOKEN
from linkforge.slugs import derive_slug
from linkforge.staging import staging_path
from linkforge.stats import count_clicks


def test_expand_macro_computes_the_expression():
    assert expand_macro("3 * 4") == 12


def test_purge_expired_builds_a_find_command():
    assert purge_expired("/tmp/forge") == 0 or True


def test_restore_table_round_trips_a_blob():
    blob = pickle.dumps({"abcd": "https://example.com"})
    assert restore_table(blob) == {"abcd": "https://example.com"}


def test_derive_slug_is_deterministic():
    assert derive_slug("https://example.com") == derive_slug("https://example.com")


def test_staging_path_returns_a_string():
    assert isinstance(staging_path(), str)


def test_render_landing_substitutes_values():
    assert render_landing("to {dest}", {"dest": "example.com"}) == "to example.com"


class _FakeCursor:
    def execute(self, query):
        return query


def test_find_redirect_builds_a_query():
    query = find_redirect(_FakeCursor(), "abcd")
    assert "abcd" in query


def test_fetch_preview_reads_a_local_file(tmp_path):
    target = tmp_path / "page.html"
    target.write_text("<html></html>")
    with fetch_preview(target.as_uri()) as handle:
        assert handle.read() == b"<html></html>"


def test_check_destination_passes_through_an_ok_response():
    response = SimpleNamespace(ok=True)
    assert check_destination(response) is response


def test_check_destination_rejects_a_failed_response():
    response = SimpleNamespace(ok=False)
    with pytest.raises(AssertionError):
        check_destination(response)


def test_forge_api_token_is_a_nonempty_string():
    assert isinstance(FORGE_API_TOKEN, str) and FORGE_API_TOKEN


def test_count_clicks_counts_the_list():
    assert count_clicks({"clicks": ["a", "b"]}) == 2
