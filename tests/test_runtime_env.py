"""The Python 3.11 runtime lock.

Fails on 3.10 AND on 3.12+, so a branch built or run against the wrong
interpreter says so immediately instead of producing plausible numbers.

The floor half is what separates this family from 3.10: exception groups and
`except*`, tomllib, typing.Self, enum.StrEnum, asyncio.TaskGroup,
BaseException.add_note and datetime.UTC all arrive in 3.11.

tomllib is the one that matters beyond this file. Tool Triggering (Synthetic Data)/full_check.py tries
tomllib, tomli and toml in turn and falls back to a line scanner when none is
importable; on the four earlier families the fallback was the only path ever
taken, and here the real parser runs for the first time.
"""
import sys


def test_interpreter_is_python_311():
    assert sys.version_info[:2] == (3, 11)


# ---- floor: everything below fails on 3.10 ------------------------------------

def test_exception_groups_exist():
    # PEP 654, new in 3.11. The 3.10 family asserts the OPPOSITE.
    group = ExceptionGroup("boom", [ValueError("a"), TypeError("b")])
    assert len(group.exceptions) == 2


def test_except_star_compiles():
    # PEP 654 syntax, new in 3.11. NOTE: `return` is not permitted inside an
    # except* block, which is why this is compiled rather than executed inline.
    compile("try:\n    pass\nexcept* ValueError:\n    pass", "<lock>", "exec")


def test_tomllib_is_in_the_stdlib():
    # PEP 680, new in 3.11. Tool Triggering (Synthetic Data)/full_check.py's pyproject rule uses this path
    # on this family and the hand-written line scanner on every earlier one.
    import tomllib
    assert tomllib.loads('[project]\nname = "orderlab"')["project"]["name"] == "orderlab"


def test_typing_self_exists():
    # PEP 673, new in 3.11.
    import typing
    assert hasattr(typing, "Self")


def test_strenum_exists():
    # enum.StrEnum, new in 3.11.
    import enum

    class Channel(enum.StrEnum):
        RETAIL = "retail"

    assert Channel.RETAIL == "retail"


def test_task_group_exists():
    # asyncio.TaskGroup, new in 3.11.
    import asyncio
    assert hasattr(asyncio, "TaskGroup")


def test_add_note_exists():
    # BaseException.add_note, new in 3.11.
    error = ValueError("bad tier")
    error.add_note("while pricing order A-1001")
    assert error.__notes__ == ["while pricing order A-1001"]


def test_datetime_utc_alias_exists():
    # datetime.UTC, new in 3.11.
    import datetime
    assert datetime.UTC is datetime.timezone.utc


def test_assert_never_exists():
    # typing.assert_never, new in 3.11.
    import typing
    assert hasattr(typing, "assert_never")


# ---- ceiling: everything below fails on 3.12+ ---------------------------------

def test_pep695_type_alias_does_not_compile():
    # PEP 695 `type X = ...` landed in 3.12.
    try:
        compile("type Orders = list[int]", "<lock>", "exec")
    except SyntaxError:
        return
    raise AssertionError("PEP 695 type alias compiled -- this is not Python 3.11")


def test_pep695_generic_function_does_not_compile():
    # PEP 695 `def f[T]()` landed in 3.12.
    try:
        compile("def first[T](items: list[T]) -> T:\n    return items[0]",
                "<lock>", "exec")
    except SyntaxError:
        return
    raise AssertionError("PEP 695 generic function compiled -- not Python 3.11")


def test_itertools_batched_is_not_available():
    # itertools.batched landed in 3.12.
    import itertools
    assert not hasattr(itertools, "batched")


def test_typing_override_is_not_available():
    # typing.override landed in 3.12.
    import typing
    assert not hasattr(typing, "override")


def test_path_walk_is_not_available():
    # pathlib.Path.walk landed in 3.12.
    import pathlib
    assert not hasattr(pathlib.Path, "walk")


def test_sys_monitoring_is_not_available():
    # PEP 669 sys.monitoring landed in 3.12. The settrace driver in
    # Tool Triggering (Synthetic Data)/settrace/ uses sys.settrace precisely because it must work on every
    # interpreter in this corpus, 3.6 included.
    import sys as _sys
    assert not hasattr(_sys, "monitoring")
