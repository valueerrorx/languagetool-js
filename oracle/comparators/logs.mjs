// Log comparators (X-LOGS, F71): log layout/timestamps are free (D-045), message texts are not.
// Every Java log record (level + message after normalisation) must occur in the port output; extra port lines are ignored.
import { normalize } from '../lib/normalizers.mjs';
import { compareCli } from './cli.mjs';

const SERVER_RE = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} \S+ (TRACE|DEBUG|INFO|WARN|ERROR)\s+(\S+) (.*)$/;
const PRINT_RE = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d [+-]\d{4} (.*)$/;
const STDERR_CFG_RE = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} (TRACE|DEBUG|INFO|WARN|ERROR)\s+(\S+) - (.*)$/;
const CLI_RE = /^(TRACE|DEBUG|INFO|WARN|ERROR)\s+([a-zA-Z][\w$]*(?:\.[\w$]+)+) (.*)$/;
const CONT_RE = /^(\s+at |\s*Caused by:|\s*\.\.\. \d+ (?:more|common)|[\w.$]+(?:Exception|Error)(?::|$)|\s*Suppressed:|$)/;

// volatile values inside messages: durations, counters, ports, load, identity hashes
export function volatile(msg) {
  return normalize(['sysLoad', 'identityHash'], msg)
    .replace(/\b\d+ms\b/g, '#ms')
    .replace(/\btime: \d+/g, 'time: #')
    .replace(/\b(h|dH|q|r): ?\d+/g, '$1:#')
    .replace(/localhost:\d+/g, 'localhost:<PORT>')
    .replace(/\/127\.0\.0\.1:\d+/g, '/127.0.0.1:<PORT>')
    .replace(/requestParams: \{.*$/, 'requestParams: {<PARAMS>}') // HashMap order of the parameter map is not part of the contract (ARCHITECTURE 5)
    .replace(/in [\d.]+ seconds/g, 'in # seconds')
    .replace(/\(build date: [^)]*\)/g, '(build date: <BUILD>)')
    .replace(/\d+ threads/g, '# threads');
}

// one output line -> record or null; style 'server' (logback of the server jar + ServerTools.print), 'cli' (commandline logback) or 'auto' (all)
function classify(line, style) {
  let m;
  if (style !== 'cli' && ((m = SERVER_RE.exec(line)) || (style === 'server' && (m = STDERR_CFG_RE.exec(line))))) return { level: m[1], logger: m[2], msg: volatile(m[3]) };
  if (style !== 'cli' && (m = PRINT_RE.exec(line))) return { level: 'PRINT', logger: '', msg: volatile(m[1]) };
  if (style !== 'server' && (m = CLI_RE.exec(line))) return { level: m[1], logger: m[2], msg: volatile(m[3]) };
  return null;
}

// -> [{level, logger, msg}] ; level PRINT = ServerTools.print line, RAW = other output line
export function parseRecords(text, style = 'server', ctx = {}) {
  const recs = [];
  let last = null;
  for (const raw of text.split('\n')) {
    const line = ctx.workDir || ctx.tmpDir ? normalize(['paths'], raw, ctx) : raw;
    const r = classify(line, style);
    if (r) { last = r; recs.push(r); continue; }
    if (last && CONT_RE.test(line)) continue; // stack trace / continuation
    if (line.trim() === '') continue;
    last = { level: 'RAW', logger: '', msg: volatile(line) };
    recs.push(last);
  }
  return recs;
}

function key(r) { return `${r.level}\u0000${r.msg}`; }

// expected records must be contained in the actual output (level token and message text)
export function missingRecords(expRecs, actualText, ctx = {}) {
  const act = actualText.split('\n').map((l) => volatile(ctx.workDir || ctx.tmpDir ? normalize(['paths'], l, ctx) : l));
  const seen = new Set();
  const missing = [];
  for (const r of expRecs) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    const lvl = ['PRINT', 'RAW'].includes(r.level) ? null : new RegExp(`\\b${r.level}\\b`, 'i');
    const msgFirst = r.msg.split('Stacktrace follows:')[0];
    if (!act.some((l) => l.includes(msgFirst) && (!lvl || lvl.test(l)))) missing.push(`${r.level} ${r.msg.slice(0, 220)}`);
  }
  return missing;
}

// http cases: server.log (stdout+stderr of the server JVM) vs the port's output
export function compareServerLog(expectedText, actualText, ctx = {}) {
  const recs = parseRecords(expectedText, 'server', ctx);
  return missingRecords(recs, actualText ?? '', ctx).map((m) => `log record missing in port output: ${m}`);
}

// cli cases with the real logback config: log records on stdout compared by presence, the rest as usual
export function compareCliLog(e, a, opts = {}) {
  const split = (t) => {
    const recs = [];
    const rest = [];
    let last = false;
    for (const line of t.split('\n')) {
      const r = classify(line, 'auto');
      if (r) { last = true; recs.push(r); continue; }
      if (last && CONT_RE.test(line) && line.trim() !== '') continue;
      last = false;
      rest.push(line);
    }
    return { recs, rest: rest.join('\n') };
  };
  const se = split(e.stdout);
  const sa = split(a.stdout);
  const diffs = compareCli({ ...e, stdout: se.rest }, { ...a, stdout: sa.rest }, opts);
  diffs.push(...missingRecords(se.recs, a.stdout, opts.ctx).map((m) => `log record missing in port stdout: ${m}`));
  return diffs;
}
