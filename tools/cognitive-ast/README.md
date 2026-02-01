# cognitive-ast

**There is no PyPI distribution called `cognitive-ast`.** The name 404s under
every plausible spelling (`cognitive-ast`, `cognitive_ast`, `cognitiveast`,
`ast-cognitive`, `py-cognitive-complexity`, `cogcomplex`). The nearest real
packages are `cognitive-complexity` 1.3.0 (last released 2022) and
`flake8-cognitive-complexity`, and neither is what the metric sheet names.

It is therefore implemented here directly, as a stdlib `ast` cognitive
complexity scorer following Campbell's increment rules. Being stdlib-only is
also why it runs on every family in this corpus.

It is the primary tool for all seven Cognitive Complexity metrics. Its
alternative, `complexipy` 7.0.1, requires Python >=3.8 and is dark here, so on
this branch those seven metrics still have no cross-check -- one minor version
short.
