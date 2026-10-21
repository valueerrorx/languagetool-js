// Generates oracle/cases/X-SRV-ENDPOINTS (inputs only; expected values come from the Java server, F68).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-ENDPOINTS');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit'];
const write = (name, description, extra) => writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, serverArgs: [], ...extra }, null, 1) + '\n');
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const basic = (u, p) => ({ Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') });
const LANGS = (r) => ({ ...r, languagesList: true }); // Java list restricted to in-scope languages (DEV-006)
const CFG = (props) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': props } });

// languages
write('languages', '/v2/languages (SRV-0092): GET/POST/extra params; list restricted to in-scope languages by the comparator (DEV-006)', { requests: [
  LANGS(get('/v2/languages')), LANGS(post('/v2/languages')), LANGS(get('/v2/languages', { foo: 'bar' })), LANGS(post('/v2/languages', { language: 'de' })),
  LANGS(get('/v2/languages/')), get('/v2/languages/x'), LANGS({ method: 'HEAD', path: '/v2/languages' }), LANGS({ method: 'OPTIONS', path: '/v2/languages' }), LANGS({ method: 'PUT', path: '/v2/languages', body: 'x', contentType: 'text/plain' }),
] });
// maxtextlength
write('maxtextlength', '/v2/maxtextlength default (SRV-0093)', { requests: [get('/v2/maxtextlength'), post('/v2/maxtextlength'), get('/v2/maxtextlength', { language: 'en-US' }), { method: 'HEAD', path: '/v2/maxtextlength' }] });
write('maxtextlength-config', '/v2/maxtextlength with maxTextLength=1234 and maxTextLengthAnonymous=77', { ...CFG('maxTextLength=1234\nmaxTextLengthAnonymous=77\n'), requests: [get('/v2/maxtextlength')] });
write('maxtextlength-config-all', '/v2/maxtextlength with maxTextLength=5000 only', { ...CFG('maxTextLength=5000\n'), requests: [get('/v2/maxtextlength')] });
write('maxtextlength-premium', '/v2/maxtextlength with premiumAlways (anonymous limit still reported)', { ...CFG('maxTextLengthAnonymous=300\nmaxTextLengthPremium=900\npremiumAlways=true\n'), requests: [get('/v2/maxtextlength')] });
// info
write('info', '/v2/info (SRV-0094)', { requests: [get('/v2/info'), post('/v2/info'), get('/v2/info', { x: 'y' }), { method: 'HEAD', path: '/v2/info' }, get('/v2/info/'), get('/v2/Info')] });
write('info-premium-always', '/v2/info with premiumAlways (config key)', { ...CFG('premiumAlways=true\n'), requests: [get('/v2/info')] });
// configinfo
{
  const langs = ['de-DE', 'de-AT', 'en-US', 'en-GB', 'fr', 'fr-CA'];
  write('configinfo', '/v2/configinfo per language: rules, rule options (SRV-0095, SRV-0096)', { requests: langs.map((l) => get('/v2/configinfo', { language: l })) });
  write('configinfo-errors', '/v2/configinfo error paths', { requests: [
    get('/v2/configinfo'), get('/v2/configinfo', { language: '' }), get('/v2/configinfo', { language: 'xx' }), get('/v2/configinfo', { language: 'DE' }), get('/v2/configinfo', { language: 'De-de' }), get('/v2/configinfo', { language: 'auto' }),
    get('/v2/configinfo', { language: 'en_US' }), get('/v2/configinfo', { language: ' en' }), get('/v2/configinfo', { lang: 'en' }), get('/v2/configinfo', { language: 'de-XX' }), get('/v2/configinfo', { language: 'x'.repeat(200) }),
  ] });
  write('configinfo-post', '/v2/configinfo via POST and with doubled parameter', { requests: [get('/v2/configinfo?language=fr&language=en'), post('/v2/configinfo'), post('/v2/configinfo', { language: 'en-GB', foo: 'bar' }), { method: 'HEAD', path: '/v2/configinfo?language=en' }] });
  write('configinfo-maxhard', '/v2/configinfo parameter.maxTextLength reflects maxTextHardLength', { ...CFG('maxTextHardLength=4321\nmaxTextLength=100\n'), requests: [get('/v2/configinfo', { language: 'en-US' }), get('/v2/configinfo', { language: 'fr' })] });
}
// words without DB
{
  const U = { username: 'testuser', apiKey: 'testkey' };
  write('words', '/v2/words (SRV-0193): GET checks without DB', { requests: [
    get('/v2/words'), post('/v2/words'), get('/v2/words', U), get('/v2/words', { username: 'u' }), get('/v2/words', { apiKey: 'k' }), get('/v2/words', { username: 'u', apiKey: 'k', password: 'p' }),
    get('/v2/words', { username: 'u', password: 'p' }), get('/v2/words', { password: 'p' }), get('/v2/words', { ...U, dict: 'x' }), get('/v2/words', { ...U, dicts: 'a,b' }), get('/v2/words', { ...U, offset: '0', limit: '10' }),
    get('/v2/words', { ...U, offset: 'abc' }), get('/v2/words', { ...U, limit: '-1' }), get('/v2/words', { username: '', apiKey: '' }), get('/v2/words', { username: ' ', apiKey: ' ' }), get('/v2/words', { username: 'u', apiKey: '' }),
    get('/v2/words', {}, { headers: basic('u', 'p') }), get('/v2/words', {}, { headers: { Authorization: 'Bearer abc.def.ghi' } }), get('/v2/words', {}, { headers: { Authorization: '   ' } }), get('/v2/words', { username: 'u', tokenV2: 't' }),
    { method: 'PUT', path: '/v2/words' }, { method: 'DELETE', path: '/v2/words' }, { method: 'OPTIONS', path: '/v2/words' }, { method: 'HEAD', path: '/v2/words' },
  ] });
  write('words-add', '/v2/words/add (SRV-0195)', { requests: [
    get('/v2/words/add'), get('/v2/words/add', { word: 'x' }), { method: 'post', path: '/v2/words/add' }, post('/v2/words/add'), post('/v2/words/add', { word: 'Wort' }), post('/v2/words/add', { ...U, word: 'Wort' }), post('/v2/words/add', { ...U }), post('/v2/words/add', { ...U, word: '' }),
    post('/v2/words/add', { ...U, word: ' ' }), post('/v2/words/add', { ...U, word: 'zwei Wörter' }), post('/v2/words/add', { ...U, mode: 'batch', words: 'a b c' }), post('/v2/words/add', { ...U, mode: 'batch' }), post('/v2/words/add', { username: 'u', word: 'x' }),
    post('/v2/words/add', { apiKey: 'k', word: 'x' }), post('/v2/words/add', { username: 'u', apiKey: 'k', password: 'p', word: 'x' }), post('/v2/words/add', { ...U, word: 'x', dict: 'd' }), post('/v2/words/add', { ...U, word: 'x', dicts: 'd1,d2' }),
    post('/v2/words/add', { word: 'x' }, { headers: basic('u', 'p') }), post('/v2/words/add', { word: 'x' }, { headers: { Authorization: 'Bearer abc' } }), post('/v2/words/add', null, { body: '{"word":"x"}', contentType: 'application/json' }),
    post('/v2/words/add', { ...U, word: 'Tab\there' }), post('/v2/words/add', { ...U, word: 'Zeile\numbruch' }), post('/v2/words/add', { ...U, word: 'Grüße' }), post('/v2/words/add', { ...U, word: ' ' }), post('/v2/words/add', { ...U, word: 'a b' }),
    post('/v2/words/add', { ...U, word: '　' }), post('/v2/words/add', { ...U, word: 'a b' }), post('/v2/words/add', { ...U, word: 'x'.repeat(2000) }),
    { method: 'PUT', path: '/v2/words/add' }, { method: 'OPTIONS', path: '/v2/words/add' },
  ].map((r) => r) });
  write('words-delete', '/v2/words/delete (SRV-0197)', { requests: [
    get('/v2/words/delete'), get('/v2/words/delete', { word: 'x' }), post('/v2/words/delete'), post('/v2/words/delete', { word: 'Wort' }), post('/v2/words/delete', { ...U, word: 'Wort' }), post('/v2/words/delete', { ...U }), post('/v2/words/delete', { ...U, word: '' }),
    post('/v2/words/delete', { ...U, word: 'zwei Wörter' }), post('/v2/words/delete', { ...U, mode: 'batch', words: 'a b c' }), post('/v2/words/delete', { ...U, mode: 'batch' }), post('/v2/words/delete', { username: 'u', word: 'x' }), post('/v2/words/delete', { apiKey: 'k', word: 'x' }),
    post('/v2/words/delete', { word: 'x' }, { headers: basic('u', 'p') }), post('/v2/words/delete', { ...U, word: 'x', dict: 'd' }), post('/v2/words/delete', { ...U, word: 'x', dicts: 'd1' }), { method: 'DELETE', path: '/v2/words/delete' }, { method: 'OPTIONS', path: '/v2/words/delete' },
  ] });
}

// users/me
{
  write('users-me', '/v2/users/me (SRV-0105): methods, Basic auth parsing, authMethod, no DB', { requests: [
    get('/v2/users/me'), post('/v2/users/me'), { method: 'OPTIONS', path: '/v2/users/me', recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'] },
    { method: 'OPTIONS', path: '/v2/users/me', headers: { 'Access-Control-Request-Headers': 'authorization, x-foo' }, recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers'] },
    { method: 'options', path: '/v2/users/me', headers: { 'Access-Control-Request-Headers': 'content-type' }, recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers'] },
    { method: 'PUT', path: '/v2/users/me' }, { method: 'DELETE', path: '/v2/users/me' }, { method: 'HEAD', path: '/v2/users/me' },
    get('/v2/users/me', null, { headers: basic('user', 'pass') }), get('/v2/users/me', { authMethod: 'password' }, { headers: basic('user', 'pass') }), get('/v2/users/me', { authMethod: 'apiKey' }, { headers: basic('user', 'key') }),
    get('/v2/users/me', { authMethod: 'addonToken' }, { headers: basic('user', 'tok') }), get('/v2/users/me', { authMethod: 'bogus' }, { headers: basic('user', 'pass') }), get('/v2/users/me', { authMethod: '' }, { headers: basic('user', 'pass') }),
    get('/v2/users/me', { authMethod: 'APIKEY' }, { headers: basic('user', 'pass') }), get('/v2/users/me', { authMethod: 'apiKey', format: 'minimal' }, { headers: basic('user', 'key') }), get('/v2/users/me', { format: 'minimal' }, { headers: basic('user', 'pass') }),
    get('/v2/users/me', { format: 'extended' }, { headers: basic('user', 'pass') }), get('/v2/users/me', { format: 'bogus' }, { headers: basic('user', 'pass') }),
    get('/v2/users/me', null, { headers: { Authorization: 'Basic' } }), get('/v2/users/me', null, { headers: { Authorization: 'Basic ' } }), get('/v2/users/me', null, { headers: { Authorization: 'Basic !!!notbase64' } }),
    get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from('nocolon').toString('base64') } }), get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from(':').toString('base64') } }),
    get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from('user:').toString('base64') } }), get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from(':pass').toString('base64') } }),
    get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from('us:er:pa:ss').toString('base64') } }), get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from('ümlaut:pässword').toString('base64') } }),
    get('/v2/users/me', null, { headers: { Authorization: 'basic ' + Buffer.from('user:pass').toString('base64') } }), get('/v2/users/me', null, { headers: { Authorization: 'Bearer abc.def.ghi' } }), get('/v2/users/me', null, { headers: { Authorization: 'Digest x' } }),
    get('/v2/users/me', null, { headers: { Authorization: '' } }), get('/v2/users/me', { authMethod: 'apiKey' }), get('/v2/users/me', { authMethod: 'bogus' }),
    get('/v2/users/me', { username: 'u', apiKey: 'k' }), get('/v2/users/me', null, { headers: { Authorization: 'Basic ' + Buffer.from('user:pass').toString('base64'), Origin: 'https://x.example' } }),
  ] });
  write('users-me-origin', '/v2/users/me OPTIONS with --allow-origin: CORS headers', { serverArgs: ['--allow-origin', 'https://example.org'], requests: [
    { method: 'OPTIONS', path: '/v2/users/me', recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'] },
    { method: 'OPTIONS', path: '/v2/users/me', headers: { 'Access-Control-Request-Headers': 'authorization' }, recordHeaders: ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'] },
    get('/v2/users/me'),
  ] });
}
// admin/refreshUser
{
  const U = { username: 'testuser', apiKey: 'testkey' };
  write('refresh-user', '/v2/admin/refreshUser (SRV-0104) without DB', { requests: [
    get('/v2/admin/refreshUser'), post('/v2/admin/refreshUser'), post('/v2/admin/refreshUser', { username: 'u' }), post('/v2/admin/refreshUser', U), post('/v2/admin/refreshUser', { apiKey: 'k' }), post('/v2/admin/refreshUser', { username: 'u', apiKey: 'k', password: 'p' }),
    post('/v2/admin/refreshUser', { username: 'u', password: 'p' }), post('/v2/admin/refreshUser', { password: 'p' }), post('/v2/admin/refreshUser', {}, { headers: basic('u', 'p') }), post('/v2/admin/refreshUser', {}, { headers: { Authorization: 'Bearer a.b.c' } }),
    { method: 'PUT', path: '/v2/admin/refreshUser' }, { method: 'OPTIONS', path: '/v2/admin/refreshUser' }, { method: 'post', path: '/v2/admin/refreshUser' }, get('/v2/admin'), get('/v2/admin/'), get('/v2/admin/refreshuser'), post('/v2/admin/refreshUser/x'),
  ] });
}
// DB-less access / logger behaviour (configs that touch DB or limits)
{
  const CK = { language: 'en-US', text: 'This is a test,, ok.', enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' };
  write('access-anonymous-denied', 'anonymousAccessAllowed=false: anonymous and username/apiKey requests (SRV-0199)', { ...CFG('anonymousAccessAllowed=false\n'), requests: [
    post('/v2/check', CK), get('/v2/check', CK), post('/v2/check', { ...CK, username: 'u', apiKey: 'k' }), post('/v2/check', { ...CK, apiKey: 'k' }), get('/v2/languages'), get('/v2/maxtextlength'), get('/v2/info'), get('/v2/healthcheck'), get('/v2/configinfo', { language: 'en' }),
    get('/v2/words', { username: 'u', apiKey: 'k' }), post('/v2/check', CK, { headers: basic('u', 'p') }),
  ].map((r) => (r.path === '/v2/languages' ? LANGS(r) : r)) });
  write('access-premium-always', 'premiumAlways: words/users/limits endpoints (user id 1 via default limits)', { ...CFG('premiumAlways=true\n'), requests: [
    get('/v2/words'), get('/v2/words', { offset: '0', limit: '5' }), get('/v2/words', { dict: 'x' }), get('/v2/words', { offset: 'abc' }), post('/v2/words/add', { word: 'Wort' }), post('/v2/words/add', { word: '' }), post('/v2/words/add', { word: 'zwei Wörter' }),
    post('/v2/words/add', { mode: 'batch', words: 'a b c' }), post('/v2/words/add', { mode: 'batch' }), post('/v2/words/delete', { word: 'Wort' }), post('/v2/words/delete', { mode: 'batch', words: 'a b' }), post('/v2/words/delete', { word: '' }),
    post('/v2/admin/refreshUser'), post('/v2/admin/refreshUser', { username: 'u' }), get('/v2/words', { username: 'u', apiKey: 'k' }), get('/v2/words', { apiKey: 'k' }), get('/v2/words', { dicts: 'a,b' }),
  ] });
  write('db-config-no-driver', 'dbUrl/dbUsername/dbPassword without dbDriver: no DB access, checks work (SRV-0199, SRV-0201)', { ...CFG('dbUrl=jdbc:mysql://localhost/none\ndbUsername=x\ndbPassword=y\n'), requests: [
    post('/v2/check', CK), post('/v2/check', { ...CK, username: 'u', apiKey: 'k' }), get('/v2/words', { username: 'u', apiKey: 'k' }), get('/v2/healthcheck'), get('/v2/info'),
  ] });
  write('logging-no-db', 'skipLoggingChecks / skipLoggingRuleMatches / pings without logger: check results unchanged (SRV-0201)', { ...CFG('skipLoggingChecks=true\nskipLoggingRuleMatches=true\n'), requests: [
    post('/v2/check', CK), post('/v2/check', { ...CK, inputLogging: 'no' }), post('/v2/check', { ...CK, v: 'v1', useragent: 'ua', instanceId: 'i1', languageChanged: 'true' }),
  ] });
}
const SRV = { kind: 'cli', clock: 'fixed', compare: 'cli', jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', normalize: ['buildDate', 'commit', 'stackFrames'], stripTimestamp: true, stderrExceptionOnly: true };
const cli = (name, description, args, extra = {}) => writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ ...SRV, description, args, ...extra }, null, 1) + '\n');
cli('start-fail-premium-always-flag', '--premiumAlways flag is rejected in the open-source build (SRV-0048)', ['--premiumAlways', '--port', '18290']);
cli('start-fail-premium-only', 'premiumOnly=true is rejected (SRV-0048)', ['--config', 'p.properties', '--port', '18291'], { files: { 'p.properties': 'premiumOnly=true\n' } });
cli('start-fail-dblogging', 'dbLogging=true without dbDriver is rejected at startup (SRV-0201)', ['--config', 'd.properties', '--port', '18292'], { files: { 'd.properties': 'dbLogging=true\n' } });
console.log('X-SRV-ENDPOINTS cases written to', OUT);
