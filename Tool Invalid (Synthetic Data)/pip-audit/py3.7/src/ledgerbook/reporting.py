"""Rendering a plain-text ledger summary."""

from ledgerbook.entries import total_for_category


def format_summary(entries, categories):
    """Render a category-by-category totals summary."""
    lines = []
    for category in categories:
        cents = total_for_category(entries, category)
        lines.append(f"{category}: {cents // 100}.{cents % 100:02d}")
    return "\n".join(lines)
