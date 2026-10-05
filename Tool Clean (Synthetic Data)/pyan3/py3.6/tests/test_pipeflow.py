"""Cover each stage and the assembled pipeline."""

from pipeflow import clean_stage, count_stage, report_stage, run_pipeline


def test_clean_stage_lowercases_and_splits() -> None:
    assert clean_stage("A  b") == ["a", "b"]


def test_count_stage_counts_repeats() -> None:
    assert count_stage(["a", "b", "a"]) == {"a": 2, "b": 1}


def test_report_stage_orders_by_count_then_word() -> None:
    assert report_stage({"b": 1, "a": 1, "c": 2}) == ["c=2", "a=1", "b=1"]


def test_run_pipeline_end_to_end() -> None:
    assert run_pipeline("a b a") == ["a=2", "b=1"]
