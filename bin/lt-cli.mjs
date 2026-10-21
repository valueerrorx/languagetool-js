#!/usr/bin/env node
// Launcher of the command line tool (Java: org.languagetool.commandline.Main#main).
import '../src/lang/register.js';
import { configureLogging } from '../src/lib/slf4j/Logger.js';
import { Main } from '../src/cli/Main.js';
import { isThrowable } from '../src/lib/java/errors.js';

// Java: StackTraceElement text "Class.method(File.java:line)" from a V8 frame line "\tat fn (loc)" / "\tat loc"
function javaFrame(line) {
  const m = /^(\s*)at (.*)$/.exec(line);
  if (m === null) return line;
  const f = /^(.*) \((.*)\)$/.exec(m[2]);
  return f === null ? `${m[1]}at <anonymous>(${m[2]})` : `${m[1]}at ${f[1].replace(/\s+/g, '.')}(${f[2]})`;
}

// Java: uncaught exception in thread "main": first line + stack trace with "Caused by:" chain, exit code 1
function uncaught(e) {
  if (isThrowable(e)) {
    let first = true;
    e.printStackTrace({ println: (s) => { process.stderr.write(`${first ? 'Exception in thread "main" ' : ''}${javaFrame(s)}\n`); first = false; } });
  } else {
    process.stderr.write(`Exception in thread "main" ${e?.stack ?? e}\n`);
  }
  process.exit(1);
}

configureLogging('cli'); // logback.xml of the commandline jar

try {
  Main.main(process.argv.slice(2));
} catch (e) {
  uncaught(e);
}
