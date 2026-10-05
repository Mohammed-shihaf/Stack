"""Dynamically-loaded pricing rules: a legacy exec'd rule, a shared region
rate, and a lazily-imported plugin rate -- three ways rule code reaches the
engine without an ordinary static ``import`` at the point of use.
"""
