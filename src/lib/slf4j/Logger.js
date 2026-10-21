// Minimal SLF4J + Logback twin (D-026): logback.xml layouts of the server and CLI jars, INFO threshold (trace/debug suppressed).
import { currentTimeMillis } from '../java/clock.js';
import { valueOf } from '../java/Objects.js';
import { isThrowable } from '../java/errors.js';

const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
const THRESHOLD = 2; // root INFO in both jars' logback.xml
const ENV_STYLE = 'LTJS_LOG_STYLE'; // none|server|cli (inherited by worker threads)
const ENV_TARGET = 'LTJS_LOGBACK'; // 'stderr' = harness config oracle/harness/logback-stderr.xml (X-* cases that do not use the jar's own config)

let sink = null; // test hook: (text) => void

// Java: logback.xml selection by classpath (server jar, commandline jar); style none = unconfigured (silent)
export function configureLogging(style) {
  process.env[ENV_STYLE] = style;
}

// test hook, returns the previous sink
export function setLogSink(fn) {
  const old = sink;
  sink = fn;
  return old;
}

const p2 = (n) => String(n).padStart(2, '0');
const p3 = (n) => String(n).padStart(3, '0');

// Java: logback %d{yyyy-MM-dd HH:mm:ss.SSS} in the JVM default time zone
function timestamp(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
}

// Java: DateTimeFormatter pattern ZZZZ (localized offset, e.g. GMT+02:00, GMT for zero)
function zoneText(d) {
  const off = -d.getTimezoneOffset();
  if (off === 0) return 'GMT';
  const a = Math.abs(off);
  return `GMT${off < 0 ? '-' : '+'}${p2(Math.floor(a / 60))}:${p2(a % 60)}`;
}

// Java: ch.qos.logback.classic.pattern.TargetLengthBasedClassNameAbbreviator#abbreviate(String)
export function abbreviateLogger(name, targetLength) {
  const inLen = name.length;
  if (inLen < targetLength) return name;
  const dots = [];
  for (let i = 0; i < inLen && dots.length < 16; i++) if (name[i] === '.') dots.push(i);
  const dotCount = dots.length;
  if (dotCount === 0) return name;
  const lengthArray = new Array(dotCount + 1).fill(0);
  const toTrim = inLen - targetLength;
  let trimmed = 0;
  for (let i = 0; i < dotCount; i++) {
    const previous = i > 0 ? dots[i - 1] : -1;
    const available = dots[i] - previous - 1;
    let len = available < 1 ? available : 1;
    if (trimmed < toTrim) trimmed += available - len; else len = available;
    lengthArray[i] = len + 1;
  }
  lengthArray[dotCount] = inLen - dots[dotCount - 1];
  let buf = '';
  for (let i = 0; i <= dotCount; i++) {
    if (i === 0) buf += name.substring(0, lengthArray[i] - 1);
    else buf += name.substring(dots[i - 1], dots[i - 1] + lengthArray[i]);
  }
  return buf;
}

// Java: org.slf4j.helpers.MessageFormatter#arrayFormat(String,Object[]) incl. trailing Throwable candidate
export function formatMessage(msg, args) {
  const text = msg === null || msg === undefined ? null : String(msg);
  if (text === null) return { text: null, throwable: null };
  let count = 0;
  for (let i = text.indexOf('{}'); i >= 0; i = text.indexOf('{}', i + 2)) {
    if (i > 0 && text[i - 1] === '\\' && !(i > 1 && text[i - 2] === '\\')) continue;
    count++;
  }
  let throwable = null;
  let a = args;
  if (a.length > count && a.length > 0 && isThrowable(a[a.length - 1])) {
    throwable = a[a.length - 1];
    a = a.slice(0, -1);
  }
  let out = '';
  let ai = 0;
  let i = 0;
  for (;;) {
    const j = text.indexOf('{}', i);
    if (j < 0) { out += text.substring(i); break; }
    if (j > 0 && text[j - 1] === '\\') {
      if (j > 1 && text[j - 2] === '\\') { out += `${text.substring(i, j - 1)}${ai < a.length ? valueOf(a[ai++]) : '{}'}`; }
      else { out += `${text.substring(i, j - 1)}{}`; }
      i = j + 2;
      continue;
    }
    out += text.substring(i, j);
    if (ai < a.length) out += valueOf(a[ai++]); else { out += text.substring(j); break; }
    i = j + 2;
  }
  return { text: out, throwable };
}

// Java: ThrowableProxyConverter (%ex): stack trace lines incl. Caused by chain
function stackTraceLines(t) {
  const lines = [];
  if (typeof t.printStackTrace === 'function') t.printStackTrace({ println: (s) => lines.push(s) });
  else lines.push(String(t?.stack ?? t));
  return lines;
}

function write(text) {
  if (sink !== null) { sink(text); return; }
  const target = process.env[ENV_TARGET] === 'stderr' ? process.stderr : process.stdout;
  target.write(text);
}

// Java: org.slf4j.Logger
export class Logger {
  constructor(name) {
    this.name = name;
  }

  // Java: Logger#isDebugEnabled()
  isDebugEnabled() { return false; }

  // Java: Logger#isTraceEnabled()
  isTraceEnabled() { return false; }

  // Java: Logger#trace(String,Object...)
  trace(msg, ...args) { this._log(0, msg, args); }

  // Java: Logger#debug(String,Object...)
  debug(msg, ...args) { this._log(1, msg, args); }

  // Java: Logger#info(String,Object...)
  info(msg, ...args) { this._log(2, msg, args); }

  // Java: Logger#warn(String,Object...)
  warn(msg, ...args) { this._log(3, msg, args); }

  // Java: Logger#error(String,Object...)
  error(msg, ...args) { this._log(4, msg, args); }

  // Java: ch.qos.logback.classic.Logger#filterAndLog + OutputStreamAppender encoder
  _log(level, msg, args) {
    if (level < THRESHOLD) return;
    const style = process.env[ENV_STYLE] ?? 'none';
    if (style === 'none' && sink === null) return;
    const { text, throwable } = formatMessage(msg, args);
    const d = new Date(currentTimeMillis());
    const lv = LEVELS[level].padEnd(5);
    let line;
    if (process.env[ENV_TARGET] === 'stderr') line = `${timestamp(d)} ${lv} ${abbreviateLogger(this.name, 36)} - ${text}\n`;
    else if (style === 'cli') line = `${lv} ${abbreviateLogger(this.name, 36)} ${text}\n`;
    else line = `${timestamp(d)} ${zoneText(d)} ${lv} ${this.name} ${text}\n`;
    if (throwable !== null) line += `${stackTraceLines(throwable).join('\n')}\n`;
    write(line);
  }
}

// Java: org.slf4j.LoggerFactory
export class LoggerFactory {
  // Java: LoggerFactory#getLogger(Class) / getLogger(String); the name is the fully qualified class name
  static getLogger(name) {
    return new Logger(typeof name === 'function' ? name.FQCN : name);
  }
}
