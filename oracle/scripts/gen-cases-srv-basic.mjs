// Generates oracle/cases/X-SRV-BASIC (inputs only; expected values come from the Java server, F20).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-BASIC');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit'];
const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const FR = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UNPAIRED_BRACKETS,UNPAIRED_QUOTES,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE,WORD_REPEAT_RULE';
const DE = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,DE_SENTENCE_WHITESPACE,DE_UNPAIRED_QUOTES,GERMAN_WORD_REPEAT_RULE,UNPAIRED_BRACKETS,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const ALL = [...new Set([...EN.split(','), ...FR.split(','), ...DE.split(',')])].join(',');
const ONLY = (rules) => ({ enabledRules: rules, enabledOnly: 'true' });
const enc = encodeURIComponent;
const qs = (o) => Object.entries(o).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');

function write(name, description, extra) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, serverArgs: [], ...extra }, null, 1) + '\n');
}
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const de = (r) => ({ ...r, portLater: true });
const dev006 = (r) => ({ ...r, expect: 'dev006' });

const EN_TEXTS = [
  'This is a test,, ok.', 'This is a sentence.. Another one.', 'The the cat sat on the mat.', 'This is a test sentence .Here we go.',
  'This (foo is bad.', 'this starts lowercase. And a double  space.', 'Hello ,world and good-bye !', 'He said "hello.', 'Café naïve façade,, résumé.', 'Fine sentence without errors.',
  'First sentence.Second sentence without space. Third  one.',
];
const FR_TEXTS = ['Ceci est un test,, ok.', 'Le le chat dort.', 'Il dit (bonjour.', 'ceci commence en minuscule. Et voilà !', 'Une phrase correcte sans erreur.', 'Il a dit « bonjour. Puis il est parti.'];
const DE_TEXTS = ['Das ist ein Test,, ok.', 'Das das ist falsch.', 'Er sagte (hallo.', 'das ist klein. Und noch  einer.', 'Ein korrekter Satz ohne Fehler.', 'Grüße aus München,, äöü.'];

// 1. check basics: GET and POST per language
{
  const reqs = [];
  for (const t of EN_TEXTS) { reqs.push(get('/v2/check', { language: 'en-US', text: t, ...ONLY(EN) })); reqs.push(post('/v2/check', { language: 'en-US', text: t, ...ONLY(EN) })); }
  reqs.push(post('/v2/check', { language: 'en', text: EN_TEXTS[0], ...ONLY(EN) }));
  reqs.push(post('/v2/check', { language: 'en-GB', text: EN_TEXTS[0], ...ONLY(EN) }));
  reqs.push(post('/v2/check', { language: 'en-US', text: EN_TEXTS[0], ...ONLY(EN), c: '1' }));
  reqs.push(post('/v2/check', { language: 'en-US', text: '', ...ONLY(EN) }));
  reqs.push(post('/v2/check', { language: 'en-US', text: ' ', ...ONLY(EN) }));
  reqs.push(post('/v2/check', { language: 'en-US', text: EN_TEXTS[0], enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' }));
  reqs.push(post('/v2/check', { language: 'en-US', text: EN_TEXTS[0], disabledRules: 'DOUBLE_PUNCTUATION', ...ONLY(EN) }));
  write('check-en', 'GET/POST /v2/check en-US, F16 core rules (enabledOnly)', { requests: reqs });
}
{
  const reqs = [];
  for (const t of FR_TEXTS) { reqs.push(get('/v2/check', { language: 'fr', text: t, ...ONLY(FR) })); reqs.push(post('/v2/check', { language: 'fr', text: t, ...ONLY(FR) })); }
  reqs.push(post('/v2/check', { language: 'fr-FR', text: FR_TEXTS[0], ...ONLY(FR) }));
  reqs.push(post('/v2/check', { language: 'fr-CA', text: FR_TEXTS[0], ...ONLY(FR) }));
  write('check-fr', 'GET/POST /v2/check fr', { requests: reqs });
}
{
  const reqs = [];
  for (const t of DE_TEXTS) { reqs.push(de(get('/v2/check', { language: 'de-DE', text: t, ...ONLY(DE) }))); reqs.push(de(post('/v2/check', { language: 'de-DE', text: t, ...ONLY(DE) }))); }
  reqs.push(de(post('/v2/check', { language: 'de', text: DE_TEXTS[0], ...ONLY(DE) })));
  reqs.push(de(post('/v2/check', { language: 'de-AT', text: DE_TEXTS[0], ...ONLY(DE) })));
  reqs.push(de(post('/v2/check', { language: 'de-CH', text: DE_TEXTS[0], ...ONLY(DE) })));
  write('check-de', 'GET/POST /v2/check de-DE (port later: German module)', { requests: reqs });
}
// 2. language=auto
{
  const auto = (t, more = {}) => post('/v2/check', { language: 'auto', text: t, ...ONLY(ALL), ...more });
  const reqs = [
    auto('This is a longer english sentence,, that the the detector can handle without any trouble at all.'),
    auto('Ceci est une phrase française assez longue,, que que le détecteur peut reconnaître sans aucun problème.'),
    de(auto('Das ist ein ziemlich langer deutscher Satz,, den den der Detektor ohne Probleme erkennen kann.')),
    auto('This is a longer english sentence,, that the the detector can handle.', { preferredVariants: 'en-GB' }),
    auto('This is a longer english sentence,, that the the detector can handle.', { preferredVariants: 'en-US,de-AT' }),
    auto('This is a longer english sentence,, that the the detector can handle.', { noopLanguages: 'en' }),
    auto('Ok.'),
    auto('1234 5678'),
    auto(''),
    dev006(auto('Esta es una frase española bastante larga,, que que el detector puede reconocer sin problemas.')),
    dev006(auto('Dit is een vrij lange nederlandse zin,, die die de detector zonder problemen kan herkennen.')),
    get('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle.', ...ONLY(ALL) }),
  ];
  write('check-auto', 'language=auto with core rules; detectedLanguage per D-051; out-of-scope winners marked dev006', { requests: reqs });
}
// 3. parameter parsing (SRV-0072)
{
  const E = `enabledRules=${EN}&enabledOnly=true`;
  const reqs = [
    get('/v2/check?language=en-US&text=This+is+a+test%2C%2C+ok.&' + E),
    get('/v2/check?language=en-US&text=This%20is%20a%20test%2C%2C%20ok.&' + E),
    get('/v2/check?language=en-US&text=Caf%C3%A9+na%C3%AFve%2C%2C+ok.&' + E),
    get('/v2/check?language=en-US&text=1%2B1%3D2%2C%2C+and+a+plus%2B+sign.&' + E),
    get('/v2/check?language=en-US&text=Line+one.%0ALine+two%2C%2C+ok.&' + E),
    get('/v2/check?language=en-US&text=This+is+a+test,,+ok.&' + E),
    get('/v2/check?language=en-US&flag&text=This+is+a+test,,+ok.&novalue&' + E),
    get('/v2/check?&&language=en-US&&&text=This+is+a+test,,+ok.&&' + E + '&'),
    get('/v2/check?language=en-US&text=First+text,,+one.&text=Second+text,,+two+two.&' + E),
    get('/v2/check?language=de-DE&language=en-US&text=This+is+a+test,,+ok.&' + E),
    get('/v2/check?language=en-US&text=a=b+test,,+ok.&' + E),
    get('/v2/check?language=en-US&text=&text=This+is+a+test,,+ok.&' + E),
    get('/v2/check?language=en-US&text=This+is+a+test,,+ok.&' + E + '&=empty&extra=1'),
    get('/v2/check?language=en-US&text=100%25+sure,,+ok.&' + E),
    get('/v2/check?language=en-US&text=100%+sure&' + E),
    get('/v2/check?language=en-US&text=%ZZ&' + E),
    get('/v2/check?language=en-US&text=abc%&' + E),
    get('/v2/check?language=en-US&text=abc%4&' + E),
    get('/v2/check?language=en-US&text=%E2%80%A6+trailing+ellipsis,,+ok&' + E),
    get('/v2/check?language=en-US&text=%FF%FE+bad+utf8,,+ok.&' + E),
    get('/v2/check?language=en-US&text=%C3+truncated,,+ok.&' + E),
    get('/v2/check?%ZZ=1&language=en-US&text=x'),
    get('/v2/check?lang%75age=en-US&text=This+is+a+test,,+ok.&' + E),
    get('/v2/check?LANGUAGE=en-US&text=This+is+a+test,,+ok.&' + E),
    // POST variants
    post('/v2/check', { language: 'en-US', text: 'This is a test,, ok.', ...ONLY(EN) }),
    post('/v2/check', null, { body: `language=en-US&text=This+is+a+test%2C%2C+ok.&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=This+is+a+test%2C%2C+ok.&${E}`, contentType: 'text/plain; charset=utf-8' }),
    post('/v2/check', null, { body: `language=en-US&text=This+is+a+test%2C%2C+ok.&${E}`, contentType: 'application/json' }),
    post('/v2/check', null, { body: `language=en-US&text=This+is+a+test%2C%2C+ok.&${E}`, contentType: 'multipart/form-data; boundary=x' }),
    post('/v2/check?text=Query+text,,+wins.', null, { body: `language=en-US&text=Body+text,,+loses.&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check?language=en-US', null, { body: `text=Body+text,,+ok.&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check?language=en-US&' + E, null, { body: 'text=Only+body+text,,+ok.', contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check?language=en-US&' + E, null, { body: 'text=Body%20dup,,+one.&text=Body+dup,,+two+two.', contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=100%+sure&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=%ZZ&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=abc%&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `%ZZ=1&language=en-US&text=x&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `%=1&language=en-US&text=x&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=x&flag&&${E}&=x`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: '', contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: 'justtext', contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=Caf%C3%A9+na%C3%AFve+fa%C3%A7ade,,+ok.&${E}`, contentType: 'application/x-www-form-urlencoded; charset=iso-8859-1' }),
    post('/v2/check', null, { body: `language=en-US&text=Café,,+raw+unicode+body.&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', null, { body: `language=en-US&text=Café raw,, space and %26 amp.&${E}`, contentType: 'application/x-www-form-urlencoded' }),
    post('/v2/check', { language: 'en-US', text: 'Emoji 😀 and ßta,, ok.', ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', text: 'A='.repeat(3) + ' b&c d+e %f,, ok.', ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', text: 'x'.repeat(5000) + ',, end.', ...ONLY(EN) }),
    // data parameter
    post('/v2/check', { language: 'en-US', data: JSON.stringify({ text: 'This is a test,, ok.' }), ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: JSON.stringify({ annotation: [{ text: 'This is ' }, { markup: '<b>' }, { text: 'a test,, ok.' }, { markup: '</b>' }] }), ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: 'not json', ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: '{}', ...ONLY(EN) }),
    post('/v2/check', { language: 'en-US', data: '', ...ONLY(EN) }),
  ];
  write('params', 'parameter parsing: query/body merge, & splitting, URL decoding, invalid escapes, duplicates, data param', { requests: reqs });
}
// 4. validation errors in Java order
{
  const T = 'This is a test,, ok.';
  const lang = (code) => post('/v2/check', { text: T, language: code });
  const reqs = [
    post('/v2/check', {}),
    post('/v2/check', { language: 'en-US' }),
    post('/v2/check', { text: T }),
    post('/v2/check', { text: T, language: '' }),
    post('/v2/check', { text: '', language: '' }),
    post('/v2/check', { text: T, data: '{"text":"x"}' }),
    post('/v2/check', { text: T, data: '{"text":"x"}', language: 'en-US' }),
    post('/v2/check', { text: T, data: '{"text":"x"}', language: 'xx' }),
    post('/v2/check', { language: 'xx' }),
    get('/v2/check'),
    get('/v2/check', { language: 'en-US' }),
    get('/v2/check', { text: T }),
    lang('xx'), lang('XX'), lang('en-XX'), lang('de-XX'), lang('en-US-foo'), lang('EN-us'), lang('en_US'), lang('english'), lang(' en-US'), lang('en-US '), lang('auto-detect'), lang('AUTO'), lang('%'), lang('x'.repeat(300)),
    lang('en'), lang('fr-FR'), lang('de'),
    dev006(lang('es')), dev006(lang('es-ES')), dev006(lang('pt-PT')), dev006(lang('pt')), dev006(lang('ca-ES')), dev006(lang('nl')), dev006(lang('ru-RU')), dev006(lang('ar')), dev006(lang('zh-CN')), dev006(lang('ja-JP')),
    post('/v2/check', { text: T, language: 'en-US', enabled: 'DOUBLE_PUNCTUATION' }),
    post('/v2/check', { text: T, language: 'en-US', disabled: 'DOUBLE_PUNCTUATION' }),
    post('/v2/check', { text: T, language: 'en-US', preferredvariants: 'en-GB' }),
    post('/v2/check', { text: T, language: 'en-US', autodetect: '1' }),
    post('/v2/check', { text: T, language: 'en-US', enabled: 'A', disabled: 'B' }),
    post('/v2/check', { text: T, enabled: 'A' }),
    post('/v2/check', { language: 'en-US', enabled: 'A' }),
    post('/v2/check', { text: T, language: 'en-US', enabledOnly: 'true' }),
    post('/v2/check', { text: T, language: 'en-US', enabledOnly: 'true', enabledRules: '' }),
    post('/v2/check', { text: T, language: 'en-US', enabledRules: 'NO_SUCH_RULE_X', enabledOnly: 'true' }),
    post('/v2/check', { text: T, language: 'en-US', c: 'abc', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', level: 'bogus', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', mode: 'bogus', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', motherTongue: 'xx', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', preferredVariants: 'xx', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', disabledRules: 'NO_SUCH_RULE_X', ...ONLY(EN) }),
    post('/v2/check', { text: T, language: 'en-US', enabledCategories: 'NO_SUCH_CAT', ...ONLY(EN) }),
  ];
  write('validation', 'validation errors in Java order (missing text/data, both, language, legacy params, unknown/out-of-scope codes)', { requests: reqs });
}
// 5. dispatch / unsupported actions
{
  const reqs = [
    get('/'), get('/favicon.ico'), get('/foo'), get('/foo/bar'), get('/index.html'), get('/Languages'), get('/v1/Languages'), get('/v1/check', { language: 'en-US', text: 'x' }),
    get('/x/v2/check', { language: 'en-US', text: 'x' }), get('/v2x/check'), post('/'), post('/foo', { language: 'en-US', text: 'x' }),
    get('/v2'), get('/v2/'), get('/v2/foo'), get('/v2/check/'), get('/v2/CHECK', { language: 'en-US', text: 'x' }), get('/v2/check/extra'), get('/v2/languages/x'),
    get('/v2/rule/examples'), get('/v2/stop'), get('/v2/stop/x'), get('/v2/words/foo'), get('/v2//check'), get('/v2/%63heck', { language: 'en-US', text: 'This is a test,, ok.', ...ONLY(EN) }),
    get('/v2/healthcheck'), post('/v2/healthcheck'), get('/v2/healthcheck/x'),
    get('/v2/maxtextlength'), post('/v2/maxtextlength'), get('/v2/maxtextlength', { language: 'xx' }),
    get('/v2/check?callback=cb&language=en-US&text=This+is+a+test,,+ok.&' + qs(ONLY(EN))),
  ];
  write('dispatch', 'path dispatch, unsupported actions (404 text), old API paths, healthcheck, maxtextlength', { requests: reqs });
}
write('methods', 'other HTTP methods on /v2/check', { requests: [
  { method: 'PUT', path: '/v2/check', body: 'language=en-US&text=x', contentType: 'application/x-www-form-urlencoded' },
  { method: 'DELETE', path: '/v2/check?language=en-US&text=x' },
  { method: 'OPTIONS', path: '/v2/check' },
  { method: 'HEAD', path: '/v2/check?language=en-US&text=x' },
  { method: 'PATCH', path: '/v2/check', body: 'x', contentType: 'text/plain' },
] });
// 6. stoppable
write('stop', '--stoppable: /v2/stop (SRV-0013, SRV-0080); check works before', { serverArgs: ['--stoppable'], requests: [
  post('/v2/check', { language: 'en-US', text: 'This is a test,, ok.', ...ONLY(EN) }),
  get('/v2/healthcheck'),
  get('/v2/stop'),
] });
write('stop-post', '--stoppable: POST /v2/stop/x', { serverArgs: ['--stoppable', '--notLogIP'], requests: [
  post('/v2/stop/x', { a: 'b' }),
] });
// 7. allow-origin
const AO = [get('/v2/check', { language: 'en-US', text: 'This is a test,, ok.', ...ONLY(EN) }), post('/v2/check', { language: 'en-US', text: 'x' }), post('/v2/check', {}), get('/v2/maxtextlength'), get('/v2/healthcheck'), get('/v2/nothing'), get('/favicon.ico'), get('/'), { method: 'OPTIONS', path: '/v2/check' }];
write('allow-origin-default', 'no --allow-origin: header absent', { requests: AO });
write('allow-origin-star', '--allow-origin without value -> *', { serverArgs: ['--allow-origin'], requests: AO });
write('allow-origin-url', '--allow-origin https://example.org', { serverArgs: ['--allow-origin', 'https://example.org'], requests: AO });
write('allow-origin-next-option', '--allow-origin followed by an option -> *', { serverArgs: ['--allow-origin', '--stoppable'], requests: [...AO, get('/v2/stop')] });
write('allow-origin-empty', '--allow-origin with empty value', { serverArgs: ['--allow-origin', ''], requests: AO.slice(0, 3) });
write('allow-origin-config', 'allowOriginUrl via --config file', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'allowOriginUrl=https://config.example\n' }, requests: AO.slice(0, 4) });
// 8. public, verbose, unknown options
write('public', '--public (SRV-0008): requests from loopback work', { serverArgs: ['--public'], requests: AO.slice(0, 3) });
write('unknown-option', 'unknown options and --option=value are ignored (SRV-0004)', { serverArgs: ['--bogus', '--allow-origin=https://x.example', '-v'], requests: AO.slice(0, 3) });
// 9. serverURL prefix (SRV-0071)
{
  const CK = { language: 'en-US', text: 'This is a test,, ok.', ...ONLY(EN) };
  const reqs = [
    get('/lt/v2/check', CK), post('/lt/v2/check', CK), get('/v2/check', CK), get('/lt/v2/maxtextlength'), get('/lt/v2/healthcheck'), get('/lt/'), get('/lt'), get('/lt/foo'),
    get('/lt/lt/v2/check', CK), get('/other/v2/check', CK), get('/lt/v2/nothing'), get('/LT/v2/check', CK), get('/lt/Languages'),
  ];
  write('server-url', 'serverURL=http://localhost:8081/lt via --config', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'serverURL=http://localhost:8081/lt\n' }, requests: reqs });
  write('server-url-root', 'serverURL with trailing slash and nested path', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'serverURL=https://example.org/a/b/\n' }, requests: [get('/a/b/v2/check', CK), get('/a/v2/check', CK), get('/v2/check', CK), get('/a/b/v2/maxtextlength')] });
}
// 10. config file / programmatic config keys (SRV-0061)
{
  const CK = { language: 'en-US', text: 'This is a test,, ok. And a longer second sentence follows.', ...ONLY(EN) };
  write('config-limits', 'maxTextLength / maxTextHardLength via --config', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'maxTextLength=30\nmaxTextHardLength=40\ncacheSize=10\n' }, requests: [
    post('/v2/check', CK), post('/v2/check', { ...CK, text: 'Short,, text.' }), post('/v2/check', { ...CK, text: 'x'.repeat(41) }), get('/v2/maxtextlength'), post('/v2/check', { ...CK, text: 'x'.repeat(30) }), post('/v2/check', { ...CK, text: 'x'.repeat(31) }),
  ] });
  write('config-bad-port-key', 'property file with port key is ignored by --port (harness port wins)', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': '# comment\nmaxCheckThreads=2\n' }, requests: [post('/v2/check', CK)] });
}

// CLI start cases (SRV-0006, SRV-0016, SRV-0008, SRV-0011, SRV-0013): content lines only (D-045)
const SRV = { kind: 'cli', clock: 'fixed', compare: 'cli', jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', normalize: ['buildDate', 'commit', 'stackFrames'], stripTimestamp: true, stderrExceptionOnly: true };
const cli = (name, description, args, extra = {}) => writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ ...SRV, description, args, ...extra }, null, 1) + '\n');
for (const [name, args] of [['port-abc', ['--port', 'abc']], ['port-short-abc', ['-p', '8x']], ['port-missing', ['--port']], ['port-empty', ['--port', '']], ['port-big', ['--port', '99999']], ['port-negative', ['-p', '-5']], ['port-float', ['--port', '80.5']], ['port-max-int', ['--port', '2147483648']]]) {
  cli(`start-fail-${name}`, `server start failure: ${args.join(' ')}`, args);
}
cli('start-fail-config-missing', '--config with missing file', ['--config', 'does-not-exist.properties']);
cli('start-fail-config-no-arg', '--config without argument', ['--config']);
cli('start-fail-config-bad-number', '--config with non-numeric maxTextLength', ['--config', 'bad.properties', '--port', '18092'], { files: { 'bad.properties': 'maxTextLength=abc\n' } });
const START = { streams: ['stdout'], ignoreExit: true, stopOnOutput: 'Server started' };
cli('start-default', '-p N startup lines (SRV-0006, SRV-0016)', ['-p', '18093'], START);
cli('start-port-long', '--port N startup lines', ['--port', '18094'], START);
cli('start-public', '--public startup warnings (SRV-0008)', ['--port', '18095', '--public'], START);
cli('start-allow-origin', '--allow-origin startup lines (SRV-0011)', ['--port', '18096', '--allow-origin'], START);
cli('start-stoppable', '--stoppable startup lines (SRV-0013)', ['--port', '18097', '--stoppable'], START);
cli('start-unknown-option', 'unknown option warning (SRV-0004)', ['--port', '18098', '--bogus'], START);
cli('start-option-equals', '--option=value warning (SRV-0004)', ['--port', '18099', '--allow-origin=http://x.example'], START);
console.log('X-SRV-BASIC cases written to', OUT);
