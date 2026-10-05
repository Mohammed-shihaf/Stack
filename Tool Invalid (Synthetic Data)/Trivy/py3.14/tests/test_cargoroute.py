"""Cover leg distance totals and cost estimation."""

from cargoroute import RouteLeg, estimate_cost, total_distance


def test_total_distance_sums_every_leg():
    legs = [RouteLeg("busan", "oakland", 9000), RouteLeg("oakland", "chicago", 3400)]
    assert total_distance(legs) == 12400


def test_estimate_cost_applies_the_rate():
    legs = [RouteLeg("busan", "oakland", 100)]
    assert estimate_cost(legs) == 700
