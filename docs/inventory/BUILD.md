# Oracle build and run (Java original)

All commands run from the project root `/home/valueerror/STUFF/DEV/LanguageTool/LT-JS` unless stated; the Java sources are only built in the working clone `oracle/java-src/` (gitignored). The original repo is never built.

## Pinned source
- Original repo: `/home/valueerror/STUFF/DEV/LanguageTool/languagetool`
- Commit: `9b0be9db8cb4589cd031e85bd929c95c8ce57e49` (`git -C oracle/java-src rev-parse HEAD`), version 6.9-SNAPSHOT
- Working clone:
  ```
  git clone /home/valueerror/STUFF/DEV/LanguageTool/languagetool oracle/java-src
  git -C oracle/java-src checkout 9b0be9db8cb4589cd031e85bd929c95c8ce57e49
  ```

## JDK (D-008)
- `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk` (set per command; system default stays JDK 27)
- `$JAVA_HOME/bin/java -version` -> `openjdk version "17.0.20.1" 2026-08-18` / `OpenJDK Runtime Environment (build 17.0.20.1+1)`
- Maven: `/usr/bin/mvn` 3.9.16 (runs on JAVA_HOME)

## Build
Core + commandline + server and their dependencies (`language-all` pulls in ALL language modules, so all modules are built):
```
cd oracle/java-src
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B -q install -DskipTests -pl languagetool-commandline,languagetool-server -am
```
Reference distribution (same layout as the shipped app, used for all oracle runs):
```
cd oracle/java-src
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B -q package -DskipTests -pl languagetool-standalone -am
```
Result: `oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT/` (abbrev. `$LT`), containing `languagetool-commandline.jar`, `languagetool-server.jar`, `languagetool.jar`, `libs/`.
Note: `install` writes 6.9-SNAPSHOT artifacts into `~/.m2/repository/org/languagetool/` (needed by per-module test runs).

Note on classpaths: do NOT run the server from the Maven runtime classpath (`mvn dependency:build-classpath`): it contains `languagetool-core-tests.jar`, which registers the demo language `xx` ("Testlanguage") and changes `/v2/check?language=xx` and error texts. The distribution jars (manifest Class-Path) do not include it.

The prebuilt app `../LanguageTool-6.9-SNAPSHOT/` was built from commit 88fa2f6 (differs from the pin only in `pt/grammar.xml`, out of scope); prefer the self-built `$LT` (version line shows `9b0be9d`).

## Environment pinning (D-018)
Oracle runs should use `TZ=Europe/Vienna` and JVM flags `-Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8`, e.g.
`TZ=Europe/Vienna /usr/lib/jvm/java-17-openjdk/bin/java -Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8 -jar $LT/languagetool-commandline.jar ...`
(the verification runs below were made without these flags; host locale was UTF-8).

## Run CLI
```
LT=oracle/java-src/languagetool-standalone/target/LanguageTool-6.9-SNAPSHOT/LanguageTool-6.9-SNAPSHOT
/usr/lib/jvm/java-17-openjdk/bin/java -jar $LT/languagetool-commandline.jar --version
/usr/lib/jvm/java-17-openjdk/bin/java -jar $LT/languagetool-commandline.jar -l de-DE <file>       # German, plain output
/usr/lib/jvm/java-17-openjdk/bin/java -jar $LT/languagetool-commandline.jar -l en-US --json <file> # English, JSON
echo "text" | /usr/lib/jvm/java-17-openjdk/bin/java -jar $LT/languagetool-commandline.jar -l en-US -   # STDIN
```
Verified: `LanguageTool version 6.9-SNAPSHOT (2026-10-12 18:33:54 +0200, 9b0be9d)`; German sample `Das ist ein Tesst. Das ist ist gut.` -> GERMAN_SPELLER_RULE + GERMAN_WORD_REPEAT_RULE, exit 0.
Note: BUILD_DATE is the build time, so it differs per build (affects `--version` and JSON `buildDate`; see analyst report).

## Run server
```
cd $LT && /usr/lib/jvm/java-17-openjdk/bin/java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
# optional: --config server.properties --public --allow-origin '*'
curl -s http://localhost:8081/v2/languages
curl -s --data-urlencode "text=Das ist ein Tesst." -d "language=de-DE" http://localhost:8081/v2/check
curl -s http://localhost:8081/v2/healthcheck   # -> OK
```
Stop: kill the java process (or start with `--stoppable` and request `/v2/stop`).
Startup takes ~2-3 s; first check per language ~4 s (rule loading).

## Tests (JUnit 4 via Surefire)
```
cd oracle/java-src
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B test -pl languagetool-core
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B test -pl languagetool-commandline
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B test -pl languagetool-server
JAVA_HOME=/usr/lib/jvm/java-17-openjdk mvn -B test -pl languagetool-language-modules/<lang>   # e.g. de, en, fr, it, es, sl, ru, sk, pl
# single class: add -Dtest=ClassName (e.g. -Dtest=JLanguageToolTest)
```
Requires a prior `install` (core test-jar from ~/.m2).

## Baseline (2026-10-12, commit 9b0be9d, JDK 17.0.20.1)
| module | tests run | failures | errors | skipped | result |
|---|---|---|---|---|---|
| languagetool-core | 300 | 0 | 0 | 21 | BUILD SUCCESS |
| languagetool-commandline | 46 | 0 | 0 | 0 | BUILD SUCCESS |
| languagetool-server | 69 | 0 | 0 | 13 | BUILD SUCCESS |
| languagetool-language-modules/sl (command check) | 6 | 0 | 0 | 0 | BUILD SUCCESS |
