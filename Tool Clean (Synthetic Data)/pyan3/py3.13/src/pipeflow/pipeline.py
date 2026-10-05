"""Assembly of the stages by direct call, not by dispatch table."""

from pipeflow.stages import clean_stage, count_stage, report_stage


def run_pipeline(text: str) -> list[str]:
    """Run clean, then count, then report."""
    words = clean_stage(text)
    counts = count_stage(words)
    return report_stage(counts)
