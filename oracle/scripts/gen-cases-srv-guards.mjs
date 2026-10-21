// Generates oracle/cases/X-SRV-GUARDS (inputs only; expected values come from the Java server, F67). Ports: ORACLE_PORT_MIN/MAX=18100/18199.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-GUARDS');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit'];
const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const DE = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,DE_SENTENCE_WHITESPACE,DE_UNPAIRED_QUOTES,GERMAN_WORD_REPEAT_RULE,UNPAIRED_BRACKETS,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const FR = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UNPAIRED_BRACKETS,UNPAIRED_QUOTES,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE,WORD_REPEAT_RULE';
const ONLY = (r) => ({ enabledRules: r, enabledOnly: 'true' });
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const chk = (text, more = {}, lang = 'en-US', rules = EN) => post('/v2/check', { language: lang, text, ...ONLY(rules), ...more });
const ann = (t) => JSON.stringify({ annotation: [{ text: t }] });
const CFG = (txt) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': txt } });
// tiny maxCheckTimeMillis interrupts class initialisation of a cold pipeline (random NoClassDefFoundError later): prewarm the pipelines at startup
const PRE = 'pipelineCaching=true\npipelinePrewarming=true\npreferredLanguages=en-US,de-DE,fr\n';
const TCFG = (txt) => CFG(txt + PRE);
const form = (n, prefix = 'language=en-US&enabledRules=WHITESPACE_RULE&enabledOnly=true&text=') => ({ method: 'POST', path: '/v2/check', body: prefix + 'a'.repeat(Math.max(0, n - prefix.length)), contentType: 'application/x-www-form-urlencoded; charset=utf-8', note: `body ${n} chars` });

function write(name, description, extra) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, stopAfter: true, serverArgs: [], ...extra }, null, 1) + '\n');
}
const TXT = 'This is a test,, ok.';

// ---------- body size guard (SRV-0073) and text limits
for (const [name, hard, sizes] of [
  ['body-hard-50', 50, [100, 480, 499, 500, 501, 520, 3990, 4000, 4001, 4500, 8000, 8001, 12000, 40000]],
  ['body-hard-0', 0, [60, 3999, 4000, 4001, 8000]],
  ['body-hard-1', 1, [60, 4000, 4001, 8001]],
  ['body-hard-2000', 2000, [19000, 20000, 20001, 24000, 24001, 28000, 28001, 40000]],
  ['body-hard-negative', -5, [60, 4001, 9000]],
  ['body-hard-overflow', 214748365, [60, 9000, 40000]],
  ['body-hard-max', 2147483647, [60, 9000]],
]) {
  write(name, `maxTextHardLength=${hard}: body reader stops at ${hard}*10 chars (chunks of 4000); body sizes ${sizes.join(',')}`, {
    ...CFG(`maxTextHardLength=${hard}\n`),
    requests: [...sizes.map((n) => form(n)), get('/v2/check', { language: 'en-US', text: 'x'.repeat(5000), ...ONLY('WHITESPACE_RULE') }), get('/v2/maxtextlength')],
  });
}
write('body-multibyte', 'body reader counts chars, not bytes: umlaut/emoji bodies at the hard-limit threshold (maxTextHardLength=100 -> 1000 chars)', {
  ...CFG('maxTextHardLength=100\n'),
  requests: [
    { method: 'POST', path: '/v2/check', body: 'language=de-DE&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + 'ä'.repeat(4000), contentType: 'application/x-www-form-urlencoded; charset=utf-8' },
    { method: 'POST', path: '/v2/check', body: 'language=de-DE&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + 'ä'.repeat(4100), contentType: 'application/x-www-form-urlencoded; charset=utf-8' },
    { method: 'POST', path: '/v2/check', body: 'language=de-DE&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + '%C3%A4'.repeat(3000), contentType: 'application/x-www-form-urlencoded; charset=utf-8' },
    { method: 'POST', path: '/v2/check', body: 'language=en-US&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + '😀'.repeat(2100), contentType: 'application/x-www-form-urlencoded; charset=utf-8' },
    { method: 'POST', path: '/v2/check', body: 'language=en-US&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + '😀'.repeat(1900), contentType: 'application/x-www-form-urlencoded; charset=utf-8' },
  ],
});
write('body-other-methods', 'body size guard applies to POST only; GET/PUT/DELETE bodies and query are not limited (maxTextHardLength=5)', {
  ...CFG('maxTextHardLength=5\n'),
  requests: [
    { method: 'POST', path: '/v2/check?language=en-US&enabledOnly=true&enabledRules=WHITESPACE_RULE', body: 'text=' + 'a'.repeat(9000), contentType: 'application/x-www-form-urlencoded' },
    { method: 'PUT', path: '/v2/check?language=en-US&text=hello', body: 'a'.repeat(9000), contentType: 'text/plain' },
    { method: 'GET', path: '/v2/check?language=en-US&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + 'a'.repeat(9000) },
    { method: 'POST', path: '/v2/check?language=en-US&enabledOnly=true&enabledRules=WHITESPACE_RULE&text=' + 'a'.repeat(9000), body: '', contentType: 'application/x-www-form-urlencoded' },
    { method: 'POST', path: '/v2/healthcheck', body: 'a'.repeat(9000), contentType: 'text/plain' },
    { method: 'POST', path: '/', body: 'a'.repeat(9000), contentType: 'text/plain' },
    { method: 'POST', path: '/v2/nothing', body: 'a'.repeat(9000), contentType: 'text/plain' },
  ],
});

const LIM = (cfg, reqs, d) => ({ ...CFG(cfg), requests: reqs, description: d });
write('text-limit-20', 'maxTextLength=20: 19/20/21 chars, GET and POST, umlauts, surrogate pairs, data param, maxtextlength endpoint', {
  ...CFG('maxTextLength=20\n'),
  requests: [
    chk('a'.repeat(19)), chk('a'.repeat(20)), chk('a'.repeat(21)), get('/v2/check', { language: 'en-US', text: 'a'.repeat(21), ...ONLY(EN) }),
    chk('ä'.repeat(20)), chk('ä'.repeat(21)), chk('😀'.repeat(10)), chk('😀'.repeat(11)),
    chk('', {}), chk(' '.repeat(21)),
    post('/v2/check', { language: 'en-US', data: ann('a'.repeat(21)), ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'a'.repeat(15) }, { markup: '<b>' }, { text: 'b'.repeat(15) }] }), ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'a'.repeat(5) }, { markup: '<b>'.repeat(30) }, { text: 'b'.repeat(5) }] }), ...ONLY(EN) }),
    get('/v2/maxtextlength'),
    chk('Ein kurzer Satz.', {}, 'de-DE', DE), chk('Une phrase un peu trop longue.', {}, 'fr', FR),
  ],
});
write('text-limit-anonymous', 'maxTextLengthAnonymous overrides maxTextLength; LoggedIn/Premium keys do not affect anonymous requests', {
  ...CFG('maxTextLength=100\nmaxTextLengthAnonymous=10\nmaxTextLengthLoggedIn=5\nmaxTextLengthPremium=3\nmaxTextHardLength=1000\n'),
  requests: [chk('a'.repeat(10)), chk('a'.repeat(11)), chk('a'.repeat(100)), get('/v2/maxtextlength')],
});
write('text-limit-zero', 'maxTextLength=0 and 1: every non-empty text is too long', {
  ...CFG('maxTextLength=0\n'),
  requests: [chk(''), chk('a'), get('/v2/maxtextlength')],
});
write('text-limit-negative', 'maxTextLength=-1: even empty text is too long', {
  ...CFG('maxTextLength=-1\n'),
  requests: [chk(''), chk('a'), get('/v2/maxtextlength')],
});
write('text-limit-premium-always', 'premiumAlways=true in the config: premium limits (maxTextLengthPremium) apply to anonymous requests', {
  ...CFG('premiumAlways=true\nmaxTextLengthAnonymous=10\nmaxTextLengthPremium=30\n'),
  requests: [chk('a'.repeat(10)), chk('a'.repeat(30)), chk('a'.repeat(31)), get('/v2/maxtextlength'), chk(TXT)],
});
write('text-limit-premium-always-false', 'premiumAlways=false / padded true (trimmed) in the config', {
  ...CFG('premiumAlways= false \nmaxTextLengthAnonymous=10\nmaxTextLengthPremium=30\n'),
  requests: [chk('a'.repeat(11)), chk('a'.repeat(10)), chk(TXT)],
});
write('anonymous-prohibited', 'anonymousAccessAllowed=false: anonymous /v2/check -> 403 AuthException text; other endpoints unaffected', {
  ...CFG('anonymousAccessAllowed=false\n'),
  requests: [chk(TXT), get('/v2/check', { language: 'en-US', text: TXT }), get('/v2/maxtextlength'), get('/v2/healthcheck'), get('/'), get('/v2/nothing'),
    chk(TXT, { username: 'u' }), chk(TXT, { apiKey: 'k' }), chk(TXT, { username: 'u', apiKey: 'k' }), chk(TXT, { username: 'u', password: 'p' }), chk(TXT, { username: 'u', apiKey: 'k', password: 'p' }), chk(TXT, { username: 'u', tokenV2: 't' })],
});
write('anonymous-allowed-explicit', 'anonymousAccessAllowed true / TRUE / padded', {
  ...CFG('anonymousAccessAllowed= TRUE \n'),
  requests: [chk(TXT)],
});
write('anonymous-allowed-garbage', 'anonymousAccessAllowed=maybe -> Boolean.valueOf false -> restricted', {
  ...CFG('anonymousAccessAllowed=maybe\n'),
  requests: [chk(TXT)],
});
write('user-params', 'username/apiKey/password/tokenV2 combinations without a database (UserLimits, SRV-0075 mapping)', {
  requests: [chk(TXT, { username: 'u' }), chk(TXT, { apiKey: 'k' }), chk(TXT, { password: 'p' }), chk(TXT, { username: 'u', apiKey: 'k' }), chk(TXT, { username: 'u', password: 'p' }),
    chk(TXT, { username: 'u', apiKey: 'k', password: 'p' }), chk(TXT, { username: 'u', tokenV2: 't' }), chk(TXT, { username: '', apiKey: 'k' }), chk(TXT, { username: 'u', apiKey: '' })],
});

// ---------- timeouts and error rate
const LONG = 'This is a test, that the the checker should handle with some errors. '.repeat(40);
write('timeout-500', 'maxCheckTimeMillis=1: check times out -> 500 text (SRV-0075); maxCheckTimeMillisAnonymous override', {
  ...TCFG('maxCheckTimeMillis=1\n'),
  requests: [chk(LONG), get('/v2/check', { language: 'en-US', text: LONG, ...ONLY(EN) }), chk(''), get('/v2/healthcheck'), get('/v2/maxtextlength')],
});
write('timeout-anonymous-override', 'maxCheckTimeMillis=100000 but maxCheckTimeMillisAnonymous=2: message shows the anonymous limit', {
  ...TCFG('maxCheckTimeMillis=100000\nmaxCheckTimeMillisAnonymous=2\n'),
  requests: [chk(LONG), chk(TXT)],
});
const LONGX = (n) => 'This is a test, that the the checker should handle with some errors. '.repeat(n);
for (const [ms, n] of [[12, 40], [50, 40], [999, 1000], [3, 40], [1500, 2000]]) {
  write(`timeout-fraction-${ms}`, `maxCheckTimeMillisAnonymous=${ms}: seconds formatting (float division) in the 500 message`, { ...TCFG(`maxCheckTimeMillisAnonymous=${ms}\n`), requests: [chk(LONGX(n)), chk(TXT)] });
}
write('timeout-1500', 'maxCheckTimeMillisAnonymous=1 with long fr/de texts', {
  ...TCFG('maxCheckTimeMillisAnonymous=1\n'),
  requests: [chk('Das ist ein Test,, der leider lange dauert und noch viel länger geht. '.repeat(40), {}, 'de-DE', DE), chk('Ceci est un test,, qui dure assez longtemps pour echouer. '.repeat(40), {}, 'fr', FR)],
});
for (const [n, rate, texts] of [
  ['error-rate-low', '0.01', [TXT, 'Fine sentence without errors.', 'This is a test,, ok.. And and more,, wrong..']],
  ['error-rate-half', '0.5', [TXT, 'Hello ,world and good-bye !', 'ok']],
  ['error-rate-one', '1', [TXT, 'a ,, b ,, c ,, d']],
  ['error-rate-zero', '0', [TXT]],
  ['error-rate-negative', '-1', [TXT, 'Fine sentence without errors.']],
  ['error-rate-exp', '1e-3', [TXT, 'Fine sentence without errors.']],
]) {
  write(n, `maxErrorsPerWordRate=${rate}: ErrorRateTooHighException -> 400 (SRV-0044, SRV-0075)`, {
    ...CFG(`maxErrorsPerWordRate=${rate}\n`),
    requests: texts.flatMap((t) => [chk(t), get('/v2/check', { language: 'en-US', text: t, ...ONLY(EN) })]),
  });
}
write('error-rate-de-fr', 'maxErrorsPerWordRate=0.01 in de and fr', {
  ...CFG('maxErrorsPerWordRate=0.01\n'),
  requests: [chk('Das ist ein Test,, ok.', {}, 'de-DE', DE), chk('Ceci est un test,, ok.', {}, 'fr', FR), chk('Ein korrekter Satz ohne Fehler.', {}, 'de-DE', DE)],
});

// ---------- referrers (SRV-0082, SRV-0046)
const REFS = ['http://example.com', 'https://example.com/page', 'https://www.example.com/x?y=1', 'http://www.example.com', 'example.com/path', 'http://sub.example.com', 'http://example.org', 'http://example.com.evil.net',
  'http://notexample.com', 'HTTP://example.com', 'ftp://example.com', 'http://spam.org/a', 'https://www.spam.org', 'spam.org', '', 'http://other.net'];
write('referrer-blocked', 'blockedReferrers=example.com,spam.org: Referer header matches (SRV-0082)', {
  ...CFG('blockedReferrers=example.com,spam.org\n'),
  requests: [...REFS.map((r) => ({ ...chk(TXT), headers: { Referer: r } })), { ...get('/v2/maxtextlength'), headers: { Referer: 'http://example.com' } }, { ...get('/'), headers: { Referer: 'http://example.com' } },
    { ...get('/v2/nothing'), headers: { Referer: 'http://spam.org' } }, { ...get('/v2/healthcheck'), headers: { Referer: 'http://example.com' } }, { method: 'HEAD', path: '/v2/healthcheck', headers: { Referer: 'http://example.com' } }, chk(TXT)],
});
write('referrer-origin', 'blockedReferrers: Origin header is checked when Referer does not match (referrer first)', {
  ...CFG('blockedReferrers=example.com,spam.org\n'),
  requests: [...REFS.map((r) => ({ ...chk(TXT), headers: { Origin: r } })), { ...chk(TXT), headers: { Referer: 'http://example.com', Origin: 'http://spam.org' } }, { ...chk(TXT), headers: { Referer: 'http://other.net', Origin: 'http://spam.org' } },
    { ...chk(TXT), headers: { Referer: 'http://spam.org', Origin: 'http://example.com' } }],
});
write('referrer-list-format', 'blockedReferrers with spaces after commas, trailing comma, empty entries, whole-config single entry, regex split ",\\s*"', {
  ...CFG('blockedReferrers=a.com,   b.com ,c.com,,d.com,\n'),
  requests: ['http://a.com', 'http://b.com', 'http://b.com ', ' b.com', 'http://c.com', 'http://d.com', 'http://x.com', ''].map((r) => ({ ...chk(TXT), headers: { Referer: r } })),
});
write('referrer-empty', 'blockedReferrers= (empty): nothing blocked', {
  ...CFG('blockedReferrers=\n'),
  requests: [{ ...chk(TXT), headers: { Referer: 'http://example.com' } }, { ...chk(TXT), headers: { Origin: 'http://example.com' } }],
});
write('referrer-allow-origin', 'blocked referrer error carries Access-Control-Allow-Origin when configured', {
  serverArgs: ['--allow-origin', 'https://my-site.example', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'blockedReferrers=example.com\n' },
  requests: [{ ...chk(TXT), headers: { Referer: 'http://example.com' } }, chk(TXT)],
});
write('referrer-default', 'default config (no blocked referrers): Referer/Origin ignored', {
  requests: [{ ...chk(TXT), headers: { Referer: 'http://example.com' } }, { ...chk(TXT), headers: { Origin: 'http://example.com' } }],
});

// ---------- IP allow-list (SRV-0083); 127.0.0.2 is a loopback source address that is not in the allowed set
const LA = (r, a = '127.0.0.2') => ({ ...r, localAddress: a });
write('allowlist-denied', 'non-public server: source 127.0.0.2 denied with 403 on all paths; 127.0.0.1 allowed (SRV-0083)', {
  requests: [LA(chk(TXT)), LA(get('/v2/check', { language: 'en-US', text: TXT, ...ONLY(EN) })), LA(get('/')), LA(get('/v2/maxtextlength')), LA(get('/v2/nothing')), LA(get('/favicon.ico')), LA(get('/x/v2/check')), LA(get('/v2/healthcheck')),
    LA({ method: 'HEAD', path: '/v2/healthcheck' }), LA(chk(TXT), '127.0.0.3'), LA(chk(TXT), '127.0.0.1'), chk(TXT)],
});
write('allowlist-public', '--public: any source address is allowed', {
  serverArgs: ['--public'],
  requests: [LA(chk(TXT)), LA(get('/v2/maxtextlength')), LA(get('/')), chk(TXT)],
});
write('allowlist-allow-origin', 'denied access error carries Access-Control-Allow-Origin', {
  serverArgs: ['--allow-origin'],
  requests: [LA(chk(TXT)), chk(TXT)],
});
write('allowlist-referrer-first', 'blocked referrer (checked first) beats the allow-list; limiter beats the allow-list as well', {
  ...CFG('blockedReferrers=example.com\nrequestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [LA({ ...chk(TXT), headers: { Referer: 'http://example.com' } }), LA(chk(TXT)), LA(chk(TXT)), LA(chk(TXT), '127.0.0.4'), LA(chk(TXT), '127.0.0.4')],
});
write('allowlist-forwarded', 'allow-list uses the socket address, not X-forwarded-for (trustXForwardForHeader=true)', {
  ...CFG('trustXForwardForHeader=true\n'),
  requests: [LA({ ...chk(TXT), headers: { 'X-forwarded-for': '127.0.0.1' } }), { ...chk(TXT), headers: { 'X-forwarded-for': '10.1.2.3' } }],
});
write('allowlist-error-escape', 'denied address text goes through escapeXML (cannot be forced from a socket; recorded for IPv4 only)', {
  requests: [LA(get('/v2/check', { language: 'en-US', text: '&<>"' })), LA(post('/v2/check', { language: 'en-US', text: '&<>"' }))],
});

// ---------- healthcheck (SRV-0081)
write('healthcheck', 'GET/HEAD/POST/PUT/OPTIONS/DELETE /v2/healthcheck, variants of the path, query and body', {
  requests: [get('/v2/healthcheck'), { method: 'HEAD', path: '/v2/healthcheck' }, post('/v2/healthcheck'), { method: 'PUT', path: '/v2/healthcheck', body: 'x' }, { method: 'DELETE', path: '/v2/healthcheck' }, { method: 'OPTIONS', path: '/v2/healthcheck' }, { method: 'PATCH', path: '/v2/healthcheck', body: 'x' },
    get('/v2/healthcheck?x=1'), get('/v2/healthcheck/'), get('/v2/healthcheckx'), get('/v2/Healthcheck'), get('/v2/healthcheck;a=b'), get('/v2//healthcheck'), get('/healthcheck'), get('/v2/healthcheck%2F'), get('/v2/health%63heck'),
    { method: 'head', path: '/v2/healthcheck' }, get('/V2/healthcheck'), get('/v2/healthcheck#frag')],
});
write('healthcheck-bypass', 'healthcheck is answered before the limiter, blocked referrers and the allow-list (SRV-0081..0084)', {
  ...CFG('blockedReferrers=example.com\nrequestLimit=1\nrequestLimitPeriodInSeconds=60\nmaxWorkQueueSize=0\n'),
  requests: [chk(TXT), chk(TXT), get('/v2/healthcheck'), { ...get('/v2/healthcheck'), headers: { Referer: 'http://example.com' } }, LA(get('/v2/healthcheck')), get('/v2/healthcheck'), chk(TXT)],
});
write('healthcheck-allow-origin', 'healthcheck has no Access-Control-Allow-Origin header even when --allow-origin is set', {
  serverArgs: ['--allow-origin', '*'],
  requests: [get('/v2/healthcheck'), { method: 'HEAD', path: '/v2/healthcheck' }, get('/v2/maxtextlength')],
});
write('healthcheck-server-url', 'serverURL prefix: healthcheck below the prefix and without it', {
  ...CFG('serverURL=http://example.com/api\n'),
  requests: [get('/api/v2/healthcheck'), get('/v2/healthcheck'), get('/api/v2/maxtextlength'), get('/v2/maxtextlength'), get('/other/v2/healthcheck')],
});
write('healthcheck-stoppable', '--stoppable server: healthcheck unaffected, /v2/stopx handled as stop prefix', {
  serverArgs: ['--stoppable'],
  requests: [get('/v2/healthcheck'), get('/v2/maxtextlength')],
});

// ---------- work queue (SRV-0087, SRV-0081): one worker thread is held by a POST with an incomplete body
const HC = () => get('/v2/healthcheck');
for (const [n, cfg, probes, d] of [
  ['workqueue-1', 'maxCheckThreads=1\nmaxWorkQueueSize=1\n', [HC(), HC(), HC(), HC()], 'maxWorkQueueSize=1, 4 queued healthchecks'],
  ['workqueue-2', 'maxCheckThreads=1\nmaxWorkQueueSize=2\n', [HC(), HC(), HC(), HC(), HC()], 'maxWorkQueueSize=2, 5 queued healthchecks'],
  ['workqueue-0', 'maxCheckThreads=1\nmaxWorkQueueSize=0\n', [HC(), HC(), HC(), HC()], 'maxWorkQueueSize=0 (unlimited): all answered OK'],
  ['workqueue-big', 'maxCheckThreads=1\nmaxWorkQueueSize=100\n', [HC(), HC(), HC()], 'maxWorkQueueSize=100: all answered OK'],
  ['workqueue-mixed', 'maxCheckThreads=1\nmaxWorkQueueSize=1\n', [HC(), HC(), get('/'), get('/'), get('/v2/nothing')], 'queued healthchecks and non-healthcheck paths (503 texts differ: doubled "Error: ")'],
]) {
  write(n, d, { ...CFG(cfg), requests: [{ hold: { path: '/v2/check', contentLength: 200, sent: 10, holdMs: 500, settleMs: 800, probes }, note: d }, HC(), get('/v2/maxtextlength')] });
}
write('workqueue-allow-origin', '503 error carries Access-Control-Allow-Origin', {
  serverArgs: ['--allow-origin', '*', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'maxCheckThreads=1\nmaxWorkQueueSize=1\n' },
  requests: [{ hold: { path: '/v2/check', contentLength: 200, sent: 10, holdMs: 500, settleMs: 800, probes: [HC(), HC(), get('/')] } }],
});

// ---------- X-forwarded-for (SRV-0079) and request limiter (SRV-0084, SRV-0085)
const RL = (extra = '') => CFG(`requestLimit=2\nrequestLimitPeriodInSeconds=60\n${extra}`);
const XF = (r, v, name = 'X-forwarded-for') => ({ ...r, headers: { ...(r.headers ?? {}), [name]: v } });
write('forwarded-trusted', 'trustXForwardForHeader=true, requestLimit=2: limits count per forwarded address; message shows it', {
  ...RL('trustXForwardForHeader=true\n'),
  requests: [XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.2'), XF(chk(TXT), '10.0.0.2'), XF(chk(TXT), '10.0.0.2'), chk(TXT), chk(TXT), chk(TXT),
    XF(chk(TXT), '10.0.0.1'), XF(get('/v2/maxtextlength'), '10.0.0.2')],
});
write('forwarded-untrusted', 'trustXForwardForHeader=false (default): header ignored, all requests count for 127.0.0.1', {
  ...RL(),
  requests: [XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.2'), XF(chk(TXT), '10.0.0.3'), chk(TXT)],
});
write('forwarded-formats', 'X-forwarded-for forms: header case, list value (whole header string), IPv6, empty, spaces, unicode', {
  ...RL('trustXForwardForHeader=true\nipFingerprintFactor=0\n'),
  requests: [XF(chk(TXT), '1.2.3.4, 5.6.7.8'), XF(chk(TXT), '1.2.3.4, 5.6.7.8'), XF(chk(TXT), '1.2.3.4, 5.6.7.8'), XF(chk(TXT), '1.2.3.4'), XF(chk(TXT), '::1'), XF(chk(TXT), '::1'), XF(chk(TXT), '::1'),
    XF(chk(TXT), 'a b'), XF(chk(TXT), 'a b'), XF(chk(TXT), 'a b'), XF(chk(TXT), 'x', 'x-FORWARDED-for'), XF(chk(TXT), 'x', 'X-Forwarded-For'), XF(chk(TXT), 'x', 'x-forwarded-for'),
    XF(chk(TXT), 'host.example'), XF(chk(TXT), 'host.example'), XF(chk(TXT), 'host.example'), XF(chk(TXT), ' pad '), XF(chk(TXT), ' pad '), XF(chk(TXT), ' pad ')],
});
write('forwarded-empty', 'X-forwarded-for with an empty value, trusted', {
  ...RL('trustXForwardForHeader=true\n'),
  requests: [XF(chk(TXT), ''), XF(chk(TXT), ''), XF(chk(TXT), ''), chk(TXT)],
});
write('forwarded-error-limiter', 'forwarded address in the timeout limiter message (timeoutRequestLimit=1)', {
  ...TCFG('trustXForwardForHeader=true\nmaxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [XF(chk(LONG), '10.9.9.9'), XF(chk(LONG), '10.9.9.9'), XF(chk(LONG), '10.9.9.9'), XF(chk(LONG), '10.9.9.8'), chk(LONG), chk(LONG)],
});
write('forwarded-limit-skip-token', 'forwarded + access token: limit skipped with the token', {
  ...RL('trustXForwardForHeader=true\nrequestLimitAccessToken=sekrit\n'),
  requests: [XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.1'), XF(chk(TXT), '10.0.0.1'), { ...XF(chk(TXT), '10.0.0.1'), headers: { 'X-forwarded-for': '10.0.0.1', 'X-Request-Limit-Access-Token': 'sekrit' } }],
});

write('limit-count', 'requestLimit=2 per 60 s: third request from the same IP -> 429 text; GET and POST, other endpoints count too (SRV-0084)', {
  ...RL(),
  requests: [chk(TXT), get('/v2/check', { language: 'en-US', text: TXT, ...ONLY(EN) }), chk(TXT), get('/v2/maxtextlength'), get('/'), get('/v2/nothing'), get('/v2/healthcheck'), chk(TXT)],
});
write('limit-count-one', 'requestLimit=1', { ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\n'), requests: [chk(TXT), chk(TXT), chk(TXT)] });
write('limit-period-expiry', 'requestLimit=2 per 2 s: allowed again after the period', {
  ...CFG('requestLimit=2\nrequestLimitPeriodInSeconds=2\n'),
  requests: [chk(TXT), chk(TXT), chk(TXT), { sleep: 3000 }, chk(TXT), chk(TXT), chk(TXT)],
});
write('limit-needs-period', 'requestLimit without requestLimitPeriodInSeconds (0): limiter off', { ...CFG('requestLimit=1\n'), requests: [chk(TXT), chk(TXT), chk(TXT)] });
write('limit-needs-limit', 'period without limits: limiter off', { ...CFG('requestLimitPeriodInSeconds=60\n'), requests: [chk(TXT), chk(TXT), chk(TXT)] });
write('limit-negative', 'negative requestLimit / period: limiter off', { ...CFG('requestLimit=-1\nrequestLimitPeriodInSeconds=60\n'), requests: [chk(TXT), chk(TXT), chk(TXT)] });
write('limit-negative-period', 'negative period: limiter off', { ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=-60\n'), requests: [chk(TXT), chk(TXT), chk(TXT)] });
write('limit-bytes', 'requestLimitInBytes=50 per 60 s: aggregated text sizes (SRV-0085)', {
  ...CFG('requestLimitInBytes=50\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('a'.repeat(20)), chk('a'.repeat(20)), chk('a'.repeat(20)), chk('a'), get('/v2/maxtextlength'), chk('b'.repeat(40))],
});
write('limit-bytes-only-first-big', 'requestLimitInBytes=50: a single request above the limit is counted and blocked on its own', {
  ...CFG('requestLimitInBytes=50\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('a'.repeat(51)), chk('a'), chk('a')],
});
write('limit-bytes-data', 'requestLimitInBytes with the data parameter (size of data JSON) and body without text', {
  ...CFG('requestLimitInBytes=60\nrequestLimitPeriodInSeconds=60\n'),
  requests: [post('/v2/check', { language: 'en-US', data: ann('a'.repeat(20)), ...ONLY(EN) }), post('/v2/check', { language: 'en-US', data: ann('a'.repeat(20)), ...ONLY(EN) }), chk('a'), get('/v2/maxtextlength')],
});
write('limit-bytes-textlevel', 'mode=textLevelOnly counts 10% of the size (float to int truncation in +=), mode=all full size', {
  ...CFG('requestLimitInBytes=50\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }),
    chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a'.repeat(100), { mode: 'textLevelOnly' }), chk('a', { mode: 'all' }), chk('a', { mode: 'allButTextLevelOnly' })],
});
write('limit-bytes-textlevel-small', 'textLevelOnly with sizes 9 and 19 (0.1 weighting truncates to 0 / 1)', {
  ...CFG('requestLimitInBytes=2\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('a'.repeat(9), { mode: 'textLevelOnly' }), chk('a'.repeat(9), { mode: 'textLevelOnly' }), chk('a'.repeat(9), { mode: 'textLevelOnly' }), chk('a'.repeat(19), { mode: 'textLevelOnly' }), chk('a'.repeat(19), { mode: 'textLevelOnly' })],
});
write('limit-both', 'requestLimit and requestLimitInBytes together: count limit first (checks in event loop order)', {
  ...CFG('requestLimit=3\nrequestLimitInBytes=30\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('a'.repeat(15)), chk('a'.repeat(15)), chk('a'.repeat(15)), chk('a'), chk('a')],
});
write('limit-skip-token', 'requestLimitAccessToken: header X-Request-Limit-Access-Token skips the limiter (and the timeout limiter)', {
  ...RL('requestLimitAccessToken=sekrit\n'),
  requests: [chk(TXT), chk(TXT), chk(TXT), { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'sekrit' } }, { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'wrong' } }, { ...chk(TXT), headers: { 'x-request-limit-access-token': 'sekrit' } },
    { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': '' } }, { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'sekrit ' } }, { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'SEKRIT' } }],
});
write('limit-no-token-config', 'X-Request-Limit-Access-Token sent but requestLimitAccessToken not configured', {
  ...RL(),
  requests: [chk(TXT), chk(TXT), { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'sekrit' } }, { ...chk(TXT), headers: { 'X-Request-Limit-Access-Token': 'null' } }],
});
write('limit-refresh-user-path', 'path ending in admin/refreshUser is not rate limited', {
  ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk(TXT), chk(TXT), get('/v2/admin/refreshUser'), get('/v2/admin/refreshUser'), get('/v2/xadmin/refreshUser'), post('/v2/admin/refreshUser'), chk(TXT)],
});
write('limit-fingerprint', 'ipFingerprintFactor=1/2/3/0: per-IP limit = requestLimit*factor; fingerprint = User-Agent|Accept-Language|Referer|textSessionId (SRV-0085)', {
  ...CFG('requestLimit=2\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=2\n'),
  requests: ['A', 'A', 'B', 'B', 'C', 'D', 'A', 'B'].map((u) => ({ ...chk(TXT), headers: { 'User-Agent': u } })),
});
write('limit-fingerprint-1', 'ipFingerprintFactor=1: fingerprint limit equals ip limit', {
  ...CFG('requestLimit=2\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=1\n'),
  requests: ['A', 'B', 'C', 'D'].map((u) => ({ ...chk(TXT), headers: { 'User-Agent': u } })),
});
write('limit-fingerprint-0', 'ipFingerprintFactor=0: fingerprinting disabled, ip limit = requestLimit', {
  ...CFG('requestLimit=2\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=0\n'),
  requests: ['A', 'B', 'C', 'D'].map((u) => ({ ...chk(TXT), headers: { 'User-Agent': u } })),
});
write('limit-fingerprint-negative', 'ipFingerprintFactor=-3', {
  ...CFG('requestLimit=2\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=-3\n'),
  requests: ['A', 'B', 'C', 'D'].map((u) => ({ ...chk(TXT), headers: { 'User-Agent': u } })),
});
write('limit-fingerprint-fields', 'fingerprint parts: Accept-Language, Referer, textSessionId distinguish clients behind one IP (factor 3)', {
  ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=3\n'),
  requests: [{ ...chk(TXT), headers: { 'Accept-Language': 'de' } }, { ...chk(TXT), headers: { 'Accept-Language': 'fr' } }, { ...chk(TXT, { textSessionId: 's1' }) }, { ...chk(TXT, { textSessionId: 's2' }) }, { ...chk(TXT), headers: { Referer: 'http://r.example' } },
    { ...chk(TXT), headers: { 'Accept-Language': 'de' } }, chk(TXT, { textSessionId: 's1' }), chk(TXT)],
});
write('limit-whitelist', 'requestLimitWhitelistUsers/Limit with username param (needs DB lookups: records what a DB-less server answers)', {
  ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\nrequestLimitWhitelistUsers=alice, bob\nrequestLimitWhitelistLimit=3\n'),
  requests: [chk(TXT, { username: 'alice' }), chk(TXT, { username: 'alice', apiKey: 'k' }), chk(TXT, { username: 'carol', apiKey: 'k' }), chk(TXT), chk(TXT)],
});
write('limit-allow-origin', '429 error carries Access-Control-Allow-Origin', {
  serverArgs: ['--allow-origin', '*', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'requestLimit=1\nrequestLimitPeriodInSeconds=60\n' },
  requests: [chk(TXT), chk(TXT)],
});
write('limit-ip-separate', 'limits are per source address: 127.0.0.2 and 127.0.0.1 counted separately (127.0.0.2 gets 403 after the limiter passes)', {
  ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk(TXT), LA(chk(TXT)), LA(chk(TXT)), chk(TXT), LA(chk(TXT), '127.0.0.5')],
});
write('limit-public-ips', '--public with several source addresses: each has its own budget', {
  serverArgs: ['--public', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'requestLimit=1\nrequestLimitPeriodInSeconds=60\n' },
  requests: [chk(TXT), LA(chk(TXT)), LA(chk(TXT)), chk(TXT), LA(chk(TXT), '127.0.0.5'), LA(chk(TXT), '127.0.0.5')],
});
write('limit-de-fr', 'limiter with de and fr texts', {
  ...CFG('requestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('Das ist ein Test,, ok.', {}, 'de-DE', DE), chk('Ceci est un test,, ok.', {}, 'fr', FR), chk(TXT)],
});
write('limit-big', 'requestLimit=2147483647 (ipRequestLimit overflow *factor), factor 2', {
  ...CFG('requestLimit=2147483647\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=2\n'),
  requests: [chk(TXT), chk(TXT), chk(TXT)],
});
write('limit-big-bytes', 'requestLimitInBytes=2147483647 with factor 2 (overflow to negative ipRequestLimitInBytes)', {
  ...CFG('requestLimitInBytes=2147483647\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=2\n'),
  requests: [chk(TXT), chk(TXT), chk(TXT)],
});

// ---------- error (timeout) limiter (SRV-0086)
const EL = (extra = '') => TCFG(`maxCheckTimeMillis=1\ntimeoutRequestLimit=2\nrequestLimitPeriodInSeconds=60\n${extra}`);
write('errlimit-basic', 'timeoutRequestLimit=2: after 3 timeouts the IP gets 429 "too many recent timeouts" with text size (SRV-0086)', {
  ...EL(),
  requests: [chk(LONG), chk(LONG), chk(LONG), chk(LONG), chk(TXT), get('/v2/check', { language: 'en-US', text: LONG, ...ONLY(EN) }), get('/v2/maxtextlength'), get('/v2/healthcheck'), get('/')],
});
write('errlimit-data', 'timeout limiter message shows "Data size" for the data parameter', {
  ...EL(),
  requests: [post('/v2/check', { language: 'en-US', data: ann(LONG), ...ONLY(EN) }), post('/v2/check', { language: 'en-US', data: ann(LONG), ...ONLY(EN) }), post('/v2/check', { language: 'en-US', data: ann(LONG), ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: ann(LONG), ...ONLY(EN) }), post('/v2/check', { language: 'en-US', ...ONLY(EN) }), get('/')],
});
write('errlimit-skip-token', 'requestLimitAccessToken also skips the timeout limiter', {
  ...EL('requestLimitAccessToken=sekrit\n'),
  requests: [chk(LONG), chk(LONG), chk(LONG), chk(LONG), { ...chk(LONG), headers: { 'X-Request-Limit-Access-Token': 'sekrit' } }, chk(LONG)],
});
write('errlimit-one', 'timeoutRequestLimit=1', { ...TCFG('maxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimitPeriodInSeconds=60\n'), requests: [chk(LONG), chk(LONG), chk(LONG)] });
write('errlimit-period-expiry', 'timeout limit period 2 s: allowed again after the period', {
  ...TCFG('maxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimitPeriodInSeconds=2\n'),
  requests: [chk(LONG), chk(LONG), chk(LONG), { sleep: 3000 }, chk(LONG), chk(LONG)],
});
write('errlimit-no-period', 'timeoutRequestLimit without period: limiter off', { ...TCFG('maxCheckTimeMillis=1\ntimeoutRequestLimit=1\n'), requests: [chk(LONG), chk(LONG), chk(LONG)] });
write('errlimit-with-request-limit', 'both limiters: request limit 429 text vs timeout limit 429 text', {
  ...TCFG('maxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimit=4\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk(LONG), chk(LONG), chk(LONG), chk(LONG), chk(LONG), chk(LONG)],
});
write('errlimit-allow-origin', '429 timeout error carries Access-Control-Allow-Origin', {
  serverArgs: ['--allow-origin', 'https://x.example', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'maxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimitPeriodInSeconds=60\n' + PRE },
  requests: [chk(LONG), chk(LONG), chk(LONG)],
});
write('errlimit-de-fr', 'timeout limiter with de/fr texts', {
  ...TCFG('maxCheckTimeMillis=1\ntimeoutRequestLimit=1\nrequestLimitPeriodInSeconds=60\n'),
  requests: [chk('Das ist ein Test,, der leider lange dauert und noch viel länger geht. '.repeat(40), {}, 'de-DE', DE), chk('Das ist ein Test,, der leider lange dauert und noch viel länger geht. '.repeat(40), {}, 'de-DE', DE), chk('Ceci est un test,, qui dure assez longtemps. '.repeat(40), {}, 'fr', FR), chk('Ceci est un test,, qui dure assez longtemps. '.repeat(40), {}, 'fr', FR)],
});

// ---------- error mapping (SRV-0075, SRV-0076, SRV-0078)
const ERRS = [
  chk(TXT), get('/v2/check'), get('/v2/check', { language: 'en-US' }), get('/v2/check', { text: TXT }), get('/v2/check', { language: 'xx-ZZ', text: TXT }), get('/v2/check', { language: 'en-US', text: TXT, mode: 'bogus' }),
  get('/v2/check', { language: 'en-US', text: TXT, level: 'bogus' }), get('/v2/check', { language: 'en-US', text: TXT, data: '{"text":"x"}' }), get('/v2/check', { language: 'en-US', data: '{"annotation":[' }), get('/v2/check', { language: 'en-US', data: '[]' }),
  get('/v2/check', { language: 'auto', text: '' }), get('/v2/check', { language: 'en-US', text: TXT, motherTongue: 'zz-ZZ' }), get('/v2/check', { language: 'en-US', text: TXT, preferredVariants: 'xx' }), get('/v2/check', { language: 'en-US', text: TXT, enabledRules: 'A', enabledOnly: 'true' }),
  get('/v2/nothing'), get('/v2/'), get('/v2'), get('/v2/words/add'), get('/v2/admin/refreshUser'), get('/Languages'), get('/x/Languages'), get('/'), get('/v2/x/v2/check'), get('/x/v2/check'), get('/favicon.ico'), get('/robots.txt'), get('/index.html'), get('/v1/check'),
  get('/v2/check', { language: 'en-US', text: TXT, username: 'u' }), get('/v2/check', { language: 'en-US', text: TXT, apiKey: 'k' }), get('/v2/check', { language: 'en-US', text: TXT, password: 'p' }),
  { method: 'PUT', path: '/v2/check', body: 'x' }, { method: 'DELETE', path: '/v2/check' }, { method: 'HEAD', path: '/v2/check' }, { method: 'OPTIONS', path: '/v2/check' },
  { ...get('/v2/languages', { x: '%' }), languagesList: true }, { method: 'GET', path: '/v2/check?text=%ZZ&language=en-US' }, { method: 'GET', path: '/v2/check?language=en-US&text=%E0%A4%A' }, { method: 'POST', path: '/v2/check', body: 'language=en-US&text=%', contentType: 'application/x-www-form-urlencoded' },
];
write('error-mapping', 'error status/body mapping for BadRequest, PathNotFound, old API, root, method errors (SRV-0075/0076/0078)', { requests: ERRS });
write('error-mapping-allow-origin', 'same errors with --allow-origin: Access-Control-Allow-Origin is set on every sendError (SRV-0078)', { serverArgs: ['--allow-origin', '*'], requests: ERRS });
write('error-mapping-allow-origin-url', 'same errors with --allow-origin URL', { serverArgs: ['--allow-origin', 'https://my-website.org'], requests: ERRS.slice(0, 20) });
write('error-no-content-type', 'sendError sends no Content-Type: record contentType for errors', {
  requests: [get('/v2/check'), get('/v2/nothing'), get('/'), get('/favicon.ico'), { ...chk(TXT), recordHeaders: ['content-type', 'content-length'] }, { ...get('/v2/nothing'), recordHeaders: ['content-type', 'content-length', 'access-control-allow-origin'] }, { ...get('/v2/healthcheck'), recordHeaders: ['content-type', 'content-length'] }],
});
write('error-umlaut-text', 'error texts with non-ASCII characters (utf-8 length in Content-Length): language code and path with umlauts', {
  requests: [get('/v2/check', { language: 'äö-ÜÖ', text: TXT }), get('/v2/nöthing'), get('/v2/check', { language: 'en-US', text: TXT, mode: 'äöü' }), get('/v2/check', { language: 'en-US', text: TXT, level: '😀' }), get('/v2/check', { language: '😀', text: TXT })],
});
write('error-verbose', '-v / --verbose does not change responses (logging only)', { serverArgs: ['--verbose'], requests: [get('/v2/check'), get('/v2/nothing'), chk(TXT)] });
write('error-verbose-short', '-v', { serverArgs: ['-v'], requests: [get('/v2/check'), chk(TXT)] });
write('error-not-log-ip', '--notLogIP does not change responses', { serverArgs: ['--notLogIP'], requests: [get('/v2/check'), chk(TXT)] });
write('error-log-ip-pattern', '--logIpMatchingPattern X does not change responses', { serverArgs: ['--logIpMatchingPattern', 'XYZ'], requests: [get('/v2/check'), chk(TXT)] });

// ---------- Basic auth on /v2/users/me (SRV-0106)
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const AUTH = (h, params) => ({ method: 'GET', path: '/v2/users/me', ...(params ? { params } : {}), headers: { Authorization: h } });
write('basic-auth', 'GET /v2/users/me: Basic Authentication parsing, AuthException -> 403 text (SRV-0106, SRV-0075); no database configured', {
  requests: [get('/v2/users/me'), AUTH(''), AUTH('Basic'), AUTH('Basic '), AUTH('basic ' + b64('u:p')), AUTH('Bearer abc'), AUTH('Basic ' + b64('u:p')), AUTH('Basic ' + b64(':p')), AUTH('Basic ' + b64('u:')), AUTH('Basic ' + b64(' :p')), AUTH('Basic ' + b64('u: ')),
    AUTH('Basic ' + b64('u')), AUTH('Basic ' + b64('')), AUTH('Basic ' + b64('u:p:q')), AUTH('Basic ' + b64('ü:ö')), AUTH('Basic !!!'), AUTH('Basic ' + b64('u:p').replace(/=+$/, '')), AUTH('Basic  ' + b64('u:p')), AUTH('Basic ' + b64('u:p') + ' '),
    AUTH('Basic ' + b64('u:p'), { authMethod: 'password' }), AUTH('Basic ' + b64('u:p'), { authMethod: 'apiKey' }), AUTH('Basic ' + b64('u:p'), { authMethod: 'addonToken' }), AUTH('Basic ' + b64('u:p'), { authMethod: 'bogus' }), AUTH('Basic ' + b64('u:p'), { authMethod: '' }),
    AUTH('Bearer abc', { authMethod: 'bogus' }), AUTH('Basic !!!', { authMethod: 'bogus' }),
    { method: 'POST', path: '/v2/users/me', headers: { Authorization: 'Basic ' + b64('u:p') }, body: '' }, { method: 'PUT', path: '/v2/users/me', headers: { Authorization: 'Basic ' + b64('u:p') }, body: 'x' }, { method: 'HEAD', path: '/v2/users/me' }, { method: 'OPTIONS', path: '/v2/users/me' },
    { method: 'OPTIONS', path: '/v2/users/me', headers: { 'Access-Control-Request-Headers': 'authorization, x-custom' }, recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'] },
    { method: 'GET', path: '/v2/users/me', headers: { Authorization: 'Basic ' + b64('u:p') }, recordHeaders: ['content-type'] }],
});
write('basic-auth-allow-origin', 'users/me with --allow-origin: preflight headers', {
  serverArgs: ['--allow-origin', '*'],
  requests: [{ method: 'OPTIONS', path: '/v2/users/me', headers: { 'Access-Control-Request-Headers': 'authorization' }, recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'] }, get('/v2/users/me'), AUTH('Basic !!!')],
});
write('basic-auth-restricted', 'anonymousAccessAllowed=false with users/me', { ...CFG('anonymousAccessAllowed=false\n'), requests: [get('/v2/users/me'), AUTH('Basic ' + b64('u:p'))] });
write('basic-auth-check-header', 'Authorization header sent to /v2/check (JWT path of getUserLimits is not used by check): ignored or rejected', {
  requests: [{ ...chk(TXT), headers: { Authorization: 'Basic ' + b64('u:p') } }, { ...chk(TXT), headers: { Authorization: 'Bearer abc' } }, { ...chk(TXT), headers: { Authorization: '' } }],
});

// ---------- request counter (SRV-0170): recorded in the server log (r:/h: counters); the log is not compared by parity (D-045)
write('request-counter', 'request counter r: and h: in error log lines (log captured to server.log, not compared): 6 requests, 3 of them errors', {
  captureLog: true, isolate: true,
  requests: [chk(TXT), get('/v2/check'), get('/v2/nothing'), chk(TXT), get('/v2/healthcheck'), get('/v2/check', { language: 'zz' })],
});

// ---------- verbose logging of the failing text (SRV-0007): stderr line "Exception was caused by this text (N chars, showing up to 500):" lands in server.log (not compared by parity)
write('verbose-text-log', '-v: an internal error (ruleValues=abc -> IndexOutOfBounds, 500 Internal Error) logs the text on stderr; captured in server.log', {
  serverArgs: ['-v'], captureLog: true, isolate: true,
  requests: [chk('A short text for the error log.', { ruleValues: 'abc' }), chk('x'.repeat(700), { ruleValues: 'abc' }), chk(TXT)],
});
write('verbose-text-log-off', 'without -v the failing text is not logged (server.log recorded)', {
  captureLog: true, isolate: true,
  requests: [chk('A short text for the error log.', { ruleValues: 'abc' }), chk(TXT)],
});

// ---------- 500 Internal Error mapping (SRV-0075/0076): generic exceptions get the "Internal Error: " prefix and the exception message
write('error-internal', 'unexpected exceptions -> 500 "Error: Internal Error: <message>" (ruleValues parsing)', {
  requests: [chk(TXT, { ruleValues: 'abc' }), chk(TXT, { ruleValues: 'A:B:C' }), chk(TXT, { ruleValues: 'A:1' }), chk(TXT, { ruleValues: ':' }), chk(TXT, { ruleValues: 'A:1:B:2' }), chk(TXT, { ruleValues: 'A:1,B' }), chk(TXT, { ruleValues: '' }),
    get('/v2/users/me', undefined, { headers: { Authorization: 'Basic ' + Buffer.from('u:p').toString('base64') } }), chk(TXT, { ruleValues: '😀' })],
});
write('error-internal-allow-origin', 'internal error with --allow-origin carries the CORS header', { serverArgs: ['--allow-origin', '*'], requests: [chk(TXT, { ruleValues: 'abc' })] });
