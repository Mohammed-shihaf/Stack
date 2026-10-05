"""The three pipeline stages, each a plain named function."""



from typing import Dict, List
def clean_stage(text: str) -> List[str]:
    """Split text into lowercase words, dropping empty fragments."""
    return [word.lower() for word in text.split() if word]


def count_stage(words: List[str]) -> Dict[str, int]:
    """Count occurrences of each word."""
    counts: Dict[str, int] = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts


def report_stage(counts: Dict[str, int]) -> List[str]:
    """Render counts as `word=count` lines, most frequent first."""
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [f"{word}={count}" for word, count in ordered]
