// Writes oracle/cases/X-ORACLE-CHECK/*.json: small sample proving the content ops and the cli/http kinds.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const dir = path.join(ROOT, 'oracle/cases/X-ORACLE-CHECK');
mkdirSync(dir, { recursive: true });
const write = (name, o) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(o, null, 2) + '\n');

const firstSentences = (lang, n) => readFileSync(path.join(ROOT, `oracle/corpus/${lang}/corpus.txt`), 'utf8')
  .split('\n\n').slice(0, n).map((p) => p.match(/^.*?[.!?](?=\s|$)/s)[0].trim());
const SAMPLE = {
  'de-DE': { corpus: 'de', bad: ['Das ist ein Tesst.', 'Das ist ist gut.'] },
  'en-US': { corpus: 'en', bad: ['This are a test.', 'I has a apple.'] },
  fr: { corpus: 'fr', bad: ['Je suis aller au marché.', 'Les chat mange.'] },
};
const desc = { 'de-DE': 'German', 'en-US': 'English', fr: 'French' };
for (const [lang, s] of Object.entries(SAMPLE)) {
  const texts = [...firstSentences(s.corpus, 3), ...s.bad];
  write(`check-${lang}`, {
    kind: 'harness', clock: 'fixed', description: `${desc[lang]}: 5 sentences through check`, compare: 'check', normalize: [],
    ops: texts.map((text) => ({ op: 'check', args: { lang, text } })),
  });
}
write('analyze-en', {
  kind: 'harness', clock: 'fixed', description: 'analyze with pre-disambiguation tokens', compare: 'analyze', normalize: [],
  ops: [{ op: 'analyze', args: { lang: 'en-US', text: 'I saw a cat. It runs fast.', preDisambiguation: true } }],
});
write('analyze-de', {
  kind: 'harness', clock: 'fixed', description: 'analyze German sentence (lemma/POS/chunks)', compare: 'analyze', normalize: [],
  ops: [{ op: 'analyze', args: { lang: 'de-DE', text: 'Der Hund läuft schnell. Er hat Hunger.' } }],
});
write('check-options', {
  kind: 'harness', clock: 'fixed', description: 'check options: disabled rule, enabledOnly, level picky, mother tongue, error path', compare: 'check', normalize: [],
  ops: [
    { op: 'check', args: { lang: 'de-DE', text: 'Das ist ist gut. Das ist ein Tesst.', disabledRules: ['GERMAN_WORD_REPEAT_RULE'] } },
    { op: 'check', args: { lang: 'de-DE', text: 'Das ist ist gut. Das ist ein Tesst.', enabledRules: ['GERMAN_WORD_REPEAT_RULE'], enabledOnly: true } },
    { op: 'check', args: { lang: 'en-US', text: 'This is a very good and really nice test, it is fine.', level: 'PICKY' } },
    { op: 'check', args: { lang: 'en-US', text: 'I has a apple.', motherTongue: 'de-DE' } },
    { op: 'check', args: { lang: 'xx-nonexistent', text: 'x' } },
  ],
});
write('rule-examples-fr-sample', {
  kind: 'harness', clock: 'fixed', description: 'rule-examples: 3 French rules, restricted and unrestricted', compare: 'rule-examples', normalize: [],
  ops: [{ op: 'rule-examples', args: { lang: 'fr', offset: 5, limit: 3 } }],
});
write('disambiguation-examples-de-sample', {
  kind: 'harness', clock: 'fixed', description: 'disambiguation-examples: German rules 0..60', compare: 'disambiguation-examples', normalize: [],
  ops: [{ op: 'disambiguation-examples', args: { lang: 'de', offset: 0, limit: 60 } }],
});
write('rules-list-fr', {
  kind: 'harness', clock: 'fixed', description: 'rules-list French', compare: 'rules-list', normalize: [],
  ops: [{ op: 'rules-list', args: { lang: 'fr' } }],
});
write('http-check', {
  kind: 'http', clock: 'fixed', description: '/v2/check de-DE and en-US, error path, languages', compare: 'api', normalize: ['buildDate', 'commit'], serverArgs: [],
  requests: [
    { method: 'POST', path: '/v2/check', params: { language: 'de-DE', text: 'Das ist ein Tesst. Das ist ist gut.' } },
    { method: 'POST', path: '/v2/check', params: { language: 'en-US', text: 'This are a test.', level: 'picky' } },
    { method: 'GET', path: '/v2/check', params: { language: 'fr', text: 'Je suis aller au marché.' } },
    { method: 'POST', path: '/v2/check', params: { language: 'xx-nonexistent', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { text: 'Das ist ein Tesst.', language: 'auto' } },
    { method: 'GET', path: '/v2/healthcheck' },
  ],
});
write('cli-check', {
  kind: 'cli', clock: 'fixed', description: 'languagetool-commandline plain output from stdin', compare: 'cli', normalize: ['buildDate', 'commit', 'durations'],
  args: ['-l', 'de-DE', '-'], stdin: 'Das ist ein Tesst. Das ist ist gut.\n',
});
write('cli-check-json', {
  kind: 'cli', clock: 'fixed', description: 'commandline --json for a file', compare: 'cli', normalize: ['buildDate', 'commit'],
  args: ['-l', 'en-US', '--json', 'in.txt'], files: { 'in.txt': 'This are a test. I has a apple.\n' },
});
write('cli-version', {
  kind: 'cli', clock: 'fixed', description: 'commandline --version (build date/commit normalised)', compare: 'cli', normalize: ['buildDate', 'commit'],
  args: ['--version'],
});
write('cli-error', {
  kind: 'cli', clock: 'fixed', description: 'commandline error path: missing file', compare: 'cli', normalize: ['stackFrames'],
  args: ['-l', 'en-US', 'does-not-exist.txt'],
});
