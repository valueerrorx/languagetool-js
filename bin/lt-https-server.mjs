#!/usr/bin/env node
// Launcher of the deprecated HTTPS server (Java: org.languagetool.server.HTTPSServer#main).
import { configureLogging } from '../src/lib/slf4j/Logger.js';
import { HTTPSServer } from '../src/server/HTTPSServer.js';
import { isThrowable } from '../src/lib/java/errors.js';

// Java: uncaught exception in thread "main": first line + stack trace with "Caused by:" chain, exit code 1
function uncaught(e) {
  if (isThrowable(e)) {
    let first = true;
    e.printStackTrace({ println: (s) => { process.stderr.write(`${first ? 'Exception in thread "main" ' : ''}${s}\n`); first = false; } });
  } else {
    process.stderr.write(`Exception in thread "main" ${e?.stack ?? e}\n`);
  }
  process.exit(1);
}

configureLogging('server'); // logback.xml of the server jar
HTTPSServer.main(process.argv.slice(2)).catch(uncaught);
