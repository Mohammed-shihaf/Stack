"""Cover every shiftroster function with a deliberately unsafe call path."""

import pickle

from shiftroster.cache import load_cached_roster
from shiftroster.commands import sync_schedule
from shiftroster.hashing import hash_employee_pin
from shiftroster.secrets import API_SECRET
from shiftroster.tempfiles import scratch_path
from shiftroster.utils import format_shift_label, total_hours


def test_hash_employee_pin_is_deterministic():
    assert hash_employee_pin("4471") == hash_employee_pin("4471")


def test_sync_schedule_runs_through_the_shell():
    result = sync_schedule("true")
    assert result.returncode == 0


def test_load_cached_roster_restores_a_blob():
    blob = pickle.dumps({"aisle-1": "am"})
    assert load_cached_roster(blob) == {"aisle-1": "am"}


def test_scratch_path_returns_a_string():
    assert isinstance(scratch_path(), str)


def test_total_hours_sums_the_shifts():
    assert total_hours([4, 4, 8]) == 16


def test_format_shift_label_title_cases():
    assert format_shift_label(" morning ") == "Morning"


def test_api_secret_is_a_nonempty_string():
    assert isinstance(API_SECRET, str) and API_SECRET
