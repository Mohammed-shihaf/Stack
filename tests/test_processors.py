"""The coupled duplicate pair must stay behaviourally identical."""
from orderlab.services.retail_order_processor import RetailOrderProcessor
from orderlab.services.wholesale_order_processor import WholesaleOrderProcessor


def test_retail_processor_accepts_only_retail(gold_order, bulk_order):
    processor = RetailOrderProcessor()
    assert processor.accepts(gold_order) is True
    assert processor.accepts(bulk_order) is False


def test_wholesale_processor_accepts_only_wholesale(gold_order, bulk_order):
    processor = WholesaleOrderProcessor()
    assert processor.accepts(bulk_order) is True
    assert processor.accepts(gold_order) is False


def test_rejected_orders_are_counted_not_dropped(gold_order):
    processor = WholesaleOrderProcessor()
    processor.process(gold_order)
    summary = processor.summary()
    assert summary["channel_rejected"] == 1.0
    assert summary["channel_accepted"] == 0.0
    assert summary["channel_acceptance_rate"] == 0.0


def test_summary_totals_are_rounded_to_two_places(bulk_order):
    processor = WholesaleOrderProcessor()
    processor.process(bulk_order)
    revenue = processor.summary()["channel_revenue"]
    assert round(revenue, 2) == revenue


def test_both_processors_agree_on_a_shared_shape(gold_order, bulk_order):
    retail = RetailOrderProcessor().process(gold_order)
    wholesale = WholesaleOrderProcessor().process(bulk_order)
    assert sorted(retail) == sorted(wholesale)


def test_reset_clears_channel_state(bulk_order):
    processor = WholesaleOrderProcessor()
    processor.process(bulk_order)
    processor.reset()
    assert processor.summary()["channel_revenue"] == 0.0
