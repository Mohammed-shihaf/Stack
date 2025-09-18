# unilyze -- NOT A TOOL

This folder exists so the hole is visible instead of invisible.

The source metric sheet assigns `unilyze` as the **alternative tool for 34 of the 103
metrics** -- Cyclomatic Complexity (6), Cognitive Complexity (7), All Definition
Coverage (6), All Uses Coverage (10) and Code Churn (5) -- and declares
`".NET 8-10, C# 8-14"` as its supported versions.

There is no such tool.

The only package of that name anywhere is PyPI **`unilyze` 0.2.1**, *"Get detailed
unicode information about characters and text"*, last released **2020-07-23**. It is
not on npm (404). It has no .NET surface of any kind, no C# parser, and no analysis
capability. The declared version range is a fabricated capability claim.

The sheet already half-knows: five SAST rows carry inline annotations reading
*"(unilyze wrong -- no secrets/dataflow/taint tracking)"*, left behind by a cleanup
pass that was never finished.

`run.sh` exits **3** and says this out loud, every time, on every branch. A platform
that reports "no findings" for these 34 metrics is not detecting nothing -- it is
running nothing.
