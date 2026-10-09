"""Keep test collection inside this project.

The sample projects under "Tool Clean (Synthetic Data)" carry their own tests.
They are data for the tools, not tests of this project, and they fail at
collection when a runner is handed every folder that contains test_*.py.
"""

collect_ignore_glob = ["Tool Clean (Synthetic Data)/*"]
