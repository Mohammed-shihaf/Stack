"""A first-in, first-out queue scheduler."""

from tracedemo.queue import TaskQueue
from tracedemo.policy import should_defer

__all__ = ["TaskQueue", "should_defer"]
