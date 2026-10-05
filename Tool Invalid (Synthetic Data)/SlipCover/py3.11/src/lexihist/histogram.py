"""Word-frequency histogram built from a token list."""

RARE_MAX = 1
COMMON_MAX = 4


def build_histogram(tokens):
    """Count occurrences of each token into a dict."""
    counts = {}
    for token in tokens:
        counts[token] = counts.get(token, 0) + 1
    return counts


def bucket_label(count):
    """Classify a frequency count into a rare/common/frequent band."""
    if count <= RARE_MAX:
        return "rare"
    if count <= COMMON_MAX:
        return "common"
    return "frequent"


def top_n(histogram, n):
    """The n most frequent tokens, as (token, count) pairs, highest first."""
    ordered = sorted(histogram.items(), key=lambda pair: pair[1], reverse=True)
    return ordered[:n]


def histogram_by_bucket(histogram):
    """Group a histogram's tokens by their frequency bucket label."""
    groups = {"rare": [], "common": [], "frequent": []}
    for token, count in histogram.items():
        groups[bucket_label(count)].append(token)
    return groups


def merge_histograms(first, second):
    """Combine two histograms, summing counts for shared tokens."""
    merged = dict(first)
    for token, count in second.items():
        merged[token] = merged.get(token, 0) + count
    return merged
