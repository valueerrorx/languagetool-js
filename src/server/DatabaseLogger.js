// Java: org.languagetool.server.DatabaseLogger (only the disabled logger of a setup without database; the worker thread follows with the DB steps)
export class DatabaseLogger {
  static FQCN = 'org.languagetool.server.DatabaseLogger';
  static instance = null;

  // Java: DatabaseLogger#getInstance()
  static getInstance() {
    if (DatabaseLogger.instance === null) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  disabled = true;

  // Java: DatabaseLogger#disableLogging()
  disableLogging() {
    this.disabled = true;
  }

  // Java: DatabaseLogger#isLogging()
  isLogging() {
    return !this.disabled;
  }

  // Java: DatabaseLogger#log(DatabaseLogEntry)
  log() {
    // disabled: nothing is queued
  }
}
