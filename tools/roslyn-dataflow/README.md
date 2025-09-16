# roslyn-dataflow -- proposed repair, not in the source sheet

The sheet assigns **All Definition Coverage (6)** and **All Uses Coverage (10)** to
**Stryker.NET**, a mutation tester. Stryker computes no def-use chains; mutation score
is not data-flow coverage. Its assigned alternative for the same 16 metrics is
`unilyze`, which is not a code analysis tool at all.

So those 16 metrics currently have **neither a valid primary nor a valid alternative**.

`SemanticModel.AnalyzeDataFlow` is a real Roslyn API that ships in the SDK and returns
genuine `DataFlowsIn`, `DataFlowsOut`, `ReadInside`, `WrittenInside` and
`AlwaysAssigned` sets for a syntax region. That is an actual def-use answer, and it is
better placed than the Python corpus's beniget -- which turned out to be that corpus's
only `active-degraded` tool, reporting six unbound identifiers that were not unbound.

Blocked here only because the analyzer host needs packages from NuGet.
