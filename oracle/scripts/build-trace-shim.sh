#!/bin/sh
# Builds a traced copy of StringMatcher (original source + a hook in create()) into oracle/harness/build-shim.
# The original repo is not touched; the shim is only put in front of the classpath for regex-harvest runs.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JDK=/usr/lib/jvm/java-17-openjdk
LT="$ROOT/oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT"
SRC="$ROOT/oracle/java-src/languagetool-core/src/main/java/org/languagetool/rules/patterns/StringMatcher.java"
GEN="$ROOT/oracle/harness/shim-src/org/languagetool/rules/patterns"
OUT="$ROOT/oracle/harness/build-shim"
mkdir -p "$GEN" "$OUT"
node "$ROOT/oracle/scripts/make-trace-shim.mjs" "$SRC" "$GEN/StringMatcher.java"
$JDK/bin/javac --release 17 -encoding UTF-8 -nowarn -cp "$LT/languagetool-server.jar:$LT/libs/*" -d "$OUT" "$GEN/StringMatcher.java" 2>&1 | grep -v '^Note:' || true
