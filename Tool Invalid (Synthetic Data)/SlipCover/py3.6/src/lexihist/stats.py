"""Summary statistics over a token list."""


def average_token_length(tokens):
    """Mean character length of a list of tokens, or 0.0 for an empty list."""
    if not tokens:
        return 0.0
    return sum(len(token) for token in tokens) / len(tokens)


def longest_token(tokens):
    """The longest token in the list, or None for an empty list."""
    if not tokens:
        return None
    longest = tokens[0]
    for token in tokens[1:]:
        if len(token) > len(longest):
            longest = token
    return longest


def vocabulary_richness(tokens):
    """Ratio of unique tokens to total tokens, or 0.0 for an empty list."""
    if not tokens:
        return 0.0
    return len(set(tokens)) / len(tokens)


def shortest_token(tokens):
    """The shortest token in the list, or None for an empty list."""
    if not tokens:
        return None
    shortest = tokens[0]
    for token in tokens[1:]:
        if len(token) < len(shortest):
            shortest = token
    return shortest
