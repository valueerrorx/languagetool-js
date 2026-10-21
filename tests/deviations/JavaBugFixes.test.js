// Tests of the fixed Java bugs DEV-013 .. DEV-027 (D-055/D-056, docs/review/CRASHBUGS.md CB-01..CB-15).
// End-to-end through the oracle adapters (bin/lt-cli.mjs, bin/lt-server.mjs), plus direct unit tests.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as cliAdapter from '../../oracle/adapters/cli.mjs';
import * as httpAdapter from '../../oracle/adapters/http.mjs';

const PORT_ENV = { ORACLE_PORT_MIN: process.env.ORACLE_PORT_MIN ?? '19300', ORACLE_PORT_MAX: process.env.ORACLE_PORT_MAX ?? '19399' };
Object.assign(process.env, PORT_ENV);

async function runCli(cs) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-dev-'));
  mkdirSync(path.join(workDir, 'tmp'));
  try {
    return await cliAdapter.run({ kind: 'cli', clock: 'fixed', ...cs }, { workDir });
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}
async function runHttp(cs) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-dev-'));
  try {
    return (await httpAdapter.run({ kind: 'http', clock: 'fixed', ...cs }, { workDir })).responses;
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}
const post = (pth, params) => ({ method: 'POST', path: pth, params });
const ruleXml = (lang, id, extra) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${lang}">\n<category id="CAT1" name="cat">\n<rule id="${id}" name="r">${extra}</rule>\n</category>\n</rules>\n`;

describe('Java bug fixes (CB-01..CB-15)', () => {
  // DEV-013, DEV-014, DEV-021, DEV-022, DEV-023
  it('server check requests (CB-01, CB-02, CB-09, CB-10, CB-11)', async () => {
    const sentence = 'This is a very long sentence that goes on and on and on without any good reason whatsoever, and it keeps going with more and more words until the reader loses all interest in it completely.';
    const long = { language: 'en-US', text: sentence, enabledRules: 'TOO_LONG_SENTENCE', enabledOnly: 'true' };
    const r = await runHttp({ requests: [
      post('/v2/check', { language: 'de-DE', text: '?', sourceLanguage: 'en-US', sourceText: 'Hi' }), // 0 CB-01
      post('/v2/check', { language: 'de-DE', text: '', sourceLanguage: 'en-US', sourceText: 'Hello world' }), // 1 CB-02
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE' }), // 2 CB-09
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE:' }), // 3
      post('/v2/check', { ...long, ruleValues: ':' }), // 4
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE:;10' }), // 5
      post('/v2/check', { ...long, ruleValues: '' }), // 6 empty = no values
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE:;' }), // 7 CB-10 empty array
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE:btrue' }), // 8 CB-10 wrong type
      post('/v2/check', { language: 'en-US', text: 'Some text.', enabledCategories: '' }), // 9 CB-11
      post('/v2/check', { language: 'en-US', text: 'Some text.', disabledCategories: '' }), // 10
      post('/v2/check', { ...long, ruleValues: 'TOO_LONG_SENTENCE:5' }), // 11
    ] });
    expect(r[0].status).toBe(200);
    const m0 = r[0].body.matches.filter((m) => m.rule.id === 'DIFFERENT_PUNCTUATION');
    expect(m0.length).toBe(1);
    expect(m0[0].offset).toBe(0);
    expect(m0[0].length).toBe(1);
    expect(r[1].status).toBe(200);
    expect(r[1].body.matches.some((m) => m.rule.id === 'TRANSLATION_LENGTH')).toBe(false);
    for (const i of [2, 3, 4, 5]) {
      expect(r[i].status).toBe(400);
      expect(String(r[i].body)).toContain("Invalid 'ruleValues' entry");
    }
    for (const i of [6, 7, 8]) {
      expect(r[i].status).toBe(200);
    }
    expect(r[11].status).toBe(200); // control: a valid value is still accepted
    expect(r[9].status).toBe(200);
    expect(r[10].status).toBe(200);
  }, 120000);

  // DEV-024
  it('words batch without words (CB-12)', async () => {
    const r = await runHttp({
      serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': 'premiumAlways=true\n' },
      requests: [post('/v2/words/add', { mode: 'batch' }), post('/v2/words/delete', { mode: 'batch' })],
    });
    for (const x of r) {
      expect(x.status).toBe(400);
      expect(String(x.body)).toContain("Missing 'words' parameter");
    }
  }, 120000);

  // DEV-015
  it('false friend example without type (CB-03)', async () => {
    const ff = '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en" xsi:noNamespaceSchemaLocation="../false-friends.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n<rulegroup id="R1"><rule><pattern lang="en"><token>foo</token></pattern><translation lang="de">bar</translation></rule><example>no type</example></rulegroup>\n</rules>\n';
    const res = await runCli({ args: ['-l', 'en-US', '-m', 'de-DE', '--falsefriends', 'ff.xml', '-'], stdin: 'It is foo.', files: { 'ff.xml': ff } });
    expect(res.stderr).not.toContain('NullPointerException');
    expect(res.stderr).toContain('<example> without type attribute in rule');
  }, 120000);

  // DEV-019
  it('--level without value (CB-07)', async () => {
    const res = await runCli({ args: ['-l', 'en-US', '--level'], stdin: 'x' });
    expect(res.stderr).not.toContain('ArrayIndexOutOfBounds');
    expect(res.stderr).toContain('Missing value for option --level');
    expect(res.exitCode).not.toBe(0);
  }, 120000);

  // DEV-020
  it('server options without value (CB-08)', async () => {
    for (const opt of ['--config', '-p', '--port', '--languageModel']) {
      const res = await runCli({ mainClass: 'org.languagetool.server.HTTPServer', args: [opt], stopOnOutput: 'never' });
      expect(res.stderr).not.toContain('ArrayIndexOutOfBounds');
      expect(res.stderr).toContain(`Missing value for option ${opt}`);
      expect(res.exitCode).toBe(1);
    }
  }, 120000);

  // DEV-018
  it('profile with --line-by-line (CB-06)', async () => {
    const res = await runCli({ args: ['-l', 'en-US', '-eo', '-e', 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,EN_UNPAIRED_BRACKETS,ENGLISH_WORD_REPEAT_RULE,SENTENCE_WHITESPACE', '--line-by-line', '-p', 'input.txt'], files: { 'input.txt': 'first line here here\nsecond  line\n\nthird paragraph ,here\nfourth line (open\n' } });
    expect(res.stderr).not.toContain('Not implemented for a text-level rule');
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Testing 7 rules');
  }, 120000);

  // DEV-017
  it('YMD/DMY date check filters (CB-05)', async () => {
    const mk = (lang, cls, token, date, week) => ruleXml(lang, 'R1', `<pattern><token>${token}</token></pattern><filter class="${cls}" args="date:${date} weekDay:\\1"/><message>msg {realDay}</message><example correction="">x ${token}.</example>`);
    const en = (token) => runCli({ args: ['-l', 'en-US', '--rulefile', 'rules.xml', '-'], stdin: `It is ${token}.`, files: { 'rules.xml': mk('en', 'org.languagetool.rules.en.YMDDateCheckFilter', token, '2020-01-01') } });
    const ok = await en('Wednesday'); // 2020-01-01 was a Wednesday
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).not.toContain('Rule ID: R1');
    const bad = await en('Monday');
    expect(bad.exitCode).toBe(0);
    expect(bad.stdout).toContain('Rule ID: R1');
    expect(bad.stdout).toContain('msg Wednesday');
    const unknown = await en('foo');
    expect(unknown.exitCode).toBe(0);
    expect(unknown.stdout).not.toContain('Rule ID: R1');
    const de = await runCli({ args: ['-l', 'de-DE', '--rulefile', 'rules.xml', '-'], stdin: 'Es ist Montag.', files: { 'rules.xml': mk('de', 'org.languagetool.rules.de.YMDDateCheckFilter', 'Montag', '2020-01-01') } });
    expect(de.stdout).toContain('Rule ID: R1');
    const fr = await runCli({ args: ['-l', 'fr', '--rulefile', 'rules.xml', '-'], stdin: 'Il est lundi.', files: { 'rules.xml': mk('fr', 'org.languagetool.rules.fr.DMYDateCheckFilter', 'lundi', '01-01-2020') } });
    expect(fr.stdout).toContain('Rule ID: R1');
    const frOk = await runCli({ args: ['-l', 'fr', '--rulefile', 'rules.xml', '-'], stdin: 'Il est mercredi.', files: { 'rules.xml': mk('fr', 'org.languagetool.rules.fr.DMYDateCheckFilter', 'mercredi', '01-01-2020') } });
    expect(frOk.exitCode).toBe(0);
    expect(frOk.stdout).not.toContain('Rule ID: R1');
  }, 240000);
});
