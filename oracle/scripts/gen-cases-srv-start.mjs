// Generates oracle/cases/X-SRV-START (inputs only; expected values come from the Java server, F66).
// CLI cases use explicit ports 18150-18199 (ORACLE_PORT_MIN/MAX=18100/18149 for the http cases of X-SRV-GUARDS meanwhile).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-START');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit'];
const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const ONLY = (r) => ({ enabledRules: r, enabledOnly: 'true' });
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const chk = (text, more = {}, lang = 'en-US', rules = EN) => post('/v2/check', { language: lang, text, ...ONLY(rules), ...more });
const TXT = 'This is a test,, ok.';

let portCounter = 0;
const nextPort = () => String(18150 + (portCounter++ % 30));
const used = new Set();
function cliWrite(name, description, extra) {
  if (used.has(name)) throw new Error(`duplicate ${name}`);
  used.add(name);
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'cli', clock: 'fixed', compare: 'cli', jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', normalize: [...NORM, 'stackFrames'], stripTimestamp: true, description, ...extra }, null, 1) + '\n');
}
const WARN = '^(\\*{5} WARNING|Key \'|Known keys:|WARNING:|\\*\\*\\* |Exception in thread|Caused by:)';
// startup that must fail: exit code, stdout (timestamps stripped) and the uncaught exception line plus causes are compared
function fail(name, description, args, files, more = {}) {
  cliWrite(name, description, { stderrExceptionOnly: true, args: [...args, ...(args.includes('--port') || args.includes('-p') ? [] : ['--port', nextPort()])], ...(files ? { files } : {}), ...more });
}
// startup that succeeds: killed after "Server started"; stdout and selected stderr lines (config warnings) compared, exit code ignored
function start(name, description, args, files, more = {}) {
  cliWrite(name, description, { ignoreExit: true, stopOnOutput: 'Server started', stderrFilter: WARN, args: [...args, ...(args.includes('--port') || args.includes('-p') ? [] : ['--port', nextPort()])], ...(files ? { files } : {}), ...more });
}
// usage / short-lived runs: exit code and both streams compared
function plain(name, description, args, files, more = {}) {
  cliWrite(name, description, { stderrExceptionOnly: true, args, ...(files ? { files } : {}), ...more });
}
const cfg = (txt) => ({ 'c.properties': txt });
const A = ['--config', 'c.properties'];
const CHTTP = (txt) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': txt } });
function httpWrite(name, description, extra) {
  if (used.has(name)) throw new Error(`duplicate ${name}`);
  used.add(name);
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, stopAfter: true, serverArgs: [], ...extra }, null, 1) + '\n');
}

// ===== usage (SRV-0001..0003)
plain('usage-h', 'HTTPServer -h: usage on stdout, exit 1', ['-h']);
plain('usage-help', 'HTTPServer --help', ['--help']);
start('usage-h-with-port', '-h together with another argument is no usage request: unknown option "-h", server starts', ['-h', '--port', '18150']);
start('usage-help-twice', '--help --help: two unknown options', ['--help', '--help', '--port', '18151']);
start('usage-help-after-port', '--port N --help: unknown option', ['--port', '18152', '--help']);
start('usage-upper', '-H and --HELP are unknown options', ['-H', '--HELP', '--port', '18153']);
start('usage-question', '-? / help', ['-?', 'help', '--port', '18154']);

// ===== argument parsing (SRV-0004, SRV-0014, SRV-0010)
start('args-unknown', 'unknown arguments: plain words, dashes, empty string', ['foo', '-', '--', '---x', '', '-x', '--port', nextPort()]);
start('args-equals-unknown', 'unknown option with "=": extended hint text; --a-b=c does not match the --option=value regex', ['--foo=bar', '--a-b=c', '--a=', '-x=1', '=', 'a=b=c', '--port', nextPort()]);
start('args-equals-known', '--verbose=true / --public=1 / --allow-origin=x: stderr WARNING plus stdout unknown option (parameters ignored)', ['--verbose=true', '--public=1', '--allow-origin=x', '--port', nextPort()]);
start('args-equals-digits', '--opt=value regex needs letters only: --opt2=v and --Opt=Value', ['--opt2=v', '--Opt=Value', '--port', nextPort()]);
start('args-equals-config', '--config=c.properties is not used (unknown option); server starts with defaults', ['--config=c.properties', '--port', nextPort()], cfg('maxTextLength=1\n'));
start('args-port-short', '-p N', ['-p', '18155']);
start('args-port-twice', 'last --port wins', ['--port', '18156', '-p', '18157']);
start('args-port-plus', '--port +18158 (Integer.parseInt accepts a leading plus)', ['--port', '+18158']);
start('args-port-leading-zero', '--port 018159 (decimal)', ['--port', '018159']);
start('args-port-unicode-digits', '--port with Arabic-Indic digits (Integer.parseInt accepts Unicode digits)', ['--port', '١٨١٦٠']);
start('args-port-fullwidth', '--port with fullwidth digits', ['--port', '１８１６１']);
fail('args-port-trailing-space', '--port "18162 " (NumberFormatException)', ['--port', '18162 ']);
fail('args-port-minus-zero', '--port -0 is port 0 without minPort/maxPort', ['--port', '-0']);
fail('args-port-hex', '--port 0x1F', ['--port', '0x1F']);
fail('args-port-underscore', '--port 18_000', ['--port', '18_000']);
fail('args-port-65536', '--port 65536: port out of range', ['--port', '65536']);
fail('args-port-65535-lt', '--port 70000', ['--port', '70000']);
fail('args-port-last', '-p as last argument: array index error', ['-p']);
fail('args-config-last', '--config as last argument', ['--port', '18163', '--config']);
fail('args-config-dir', '--config pointing to a directory', ['--port', '18164', '--config', '.']);
fail('args-config-empty-name', '--config "" (empty path)', ['--port', '18165', '--config', '']);
start('args-config-twice', 'two --config files are both parsed, later keys override', ['--config', 'a.properties', '--config', 'b.properties', '--port', nextPort()], { 'a.properties': 'unknownA=1\nmaxTextLength=5\n', 'b.properties': 'unknownB=2\n' });
start('args-verbose', '-v and --verbose', ['-v', '--verbose', '--port', nextPort()]);
start('args-public', '--public: two WARNING lines first', ['--public', '--port', nextPort()]);
start('args-public-stoppable-verbose', '--public --stoppable -v together', ['--public', '--stoppable', '-v', '--port', nextPort()]);
start('args-not-log-ip', '--notLogIP', ['--notLogIP', '--port', nextPort()]);
start('args-log-ip-pattern', '--logIpMatchingPattern value', ['--logIpMatchingPattern', 'MY_PATTERN', '--port', nextPort()]);
fail('args-log-ip-pattern-missing', '--logIpMatchingPattern as last argument: IllegalArgumentException', ['--port', '18166', '--logIpMatchingPattern']);
fail('args-log-ip-pattern-dashes', '--logIpMatchingPattern followed by an option', ['--logIpMatchingPattern', '--public', '--port', '18167']);
fail('args-log-ip-pattern-dash-value', '--logIpMatchingPattern --x', ['--port', '18168', '--logIpMatchingPattern', '--x']);
start('args-log-ip-pattern-single-dash', '--logIpMatchingPattern -x is an acceptable value', ['--logIpMatchingPattern', '-x', '--port', nextPort()]);
fail('args-premium-always', '--premiumAlways in the open source build: IllegalArgumentException from the config constructor', ['--premiumAlways', '--port', '18169']);
fail('args-premium-always-first', '--premiumAlways before unknown options (parsing stops at the exception)', ['--premiumAlways', '--foo', '--port', '18170']);
start('args-allow-origin-url', '--allow-origin URL / * / next option', ['--allow-origin', 'https://x.example', '--allow-origin', '--public', '--port', nextPort()]);
start('args-allow-origin-last', '--allow-origin as the last argument', ['--port', nextPort(), '--allow-origin']);
start('args-allow-origin-empty', '--allow-origin "" (empty)', ['--allow-origin', '', '--port', nextPort()]);
start('args-order', 'options in a different order: --public before --port', ['--public', '-v', '--port', nextPort()]);

// ===== language model option (SRV-0181, SRV-0005)
fail('lm-missing-dir', '--languageModel nonexistent directory', ['--languageModel', 'nolm', '--port', '18171']);
fail('lm-is-file', '--languageModel pointing to a file', ['--languageModel', 'afile', '--port', '18172'], { afile: 'x' });
fail('lm-last', '--languageModel as last argument', ['--port', '18173', '--languageModel']);
start('lm-ok', '--languageModel existing directory', ['--languageModel', 'lm', '--port', nextPort()], { 'lm/readme.txt': 'x' });
start('lm-config-ok', 'config key languageModel existing directory', [...A, '--port', nextPort()], { ...cfg('languageModel=lm\n'), 'lm/readme.txt': 'x' });
fail('lm-config-missing', 'config key languageModel nonexistent', [...A, '--port', '18174'], cfg('languageModel=nolm\n'));
fail('lm-config-file', 'config key languageModel is a file', [...A, '--port', '18175'], { ...cfg('languageModel=afile\n'), afile: 'x' });
start('lm-cli-overrides-config', 'config languageModel is ignored when --languageModel is on the command line', [...A, '--languageModel', 'lm', '--port', nextPort()], { ...cfg('languageModel=nolm\n'), 'lm/readme.txt': 'x' });
fail('lm-cli-bad-config-ok', '--languageModel bad with a valid config languageModel: command line wins and fails', [...A, '--languageModel', 'nolm2', '--port', '18176'], { ...cfg('languageModel=lm\n'), 'lm/readme.txt': 'x' });
start('lm-cli-before-config', '--languageModel before --config (order irrelevant for the ignore rule; server starts)', ['--languageModel', 'lm', ...A, '--port', '18177'], { ...cfg('languageModel=nolm\n'), 'lm/readme.txt': 'x' });
fail('lm-empty-key', 'config languageModel= (empty value): empty File does not exist', [...A, '--port', nextPort()], cfg('languageModel=\n'));

// ===== config file reading (SRV-0030)
fail('cfg-missing', '--config nonexistent file (FileNotFoundException wrapped)', ['--config', 'nope.properties', '--port', '18178']);
start('cfg-empty-file', 'empty config file', [...A, '--port', nextPort()], cfg(''));
start('cfg-comments', 'comment lines # and ! and blank lines', [...A, '--port', nextPort()], cfg('# comment\n! another\n\n   # indented comment\nunknownKey=1\n'));
start('cfg-separators', 'separators = : space tab and padding', [...A, '--port', nextPort()], cfg('a=1\nb:2\nc 3\nd\t4\n  e  =  5\nf=\n'));
start('cfg-continuation', 'line continuation and escapes in keys and values', [...A, '--port', nextPort()], cfg('longKey=part1\\\n   part2\nk\\ ey=v\nu\\u0041=\\u00e4\nx\\=y=z\n'));
start('cfg-crlf', 'CRLF line endings', [...A, '--port', nextPort()], cfg('a=1\r\nb=2\r\n'));
start('cfg-latin1-key', 'ISO-8859-1 bytes in a key (Properties.load decodes Latin-1)', [...A, '--port', nextPort()], undefined, { filesB64: { 'c.properties': Buffer.from([0x6b, 0xe9, 0x79, 0x3d, 0x31, 0x0a]).toString('base64') } });
start('cfg-utf8-key', 'UTF-8 umlaut in a key is read as Latin-1 (mojibake in the warning)', [...A, '--port', nextPort()], cfg('schlüssel=1\n'));
start('cfg-duplicate-keys', 'duplicate keys: last wins (shown through the warning list: one warning)', [...A, '--port', nextPort()], cfg('dup=1\ndup=2\n'));
start('cfg-unknown-keys', 'SRV-0058: unknown keys warn with the known-key list; case matters', [...A, '--port', nextPort()], cfg('foo=1\nMaxTextLength=5\nmaxtextlength=5\nbar.baz=1\n'));
start('cfg-unlisted-accepted-keys', 'SRV-0058: accepted but unlisted keys also warn', [...A, '--port', nextPort()], cfg('maxCheckTimeMillisAnonymous=100\nmaxCheckTimeMillisLoggedIn=100\nmaxCheckTimeMillisPremium=100\nredisPort=6379\nredisDictTTLSeconds=60\nslowRuleLoggingThreshold=5\ndefaultThirdPartyAI=false\nmode=LanguageTool\ndbLogging=false\n'));
start('cfg-known-keys-silent', 'SRV-0058: keystore/password/trustedSource and other known keys do not warn', [...A, '--port', nextPort()], cfg('keystore=k\npassword=p\ntrustedSource=x\nmaxTextLengthWithApiKey=5\nmaxCheckTimeWithApiKeyMillis=5\n'));
fail('cfg-lang-key-uppercase', 'lang-XX is not exempt from the unknown-key check and fails in addDynamicLanguages (code check)', [...A, '--port', '18179'], cfg('lang-XX=Xx\n'));
start('cfg-whitespace-value', 'leading whitespace of a value is stripped, trailing kept (unknown key echo is only the key)', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed=   true\nsuggestionsEnabled=true   \n'));
start('cfg-booleans', 'boolean keys: padded true/TRUE/yes/1/garbage', [...A, '--port', nextPort()], cfg('pipelineCaching= true \npipelinePrewarming=FALSE\ntrustXForwardForHeader=yes\nskipLoggingChecks=1\nskipLoggingRuleMatches=True\nsuggestionsEnabled=no\nlocalApiMode= true \nredisUseSSL=maybe\nredisUseSentinel=true\ngracefulDatabaseFailure=TRUE\n'));
start('cfg-config-then-port-in-file', 'port is not a config file key: "port=1" warns as unknown key', [...A, '--port', nextPort()], cfg('port=18999\nmaxPort=0\n'));

// ===== numeric keys: NumberFormatException texts (SRV-0030..0035, 0039, 0043, 0051, 0185, 0187, 0189, 0191)
const INT_KEYS = ['maxTextHardLength', 'maxTextLength', 'maxTextLengthAnonymous', 'maxTextLengthLoggedIn', 'maxTextLengthPremium', 'maxCheckTimeMillis', 'maxCheckTimeMillisAnonymous', 'maxCheckTimeMillisLoggedIn', 'maxCheckTimeMillisPremium',
  'requestLimit', 'requestLimitInBytes', 'timeoutRequestLimit', 'requestLimitWhitelistLimit', 'maxPipelinePoolSize', 'pipelineExpireTimeInSeconds', 'requestLimitPeriodInSeconds', 'ipFingerprintFactor', 'maxWorkQueueSize', 'minPort', 'maxPort',
  'maxCheckThreads', 'maxTextCheckerThreads', 'textCheckerQueueSize', 'cacheSize', 'cacheTTLSeconds', 'maxSpellingSuggestions', 'redisPort', 'redisDatabase', 'redisDictTTLSeconds', 'redisTimeoutMilliseconds', 'redisConnectionTimeoutMilliseconds',
  'sentinelPort', 'dbTimeoutSeconds', 'dbMaxConnections', 'dbErrorRateThreshold', 'dbTimeoutRateThreshold', 'dbDownIntervalSeconds', 'prometheusPort', 'slowRuleLoggingThreshold', 'dictLimitUser', 'dictLimitTeam', 'styleGuideLimitUser', 'styleGuideLimitTeam', 'abTestRollout'];
for (const k of INT_KEYS) {
  // cacheTTLSeconds without cacheSize fails earlier with a different message: give it a cacheSize
  fail(`num-${k}-abc`, `${k}=abc -> NumberFormatException`, [...A, '--port', nextPort()], cfg(`${k === 'cacheTTLSeconds' ? 'cacheSize=10\n' : ''}${k}=abc\n`));
}
for (const v of ['', '1.5', ' 5', '5 ', '2147483648', '-2147483649', '0x10', '1e3', '१२', '+5x']) {
  (v === ' 5' ? start : fail)(`num-maxTextLength-${v === '' ? 'empty' : v.replace(/[^A-Za-z0-9]/g, (c) => `u${c.charCodeAt(0).toString(16)}`)}`, `maxTextLength=${JSON.stringify(v)}`, [...A, '--port', nextPort()], cfg(`maxTextLength=${v}\n`));
}
for (const [k, v] of [['maxCheckTimeMillisAnonymous', '9223372036854775808'], ['maxCheckTimeMillisLoggedIn', '1.5'], ['maxCheckTimeMillisPremium', ''], ['maxCheckTimeMillis', '2147483648'], ['maxCheckTimeMillisAnonymous', '9223372036854775807']]) {
  (v === '9223372036854775807' ? start : fail)(`num-${k}-${v === '' ? 'empty' : v.length > 12 ? 'long' + v.slice(-2) : v.replace(/\W/g, '_')}`, `${k}=${JSON.stringify(v)} (Long.parseLong / Integer.parseInt)`, [...A, '--port', nextPort()], cfg(`${k}=${v}\n`));
}
for (const k of ['maxTextLength', 'requestLimit', 'maxCheckThreads', 'prometheusPort', 'dictLimitUser']) {
  start(`num-${k}-ok-forms`, `${k} accepts +5, 007 and Unicode digits`, [...A, '--port', nextPort()], cfg(`${k}=+5\n`));
}
fail('props-unicode-digits-utf8', 'UTF-8 encoded Arabic-Indic digits are read as Latin-1 mojibake -> NumberFormatException', [...A, '--port', nextPort()], cfg('maxTextLength=٤٢\n'));
start('num-unicode-digits', 'Integer.parseInt accepts Arabic-Indic digits written as unicode escapes in config values', [...A, '--port', nextPort()], cfg('maxTextLength=\\u0663\\u0660\nmaxWorkQueueSize=\\u0660\\u0660\n'));
start('num-float-key', 'maxErrorsPerWordRate accepts float forms: 1e-2, .5, 1f, NaN, Infinity', [...A, '--port', nextPort()], cfg('maxErrorsPerWordRate=1e-2\n'));
for (const v of ['.5', '1f', 'NaN', 'Infinity', '-0.0', '0x1p3', ' 0.5', '0.5 ', '1,5', 'abc', '', '1e400', '1d']) {
  (['abc', '', '1,5'].includes(v) ? fail : start)(`num-rate-${v === '' ? 'empty' : v.replace(/[^A-Za-z0-9]/g, (c) => `u${c.charCodeAt(0).toString(16)}`)}`, `maxErrorsPerWordRate=${JSON.stringify(v)} (Float.parseFloat trims whitespace)`, [...A, '--port', nextPort()], cfg(`maxErrorsPerWordRate=${v}\n`));
}
// ===== range validation (SRV-0035, 0039, 0043)
fail('range-maxWorkQueueSize-neg', 'maxWorkQueueSize=-1', [...A, '--port', nextPort()], cfg('maxWorkQueueSize=-1\n'));
fail('range-maxCheckThreads-0', 'maxCheckThreads=0', [...A, '--port', nextPort()], cfg('maxCheckThreads=0\n'));
fail('range-maxCheckThreads-neg', 'maxCheckThreads=-3', [...A, '--port', nextPort()], cfg('maxCheckThreads=-3\n'));
start('range-maxCheckThreads-1', 'maxCheckThreads=1: thread pool line', [...A, '--port', nextPort()], cfg('maxCheckThreads=1\n'));
start('range-maxCheckThreads-37', 'maxCheckThreads=37', [...A, '--port', nextPort()], cfg('maxCheckThreads=37\n'));
fail('range-maxTextCheckerThreads-neg', 'maxTextCheckerThreads=-1', [...A, '--port', nextPort()], cfg('maxTextCheckerThreads=-1\n'));
start('range-maxTextCheckerThreads-0', 'maxTextCheckerThreads=0 (use maxCheckThreads)', [...A, '--port', nextPort()], cfg('maxTextCheckerThreads=0\n'));
start('range-maxTextCheckerThreads-3', 'maxTextCheckerThreads=3', [...A, '--port', nextPort()], cfg('maxTextCheckerThreads=3\n'));
fail('range-textCheckerQueueSize-neg', 'textCheckerQueueSize=-1', [...A, '--port', nextPort()], cfg('textCheckerQueueSize=-1\n'));
start('range-textCheckerQueueSize-0', 'textCheckerQueueSize=0', [...A, '--port', nextPort()], cfg('textCheckerQueueSize=0\n'));
fail('range-cacheSize-neg', 'cacheSize=-1', [...A, '--port', nextPort()], cfg('cacheSize=-1\n'));
fail('range-cacheTTL-without-size', 'cacheTTLSeconds without cacheSize', [...A, '--port', nextPort()], cfg('cacheTTLSeconds=60\n'));
start('range-cacheTTL-with-size', 'cacheSize + cacheTTLSeconds', [...A, '--port', nextPort()], cfg('cacheSize=100\ncacheTTLSeconds=60\n'));
start('range-cacheTTL-with-size-zero', 'cacheSize=0 with cacheTTLSeconds present is accepted', [...A, '--port', nextPort()], cfg('cacheTTLSeconds=60\ncacheSize=0\n'));
fail('range-cacheTTL-neg', 'cacheTTLSeconds negative with cacheSize', [...A, '--port', nextPort()], cfg('cacheSize=5\ncacheTTLSeconds=-5\n'));
fail('mode-atd', 'mode=AfterTheDeadline', [...A, '--port', nextPort()], cfg('mode=AfterTheDeadline\n'));
fail('mode-atd-lower', 'mode=afterthedeadline (case-insensitive)', [...A, '--port', nextPort()], cfg('mode=afterthedeadline\n'));
fail('mode-atd-padded', 'mode= AfterTheDeadline (leading blanks stripped by Properties)', [...A, '--port', nextPort()], cfg('mode= AfterTheDeadline\n'));
start('mode-trailing-space', 'mode=AfterTheDeadline with trailing space is not equal -> accepted', [...A, '--port', nextPort()], cfg('mode=AfterTheDeadline \n'));
start('mode-other', 'mode=foo accepted', [...A, '--port', nextPort()], cfg('mode=foo\n'));
fail('premiumOnly-true', 'premiumOnly=true in the open source build', [...A, '--port', nextPort()], cfg('premiumOnly=true\n'));
fail('premiumOnly-true-padded', 'premiumOnly= TRUE ', [...A, '--port', nextPort()], cfg('premiumOnly= TRUE \n'));
start('premiumOnly-false', 'premiumOnly=false / garbage', [...A, '--port', nextPort()], cfg('premiumOnly=yes\n'));
start('premiumAlways-true', 'premiumAlways=true in config: stdout "*** Running in PREMIUM-ALWAYS mode"', [...A, '--port', nextPort()], cfg('premiumAlways=true\n'));
start('premiumAlways-padded', 'premiumAlways= TRUE  (trimmed)', [...A, '--port', nextPort()], cfg('premiumAlways= TRUE \n'));
start('premiumAlways-false', 'premiumAlways=false', [...A, '--port', nextPort()], cfg('premiumAlways=false\n'));
start('premiumAlways-garbage', 'premiumAlways=on', [...A, '--port', nextPort()], cfg('premiumAlways=on\n'));
start('premiumAlways-empty', 'premiumAlways= (empty value)', [...A, '--port', nextPort()], cfg('premiumAlways=\n'));
start('anonymous-false', 'anonymousAccessAllowed=false: stdout "*** Running in RESTRICTED-ACCESS mode"', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed=false\n'));
start('anonymous-true', 'anonymousAccessAllowed=true', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed=true\n'));
start('anonymous-padded-false', 'anonymousAccessAllowed= false  (trimmed)', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed= false \n'));
start('anonymous-garbage', 'anonymousAccessAllowed=0 -> false -> restricted', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed=0\n'));
start('premium-both', 'premiumAlways=true and anonymousAccessAllowed=false: both mode lines in file order of the code', [...A, '--port', nextPort()], cfg('anonymousAccessAllowed=false\npremiumAlways=true\n'));

// ===== file-path keys (SRV-0041, 0042, 0057, 0183, 0191, 0037)
fail('rulesFile-missing', 'rulesFile nonexistent', [...A, '--port', nextPort()], cfg('rulesFile=nofile.cfg\n'));
fail('rulesFile-dir', 'rulesFile is a directory', [...A, '--port', nextPort()], { ...cfg('rulesFile=adir\n'), 'adir/x': 'x' });
start('rulesFile-ok', 'rulesFile existing (empty .languagetool.cfg)', [...A, '--port', nextPort()], { ...cfg('rulesFile=rules.cfg\n'), 'rules.cfg': '' });
fail('remoteRulesFile-missing', 'remoteRulesFile nonexistent', [...A, '--port', nextPort()], cfg('remoteRulesFile=nofile.json\n'));
fail('remoteRulesFile-dir', 'remoteRulesFile is a directory', [...A, '--port', nextPort()], { ...cfg('remoteRulesFile=adir\n'), 'adir/x': 'x' });
start('remoteRulesFile-ok', 'remoteRulesFile existing (empty file)', [...A, '--port', nextPort()], { ...cfg('remoteRulesFile=r.json\n'), 'r.json': '[]' });
fail('beolingus-missing', 'beolingusFile nonexistent', [...A, '--port', nextPort()], cfg('beolingusFile=nofile.txt\n'));
start('beolingus-ok', 'beolingusFile existing', [...A, '--port', nextPort()], { ...cfg('beolingusFile=b.txt\n'), 'b.txt': '' });
start('nerUrl', 'nerUrl set (log line only)', [...A, '--port', nextPort()], cfg('nerUrl=http://localhost:1/ner\n'));
start('grammalecte', 'grammalecteServer/User/Password set', [...A, '--port', nextPort()], cfg('grammalecteServer=http://localhost:1/g\ngrammalecteUser=u\ngrammalectePassword=p\n'));
fail('fasttext-model-missing', 'fasttextModel + fasttextBinary: model missing', [...A, '--port', nextPort()], { ...cfg('fasttextModel=nomodel\nfasttextBinary=/bin/true\n') });
fail('fasttext-model-dir', 'fasttextModel is a directory', [...A, '--port', nextPort()], { ...cfg('fasttextModel=mdir\nfasttextBinary=/bin/true\n'), 'mdir/x': 'x' });
fail('fasttext-binary-missing', 'fasttextBinary missing (model ok)', [...A, '--port', nextPort()], { ...cfg('fasttextModel=m.bin\nfasttextBinary=nobin\n'), 'm.bin': 'x' });
fail('fasttext-binary-dir', 'fasttextBinary is a directory', [...A, '--port', nextPort()], { ...cfg('fasttextModel=m.bin\nfasttextBinary=bdir\n'), 'm.bin': 'x', 'bdir/x': 'x' });
fail('fasttext-binary-not-exec', 'fasttextBinary not executable', [...A, '--port', nextPort()], { ...cfg('fasttextModel=m.bin\nfasttextBinary=b.bin\n'), 'm.bin': 'x', 'b.bin': 'x' });
start('fasttext-both-ok', 'fasttextModel (any file) + fasttextBinary=/bin/true (executable): accepted, fastText process started lazily', [...A, '--port', nextPort()], { ...cfg('fasttextModel=m.bin\nfasttextBinary=/bin/true\n'), 'm.bin': 'x' });
fail('fasttext-both-missing', 'both missing: model reported first', [...A, '--port', nextPort()], cfg('fasttextModel=nomodel\nfasttextBinary=nobin\n'));
start('fasttext-only-model', 'only fasttextModel set: ignored', [...A, '--port', nextPort()], cfg('fasttextModel=nomodel\n'));
start('fasttext-only-binary', 'only fasttextBinary set: ignored', [...A, '--port', nextPort()], cfg('fasttextBinary=nobin\n'));
fail('ngram-lang-ident-missing', 'ngramLangIdentData nonexistent', [...A, '--port', nextPort()], cfg('ngramLangIdentData=nofile.zip\n'));
fail('ngram-lang-ident-dir', 'ngramLangIdentData is a directory', [...A, '--port', nextPort()], { ...cfg('ngramLangIdentData=adir\n'), 'adir/x': 'x' });
fail('ngram-lang-ident-file', 'ngramLangIdentData existing file that is not a ZIP: startup fails', [...A, '--port', nextPort()], { ...cfg('ngramLangIdentData=z.zip\n'), 'z.zip': 'x' });
fail('conf-no-placeholder', 'ruleIdToConfidenceFile without {lang}', [...A, '--port', nextPort()], { ...cfg('ruleIdToConfidenceFile=conf.csv\n'), 'conf.csv': 'X,0.5\n' });
fail('conf-no-files', 'ruleIdToConfidenceFile with {lang} but no matching file', [...A, '--port', nextPort()], cfg('ruleIdToConfidenceFile=conf-{lang}.csv\n'));
fail('conf-bad-float', 'confidence file with a bad float', [...A, '--port', nextPort()], { ...cfg('ruleIdToConfidenceFile=conf-{lang}.csv\n'), 'conf-en.csv': 'COMMA_PARENTHESIS_WHITESPACE,abc\n' });
fail('conf-bad-line', 'confidence file line without comma', [...A, '--port', nextPort()], { ...cfg('ruleIdToConfidenceFile=conf-{lang}.csv\n'), 'conf-en.csv': '# comment\nJUST_ONE_COLUMN\n' });
start('conf-ok', 'confidence file for en and de', [...A, '--port', nextPort()], { ...cfg('ruleIdToConfidenceFile=conf-{lang}.csv\n'), 'conf-en.csv': '# c\nCOMMA_PARENTHESIS_WHITESPACE,0.5,extra\nDOUBLE_PUNCTUATION,1\n', 'conf-de.csv': 'WHITESPACE_RULE,0.25\n' });
fail('conf-ok-empty-file', 'confidence file with only comments: no mappings -> RuntimeException', [...A, '--port', nextPort()], { ...cfg('ruleIdToConfidenceFile=conf-{lang}.csv\n'), 'conf-en.csv': '# only comments\n' });
fail('serverurl-invalid', 'serverURL not a URI', [...A, '--port', nextPort()], cfg('serverURL=http://[bad\n'));
fail('serverurl-space', 'serverURL with a space', [...A, '--port', nextPort()], cfg('serverURL=ht tp://x y\n'));
start('serverurl-forms', 'serverURL forms: only the path is kept', [...A, '--port', nextPort()], cfg('serverURL=https://user@host.example:8443/api/v1/?q=1#frag\n'));
fail('trusted-sources-bad', 'trustedSources not a regex', [...A, '--port', nextPort()], cfg('trustedSources=[\n'));
start('trusted-sources-ok', 'trustedSources regex', [...A, '--port', nextPort()], cfg('trustedSources=https://.*\\.example\\.org/.*\n'));
fail('abtest-clients-bad', 'abTestClients not a regex', [...A, '--port', nextPort()], cfg('abTestClients=(\n'));
start('abtest-ok', 'abTest / abTestClients / abTestRollout', [...A, '--port', nextPort()], cfg('abTest=a,b, c\nabTestClients=client.*\nabTestRollout=50\n'));
start('abtest-empty', 'abTest= (blank)', [...A, '--port', nextPort()], cfg('abTest=   \n'));
start('abtest-rollout-range', 'abTestRollout=500 (no range validation here)', [...A, '--port', nextPort()], cfg('abTestRollout=500\n'));
start('third-party-ai', 'defaultThirdPartyAI=true (not a known key: warning)', [...A, '--port', nextPort()], cfg('defaultThirdPartyAI=true\n'));

// ===== database / redis / monitoring keys (SRV-0051, 0185, 0187)
fail('db-logging-nothing', 'dbLogging=true without driver/url/user/password', [...A, '--port', nextPort()], cfg('dbLogging=true\n'));
fail('db-logging-partial', 'dbLogging=true with only driver, url, username', [...A, '--port', nextPort()], cfg('dbLogging=true\ndbDriver=x\ndbUrl=y\ndbUsername=z\n'));
fail('db-logging-padded', 'dbLogging= TRUE  (trimmed)', [...A, '--port', nextPort()], cfg('dbLogging= TRUE \n'));
start('db-logging-false-others', 'dbLogging=false with no database', [...A, '--port', nextPort()], cfg('dbLogging=false\n'));
fail('db-driver-class-missing', 'dbDriver set to a missing class: DatabaseAccess.init fails', [...A, '--port', nextPort()], cfg('dbDriver=foo.Bar\n'));
start('db-driver-full', 'dbDriver/Url/Username/Password set, driver class not available (server starts, no connection yet)', [...A, '--port', nextPort()], cfg('dbDriver=org.nonexistent.Driver\ndbUrl=jdbc:x:y\ndbUsername=u\ndbPassword=p\n'));
start('db-driver-full-logging', 'as above with dbLogging=true (server starts)', [...A, '--port', nextPort()], cfg('dbLogging=true\ndbDriver=org.nonexistent.Driver\ndbUrl=jdbc:x:y\ndbUsername=u\ndbPassword=p\n'));
start('db-graceful', 'gracefulDatabaseFailure=true without a database', [...A, '--port', nextPort()], cfg('gracefulDatabaseFailure=true\n'));
start('redis-keys', 'redis keys parsed (no connection at startup)', [...A, '--port', nextPort()], cfg('redisHost=localhost\nredisPort=6380\nredisDatabase=2\nredisPassword=p\nredisUseSSL=false\nredisDictTTLSeconds=5\nredisTimeoutMilliseconds=7\nredisConnectionTimeoutMilliseconds=9\nredisCertificate=c\nredisKey=k\nredisKeyPassword=kp\n'));
start('redis-sentinel', 'sentinel keys parsed', [...A, '--port', nextPort()], cfg('redisUseSentinel=true\nsentinelHost=localhost\nsentinelPort=1\nsentinelPassword=p\nsentinelMasterId=m\n'));
start('prometheus-on', 'prometheusMonitoring=true on port 18190', [...A, '--port', nextPort()], cfg('prometheusMonitoring=true\nprometheusPort=18190\n'));
start('prometheus-off', 'prometheusMonitoring=false with prometheusPort=18191 (not opened)', [...A, '--port', nextPort()], cfg('prometheusMonitoring=false\nprometheusPort=18191\n'));
start('prometheus-garbage', 'prometheusMonitoring=maybe -> false', [...A, '--port', nextPort()], cfg('prometheusMonitoring=maybe\n'));
start('misc-keys', 'jwtSecret/externalRollout*/dict limit/styleGuide/skipLogging/passwortLoginAccessListPath/requestLimitAccessToken parsed', [...A, '--port', nextPort()], cfg('jwtSecret=s\nexternalRolloutServiceUrl=http://x\nexternalRolloutServiceApiKey=k\ndictLimitUser=1\ndictLimitTeam=2\nstyleGuideLimitUser=3\nstyleGuideLimitTeam=4\nskipLoggingRuleMatches=true\nskipLoggingChecks=true\nslowRuleLoggingThreshold=250\npasswortLoginAccessListPath=/x\nrequestLimitAccessToken=t\n'));
start('limits-keys', 'all limit keys valid', [...A, '--port', nextPort()], cfg('requestLimit=10\nrequestLimitInBytes=1000\ntimeoutRequestLimit=3\nrequestLimitPeriodInSeconds=60\nipFingerprintFactor=3\nrequestLimitWhitelistUsers=a, b,c\nrequestLimitWhitelistLimit=5\nmaxWorkQueueSize=50\nmaxPipelinePoolSize=7\npipelineExpireTimeInSeconds=30\npipelineCaching=true\npipelinePrewarming=false\n'));
start('lang-prefs-keys', 'localApiMode/motherTongue/preferredLanguages parsed', [...A, '--port', nextPort()], cfg('localApiMode=true\nmotherTongue=de-DE\npreferredLanguages= en-US, de-DE ,fr\n'));
start('disabled-rules-key', 'disabledRuleIds list', [...A, '--port', nextPort()], cfg('disabledRuleIds=A, B,C\n'));
start('blocked-referrers-key', 'blockedReferrers list', [...A, '--port', nextPort()], cfg('blockedReferrers=a.com, b.com\n'));

// ===== port selection by range (SRV-0017, SRV-0018)
start('port0-range', '--port 0 with minPort/maxPort: first free port of the range', ['--port', '0', ...A], cfg('minPort=18180\nmaxPort=18185\n'));
start('port0-range-first-busy', '--port 0: first two ports busy', ['--port', '0', ...A], cfg('minPort=18180\nmaxPort=18185\n'), { occupyPorts: [18180, 18181] });
fail('port0-range-all-busy', '--port 0: every port in the range busy -> "No free port in range"', ['--port', '0', ...A], cfg('minPort=18180\nmaxPort=18182\n'), { occupyPorts: [18180, 18181, 18182] });
start('port0-range-last', '--port 0 where only the max port is free (range is inclusive)', ['--port', '0', ...A], cfg('minPort=18180\nmaxPort=18182\n'), { occupyPorts: [18180, 18181] });
fail('port0-no-range', '--port 0 without minPort/maxPort', ['--port', '0']);
fail('port0-min-eq-max', '--port 0 with minPort == maxPort', ['--port', '0', ...A], cfg('minPort=18180\nmaxPort=18180\n'));
fail('port0-min-gt-max', '--port 0 with minPort > maxPort', ['--port', '0', ...A], cfg('minPort=18185\nmaxPort=18180\n'));
fail('port0-min-zero', '--port 0 with minPort=0', ['--port', '0', ...A], cfg('minPort=0\nmaxPort=18180\n'));
fail('port0-min-neg', '--port 0 with minPort=-1', ['--port', '0', ...A], cfg('minPort=-1\nmaxPort=18180\n'));
start('port-ignores-range', 'explicit --port ignores minPort/maxPort', ['--port', '18186', ...A], cfg('minPort=18180\nmaxPort=18182\n'));
fail('port-in-use', 'port already in use: PortBindingException text (SRV-0017)', ['--port', '18187'], undefined, { occupyPorts: [18187] });
fail('port-in-use-config', 'port in use with a config file', ['--port', '18187', ...A], cfg('maxTextLength=10\n'), { occupyPorts: [18187] });
fail('port-in-use-public', 'port in use with --public', ['--port', '18187', '--public'], undefined, { occupyPorts: [18187] });
fail('port-privileged', 'port 80 (privileged, no root)', ['--port', '80']);
fail('port-1', 'port 1', ['--port', '1']);

// ===== dynamic languages (SRV-0059); files under dyn/, relative paths (cwd = work dir)
const DYN = (code, extra = {}) => ({ ['dyn/' + code + '.dic']: '4\nhello\nworld\nfoo/S\nBär\n', ['dyn/' + code + '.aff']: 'SET UTF-8\nSFX S Y 1\nSFX S 0 s .\n', 'dyn/common_words.txt': 'hello\nworld\nfoo\n', ...extra });
start('dyn-ok', 'dynamic spell-check language tr=Turkish', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.dic\n'), ...DYN('tr') });
start('dyn-ok-variant', 'dynamic language with variant code tr-TR', [...A, '--port', nextPort()], { ...cfg('lang-tr-TR=Turkish (Turkey)\nlang-tr-TR-dictPath=dyn/tr.dic\n'), ...DYN('tr') });
fail('dyn-code-too-long', 'code of four letters without dash', [...A, '--port', nextPort()], { ...cfg('lang-abcd=Abcd\nlang-abcd-dictPath=dyn/abcd.dic\n'), ...DYN('abcd') });
fail('dyn-code-one-letter', 'code of one letter', [...A, '--port', nextPort()], { ...cfg('lang-x=X\nlang-x-dictPath=dyn/x.dic\n'), ...DYN('x') });
fail('dyn-code-digit', 'lang-1 (digit key does not match lang-[a-z]+: unknown-key warning then code check)', [...A, '--port', nextPort()], { ...cfg('lang-12=Numeric\nlang-12-dictPath=dyn/n.dic\n'), ...DYN('n') });
fail('dyn-no-dictpath', 'lang-xx without lang-xx-dictPath', [...A, '--port', nextPort()], cfg('lang-tr=Turkish\n'));
start('dyn-only-dictpath', 'lang-tr-dictPath alone: ignored (no lang- key)', [...A, '--port', nextPort()], { ...cfg('lang-tr-dictPath=dyn/tr.dic\n'), ...DYN('tr') });
fail('dyn-dict-missing', 'dictPath points to a missing file', [...A, '--port', nextPort()], cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/nope.dic\n'));
fail('dyn-dict-dir', 'dictPath is a directory', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/dir.dic\n'), 'dyn/dir.dic/x': 'x' });
fail('dyn-dict-wrong-ext', 'dictPath with extension .txt', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.txt\n'), ...DYN('tr', { 'dyn/tr.txt': 'x' }) });
fail('dyn-no-common-words', 'common_words.txt missing', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.dic\n'), 'dyn/tr.dic': '1\nhello\n', 'dyn/tr.aff': 'SET UTF-8\n' });
start('dyn-no-aff', 'hunspell .aff missing (server starts)', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.dic\n'), 'dyn/tr.dic': '1\nhello\n', 'dyn/common_words.txt': 'hello\n' });
start('dyn-dict-garbage', '.dic with garbage content (server starts)', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.dic\n'), 'dyn/tr.dic': 'not a dictionary\n\u0000\u0001', 'dyn/tr.aff': 'SET UTF-8\n', 'dyn/common_words.txt': 'hello\n' });
start('dyn-no-name-value-empty', 'lang-tr= (empty name)', [...A, '--port', nextPort()], { ...cfg('lang-tr=\nlang-tr-dictPath=dyn/tr.dic\n'), ...DYN('tr') });
fail('dyn-code-no-profile', 'dynamic language without a language-identifier profile (xy): server cannot start', [...A, '--port', nextPort()], { ...cfg('lang-xy=Xylish\nlang-xy-dictPath=dyn/xy.dic\n'), ...DYN('xy') });
start('dyn-two', 'two dynamic languages (tr, sv)', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=dyn/tr.dic\nlang-sv=Swedish\nlang-sv-dictPath=dyn/sv.dic\n'), ...DYN('tr'), 'dyn/sv.dic': '2\nhej\nvärld\n', 'dyn/sv.aff': 'SET UTF-8\n' });
start('dyn-existing-code', 'dynamic language with the code of a built-in language (en): server starts', [...A, '--port', nextPort()], { ...cfg('lang-en=English2\nlang-en-dictPath=dyn/en.dic\n'), ...DYN('en') });
start('dyn-absolute-dictpath', 'dictPath given with ./ prefix', [...A, '--port', nextPort()], { ...cfg('lang-tr=Turkish\nlang-tr-dictPath=./dyn/tr.dic\n'), ...DYN('tr') });

// ===== HTTPS server usage and config errors (SRV-0177), mainClass HTTPSServer
const https = (name, d, args, files, more = {}) => cliWrite(name, d, { mainClass: 'org.languagetool.server.HTTPSServer', stderrExceptionOnly: true, args, ...(files ? { files } : {}), ...more });
https('https-no-args', 'HTTPSServer without arguments: usage, exit 1', []);
https('https-h', 'HTTPSServer -h', ['-h']);
https('https-help', 'HTTPSServer --help', ['--help']);
https('https-h-with-port', 'HTTPSServer -h --port N: no usage, "--config must be set"', ['-h', '--port', '18192']);
https('https-no-config', 'HTTPSServer --port N without --config', ['--port', '18192']);
https('https-public-no-config', 'HTTPSServer --public without --config', ['--public']);
https('https-config-missing-file', 'HTTPSServer --config nonexistent file', ['--config', 'nope.properties', '--port', '18192']);
https('https-config-empty', 'HTTPSServer config without keystore', ['--config', 'c.properties', '--port', '18192'], cfg(''));
https('https-config-no-password', 'HTTPSServer config with keystore but no password', ['--config', 'c.properties', '--port', '18192'], cfg('keystore=k.jks\n'));
https('https-config-no-keystore', 'HTTPSServer config with password but no keystore', ['--config', 'c.properties', '--port', '18192'], cfg('password=p\n'));
https('https-config-blank-keystore', 'HTTPSServer keystore with blank value', ['--config', 'c.properties', '--port', '18192'], cfg('keystore=   \npassword=p\n'));
https('https-config-blank-password', 'HTTPSServer password with blank value', ['--config', 'c.properties', '--port', '18192'], cfg('keystore=k.jks\npassword=   \n'));
https('https-keystore-missing', 'HTTPSServer keystore file does not exist', ['--config', 'c.properties', '--port', '18192'], cfg('keystore=k.jks\npassword=p\n'));
https('https-keystore-garbage', 'HTTPSServer keystore with invalid content', ['--config', 'c.properties', '--port', '18192'], { ...cfg('keystore=k.jks\npassword=p\n'), 'k.jks': 'not a keystore' });
https('https-config-dir', 'HTTPSServer --config is a directory', ['--config', '.', '--port', '18192']);
https('https-config-bad-number', 'HTTPSServer common key with bad number: HTTPServerConfig parsing runs first', ['--config', 'c.properties', '--port', '18192'], cfg('maxTextLength=abc\nkeystore=k\npassword=p\n'));
https('https-bad-port', 'HTTPSServer --port abc', ['--config', 'c.properties', '--port', 'abc'], cfg('keystore=k\npassword=p\n'));
https('https-premium-always', 'HTTPSServer --premiumAlways', ['--config', 'c.properties', '--port', '18192', '--premiumAlways'], cfg('keystore=k\npassword=p\n'));
https('https-unknown-key', 'HTTPSServer unknown config key plus missing keystore: warning on stderr, message on stdout', ['--config', 'c.properties', '--port', '18192'], cfg('foo=1\n'), { stderrFilter: WARN, stderrExceptionOnly: undefined });
https('https-config-twice', 'HTTPSServer two --config options: last one is used for keystore/password', ['--config', 'a.properties', '--config', 'c.properties', '--port', '18192'], { 'a.properties': 'keystore=k\npassword=p\n', 'c.properties': '' });
https('https-config-last', 'HTTPSServer --config as last argument', ['--port', '18192', '--config']);
https('https-port-in-use-keystore-bad', 'HTTPSServer port occupied and keystore bad: BindException branch (SRV-0021 text)', ['--config', 'c.properties', '--port', '18193'], { ...cfg('keystore=k.jks\npassword=p\n'), 'k.jks': 'x' }, { occupyPorts: [18193] });

// ===== HTTP behaviour that depends on config keys (SRV-0031..0036, 0043..0049, 0053..0055)
const MAXLEN = get('/v2/maxtextlength');
for (const [name, content, d] of [
  ['props-equals', 'maxTextLength=42\n', 'key=value'],
  ['props-colon', 'maxTextLength: 42\n', 'key: value'],
  ['props-space', 'maxTextLength 42\n', 'key value'],
  ['props-tab', 'maxTextLength\t42\n', 'key<TAB>value'],
  ['props-leading-ws', '   maxTextLength   =   42\n', 'whitespace around key and value'],
  ['props-comment', '# maxTextLength=1\n! maxTextLength=2\nmaxTextLength=42\n', 'comments'],
  ['props-duplicate', 'maxTextLength=1\nmaxTextLength=42\n', 'duplicate key, last wins'],
  ['props-continuation', 'maxTextLength=4\\\n  2\n', 'line continuation joins value (leading blanks of the next line dropped)'],
  ['props-unicode-escape', 'maxTextLength=\\u0034\\u0032\n', 'unicode escapes in the value'],
  ['props-escaped-key', 'max\\Text\\Length=42\n', 'backslash before ordinary characters is dropped'],
  ['props-crlf', 'maxTextLength=42\r\n', 'CRLF line ending'],
  ['props-cr-only', 'maxTextLength=42\rmaxTextHardLength=100\r', 'CR only line endings'],
  ['props-plus', 'maxTextLength=+42\n', 'leading plus'],
  ['props-leading-zero', 'maxTextLength=0042\n', 'leading zeros (decimal)'],
  ['props-negative', 'maxTextLength=-42\n', 'negative value'],
  ['props-unicode-escape-digits', 'maxTextLength=\\u0664\\u0662\n', 'Arabic-Indic digits through unicode escapes (Integer.parseInt accepts them)'],
  ['props-int-max', 'maxTextLength=2147483647\n', 'Integer.MAX_VALUE'],
  ['props-int-min', 'maxTextLength=-2147483648\n', 'Integer.MIN_VALUE'],
  ['props-empty-config', '', 'empty file: defaults'],
  ['props-max-length-keys', 'maxTextLength=100\nmaxTextLengthAnonymous=7\n', 'anonymous override'],
  ['props-anonymous-only', 'maxTextLengthAnonymous=9\n', 'anonymous key alone (maxTextLength default MAX)'],
  ['props-premium-only', 'maxTextLengthPremium=9\nmaxTextLengthLoggedIn=8\n', 'premium / loggedIn keys do not change the anonymous limit'],
]) {
  httpWrite(name, `config ${d}: /v2/maxtextlength and a check around the limit`, { ...CHTTP(content), requests: [MAXLEN, chk('a'.repeat(41)), chk('a'.repeat(42)), chk('a'.repeat(43)), chk('a'.repeat(9)), chk('a'.repeat(10))] });
}
httpWrite('cfg-server-url-forms', 'serverURL forms (SRV-0036): path prefix handling for several request paths', {
  ...CHTTP('serverURL=https://user@host.example:8443/api/v1/?q=1#frag\n'),
  requests: [get('/api/v1/v2/maxtextlength'), get('/v2/maxtextlength'), get('/api/v1/'), get('/api/v1'), get('/api/v1/v2/healthcheck'), get('/api/v2/maxtextlength'), get('/api/v1//v2/maxtextlength'), get('/API/V1/v2/maxtextlength'),
    { ...chk(TXT), path: '/api/v1/v2/check' }, get('/'), get('/other')],
});
httpWrite('cfg-server-url-root', 'serverURL=/ (empty prefix)', { ...CHTTP('serverURL=/\n'), requests: [get('/v2/maxtextlength'), get('/'), get('/x/v2/maxtextlength')] });
httpWrite('cfg-server-url-empty', 'serverURL= (empty string)', { ...CHTTP('serverURL=\n'), requests: [get('/v2/maxtextlength'), get('/x'), get('/v2/nothing')] });
httpWrite('cfg-server-url-trailing', 'serverURL=/api/ with trailing slash', { ...CHTTP('serverURL=/api/\n'), requests: [get('/api/v2/maxtextlength'), get('/api/'), get('/api'), get('/apix/v2/maxtextlength'), get('/v2/maxtextlength')] });
httpWrite('cfg-server-url-nested-v2', 'serverURL=/v2x: prefix equal to part of the API path', { ...CHTTP('serverURL=/v2x\n'), requests: [get('/v2x/v2/maxtextlength'), get('/v2/maxtextlength'), get('/v2x'), get('/v2x/')] });
fail('serverurl-escaped', 'serverURL=/a%20b: getPath() decodes the escape, the second URI parse fails (SRV-0036)', [...A, '--port', nextPort()], cfg('serverURL=/a%20b\n'));
httpWrite('cfg-server-url-umlaut', 'serverURL with umlaut (config read as Latin-1: mojibake prefix)', { ...CHTTP('serverURL=/äpi\n'), requests: [get('/%C3%A4pi/v2/maxtextlength'), get('/äpi/v2/maxtextlength'), get('/v2/maxtextlength')] });
httpWrite('cfg-server-url-relative', 'serverURL without a leading slash (relative URI)', { ...CHTTP('serverURL=api\n'), requests: [get('/api/v2/maxtextlength'), get('/v2/maxtextlength'), get('/api'), get('/x')] });

const SPELL = 'MORFOLOGIK_RULE_EN_US';
const spellReq = (t = 'This is a tset of speling.') => post('/v2/check', { language: 'en-US', text: t, enabledRules: SPELL, enabledOnly: 'true' });
httpWrite('cfg-suggestions-enabled', 'suggestionsEnabled=false (SRV-0045): spelling matches without replacements?', { ...CHTTP('suggestionsEnabled=false\n'), requests: [spellReq(), chk(TXT)] });
httpWrite('cfg-suggestions-default', 'suggestionsEnabled default true', { requests: [spellReq(), chk(TXT)] });
httpWrite('cfg-max-spelling-suggestions-1', 'maxSpellingSuggestions=1', { ...CHTTP('maxSpellingSuggestions=1\n'), requests: [spellReq('A tset and a speling mistaek and wrod.'), chk(TXT)] });
httpWrite('cfg-max-spelling-suggestions-5', 'maxSpellingSuggestions=5', { ...CHTTP('maxSpellingSuggestions=5\n'), requests: [spellReq('A tset and a speling mistaek and wrod.')] });
httpWrite('cfg-max-spelling-suggestions-neg', 'maxSpellingSuggestions=-1', { ...CHTTP('maxSpellingSuggestions=-1\n'), requests: [spellReq('A tset and a speling mistaek and wrod.')] });
httpWrite('cfg-disabled-rules', 'disabledRuleIds (SRV-0054): disabled in every pipeline, also when enabled by the request', {
  ...CHTTP('disabledRuleIds=DOUBLE_PUNCTUATION, WHITESPACE_RULE,EN_UNPAIRED_BRACKETS\n'),
  requests: [chk('This is a test,, ok.. And (bracket  open.'), post('/v2/check', { language: 'en-US', text: 'This is a test,, ok.. And (bracket  open.', enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' }), post('/v2/check', { language: 'en-US', text: 'This is a test,, ok.. And (bracket  open.', enabledRules: 'DOUBLE_PUNCTUATION,COMMA_PARENTHESIS_WHITESPACE', enabledOnly: 'true' })],
});
httpWrite('cfg-disabled-rules-empty', 'disabledRuleIds= (empty)', { ...CHTTP('disabledRuleIds=\n'), requests: [chk('This is a test,, ok.. And (bracket  open.')] });
httpWrite('cfg-cache', 'cacheSize=10 (SRV-0043): repeated checks give identical results', { ...CHTTP('cacheSize=10\ncacheTTLSeconds=30\n'), requests: [chk(TXT), chk(TXT), chk('Another one,, here. ' + TXT), chk(TXT)] });
httpWrite('cfg-pipeline-caching', 'pipelineCaching=true / maxPipelinePoolSize=2 / pipelineExpireTimeInSeconds=5 (SRV-0034)', { ...CHTTP('pipelineCaching=true\nmaxPipelinePoolSize=2\npipelineExpireTimeInSeconds=5\n'), requests: [chk(TXT), chk(TXT), chk(TXT, { disabledRules: 'DOUBLE_PUNCTUATION' }), chk(TXT)] });
httpWrite('cfg-pipeline-prewarming', 'pipelinePrewarming=true with preferredLanguages=en-US', { ...CHTTP('pipelineCaching=true\npipelinePrewarming=true\npreferredLanguages=en-US\n'), requests: [chk(TXT)] });
httpWrite('cfg-local-api-mode', 'localApiMode=true (SRV-0055): detection restricted to preferredLanguages; motherTongue', {
  ...CHTTP('localApiMode=true\npreferredLanguages=en-US, de-DE\nmotherTongue=de-DE\n'),
  requests: [post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble at all.', ...ONLY(EN) }), post('/v2/check', { language: 'auto', text: 'Das ist ein ziemlich langer deutscher Satz,, den den der Detektor erkennen kann.', ...ONLY('DE_DOUBLE_PUNCTUATION,GERMAN_WORD_REPEAT_RULE,COMMA_PARENTHESIS_WHITESPACE') }), chk(TXT), chk(TXT, { motherTongue: 'fr' })],
});
httpWrite('cfg-local-api-mode-default-prefs', 'localApiMode=true without preferredLanguages', { ...CHTTP('localApiMode=true\n'), requests: [post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble at all.', ...ONLY(EN) }), chk(TXT)] });
httpWrite('cfg-mother-tongue', 'motherTongue=de-DE without localApiMode (key accepted; request motherTongue param decides)', { ...CHTTP('motherTongue=de-DE\n'), requests: [chk(TXT), chk(TXT, { motherTongue: 'de-DE' })] });
httpWrite('cfg-preferred-languages', 'preferredLanguages without localApiMode', { ...CHTTP('preferredLanguages=de-DE\n'), requests: [post('/v2/check', { language: 'auto', text: 'This is a longer english sentence,, that the the detector can handle without any trouble at all.', ...ONLY(EN) })] });
httpWrite('cfg-skip-logging', 'skipLoggingChecks/skipLoggingRuleMatches/slowRuleLoggingThreshold do not change responses', { ...CHTTP('skipLoggingChecks=true\nskipLoggingRuleMatches=true\nslowRuleLoggingThreshold=1\n'), requests: [chk(TXT)] });
httpWrite('cfg-trusted-sources', 'trustedSources regex with useragent parameter', { ...CHTTP('trustedSources=https://.*\\.example\\.org/.*\n'), requests: [chk(TXT, { useragent: 'https://a.example.org/x' }), chk(TXT, { useragent: 'other' }), chk(TXT)] });
httpWrite('cfg-confidence-file', 'ruleIdToConfidenceFile (SRV-0037): confidence values appear in matches', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'ruleIdToConfidenceFile={WORK}/conf-{lang}.csv\n', 'conf-en.csv': '# c\nDOUBLE_PUNCTUATION,0.75\nCOMMA_PARENTHESIS_WHITESPACE,0.5,debug\nWHITESPACE_RULE,x\n'.replace('WHITESPACE_RULE,x\n', 'WHITESPACE_RULE,0.125\n') },
  requests: [chk('This is a test,, ok.. And (bracket  open.'), chk('Fine sentence.', {}), chk('Das ist ein Test,, ok.', {}, 'de-DE', 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION')],
});
httpWrite('cfg-rules-file', 'rulesFile (.languagetool.cfg style) configures every pipeline (SRV-0041)', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'rulesFile={WORK}/rules.cfg\n', 'rules.cfg': 'disabledRules.en=DOUBLE_PUNCTUATION\nenabledRules.en=WHITESPACE_RULE\nmotherTongue=de\n' },
  requests: [chk('This is a test,, ok.. And (bracket  open.'), post('/v2/check', { language: 'en-US', text: 'This is a test,, ok.. And (bracket  open.', enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' })],
});
httpWrite('cfg-rules-file-empty', 'empty rulesFile', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'rulesFile={WORK}/rules.cfg\n', 'rules.cfg': '' }, requests: [chk(TXT)] });
httpWrite('cfg-language-model-dir', 'languageModel directory without ngram data: server runs', { serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'languageModel={WORK}/lm\n', 'lm/readme.txt': 'x' }, requests: [chk(TXT)] });
httpWrite('cfg-mode-key', 'mode=LanguageTool / other values do not change behaviour', { ...CHTTP('mode=LanguageTool\n'), requests: [chk(TXT)] });
httpWrite('cfg-max-check-threads-1', 'maxCheckThreads=1: sequential requests all answered', { ...CHTTP('maxCheckThreads=1\n'), requests: [chk(TXT), chk(TXT), get('/v2/healthcheck')] });
httpWrite('cfg-text-checker-threads', 'maxTextCheckerThreads=1 / textCheckerQueueSize=1', { ...CHTTP('maxTextCheckerThreads=1\ntextCheckerQueueSize=1\n'), requests: [chk(TXT), get('/v2/healthcheck'), chk(TXT)] });
httpWrite('cfg-text-checker-queue-0', 'textCheckerQueueSize=0: healthcheck queue test (queue size 0 > 0/2 never)', { ...CHTTP('textCheckerQueueSize=0\n'), requests: [get('/v2/healthcheck'), chk(TXT)] });
httpWrite('cfg-dynamic-lang-check', 'dynamic language tr: check text, unknown word flagged by the hunspell speller (SRV-0059)', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'lang-tr=Turkish\nlang-tr-dictPath={WORK}/dyn/tr.dic\n', ...DYN('tr') },
  requests: [post('/v2/check', { language: 'tr', text: 'hello wrld foos Bär' }), post('/v2/check', { language: 'tr', text: 'hello world foo' }), post('/v2/check', { language: 'tr-TR', text: 'hello wrld' }), post('/v2/check', { language: 'auto', text: 'hello wrld' }), get('/v2/maxtextlength')],
});
httpWrite('cfg-dynamic-lang-languages', 'dynamic language listed in /v2/languages (endpoint ported later; Java list restricted to in-scope plus dynamic)', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'lang-tr=Turkish\nlang-tr-dictPath={WORK}/dyn/tr.dic\n', ...DYN('tr') },
  requests: [{ ...get('/v2/languages'), languagesList: true }],
});
httpWrite('cfg-dynamic-lang-variant', 'dynamic language with variant code tr-TR: language=tr and tr-TR', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'lang-tr-TR=Turkish (Turkey)\nlang-tr-TR-dictPath={WORK}/dyn/tr.dic\n', ...DYN('tr') },
  requests: [post('/v2/check', { language: 'tr-TR', text: 'hello wrld' }), post('/v2/check', { language: 'tr', text: 'hello wrld' }), post('/v2/check', { language: 'tr-XX', text: 'hello wrld' })],
});
httpWrite('cfg-dynamic-lang-no-aff-words', 'dynamic language with suffix flag: foos accepted via foo/S, Bär', {
  serverArgs: ['--config', '{WORK}/server.properties'],
  files: { 'server.properties': 'lang-tr=Turkish\nlang-tr-dictPath={WORK}/dyn/tr.dic\n', ...DYN('tr') },
  requests: [post('/v2/check', { language: 'tr', text: 'foos foo foo, Bär bär BÄR' }), post('/v2/check', { language: 'tr', text: '' }), post('/v2/check', { language: 'tr', text: 'hello,, world' })],
});
httpWrite('cfg-premium-always-limits', 'premiumAlways=true: premium text limit and "premium" flag in software info', { ...CHTTP('premiumAlways=true\nmaxTextLengthAnonymous=5\nmaxTextLengthPremium=50\n'), requests: [chk('a'.repeat(6)), chk('a'.repeat(51)), MAXLEN, get('/v2/info')] });
httpWrite('cfg-hard-limit-vs-soft', 'maxTextHardLength smaller than maxTextLength: body guard acts first', { ...CHTTP('maxTextHardLength=10\nmaxTextLength=100000\n'), requests: [chk('a'.repeat(500)), { method: 'POST', path: '/v2/check', body: 'language=en-US&text=' + 'a'.repeat(120), contentType: 'application/x-www-form-urlencoded' }, { method: 'POST', path: '/v2/check', body: 'language=en-US&text=' + 'a'.repeat(5000), contentType: 'application/x-www-form-urlencoded' }, MAXLEN] });
httpWrite('cfg-all-limits-default', 'defaults: maxtextlength = Integer.MAX_VALUE', { requests: [MAXLEN] });
httpWrite('cfg-unknown-and-known', 'unknown key warning does not stop the server', { ...CHTTP('foo=bar\nmaxTextLength=33\n'), requests: [MAXLEN] });
httpWrite('cfg-max-text-hard-in-info', 'configinfo reports maxTextHardLength (endpoint ported later)', { ...CHTTP('maxTextHardLength=77\n'), requests: [get('/v2/configinfo', { language: 'en-US' })] });
httpWrite('cfg-two-configs', 'two --config files: later overrides', { serverArgs: ['--config', '{WORK}/a.properties', '--config', '{WORK}/b.properties'], files: { 'a.properties': 'maxTextLength=11\nmaxTextHardLength=500\n', 'b.properties': 'maxTextLength=22\n' }, requests: [MAXLEN] });
httpWrite('cfg-two-configs-reset', 'second --config re-reads all keys: keys missing in the second file fall back to defaults', { serverArgs: ['--config', '{WORK}/a.properties', '--config', '{WORK}/b.properties'], files: { 'a.properties': 'maxTextLength=11\n', 'b.properties': 'maxTextHardLength=500\n' }, requests: [MAXLEN] });
httpWrite('cfg-verbose-flag', '--verbose with a config file', { serverArgs: ['-v', '--config', '{WORK}/server.properties'], files: { 'server.properties': 'maxTextLength=12\n' }, requests: [MAXLEN, chk('a'.repeat(13))] });
httpWrite('cfg-port-key-ignored', 'port= in the config file is not a key', { ...CHTTP('port=1\n'), requests: [MAXLEN] });
httpWrite('cfg-stoppable-flag', '--stoppable: /v2/stop prefix paths', { serverArgs: ['--stoppable'], requests: [get('/v2/maxtextlength')] });
httpWrite('cfg-public-flag', '--public: responses unchanged', { serverArgs: ['--public'], requests: [MAXLEN, chk(TXT)] });
httpWrite('cfg-allow-origin-default-star', '--allow-origin without value: * on all API responses and errors', { serverArgs: ['--allow-origin'], requests: [MAXLEN, chk(TXT), get('/v2/nothing'), get('/'), get('/v2/healthcheck')] });

// Pin the CLI ports to the ones already used by existing fixtures (keeps fixtures consistent when cases are added or removed).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
for (const f of readdirSync(OUT)) {
  const name = f.replace(/\.json$/, '');
  const gold = path.join(ROOT, 'tests/golden/X-SRV-START', name, 'case.json');
  if (!existsSync(gold)) continue;
  const g = JSON.parse(readFileSync(gold, 'utf8'));
  const c = JSON.parse(readFileSync(path.join(OUT, f), 'utf8'));
  if (c.kind !== 'cli' || !Array.isArray(g.args) || g.args.length !== c.args.length) continue;
  const same = JSON.stringify({ ...c, args: 0 }) === JSON.stringify({ ...g, args: 0 });
  if (same) writeFileSync(path.join(OUT, f), JSON.stringify({ ...c, args: g.args }, null, 1) + '\n');
}
