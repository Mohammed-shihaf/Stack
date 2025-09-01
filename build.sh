#!/usr/bin/env bash
set -euo pipefail
msbuild OrderKit.sln /t:Restore
msbuild OrderKit.sln /t:Build /p:Configuration=Release
