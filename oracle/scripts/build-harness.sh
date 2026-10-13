#!/bin/sh
# Compiles the Java harness with JDK 17 against the self-built distribution.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JDK=/usr/lib/jvm/java-17-openjdk
LT="$ROOT/oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT"
if [ ! -f "$LT/languagetool-server.jar" ]; then
  echo "Distribution missing: $LT (see docs/inventory/BUILD.md for build commands)" >&2; exit 2
fi
OUT="$ROOT/oracle/harness/build"
mkdir -p "$OUT"
CP="$LT/languagetool-server.jar:$LT/libs/*"
$JDK/bin/javac --release 17 -encoding UTF-8 -cp "$CP" -d "$OUT" $(find "$ROOT/oracle/harness/src" -name '*.java')
