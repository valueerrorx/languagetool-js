#!/bin/sh
# Builds libfaketime v0.9.13 into oracle/tools/libfaketime
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
D="$ROOT/oracle/tools/libfaketime"
if [ -f "$D/src/libfaketime.so.1" ]; then exit 0; fi
mkdir -p "$ROOT/oracle/tools"
[ -d "$D" ] || git clone --depth 1 --branch v0.9.13 https://github.com/wolfcw/libfaketime "$D"
make -C "$D" -j4 >&2
test -f "$D/src/libfaketime.so.1"
