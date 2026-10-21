// Generates oracle/cases/X-SRV-EXEC (inputs only; expected values come from the Java server and harness, F70).
// Every http case runs in a private server JVM (isolate) so counters (r, h, #n, request limiter events, caches) start at zero.
// Timing: deterministic inputs only, see docs/review/F70-oracle.md (0..few ms timeouts, queue sizes with staggered slow requests).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-EXEC');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit', 'sysLoad', 'identityHash'];
const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const FR = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UNPAIRED_BRACKETS,UNPAIRED_QUOTES,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE,WORD_REPEAT_RULE';
const DE = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,DE_SENTENCE_WHITESPACE,DE_UNPAIRED_QUOTES,GERMAN_WORD_REPEAT_RULE,UNPAIRED_BRACKETS,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const ONLY = (rules) => ({ enabledRules: rules, enabledOnly: 'true' });
const SENT = 'The quick brown fox jumps over the lazy dog near the river bank. We walked to the market and bought fresh bread. ';
const MED = SENT.repeat(100); // ~11 KB, 200 sentences
const SLOW = SENT.repeat(500); // ~56 KB, 1000 sentences: 1.8-3 s with the full en-US rule set, even when warm

// prewarming loads the rule classes of the pipelines at startup: a cancelled (interrupted) cold start can otherwise break static initialisers
// (NoClassDefFoundError: EnglishRepeatedWordsRule) and make later requests of the same JVM fail non-deterministically
const PRE = { pipelinePrewarming: 'true', preferredLanguages: 'en-US, en-GB, de-DE, fr' };
const props = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
const cfg = (o) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': props(o) } });
function write(name, description, extra) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, isolate: name, serverArgs: [], ...extra }, null, 1) + '\n');
}
function writeCli(name, description, args, files, more = {}) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({
    kind: 'cli', clock: 'fixed', compare: 'cli', jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer',
    normalize: ['buildDate', 'commit', 'stackFrames'], stripTimestamp: true, stderrExceptionOnly: true, description, args, ...(files ? { files } : {}), ...more,
  }, null, 1) + '\n');
}
function writeHarness(name, description, ops, more = {}) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, compare: 'jsonl', normalize: ['identityHash', 'paths'], ops, ...more }, null, 1) + '\n');
}
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const chk = (text, extra = {}, more = {}) => post('/v2/check', { language: 'en-US', text, ...extra }, more);
const chkOnly = (text, extra = {}, more = {}) => chk(text, { ...ONLY(EN), ...extra }, more);
const health = () => get('/v2/healthcheck');
const par = (reqs, stagger) => ({ parallel: reqs, ...(stagger ? { stagger } : {}) });
const INC = { allowIncompleteResults: 'true' };

// ---- timeouts (SRV-0138): 0 ms limit is deterministic (the check is never done at get(0)); cold pipeline creation is far above 1..25 ms
{
  const T = 'This is a test,, ok. The the cat sat on teh mat.';
  write('timeout-zero', 'maxCheckTimeMillis=0: every check times out; message uses float seconds "0.0"; allowIncompleteResults returns an empty result', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0 }),
    requests: [
      chk(T), chkOnly(T), get('/v2/check', { language: 'en-US', text: T }),
      chk(T, { mode: 'textLevelOnly' }), chk(T, { mode: 'allButTextLevelOnly' }), chk(T, { level: 'picky' }),
      chk('Das ist ein Test,, ok.', { language: 'de-DE' }), chk('Ceci est un test,, ok.', { language: 'fr' }),
      chk(T, { ...INC }), chkOnly(T, { ...INC }), chk(T, { ...INC, mode: 'textLevelOnly' }),
      chk('Das ist ein Test,, ok.', { language: 'de-DE', ...INC }), chk('Ceci est un test,, ok.', { language: 'fr', ...INC }),
      chk(T, { allowIncompleteResults: 'false' }), chk(T, { allowIncompleteResults: 'yes' }), chk(T, { allowIncompleteResults: '1' }),
      chk(T, { ...INC, c: '1' }), chk(T, { ...INC, callback: 'cb' }),
      post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle.' }),
      post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle.', ...INC }),
      post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'This is ' }, { markup: '<b>' }, { text: 'a test,, ok.' }, { markup: '</b>' }] }), ...ONLY(EN) }),
      post('/v2/check', { language: 'en-US', text: 'Short.', sourceText: 'Kurz.', sourceLanguage: 'de-DE' }),
      post('/v2/check', { language: 'en-US', text: '', ...ONLY(EN) }), post('/v2/check', { language: 'en-US', text: ' ', ...INC }),
      health(), get('/v2/maxtextlength'), chkOnly('Fine.', { ...INC }),
    ],
  });
  for (const ms of [1, 7, 10, 25, 100, 250, 999]) {
    const text = ms <= 25 ? MED : ms <= 100 ? SLOW : SENT.repeat(1000);
    write(`timeout-ms-${ms}`, `maxCheckTimeMillis=${ms}: float-seconds text and the "%.2f" incomplete-results reason`, {
      ...cfg({ ...PRE, maxCheckTimeMillis: ms }),
      requests: [chk(text), chk(text, { ...INC }), chk(text), chk(text, { ...INC, mode: 'allButTextLevelOnly' }), chk(text, { ...INC })],
    });
  }
  write('timeout-anonymous-key', 'maxCheckTimeMillisAnonymous=0 wins over maxCheckTimeMillis=100000 for anonymous requests', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 100000, maxCheckTimeMillisAnonymous: 0 }),
    requests: [chk(T), chk(T, { ...INC }), chkOnly('Fine sentence.'), health()],
  });
  write('timeout-anonymous-high', 'maxCheckTimeMillis=0 but maxCheckTimeMillisAnonymous=100000: anonymous checks succeed', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0, maxCheckTimeMillisAnonymous: 100000 }),
    requests: [chk(T), chkOnly(T), chk('Das ist ein Test,, ok.', { language: 'de-DE' })],
  });
  write('timeout-negative', 'maxCheckTimeMillis=-5 and maxCheckTimeMillisAnonymous<0: no limit', {
    ...cfg({ ...PRE, maxCheckTimeMillis: -5 }),
    requests: [chk(T), chk(T, { ...INC }), chkOnly(T)],
  });
  write('timeout-other-keys', 'maxCheckTimeMillisLoggedIn/Premium and the legacy key maxCheckTimeWithApiKeyMillis do not limit anonymous requests', {
    ...cfg({ ...PRE, maxCheckTimeMillisLoggedIn: 0, maxCheckTimeMillisPremium: 0, maxCheckTimeWithApiKeyMillis: 0 }),
    requests: [chk(T), chkOnly(T), get('/v2/maxtextlength')],
  });
  write('timeout-counter', 'language check counter "#n" in the timeout message only grows after successful (incomplete) checks', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0 }),
    requests: [chk(T), chk(T), chk(T, { ...INC }), chk(T), chk(T, { ...INC }), chk(T), chk('Das ist ein Test,, ok.', { language: 'de-DE' }), chk(T, { language: 'en-GB' }), chk(T, { language: 'en-GB', ...INC }), chk(T, { language: 'en-GB' })],
  });
  write('timeout-error-limiter', 'timeoutRequestLimit=2 per 3600 s: third timeout request is refused with 429; window expiry with a 2 s period', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0, timeoutRequestLimit: 2, requestLimitPeriodInSeconds: 3600 }),
    requests: [chk(T), chk(T), chk(T), chk('x'.repeat(300)), post('/v2/check', { language: 'en-US', data: JSON.stringify({ text: 'Data text.' }) }), post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'Data ' }, { markup: '<b>' }, { text: 'text.' }] }) }), chk(T, { ...INC }), health(), get('/v2/maxtextlength'), get('/v2/languages', null, { languagesList: true })],
  });
  write('timeout-error-limiter-expiry', 'timeoutRequestLimit=1 per 2 s: refused while the window is open, accepted again after it expired', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0, timeoutRequestLimit: 1, requestLimitPeriodInSeconds: 2 }),
    requests: [chk(T), chk(T), chk(T), { sleep: 2600 }, chk(T), chk(T), chk(T)],
  });
  write('timeout-error-limiter-incomplete', 'allowIncompleteResults timeouts count for timeoutRequestLimit as well', {
    ...cfg({ ...PRE, maxCheckTimeMillis: 0, timeoutRequestLimit: 2, requestLimitPeriodInSeconds: 3600 }),
    requests: [chk(T, { ...INC }), chk(T, { ...INC }), chk(T, { ...INC }), chk(T), chk(T, { ...INC }), health()],
  });
}

// ---- request limiter (SRV-0084), text length limits and user limits (SRV-0160)
{
  const T = 'This is a test,, ok.';
  write('reqlimit-count', 'requestLimit=3 per 3600 s: 429 text, access token header skips the limit, other paths are counted', {
    ...cfg({ requestLimit: 3, requestLimitPeriodInSeconds: 3600, requestLimitAccessToken: 'sekret' }),
    requests: [chkOnly('One.'), chkOnly('Two.'), chkOnly('Three.'), chkOnly('Four.'), chkOnly('Five.', {}, { headers: { 'X-Request-Limit-Access-Token': 'sekret' } }), chkOnly('Six.', {}, { headers: { 'X-Request-Limit-Access-Token': 'wrong' } }), health(), get('/v2/languages', null, { languagesList: true }), get('/v2/maxtextlength'), get('/v2/admin/refreshUser', { username: 'u' })],
  });
  write('reqlimit-bytes', 'requestLimitInBytes=100 per 3600 s counts text length; requestLimit unlimited', {
    ...cfg({ requestLimitInBytes: 100, requestLimit: 1000, requestLimitPeriodInSeconds: 3600 }),
    requests: [chkOnly('x'.repeat(40)), chkOnly('y'.repeat(40)), chkOnly('z'.repeat(40)), chkOnly('w'), health(), chkOnly('Another one.')],
  });
  write('reqlimit-fingerprint', 'ipFingerprintFactor=2: per-fingerprint limit 2, per-ip limit 4 (User-Agent / Referer / textSessionId fingerprints)', {
    ...cfg({ requestLimit: 2, requestLimitPeriodInSeconds: 3600, ipFingerprintFactor: 2 }),
    requests: [
      chkOnly('a1.', {}, { headers: { 'User-Agent': 'agent-a' } }), chkOnly('a2.', {}, { headers: { 'User-Agent': 'agent-a' } }), chkOnly('a3.', {}, { headers: { 'User-Agent': 'agent-a' } }),
      chkOnly('b1.', {}, { headers: { 'User-Agent': 'agent-b' } }), chkOnly('b2.', {}, { headers: { 'User-Agent': 'agent-b' } }), chkOnly('c1.', {}, { headers: { 'User-Agent': 'agent-c' } }),
      chkOnly('s1.', { textSessionId: '7' }, { headers: { 'User-Agent': 'agent-d' } }),
    ],
  });
  write('reqlimit-mode', 'text level only requests count less against requestLimit', {
    ...cfg({ requestLimit: 2, requestLimitPeriodInSeconds: 3600 }),
    requests: [chkOnly('t1.', { mode: 'textLevelOnly' }), chkOnly('t2.', { mode: 'textLevelOnly' }), chkOnly('t3.', { mode: 'textLevelOnly' }), chkOnly('t4.', { mode: 'textLevelOnly' }), chkOnly('a1.'), chkOnly('a2.'), chkOnly('a3.', { mode: 'allButTextLevelOnly' })],
  });
  write('reqlimit-period-expiry', 'requestLimit=2 per 2 s: window expiry', {
    ...cfg({ requestLimit: 2, requestLimitPeriodInSeconds: 2 }),
    requests: [chkOnly('p1.'), chkOnly('p2.'), chkOnly('p3.'), { sleep: 2600 }, chkOnly('p4.'), chkOnly('p5.'), chkOnly('p6.')],
  });
  const txt = (n) => 'a'.repeat(n);
  write('limits-textlength', 'maxTextLengthAnonymous wins for anonymous requests; maxTextLength/LoggedIn/Premium do not apply; maxTextHardLength', {
    ...cfg({ maxTextLength: 30, maxTextLengthAnonymous: 20, maxTextLengthLoggedIn: 10, maxTextLengthPremium: 5, maxTextHardLength: 45 }),
    requests: [chkOnly(txt(19)), chkOnly(txt(20)), chkOnly(txt(21)), chkOnly(txt(30)), chkOnly(txt(45)), chkOnly(txt(46)),
      chkOnly('Emoji \u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}!'), chkOnly('ä'.repeat(20)), chkOnly('ä'.repeat(21)),
      post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'a'.repeat(15) }, { markup: '<b>this markup is not counted</b>' }, { text: 'b'.repeat(5) }] }), ...ONLY(EN) }),
      post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'a'.repeat(15) }, { markup: '<b>' }, { text: 'b'.repeat(6) }] }), ...ONLY(EN) }),
      get('/v2/maxtextlength'), chk('', ONLY(EN))],
  });
  write('limits-textlength-global', 'only maxTextLength set: it applies to anonymous requests; maxTextLengthWithApiKey is a known key without effect here', {
    ...cfg({ maxTextLength: 25, maxTextLengthWithApiKey: 5 }),
    requests: [chkOnly(txt(25)), chkOnly(txt(26)), get('/v2/maxtextlength')],
  });
  write('limits-textlength-hard', 'maxTextHardLength alone (above the default maxTextLength)', {
    ...cfg({ maxTextHardLength: 40 }),
    requests: [chkOnly(txt(40)), chkOnly(txt(41)), chkOnly(txt(5000)), get('/v2/maxtextlength')],
  });
  write('limits-auth-params', 'username / apiKey / password / tokenV2 combinations in the open-source build (AuthException, NotImplementedException, BadRequest)', {
    ...cfg({ maxTextLength: 50, requestLimitWhitelistUsers: 'a@b.com, example.org' }),
    requests: [
      chkOnly(T, { username: 'a@b.com', apiKey: 'k' }), chkOnly(T, { username: 'x@example.org', apiKey: 'k' }), chkOnly(T, { username: 'nobody@nowhere.org', apiKey: 'k' }),
      chkOnly(T, { username: '', apiKey: 'k' }), chkOnly(T, { username: 'a@b.com' }), chkOnly(T, { apiKey: 'k' }),
      chkOnly(T, { username: 'a@b.com', apiKey: 'k', password: 'p' }), chkOnly(T, { username: 'a@b.com', password: 'p' }), chkOnly(T, { password: 'p' }),
      chkOnly(T, { username: 'a@b.com', tokenV2: 't' }), chkOnly(T, { tokenV2: 't' }), chkOnly(T, {}, { headers: { Authorization: 'Bearer abc' } }),
      chkOnly(T, { username: 'a@b.com', tokenV2: 't' }, { headers: { Authorization: 'Bearer abc' } }),
      post('/v2/check', { language: 'en-US', text: T, ...ONLY(EN), useragent: 'ltjs-test' }), get('/v2/maxtextlength', { username: 'a@b.com', apiKey: 'k' }),
    ],
  });
  write('limits-auth-requestlimit', 'requestLimit configured: username/apiKey requests fail in the limiter path (403 AuthException) before counting', {
    ...cfg({ requestLimit: 2, requestLimitPeriodInSeconds: 3600, requestLimitWhitelistUsers: 'a@b.com', requestLimitWhitelistLimit: 10 }),
    requests: [chkOnly(T, { username: 'a@b.com', apiKey: 'k' }), chkOnly(T), chkOnly(T), chkOnly(T), chkOnly(T, { username: 'a@b.com', apiKey: 'k' })],
  });
  write('limits-anonymous-denied', 'anonymousAccessAllowed=false: anonymous check requests are refused (403)', {
    ...cfg({ anonymousAccessAllowed: 'false' }),
    requests: [chkOnly(T), health(), get('/v2/maxtextlength'), chkOnly(T, { username: 'a@b.com', apiKey: 'k' })],
  });
  write('limits-skip-referrer', 'blockedReferrers: blocked Referer/Origin headers get 403 before any limit', {
    ...cfg({ blockedReferrers: 'blocked.example.org, other.example.com' }),
    requests: [chkOnly(T), chkOnly(T, {}, { headers: { Referer: 'https://blocked.example.org/page' } }), chkOnly(T, {}, { headers: { Origin: 'https://other.example.com' } }), chkOnly(T, {}, { headers: { Referer: 'https://fine.example.net/' } }), health()],
  });
}
writeCli('limits-premium-always', '--premiumAlways in the open-source build is refused at startup', ['--premiumAlways', '--port', '18390'], null);
for (const [name, key, val] of [
  ['maxcheckthreads-zero', 'maxCheckThreads', '0'], ['maxcheckthreads-text', 'maxCheckThreads', 'x'],
  ['maxtextcheckerthreads-negative', 'maxTextCheckerThreads', '-1'], ['textcheckerqueue-negative', 'textCheckerQueueSize', '-1'],
  ['maxworkqueue-negative', 'maxWorkQueueSize', '-1'], ['cachesize-negative', 'cacheSize', '-1'], ['cachesize-text', 'cacheSize', '1.5'],
  ['cachettl-without-size', 'cacheTTLSeconds', '10'], ['errorrate-text', 'maxErrorsPerWordRate', 'abc'],
  ['maxcheckime-text', 'maxCheckTimeMillis', 'abc'], ['poolsize-text', 'maxPipelinePoolSize', 'abc'], ['requestlimit-float', 'requestLimit', '1.5'],
  ['timeoutlimit-text', 'timeoutRequestLimit', 'x'], ['expire-text', 'pipelineExpireTimeInSeconds', 'x'], ['period-text', 'requestLimitPeriodInSeconds', 'x'],
  ['fingerprint-text', 'ipFingerprintFactor', 'x'], ['mode-atd', 'mode', 'AfterTheDeadline'],
]) writeCli(`cfgfail-${name}`, `config ${key}=${val} refused at startup`, ['--config', 'bad.properties', '--port', '18391'], { 'bad.properties': `${key}=${val}\n` });
writeCli('cfgok-booleans', 'pipelineCaching/pipelinePrewarming booleans accept junk as false; server starts', ['--config', 'ok.properties', '--port', '18392'], { 'ok.properties': 'pipelineCaching=maybe\npipelinePrewarming=maybe\nmaxPipelinePoolSize=3\nmaxCheckTimeMillis=-1\n' },
  { streams: ['stdout'], ignoreExit: true, stopOnOutput: 'Server started' });

// ---- queues (SRV-0137): staggered slow requests; rejected requests answer immediately
{
  const warm = chkOnly('Warm up.');
  write('queue-reject', 'maxTextCheckerThreads=1, textCheckerQueueSize=1: running + one queued, the rest is refused with 503 "Server overloaded"', {
    ...cfg({ maxTextCheckerThreads: 1, textCheckerQueueSize: 1 }),
    requests: [chk('Warm up.'), par([chk(SLOW), chk(SLOW), chk(SLOW), chk(SLOW)], 150), chk('After the burst.'), health()],
  });
  write('queue-health-almost-full', 'textCheckerQueueSize=2: healthcheck fails (503) while more than half of the queue is used', {
    ...cfg({ maxTextCheckerThreads: 1, textCheckerQueueSize: 2 }),
    requests: [chk('Warm up.'), par([chk(SLOW), chk(SLOW), chk(SLOW), health(), chk(SLOW), health()], 150), chk('After the burst.'), health()],
  });
  write('queue-unbounded', 'textCheckerQueueSize=0 is an unbounded queue: nothing is refused', {
    ...cfg({ maxTextCheckerThreads: 1, textCheckerQueueSize: 0 }),
    requests: [chk('Warm up.'), par([chk(MED), chk(MED), chk(MED), chk(MED), chk(MED), chk(MED)], 60), health()],
  });
  write('queue-two-threads', 'maxTextCheckerThreads=2, textCheckerQueueSize=1: two run, one queued, further ones refused', {
    ...cfg({ maxTextCheckerThreads: 2, textCheckerQueueSize: 1 }),
    requests: [chk('Warm up.'), par([chk(SLOW), chk(SLOW), chk(SLOW), chk(SLOW), chk(SLOW)], 150), chk('After the burst.')],
  });
  write('queue-work-queue', 'maxCheckThreads=1 and maxWorkQueueSize=1: the server work queue refuses (503 "too many parallel requests") when more than one request waits', {
    ...cfg({ maxCheckThreads: 1, maxWorkQueueSize: 1 }),
    requests: [chk('Warm up.'), par([chk(SLOW), chk(MED), chk(MED), chk(MED), health()], 150), chk('After the burst.'), health()],
  });
  write('queue-timeout-while-queued', 'a queued request times out although it never started (maxCheckTimeMillisAnonymous=1500, one worker)', {
    ...cfg({ ...PRE, maxTextCheckerThreads: 1, textCheckerQueueSize: 4, maxCheckTimeMillisAnonymous: 1500 }),
    requests: [chk('Warm up.', INC), par([chk(SLOW, INC), chk(MED, INC), chk(MED)], 150), chk('After.')],
  });
  void warm;
}

// ---- pipelines (SRV-0150..0154): results must not depend on pooling
const PIPE_REQS = () => {
  const E = 'He go to school every days and she dont like it. I has a apple. Their is a mistake in you\'re sentence. The the cat.';
  return [
    chk(E), chk(E), chk(E, { level: 'picky' }), chk(E, { disabledRules: 'ENGLISH_WORD_REPEAT_RULE' }), chk(E, { enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' }),
    chk(E, { motherTongue: 'de-DE' }), chk(E, { motherTongue: 'fr' }), chk(E, { altLanguages: 'de-DE' }), chk(E, { mode: 'textLevelOnly' }), chk(E, { mode: 'allButTextLevelOnly' }),
    chk(E, { toneTags: 'formal' }), chk(E), chk(E, { level: 'picky' }), chk(E, { disabledCategories: 'GRAMMAR' }), chk(E, { enabledCategories: 'STYLE', level: 'picky' }),
    chk('Das ist ein Test,, ok. Das das ist falsch.', { language: 'de-DE' }), chk('Das ist ein Test,, ok. Das das ist falsch.', { language: 'de-DE' }),
    chk('Ceci est un test,, ok. Le le chat dort.', { language: 'fr' }), chk(E, { language: 'en-GB' }), chk(E, { language: 'en-GB' }), chk(E, { ruleValues: 'SOME_RULE:3' }), chk(E, { ruleValues: 'SOME_RULE:3' }),
    chk(E, { enableTempOffRules: 'true' }), chk(E, { enableHiddenRules: 'true' }), chk(E, { inputLogging: 'no' }), chk(E, { filterDictionaryMatches: 'false' }),
  ];
};
{
  write('pipeline-uncached', 'reference run without pipelineCaching: same request list as pipeline-cached', { requests: PIPE_REQS() });
  write('pipeline-cached', 'pipelineCaching=true, pool of 5: results equal the uncached run for every request', { ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 5, pipelineExpireTimeInSeconds: 60 }), requests: PIPE_REQS() });
  write('pipeline-cached-size1', 'pipelineCaching=true, maxPipelinePoolSize=1: settings change every other request', { ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 1 }), requests: PIPE_REQS() });
  write('pipeline-cached-expire', 'pipelineCaching=true, pipelineExpireTimeInSeconds=1 and a pause between requests', {
    ...cfg({ pipelineCaching: 'true', pipelineExpireTimeInSeconds: 1, maxPipelinePoolSize: 5 }),
    requests: [chk('This is a test,, ok.'), { sleep: 1500 }, chk('This is a test,, ok.'), chk('This is another test,, ok.'), { sleep: 1500 }, chk('This is a test,, ok.')],
  });
  write('pipeline-pool-exhausted', 'maxPipelinePoolSize=1 with overlapping requests of the same settings: the second one gets an unpooled pipeline, results unchanged', {
    ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 1 }),
    requests: [chk('Warm up,, ok.'), par([chk(SLOW), chk(SENT.repeat(40) + 'Tail,, here.'), chk(SENT.repeat(30) + 'Another tail,, here.')], 400), chk('After,, ok.')],
  });
  const state = [];
  const SAME = ['I has a apple.', 'He dont know.', 'Their is a problem.', 'Your welcome.', 'She could of gone.', 'Between you and I.', 'Less people came.', 'Its a nice day, isnt it?',
    'A apple a day.', 'An hour ago a unicorn left.', 'I am looking forward to see you.', 'He said that that is wrong.', 'the cat sat. the dog ran. The end', 'We was there.', 'Me and him went.',
    'The informations are good.', 'He is more taller than me.', 'I have went to school.', 'This sentence,, has errors .And no space.', 'Wich one is correct?'];
  for (const round of [1, 2, 3]) for (const t of SAME) state.push(chk(t, round === 2 ? { level: 'picky' } : {}));
  write('pipeline-state-uncached', 'rule state across texts without pipeline reuse (20 texts x 3 rounds, rules with suggestion matches)', { requests: state });
  write('pipeline-state-cached', 'rule state across texts with pipeline reuse: the same rule instances serve all requests', { ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 2 }), requests: state });
  write('pipeline-prewarm', 'pipelinePrewarming=true with preferredLanguages=en-US,de-DE: prewarm at startup, then checks in several languages', {
    ...cfg({ pipelineCaching: 'true', pipelinePrewarming: 'true', preferredLanguages: 'en-US, de-DE', maxPipelinePoolSize: 4 }),
    requests: [chk('This is a test,, ok.'), chk('Das ist ein Test,, ok.', { language: 'de-DE' }), chk('Ceci est un test,, ok.', { language: 'fr' }), chk('This is a test,, ok.', { motherTongue: 'de-DE' }), health()],
  });
  write('pipeline-prewarm-nocache', 'pipelinePrewarming=true without pipelineCaching still runs the prewarm checks', {
    ...cfg({ pipelinePrewarming: 'true', preferredLanguages: 'en-US' }),
    requests: [chk('This is a test,, ok.'), health()],
  });
  writeCli('pipeline-prewarm-bad-language', 'pipelinePrewarming with an unknown preferred language fails at startup', ['--config', 'bad.properties', '--port', '18393'], { 'bad.properties': 'pipelinePrewarming=true\npipelineCaching=true\npreferredLanguages=xx-YY\n' }, { listCut: true });
}

// ---- pipeline creation settings (SRV-0152): rulesFile, disabledRuleIds
{
  const T = 'This is a test,,  ok. The the cat sat on teh mat.';
  const reqs = () => [chk(T), chk(T, { level: 'picky' }), chk(T, { enabledRules: 'DOUBLE_PUNCTUATION,WHITESPACE_RULE', enabledOnly: 'true' }), chk(T, { enabledRules: 'DOUBLE_PUNCTUATION' }), chk(T, { disabledRules: 'ENGLISH_WORD_REPEAT_RULE' }),
    chk('Das ist ein Test,,  ok.', { language: 'de-DE' }), chk(T, { language: 'en-GB' }), chk('Ceci est un test,,  ok.', { language: 'fr' })];
  write('pipeline-rules-file', 'rulesFile config: disabledRules / disabledRules.en / disabledCategories.en applied to every pipeline (uncached)', {
    serverArgs: ['--config', '{WORK}/server.properties'],
    files: { 'server.properties': 'rulesFile={WORK}/rules.cfg\n', 'rules.cfg': 'disabledRules.en=DOUBLE_PUNCTUATION\ndisabledRules=WHITESPACE_RULE\ndisabledCategories.en=PUNCTUATION\n' },
    requests: reqs(),
  });
  write('pipeline-rules-file-cached', 'rulesFile together with pipelineCaching', {
    serverArgs: ['--config', '{WORK}/server.properties'],
    files: { 'server.properties': 'rulesFile={WORK}/rules.cfg\npipelineCaching=true\nmaxPipelinePoolSize=3\n', 'rules.cfg': 'disabledRules.en=DOUBLE_PUNCTUATION\ndisabledRules=WHITESPACE_RULE\nenabledRules.en=ENGLISH_WORD_REPEAT_RULE\n' },
    requests: reqs(),
  });
  write('pipeline-disabled-rule-ids', 'disabledRuleIds config key: disabled before the request settings, so request enabledRules re-enable them', {
    ...cfg({ disabledRuleIds: 'DOUBLE_PUNCTUATION, WHITESPACE_RULE' }),
    requests: reqs(),
  });
  write('pipeline-disabled-rule-ids-cached', 'disabledRuleIds with pipelineCaching', {
    ...cfg({ disabledRuleIds: 'DOUBLE_PUNCTUATION, WHITESPACE_RULE', pipelineCaching: 'true', maxPipelinePoolSize: 3 }),
    requests: reqs(),
  });
  writeCli('cfgfail-rulesfile-missing', 'rulesFile pointing to a missing file is refused at startup', ['--config', 'bad.properties', '--port', '18394'], { 'bad.properties': 'rulesFile=does-not-exist.cfg\n' });
}

// ---- crash mapping (SRV-0139), error rate, cache (SRV-0155)
{
  const MANY = Array.from({ length: 14 }, () => 'the the').join(' ') + ' ' + Array.from({ length: 12 }, () => 'cat cat').join(' ') + '.';
  write('crash-mapping', 'exceptions inside the check task and in checkText: status codes and message texts', {
    ...cfg({ maxErrorsPerWordRate: 0.2 }),
    requests: [
      chk('Warm up.'),
      chk(MANY), chk(MANY, { ...INC }), chk(MANY, { level: 'picky' }), chk('This is a fine sentence with no problems at all.'),
      chk('This is a test.', { sourceText: 'Das ist ein Test.' }), chk('This is a test.', { sourceText: 'Das ist ein Test.', sourceLanguage: 'xx-XX' }),
      chk('This is a test.', { sourceText: 'Das ist ein Test.', sourceLanguage: 'de-DE' }), chk('This is a test.', { sourceText: '', sourceLanguage: 'de-DE' }),
      chk('This is a test.', { ruleValues: 'abc' }), chk('This is a test.', { ruleValues: 'abc:' }), chk('This is a test.', { ruleValues: 'abc:def' }), chk('This is a test.', { ruleValues: 'A:1,B' }),
      chk('This is a test.', { enabledRules: 'NO_SUCH_RULE_X' }), chk('This is a test.', { enabledRules: 'NO_SUCH_RULE_X', enabledOnly: 'true' }), chk('This is a test.', { disabledRules: 'NO_SUCH_RULE_X' }),
      chk('This is a test.', { enabledCategories: 'NO_SUCH_CAT' }), chk('This is a test.', { motherTongue: 'xx' }), chk('This is a test.', { altLanguages: 'de' }), chk('This is a test.', { altLanguages: 'de-DE,xx' }),
      chk('This is a test.', { level: 'foo' }), chk('This is a test.', { mode: 'foo' }), chk('This is a test.', { callback: '1' }), chk('This is a test.', { callback: 'ok' }),
      chk('This is a test.', { toneTags: 'FOO' }), chk('This is a test.', { toneTags: 'formal,FOO' }), chk('This is a test.', { toneTags: 'ALL_TONE_RULES,formal' }), chk('This is a test.', { toneTags: '' }),
      chk('This is a test.', { enabledOnly: 'true' }), chk('This is a test.', { enabledOnly: 'true', disabledRules: 'X', enabledRules: 'Y' }),
      chk('This is a test.', { noopLanguages: 'en' }), chk('This is a test.', { c: 'x' }), chk('This is a test.', { language: 'zz' }), post('/v2/check', { text: 'No language.' }),
      post('/v2/check', { language: 'en-US' }), chk('This is a test.', { sourceText: 'Das ist ein Test.', sourceLanguage: 'de-DE', mode: 'textLevelOnly' }),
    ],
  });
  write('crash-error-rate', 'maxErrorsPerWordRate=0.1: more than 25 words with many matches -> ErrorRateTooHigh (400 / incomplete results)', {
    ...cfg({ maxErrorsPerWordRate: 0.1 }),
    requests: [chkOnly(MANY), chkOnly(MANY, { ...INC }), chk(MANY), chk(MANY, { ...INC }), chkOnly('the the cat cat sat sat.'), chkOnly(MANY, { mode: 'textLevelOnly' }), health(), chkOnly('Fine text.')],
  });
  const CACHE_TEXTS = [
    'This is a test,, ok. The the cat sat on the mat. Another sentence follows here.', 'This is a test,, ok. The the cat sat on the mat. Another sentence follows here.',
    'This is a test,, ok. A different second sentence,, here. Another sentence follows here.', 'Another sentence follows here.', 'The the cat sat on the mat.',
  ];
  const cacheReqs = () => {
    const r = [];
    for (const t of CACHE_TEXTS) r.push(chkOnly(t));
    for (const t of CACHE_TEXTS) r.push(chkOnly(t, { level: 'picky' }));
    r.push(chkOnly(CACHE_TEXTS[0], { disabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: undefined }), chkOnly(CACHE_TEXTS[0], { motherTongue: 'de-DE' }), chkOnly(CACHE_TEXTS[0], { mode: 'allButTextLevelOnly' }));
    r.push(chkOnly(CACHE_TEXTS[0], { language: 'en-GB' }), chkOnly(CACHE_TEXTS[0], { language: 'en-GB' }), chk(CACHE_TEXTS[0]), chk(CACHE_TEXTS[0]));
    r.push(chkOnly(CACHE_TEXTS[2], { toneTags: 'formal' }), chkOnly(CACHE_TEXTS[2], { altLanguages: 'de-DE' }), chkOnly(CACHE_TEXTS[2], { textSessionId: '12' }), chkOnly(CACHE_TEXTS[2], { textSessionId: '13' }));
    r.push(chkOnly('Das ist ein Test,, ok.', { language: 'de-DE' }), chkOnly('Das ist ein Test,, ok.', { language: 'de-DE' }), chkOnly('Ceci est un test,, ok.', { language: 'fr' }));
    r.push(chk(CACHE_TEXTS[0], { ruleValues: 'SOME_RULE:3' }), chk(CACHE_TEXTS[0], { ruleValues: 'SOME_RULE:3' }));
    r.push(chkOnly('Line one,, here.\n\nSecond paragraph,, here.'), chkOnly('Line one,, here.\n\nSecond paragraph,, here.'), chkOnly('Second paragraph,, here.'));
    r.push(post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'This is ' }, { markup: '<b>' }, { text: 'a test,, ok.' }, { markup: '</b>' }] }), ...ONLY(EN) }));
    r.push(post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'This is ' }, { markup: '<b>' }, { text: 'a test,, ok.' }, { markup: '</b>' }] }), ...ONLY(EN) }));
    return r.map((q) => { if (q.params) for (const k of Object.keys(q.params)) if (q.params[k] === undefined) delete q.params[k]; return q; });
  };
  write('cache-off', 'reference run without result cache (cacheSize=0): same requests as cache-on', { requests: cacheReqs() });
  write('cache-on', 'cacheSize=100 (sentence + match caches): cached results equal uncached results, also across settings', { ...cfg({ cacheSize: 100 }), requests: cacheReqs() });
  write('cache-ttl', 'cacheSize=100 with cacheTTLSeconds=1 and a pause: expired entries are recomputed', {
    ...cfg({ cacheSize: 100, cacheTTLSeconds: 1 }),
    requests: [chkOnly(CACHE_TEXTS[0]), chkOnly(CACHE_TEXTS[0]), { sleep: 1800 }, chkOnly(CACHE_TEXTS[0]), chkOnly(CACHE_TEXTS[1])],
  });
  write('cache-ttl-zero', 'cacheTTLSeconds=0: entries expire immediately, results unchanged', { ...cfg({ cacheSize: 100, cacheTTLSeconds: 0 }), requests: cacheReqs().slice(0, 12) });
  write('cache-tiny', 'cacheSize=1 (weight limit 0 per cache): nothing stays cached, results unchanged', { ...cfg({ cacheSize: 1 }), requests: cacheReqs().slice(0, 14) });
  write('cache-small', 'cacheSize=4: evictions while checking many different sentences', {
    ...cfg({ cacheSize: 4 }),
    requests: [...Array.from({ length: 12 }, (_, i) => chkOnly(`Sentence number ${i},, with a comma problem. Shared sentence for all texts,, here.`)), chkOnly('Shared sentence for all texts,, here.'), chkOnly('Sentence number 0,, with a comma problem. Shared sentence for all texts,, here.')],
  });
  write('cache-with-pipeline-cache', 'cacheSize=100 together with pipelineCaching=true', { ...cfg({ cacheSize: 100, pipelineCaching: 'true', maxPipelinePoolSize: 3 }), requests: cacheReqs() });
  write('cache-error-rate', 'result cache together with maxErrorsPerWordRate: failing texts are not cached', {
    ...cfg({ cacheSize: 100, maxErrorsPerWordRate: 0.1 }),
    requests: [chkOnly(MANY), chkOnly(MANY), chkOnly(MANY, { ...INC }), chkOnly('Fine text,, here.'), chkOnly('Fine text,, here.')],
  });
}

// ---- monitorActiveRules (SRV-0175): system property only registers a JMX bean (not observable over HTTP)
{
  const reqs = [chk('This is a test,, ok. The the cat sat on teh mat.'), chk('Das ist ein Test,, ok. Das das ist falsch.', { language: 'de-DE' }), chk('Ceci est un test,, ok.', { language: 'fr' }), health()];
  write('monitor-active-rules-off', 'reference run without -DmonitorActiveRules', { requests: reqs });
  write('monitor-active-rules-on', '-DmonitorActiveRules=true: results identical, the MBean is JMX-only (SRV-0176, later)', { javaOpts: ['-DmonitorActiveRules=true'], env: { LTJS_MONITOR_ACTIVE_RULES: '1' }, requests: reqs });
}

// ---- concurrent clients: per-request results equal to sequential ones
{
  const T = [
    ['en-US', 'This is a test,, ok. The the cat sat on teh mat.'], ['en-US', 'He go to school every days.'], ['en-GB', 'Colour and color,, both fine.'], ['en-US', 'I has a apple.'],
    ['fr', 'Ceci est un test,, ok. Le le chat dort.'], ['fr', 'Il a dit (bonjour.'], ['de-DE', 'Das ist ein Test,, ok. Das das ist falsch.'], ['de-DE', 'Er sagte (hallo.'],
    ['en-US', 'Café naïve façade,, résumé.'], ['en-US', 'Fine sentence without errors.'], ['en-US', 'Emoji \u{1F600} and a,, comma.'], ['de-DE', 'Grüße aus München,, äöü.'],
  ];
  const seq = () => T.map(([l, t]) => chk(t, { language: l }));
  write('concurrent-equal', 'the same 12 requests sequentially, concurrently (sorted multiset) and staggered 20 ms apart (request order): per-request results must be equal', {
    requests: [...seq(), par(seq()), par(seq(), 20)],
  });
  write('concurrent-cached', 'same as concurrent-equal with pipelineCaching and result cache', {
    ...cfg({ pipelineCaching: 'true', maxPipelinePoolSize: 3, cacheSize: 200 }),
    requests: [...seq(), par(seq()), par(seq(), 20)],
  });
}

// ---- harness ops: package-private classes (UserLimits, LimitEnforcementMode, PipelineSettings, PipelinePool, LtThreadPoolFactory)
{
  const lim = { maxTextLength: 40, maxTextLengthAnonymous: 30, maxTextLengthLoggedIn: 50, maxTextLengthPremium: 60, maxCheckTimeMillis: 100, maxCheckTimeMillisAnonymous: 3, maxCheckTimeMillisLoggedIn: 5, maxCheckTimeMillisPremium: 7, requestLimitWhitelistUsers: 'a@b.com, example.org' };
  const cases = (direct) => ['a@b.com', 'x@example.org', 'example.org', '', 'z@z.com', 'A@B.com', 'a@b.com ', 'user@sub.example.org', '@example.org', 'a@b.com@example.org'].map((u) => ({ ...(direct ? { direct } : {}), params: { username: u, apiKey: 'k' } }));
  writeHarness('harness-user-limits', 'UserLimits: defaults, whitelist fallback (private method, reflection), parameter validation of ServerTools.getUserLimits (SRV-0160)', [
    { op: 'exec-user-limits', args: { config: { props: lim }, cases: [{ params: {} }, { params: {} , authHeader: 'Bearer x' }, ...cases(null)] } },
    { op: 'exec-user-limits', args: { config: { props: lim }, cases: cases('whitelist') } },
    { op: 'exec-user-limits', args: { config: { props: { requestLimitWhitelistUsers: '' } }, cases: [{ direct: 'whitelist', params: { username: '' } }, { direct: 'whitelist', params: { username: 'a@b.com' } }, { params: {} }] } },
    { op: 'exec-user-limits', args: { config: { props: { maxTextLength: 10 } }, cases: [{ direct: 'whitelist', params: { username: '' } }, { params: {} }] } },
    { op: 'exec-user-limits', args: { config: { props: { maxTextLengthPremium: 11 }, args: ['--premiumAlways'] }, cases: [{ params: {} }] } },
    { op: 'exec-user-limits', args: { config: { props: { maxTextLength: 12, maxCheckTimeMillisAnonymous: 0 } }, cases: [{ params: {} }, { params: { username: 'u' } }, { params: { apiKey: 'k' } }, { params: { username: 'u', password: 'p' } }, { params: { username: 'u', apiKey: 'k', password: 'p' } }, { params: { password: 'p' } }, { params: { username: 'u', tokenV2: 't' } }] } },
  ]);
  writeHarness('harness-limit-mode', 'LimitEnforcementMode.parse incl. STDERR text for unknown values (SRV-0161)', [{ op: 'exec-limit-mode', args: { values: [null, 0, -1, 1, 2, 3, 4, 100, 2147483647, -2147483648] } }]);
  const S = (o) => o;
  writeHarness('harness-pipeline-settings', 'PipelineSettings equals/hashCode: which request properties make pipelines shareable (SRV-0150)', [{
    op: 'exec-pipeline-settings', args: {
      settings: [
        S({ lang: 'en-US' }), S({ lang: 'en-US' }), S({ lang: 'de-DE' }), S({ lang: 'en-GB' }), S({ lang: 'en-US', motherTongue: 'de-DE' }), S({ lang: 'en-US', motherTongue: 'fr' }),
        S({ lang: 'en-US', query: { disabledRules: ['A'] } }), S({ lang: 'en-US', query: { disabledRules: ['A'] } }), S({ lang: 'en-US', query: { disabledRules: ['B'] } }), S({ lang: 'en-US', query: { enabledRules: ['A'] } }),
        S({ lang: 'en-US', query: { enabledCategories: ['C'] } }), S({ lang: 'en-US', query: { disabledCategories: ['C'] } }), S({ lang: 'en-US', query: { useEnabledOnly: true } }), S({ lang: 'en-US', query: { useQuerySettings: true } }),
        S({ lang: 'en-US', query: { allowIncompleteResults: true } }), S({ lang: 'en-US', query: { enableHiddenRules: true } }), S({ lang: 'en-US', query: { premium: true } }), S({ lang: 'en-US', query: { enableTempOffRules: true } }),
        S({ lang: 'en-US', query: { mode: 'TEXTLEVEL_ONLY' } }), S({ lang: 'en-US', query: { mode: 'ALL_BUT_TEXTLEVEL_ONLY' } }), S({ lang: 'en-US', query: { level: 'PICKY' } }), S({ lang: 'en-US', query: { callback: 'cb' } }), S({ lang: 'en-US', query: { inputLogging: false } }),
        S({ lang: 'en-US', query: { altLanguages: ['de-DE'] } }), S({ lang: 'en-US', query: { altLanguages: ['de-DE'] } }), S({ lang: 'en-US', query: { altLanguages: ['de-DE', 'fr'] } }), S({ lang: 'en-US', query: { altLanguages: ['fr', 'de-DE'] } }),
        S({ lang: 'en-US', user: { words: ['a'] } }), S({ lang: 'en-US', user: { words: ['a'] } }), S({ lang: 'en-US', user: { words: ['b'] } }), S({ lang: 'en-US', user: { premiumUid: 7 } }), S({ lang: 'en-US', user: { premiumUid: 8 } }),
        S({ lang: 'en-US', user: { dictName: 'groups_x' } }), S({ lang: 'en-US', user: { ruleValues: { X: [1] } } }), S({ lang: 'en-US', user: { ruleValues: { X: [1] } } }), S({ lang: 'en-US', user: { filterDictionaryMatches: true } }),
        S({ lang: 'en-US', user: { abTest: ['g'] } }), S({ lang: 'en-US', user: { hidePremiumMatches: true } }), S({ lang: 'en-US', user: { preferredLanguages: ['de', 'en'] } }), S({ lang: 'en-US', user: { preferredLanguages: ['en', 'de'] } }),
        S({ lang: 'en-US', user: { trustedSource: true } }), S({ lang: 'en-US', user: { optInThirdPartyAI: true } }), S({ lang: 'en-US', user: { isPremium: true } }), S({ lang: 'en-US', user: { tokenType: 'TRIAL_TOKEN' } }), S({ lang: 'en-US', user: { maxSpellingSuggestions: 5 } }),
        S({ lang: 'en-US', global: { grammalecteServer: 'http://x' } }), S({ lang: 'en-US', global: { grammalecteServer: 'http://x' } }), S({ lang: 'en-US', global: { grammalecteServer: 'http://y' } }),
      ],
    },
  }]);
  const get1 = (name, settings) => ({ op: 'get', name, settings });
  writeHarness('harness-pipeline-pool', 'PipelinePool: keyed pool, identity of pipelines, frozen pipelines, unmodifiable views, capacity (SRV-0150..0153)', [
    {
      op: 'exec-pipeline-pool', args: {
        config: { props: { pipelineCaching: 'true', maxPipelinePoolSize: 1, pipelineExpireTimeInSeconds: 10 } }, steps: [
          get1('a', { lang: 'en-US' }), { op: 'mutate', name: 'a', method: 'addRule' }, { op: 'mutate', name: 'a', method: 'disableRule' }, { op: 'mutate', name: 'a', method: 'setMaxErrorsPerWordRate' },
          { op: 'mutate', name: 'a', method: 'setCleanOverlappingMatches' }, { op: 'mutate', name: 'a', method: 'enableRuleCategory' }, { op: 'mutate', name: 'a', method: 'addMatchFilter' },
          { op: 'view', name: 'a', method: 'getDisabledRules.add' }, { op: 'view', name: 'a', method: 'getAllRules.clear' }, { op: 'view', name: 'a', method: 'getCategories.clear' }, { op: 'view', name: 'a', method: 'getUnknownWords.clear' },
          { op: 'check', name: 'a', text: 'This is a test,, ok.' }, get1('b', { lang: 'en-US' }), { op: 'return', name: 'a' }, { op: 'return', name: 'b' }, get1('c', { lang: 'en-US' }), get1('d', { lang: 'de-DE' }),
          { op: 'return', name: 'c' }, { op: 'return', name: 'd' }, get1('e', { lang: 'en-US' }), get1('f', { lang: 'de-DE' }), { op: 'return', name: 'e' }, { op: 'return', name: 'f' },
        ],
      },
    },
    {
      op: 'exec-pipeline-pool', args: {
        config: { props: { pipelineCaching: 'true', maxPipelinePoolSize: 3 } }, steps: [
          get1('a', { lang: 'en-US' }), get1('b', { lang: 'en-US' }), get1('c', { lang: 'en-US' }), get1('d', { lang: 'en-US' }), { op: 'return', name: 'b' }, { op: 'return', name: 'a' }, { op: 'return', name: 'c' }, { op: 'return', name: 'd' },
          get1('e', { lang: 'en-US' }), get1('f', { lang: 'en-US' }), get1('g', { lang: 'en-US' }), get1('h', { lang: 'en-US', query: { level: 'PICKY' } }), get1('i', { lang: 'en-US', query: { level: 'PICKY' } }),
          { op: 'return', name: 'h' }, { op: 'return', name: 'e' }, { op: 'return', name: 'e' }, get1('j', { lang: 'en-US', query: { level: 'PICKY' } }), get1('k', { lang: 'en-US', motherTongue: 'de-DE' }),
        ],
      },
    },
    {
      op: 'exec-pipeline-pool', args: {
        config: { props: {} }, steps: [
          get1('a', { lang: 'en-US' }), { op: 'mutate', name: 'a', method: 'addRule' }, { op: 'mutate', name: 'a', method: 'setMaxErrorsPerWordRate' }, { op: 'view', name: 'a', method: 'getDisabledRules.add' },
          { op: 'return', name: 'a' }, get1('b', { lang: 'en-US' }), { op: 'check', name: 'b', text: 'This is a test,, ok.' },
        ],
      },
    },
    {
      op: 'exec-pipeline-pool', args: {
        config: { props: { pipelineCaching: 'true', maxPipelinePoolSize: 2, disabledRuleIds: 'DOUBLE_PUNCTUATION, WHITESPACE_RULE' } }, steps: [
          get1('a', { lang: 'en-US' }), { op: 'check', name: 'a', text: 'This is a test,, ok.  Two spaces.' }, get1('b', { lang: 'en-US', query: { enabledRules: ['DOUBLE_PUNCTUATION'], useQuerySettings: true, useEnabledOnly: true } }), { op: 'check', name: 'b', text: 'This is a test,, ok.' },
          get1('c', { lang: 'en-US', query: { disabledRules: ['COMMA_PARENTHESIS_WHITESPACE'], useQuerySettings: true } }), { op: 'check', name: 'c', text: 'This is a test,, ok. The the cat.' },
        ],
      },
    },
  ]);
  writeHarness('harness-thread-pool', 'LtThreadPoolFactory: core/max/queue semantics, rejection, queue classes, naming, reuse (CORE-0333)', [
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t1', corePool: 2, maxThreads: 2, queue: 1 }, tasks: 5 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t2', corePool: 1, maxThreads: 3, queue: 1 }, tasks: 6 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t3', corePool: 2, maxThreads: 4, queue: 0 }, tasks: 8 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t4', corePool: 1, maxThreads: 2, queue: -1 }, tasks: 4 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t5', maxThreads: 4, queue: 2, short: true }, tasks: 8 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t6', corePool: 1, maxThreads: 1, queue: 3, reuse: true }, tasks: 5 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t7', corePool: 1, maxThreads: 1, queue: 1, reuse: true }, tasks: 2 } },
    { op: 'exec-thread-pool', args: { pool: { identifier: 'ltjs-t8', corePool: 3, maxThreads: 3, queue: 1, keepAlive: 5 }, tasks: 0 } },
  ]);

  // ---- crash mapping with injected faults: a real HTTPServer in the harness JVM, pipeline creation throws inside the check task
  const faults = ['runtime', 'illegalArgument', 'io', 'npe', 'error', 'stackOverflow', 'badRequest', 'textTooLong', 'auth', 'timeout', 'unavailable', 'pathNotFound', 'errorRate',
    'nestedBadRequest', 'nestedErrorRate', 'nestedTimeout', 'nestedAuth', 'failOnce'];
  const crashReqs = [
    { params: { language: 'en-US', text: 'This is a test.' } }, { params: { language: 'en-US', text: 'This is a test.', inputLogging: 'no' } },
    { params: { language: 'en-US', text: 'This is a test.', allowIncompleteResults: 'true' } }, { params: { language: 'en-US', text: 'Das ist ein Test.', mode: 'textLevelOnly' } },
    { params: { language: 'en-US', text: 'This is a test.' } },
  ];
  writeHarness('harness-crash-server', 'exceptions raised inside the check task (pipeline creation fault injection) mapped to HTTP status/text by the real handler (SRV-0139, SRV-0137)',
    faults.map((fault, i) => ({ op: 'exec-crash-server', args: { config: { props: {}, args: ['--port', String(18360 + i)] }, fault, message: fault === 'runtime' ? 'injected <sentcontent>secret</sentcontent> failure' : 'injected failure', requests: crashReqs } })),
    { normalize: ['identityHash', 'paths', 'buildDate', 'commit'] });
}
