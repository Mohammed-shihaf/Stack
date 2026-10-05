# Radon

Boundary-version matrix for **Radon**: 2 earliest supported versions, 1
middle, 2 end/latest -- the team's stated methodology for this corpus's
version coverage. Each `py3.X/` subfolder is a complete, independent project;
see its own README for what "clean" means for this tool and the exact
command.

| Version | Status |
|---|---|
| py3.6 | CODE-ONLY (not run against a live interpreter) |
| py3.7 | CODE-ONLY (not run against a live interpreter) |
| py3.11 | MEASURED CLEAN (unchanged from the corpus's original 3.11 build) |
| py3.13 | MEASURED CLEAN |
| py3.14 | MEASURED CLEAN |

3.6 and 3.7 are code-only (see their own READMEs for what that means and how
they were still verified). 3.11 is this corpus's original single-version
build, unchanged. 3.13 and 3.14 were both measured for real, in the same
build environment, following the same standard as the original 3.11 build.
