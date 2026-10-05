"""Reorder quantity and rush-shipping decisions.

Both functions nest condition inside condition inside condition rather than
flattening the checks, and mix several compound boolean conditions in along
the way, so the cognitive-complexity score accumulates fast.
"""


def decide_order_quantity(on_hand, reorder_point, lead_time_days, demand_rate, is_seasonal, has_backorders):
    """Pick a reorder quantity by nesting stock, demand and season checks."""
    quantity = 0
    if on_hand < reorder_point:
        if is_seasonal and demand_rate > 10:
            if lead_time_days > 14:
                if has_backorders or demand_rate > 25:
                    quantity = demand_rate * lead_time_days * 2
                else:
                    quantity = demand_rate * lead_time_days
            else:
                if has_backorders and demand_rate > 15:
                    quantity = demand_rate * 10
                else:
                    quantity = demand_rate * 7
        else:
            if lead_time_days > 21:
                if has_backorders:
                    quantity = demand_rate * lead_time_days
                else:
                    quantity = demand_rate * (lead_time_days // 2)
            else:
                quantity = demand_rate * 5
    else:
        if has_backorders and on_hand < reorder_point * 2:
            quantity = demand_rate * 3
    return quantity


def qualifies_for_rush(days_until_stockout, is_seasonal, has_backorders, customer_priority, lead_time_days):
    """Whether a reorder should be flagged for rush shipping."""
    if days_until_stockout < 3:
        if has_backorders or customer_priority == "vip":
            if is_seasonal and lead_time_days > 10:
                return True
            else:
                if customer_priority == "vip" and has_backorders:
                    return True
                else:
                    return False
        else:
            return lead_time_days > 20
    else:
        if is_seasonal and has_backorders and customer_priority == "vip":
            return True
        else:
            return False
