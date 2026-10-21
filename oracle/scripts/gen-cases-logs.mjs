// Generates oracle/cases/X-LOGS (inputs only; expected values come from the Java jars with their own logback.xml, F71).
// http cases: realLogging + captureLog + isolate -> server.log (stdout+stderr of the server JVM) next to responses.json.
// cli cases: realLogging -> log records on STDOUT (commandline logback.xml, CLI-0072). Comparator: message texts by presence, layout free (D-045).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-LOGS');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit', 'sysLoad', 'identityHash'];
const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const FR = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UNPAIRED_BRACKETS,UNPAIRED_QUOTES,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE,WORD_REPEAT_RULE';
const DE = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,DE_SENTENCE_WHITESPACE,DE_UNPAIRED_QUOTES,GERMAN_WORD_REPEAT_RULE,UNPAIRED_BRACKETS,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const ALL = [...new Set([...EN.split(','), ...FR.split(','), ...DE.split(',')])].join(',');
const ONLY = (rules) => ({ enabledRules: rules, enabledOnly: 'true' });
const SENT = 'The quick brown fox jumps over the lazy dog near the river bank. We walked to the market and bought fresh bread. ';
const MED = SENT.repeat(100);
const SLOW = SENT.repeat(500);
const PRE = { pipelinePrewarming: 'true', preferredLanguages: 'en-US' };

const props = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
const cfg = (o) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': props(o) } });
function write(name, description, extra) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, isolate: name, realLogging: true, captureLog: true, serverArgs: [], ...extra }, null, 1) + '\n');
}
function writeCli(name, description, args, more = {}) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'cli', clock: 'fixed', compare: 'cli-log', realLogging: true, normalize: ['buildDate', 'commit', 'stackFrames', 'paths'], description, args, ...more }, null, 1) + '\n');
}
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const chk = (text, extra = {}, more = {}) => post('/v2/check', { language: 'en-US', text, ...extra }, more);
const chkOnly = (text, extra = {}, more = {}) => chk(text, { ...ONLY(EN), ...extra }, more);
const health = () => get('/v2/healthcheck');
const par = (reqs, stagger) => ({ parallel: reqs, ...(stagger ? { stagger } : {}) });
const INC = { allowIncompleteResults: 'true' };
const MANY = Array.from({ length: 14 }, () => 'the the').join(' ') + ' ' + Array.from({ length: 12 }, () => 'cat cat').join(' ') + '.';

// ---- CLI (CLI-0072, CORE-0336 #10): language detection logs on STDOUT
const EN_ARGS = ['-eo', '-e', EN];
writeCli('cli-adl-en', '-adl on stdin: fastText WARN before the result lines', ['-adl', ...EN_ARGS, '-'], { stdin: 'This is a small English text to test the language detection,  with two spaces.' });
writeCli('cli-adl-fr', '-adl french', ['-adl', '-eo', '-e', FR, '-'], { stdin: 'Ceci est un petit texte français pour tester la détection de la langue,, avec deux virgules.' });
writeCli('cli-adl-de', '-adl german', ['-adl', '-eo', '-e', DE, '-'], { stdin: 'Dies ist ein kleiner deutscher Text, um die Spracherkennung zu testen,, mit zwei Kommas.' });
writeCli('cli-adl-json', '-adl --json: the WARN line precedes the JSON document', ['-adl', '--json', ...EN_ARGS, '-'], { stdin: 'This is a small English text to test the language detection,, with two commas.' });
writeCli('cli-adl-file', '-adl on a file argument', ['-adl', ...EN_ARGS, 'a.txt'], { files: { 'a.txt': 'This is the first English file,, with a mistake.\n' } });
writeCli('cli-adl-empty', '-adl with an empty text', ['-adl', ...EN_ARGS, '-'], { stdin: '' });
writeCli('cli-adl-short', '-adl with a very short text (detection falls back)', ['-adl', ...EN_ARGS, '-'], { stdin: 'Ok.' });
writeCli('cli-plain-en', 'no -adl: no log records at all', ['-l', 'en-US', ...EN_ARGS, '-'], { stdin: 'This is a test,, ok.' });
writeCli('cli-plain-fr', 'fr without -adl', ['-l', 'fr', '-eo', '-e', FR, '-'], { stdin: 'Ceci est un test,, ok.' });
writeCli('cli-plain-de', 'de-DE without -adl', ['-l', 'de-DE', '-eo', '-e', DE, '-'], { stdin: 'Das ist ein Test,, ok.' });
writeCli('cli-temp-off', '--enable-temp-off prints "Activating <id>, which is default=temp_off" on STDOUT (not a log record)', ['-l', 'en-US', '-eo', '--enable-temp-off', '-e', EN, '-'], { stdin: 'This is a test,, ok.' });
writeCli('cli-unknown-language', 'unknown -l value: error text, no log records', ['-l', 'xx-YY', '-']);
writeCli('cli-adl-motherTongue', '-adl with --mothertongue', ['-adl', '-m', 'de', ...EN_ARGS, '-'], { stdin: 'This is a small English text to test the language detection,, with two commas.' });
writeCli('cli-list', '--list prints the languages, no log records', ['--list']);
writeCli('cli-adl-line-by-line', '-adl -l-style options: line by line', ['-adl', '--line-by-line', ...EN_ARGS, '-'], { stdin: 'This is a small English text to test the language detection,, with two commas.\nAnother English line follows right here,, and here.\n' });

// server start via main(): port range search logs (SRV-0174 #20..#23)
const srv = (name, description, args, files, more = {}) => writeCli(name, description, args, { files, jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', streams: ['stdout'], ignoreExit: true, stopOnOutput: 'Server started', ...more });
srv('cli-server-port-range', '--port 0 with minPort/maxPort: free port search logs', ['--port', '0', '--config', 'p.properties'], { 'p.properties': 'minPort=18380\nmaxPort=18383\n' });
srv('cli-server-port-range-busy', 'first ports of the range are occupied: "Check port N" lines for each', ['--port', '0', '--config', 'p.properties'], { 'p.properties': 'minPort=18380\nmaxPort=18383\n' }, { occupyPorts: [18380, 18381] });
srv('cli-server-startup', 'server startup lines with the real logback layout (SRV-0089)', ['--port', '18384'], null);
srv('cli-server-unknown-key', 'unknown config key warning block and --public warnings', ['--port', '18385', '--public', '--config', 'k.properties'], { 'k.properties': 'noSuchKey=1\nmaxTextLength=100\n' });
srv('cli-server-ner', 'nerUrl logs "Using NER service"', ['--port', '18386', '--config', 'n.properties'], { 'n.properties': 'nerUrl=http://127.0.0.1:18399/ner\n' });
srv('cli-server-prewarm', 'pipelinePrewarming logs at startup', ['--port', '18387', '--config', 'w.properties'], { 'w.properties': 'pipelineCaching=true\npipelinePrewarming=true\npreferredLanguages=en-US\n' }, { stopOnOutput: 'Server started' });

// ---- server (SRV-0089, SRV-0174, CORE-0336)
write('srv-startup-default', 'startup lines, healthcheck, simple checks, 404/400 paths', {
  requests: [health(), chkOnly('This is a test,, ok.'), get('/'), get('/v2/unknown'), get('/favicon.ico'), post('/v2/check', { language: 'en-US' }), post('/v2/check', { text: 'No language.' }), get('/v2/maxtextlength'), get('/v2/languages', null, { languagesList: true }), chkOnly('')],
});
write('srv-check-done-variants', '"Check done" line variants: referrer, agent, version, request id, mode, mother tongue, auto language, languageChanged, tone tags', {
  requests: [
    chkOnly('This is a test,, ok.', { useragent: 'ltjs-agent', v: '1.2.3' }, { headers: { Referer: 'https://example.org/page', 'X-Request-ID': 'req-42' } }),
    chkOnly('This is a test,, ok.', { mode: 'textLevelOnly' }), chkOnly('This is a test,, ok.', { mode: 'allButTextLevelOnly' }), chkOnly('This is a test,, ok.', { motherTongue: 'de-DE' }),
    post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble.', ...ONLY(ALL) }),
    chkOnly('This is a test,, ok.', { languageChanged: 'true' }), chkOnly('This is a test,, ok.', { toneTags: 'FOO' }), chkOnly('This is a test,, ok.', { toneTags: 'ALL_TONE_RULES,formal' }),
    chkOnly('This is a test,, ok.', { toneTags: 'formal,casual' }), chkOnly('This is a test,, ok.', { textSessionId: '5', level: 'picky', c: '1' }), chkOnly('Äöü café \u{1F600},, ok.'),
    chkOnly('This is a test,, ok.', { enableHiddenRules: 'true' }), chkOnly('This is a test,, ok.', { inputLogging: 'no' }), chkOnly('This is a test,, ok.', { callback: 'cb' }),
    chkOnly('Das ist ein Test,, ok.', { language: 'de-DE', ...ONLY(DE) }), chkOnly('Ceci est un test,, ok.', { language: 'fr', ...ONLY(FR) }),
  ],
});
write('srv-noop-languages', 'language=auto with noopLanguages: warning that fastText is not active', {
  requests: [post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble.', noopLanguages: 'en', ...ONLY(ALL) }),
    post('/v2/check', { language: 'auto', text: 'Ceci est une phrase française assez longue,, que que le détecteur peut reconnaître.', preferredVariants: 'fr-CA', ...ONLY(ALL) }),
    post('/v2/check', { language: 'auto', text: 'xx', ...ONLY(ALL) })],
});
write('srv-local-api-mode', 'localApiMode=true uses the SimpleLanguageIdentifier: its init and error-rate log lines', {
  ...cfg({ localApiMode: 'true', preferredLanguages: 'en-US, de-DE' }),
  requests: [post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble.', ...ONLY(ALL) }),
    post('/v2/check', { language: 'auto', text: 'Das ist ein ziemlich langer deutscher Satz,, den den der Detektor erkennen kann.', ...ONLY(ALL) }), chkOnly('This is a test,, ok.'), health()],
});
write('srv-xforwarded', 'trustXForwardForHeader=true: real client address in the L-IP line (allButTextLevelOnly)', {
  ...cfg({ trustXForwardForHeader: 'true' }),
  requests: [chkOnly('This is a test,, ok.', { mode: 'allButTextLevelOnly' }, { headers: { 'X-Forwarded-For': '10.1.2.3' } }), chkOnly('This is a test,, ok.', { mode: 'all' }, { headers: { 'X-Forwarded-For': '10.1.2.4' } }), chkOnly('This is a test,, ok.', { mode: 'allButTextLevelOnly' })],
});
write('srv-errors', 'error lines per status class: INFO for <500 (BAD_REQUEST), WARN timeouts, ERROR >=500, stack traces', {
  ...cfg({ maxTextLength: 400, maxErrorsPerWordRate: 0.1, blockedReferrers: 'blocked.example.org' }),
  requests: [
    chkOnly('x'.repeat(401)), chk(MANY), chk(MANY, { ...INC }), chkOnly('This is a test.', { ruleValues: 'abc' }), chkOnly('This is a test.', { level: 'foo' }), chkOnly('This is a test.', { mode: 'foo' }),
    chkOnly('This is a test.', { username: 'a@b.com', apiKey: 'k' }), chkOnly('This is a test.', { username: 'a@b.com' }), chkOnly('This is a test.', { language: 'zz' }),
    chkOnly('This is a test.', {}, { headers: { Referer: 'https://blocked.example.org/x' } }), chkOnly('This is a test.', { useragent: 'ua', v: '2.0' }, { headers: { 'X-Request-ID': 'e-1' } }),
    post('/v2/check', { language: 'en-US', text: 'T.', sourceText: 'S.' }), get('/v2/words', { username: 'u' }), post('/v2/words/add', { word: 'x' }), get('/v2/nope/nope'),
  ],
});
write('srv-timeout', 'timeouts: WARN with the timeout message, INFO for incomplete results, error limiter lines', {
  ...cfg({ ...PRE, maxCheckTimeMillis: 0, timeoutRequestLimit: 2, requestLimitPeriodInSeconds: 3600 }),
  requests: [chkOnly('This is a test,, ok.'), chkOnly('This is a test,, ok.', INC), chkOnly('This is a test,, ok.'), chkOnly('This is a test,, ok.', { ...INC, useragent: 'ua' }), health()],
});
write('srv-limits', 'request limiter 429 error lines and request size limit', {
  ...cfg({ requestLimit: 2, requestLimitPeriodInSeconds: 3600 }),
  requests: [chkOnly('One.'), chkOnly('Two.'), chkOnly('Three.', { useragent: 'ua' }), chkOnly('Four.', { username: 'u' })],
});
write('srv-queue', 'queue rejection: pool WARN, 503 ERROR line, almost-full WARN on healthcheck', {
  ...cfg({ maxTextCheckerThreads: 1, textCheckerQueueSize: 2 }),
  requests: [chk('Warm up.'), par([chk(SLOW), chk(SLOW), chk(SLOW), health(), chk(SLOW), health()], 150), chk('After.')],
});
write('srv-work-queue', 'maxWorkQueueSize rejection: ERROR line with queue size and maximum', {
  ...cfg({ maxCheckThreads: 1, maxWorkQueueSize: 1 }),
  requests: [chk('Warm up.'), par([chk(SLOW), chk(MED), chk(MED), chk(MED), health()], 150), chk('After.')],
});
write('srv-pipeline-pool', 'pipeline pool capacity reached (INFO) and the expected return exception (INFO + stack trace)', {
  ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 1 }),
  requests: [chk('Warm up,, ok.'), par([chk(SLOW), chk(SENT.repeat(40) + 'Tail,, here.'), chk(SENT.repeat(30) + 'Another tail,, here.')], 400), chk('After,, ok.')],
});
write('srv-prewarm', 'pipelinePrewarming: "Prewarming pipelines...", count, duration', {
  ...cfg({ pipelineCaching: 'true', pipelinePrewarming: 'true', preferredLanguages: 'en-US, de-DE', maxPipelinePoolSize: 4 }),
  requests: [chk('This is a test,, ok.'), health()],
});
{
  // 25 distinct sentences per request: two cache lookups per sentence (sentence + matches); the stats line is logged when the request count is a multiple of 500
  const text = (i, n = 25) => Array.from({ length: n }, (_, k) => `Sentence ${i}-${k} has a comma,, problem.`).join(' ');
  const reqs = [];
  for (let i = 0; i < 12; i++) reqs.push(chkOnly(text(i)));
  for (let i = 0; i < 12; i++) reqs.push(chkOnly(text(i % 6)));
  write('srv-cache-stats', 'cacheSize=2000: "Cache stats: s% / m% / r% hit rate" every 500 cache requests', { ...cfg({ cacheSize: 2000 }), requests: reqs });
}
write('srv-stop', '--stoppable and GET /v2/stop: WARN "Stopping server by external command", then the server is gone', {
  serverArgs: ['--stoppable'],
  requests: [chkOnly('This is a test,, ok.'), get('/v2/stop'), { sleep: 800 }, health()],
});
write('srv-config-ab-test', 'abTest key: "A/B-Test enabled" line carries the configured list', {
  ...cfg({ abTest: 'SomeTest', abTestClients: 'client1', abTestRollout: 50 }),
  requests: [chkOnly('This is a test,, ok.', { useragent: 'client1' }), health()],
});
write('srv-blocked-access', 'blockedReferrers and anonymousAccessAllowed=false error lines', {
  ...cfg({ blockedReferrers: 'blocked.example.org', anonymousAccessAllowed: 'false' }),
  requests: [chkOnly('This is a test.', {}, { headers: { Referer: 'https://blocked.example.org/x' } }), chkOnly('This is a test.', {}, { headers: { Origin: 'https://blocked.example.org' } }), chkOnly('This is a test.'), health()],
});
write('srv-premium-flags', 'premiumOnly and skipLoggingChecks keys; check lines are still logged', {
  ...cfg({ skipLoggingChecks: 'true', skipLoggingRuleMatches: 'true', suggestionsEnabled: 'false' }),
  requests: [chkOnly('This is a test,, ok.'), chkOnly('Das ist ein Test,, ok.', { language: 'de-DE', ...ONLY(DE) })],
});
write('srv-log-my-ip', 'default log-my-IP text: INFO line with remote/local address and request parameters, no check', {
  requests: [chkOnly('__logIPNowForLanguageTool__', { useragent: 'ua' }), chkOnly('  __logIPNowForLanguageTool__  '), chkOnly('__logIPNowForLanguageTool__ extra'), chkOnly('This is a test,, ok.')],
});
write('srv-log-my-ip-custom', '--logIpMatchingPattern changes the trigger text; --notLogIP (second case file) disables it', {
  serverArgs: ['--logIpMatchingPattern', 'my secret pattern'],
  requests: [chkOnly('my secret pattern'), chkOnly('__logIPNowForLanguageTool__'), chkOnly('This is a test,, ok.')],
});
write('srv-log-my-ip-off', '--notLogIP: the trigger text is checked like any other text', {
  serverArgs: ['--notLogIP'],
  requests: [chkOnly('__logIPNowForLanguageTool__'), chkOnly('This is a test,, ok.')],
});
