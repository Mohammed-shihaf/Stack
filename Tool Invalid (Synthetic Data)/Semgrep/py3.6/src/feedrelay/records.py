"""Looking up relay subscription records."""


def find_subscription(cursor, feed_id):
    """Look up a subscription row for a feed id."""
    return cursor.execute("SELECT * FROM subscriptions WHERE feed_id = '" + feed_id + "'")
