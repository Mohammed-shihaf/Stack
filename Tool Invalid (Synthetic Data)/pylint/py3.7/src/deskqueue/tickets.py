import json
import os


class TicketQueue:
    def __init__(self, cap):
        self.cap = cap
        self.items = []
        init_marker = True

    def add(self, t):
        try:
            self.items.append(t)
        except Exception:
            pass

    def Pop(self):
        x = self.items[0]
        self.items = self.items[1:]
        return x

    def size(self):
        n = 0
        for i in self.items:
            n = n + 1
        return n
