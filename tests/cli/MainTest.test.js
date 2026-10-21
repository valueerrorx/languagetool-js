// Ports of MainTest cases that need only ported rules (CLI-0005..0008, CLI-0036..0038, CLI-0042/0043, CLI-0046, CLI-0048, CLI-0066, CLI-0068), run as processes.
// F64 adds the option tests (rule file, -adl, -v, -a, --json, -b, -d/-e, -t, --falsefriends, -u, -r, --xmlfilter). Not ported: Polish/Catalan/Slovak/Breton variants (languages out of scope, replaced by en/de), Bitext variants use en->de (F65).
import { describe, it, expect } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BIN = path.resolve('bin/lt-cli.mjs');
const RULES = ['-eo', '-e', 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,EN_UNPAIRED_BRACKETS,ENGLISH_WORD_REPEAT_RULE,SENTENCE_WHITESPACE'];
const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-cli-'));
const enTestFile = path.join(dir, 'en.txt');
writeFileSync(enTestFile, 'This is an test.\n\nThis is a test of of language tool.\n\nThis is is a test of language tool.');

function run(args, stdin = '') {
  const r = spawnSync(process.execPath, [BIN, ...args], { input: stdin, cwd: dir, env: { ...process.env, TZ: 'Europe/Vienna' } });
  return { out: r.stdout.toString('utf8'), err: r.stderr.toString('utf8'), status: r.status };
}

// async variant (keeps the vitest worker responsive during the long full-rule-set runs)
function runAsync(args, stdin = '') {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [BIN, ...args], { cwd: dir, env: { ...process.env, TZ: 'Europe/Vienna' } });
    const o = [];
    const e = [];
    c.stdout.on('data', (d) => o.push(d));
    c.stderr.on('data', (d) => e.push(d));
    c.stdin.on('error', () => {});
    c.on('close', (status) => resolve({ out: Buffer.concat(o).toString('utf8'), err: Buffer.concat(e).toString('utf8'), status }));
    c.stdin.end(stdin);
  });
}

describe('MainTest', () => {
  it('testUsageMessage', () => {
    const r = run(['-h']);
    expect(r.out).toContain('Usage: java -jar languagetool-commandline.jar');
    expect(r.status).toBe(1);
  });

  it('testPrintLanguages', () => {
    const r = run(['--list']);
    expect(r.out).toContain('German');
    expect(r.out).toContain('de-DE');
    expect(r.out).toContain('English');
    expect(r.status).toBe(0);
  });

  it('--version (CLI-0005) prints version line, exit 0, usage wins', () => {
    const r = run(['--version']);
    expect(r.out).toMatch(/^LanguageTool version \S+ \(.+, \S+\)\n$/);
    expect(r.status).toBe(0);
    expect(run(['--version', '-h']).status).toBe(1);
  });

  it('plain listing of a file (CLI-0038, 0042, 0046, 0048)', () => {
    const r = run(['-l', 'en', ...RULES, enTestFile]);
    expect(r.err.startsWith('Expected text language: English (no spell checking active, specify a language variant like \'en-GB\' if available)\n')).toBe(true);
    expect(r.err).toContain(`Working on ${enTestFile}...\n`);
    expect(r.out).toContain('1.) Line 3, column 16, Rule ID: ENGLISH_WORD_REPEAT_RULE premium: false prio=-1\nMessage: Possible typo: you repeated a word.\nSuggestion: of\n');
    expect(r.out).toMatch(/Time: \d+ms for 3 sentences \([\d.]+ sentences\/sec\)\n$/);
    expect(r.status).toBe(0);
  });

  it('stdin, implicit and with -', () => {
    for (const args of [['-l', 'en-US', ...RULES], ['-l', 'en-US', ...RULES, '-']]) {
      const r = run(args, 'Two  spaces.');
      expect(r.err).toBe('Expected text language: English (US) (no spell checking active)\nWorking on STDIN...\n');
      expect(r.out).toContain('Rule ID: WHITESPACE_RULE');
    }
  });

  it('no language (CLI-0037)', () => {
    const r = run([...RULES, '-'], 'Hi  there.');
    expect(r.err).toBe("No language specified, using English (no spell checking active, specify a language variant like 'en-GB' if available)\nWorking on STDIN...\n");
  });

  it('errors print with class prefix, exit 1 (CLI-0036, 0068)', () => {
    const r = run(['-l']);
    expect(r.err).toBe('java.lang.IllegalArgumentException: Missing argument to -l/--language command line option.\n');
    expect(r.status).toBe(1);
    const u = run(['--bogus', 'f']);
    expect(u.err.startsWith('Unknown parameter: --bogus\nUsage: java -jar')).toBe(true);
    expect(u.status).toBe(1);
  });

  it('missing file: uncaught FileNotFoundException, no Working-on line (CLI-0042)', () => {
    const r = run(['-l', 'en-US', ...RULES, 'nope.txt']);
    expect(r.err).toMatch(/^Expected text language: .*\nException in thread "main" java\.io\.FileNotFoundException: nope\.txt \(No such file or directory\)\n/);
    expect(r.err).not.toContain('Working on');
    expect(r.status).toBe(1);
  });

  it('BOM kept in the text (CLI-0043)', () => {
    writeFileSync(path.join(dir, 'bom.txt'), Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('Hi  there.')]));
    const r = run(['-l', 'en-US', ...RULES, 'bom.txt']);
    expect(r.out).toContain('Line 1, column 2, Rule ID: WHITESPACE_RULE');
  });

  it('no active rules (CLI-0040)', () => {
    const r = run(['-l', 'en-US', '-eo', '-e', 'FOO_BAR', '-']);
    expect(r.err).toContain('Exception in thread "main" java.lang.RuntimeException: No rules are active. Please make sure your rule ids ([FOO_BAR]) and category ids ([]) are correct\n');
    expect(r.status).toBe(1);
  });

  // F64: MainTest option tests (full rule sets, process runs)
  const xxRuleFile = path.join(dir, 'rule.xml');
  writeFileSync(xxRuleFile, '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\nxmlns:xs="http://www.w3.org/2001/XMLSchema">\n<category id="CAT1" name="trivial category">\n<rule id="EXAMPLE_RULE" name="External rule to test">\n<pattern><token>language</token><token>tool</token></pattern>\n<message>This is wrong!</message>\n<example correction="">language tool</example>\n</rule></category></rules>');
  const xxFalseFriendFile = path.join(dir, 'ff.xml');
  writeFileSync(xxFalseFriendFile, '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rules SYSTEM "false-friends.dtd">\n<rules>\n<rulegroup id="GIFT_EN_DE">\n<rule>\n<pattern lang="en">\n<token>gift</token>\n</pattern>\n<translation lang="de">Geschenk</translation>\n</rule>\n<rule>\n<pattern lang="de">\n<token>Gift</token>\n</pattern>\n<translation lang="en">poison</translation>\n</rule>\n</rulegroup>\n</rules>\n    ');
  const A_AN = 'Rule ID: EN_A_VS_AN';

  it('testFileWithExternalRule (en)', async () => {
    const r = (await runAsync(['-l', 'en', '--rulefile', xxRuleFile, enTestFile]));
    expect(r.err.indexOf('Expected text language: English')).toBe(0);
    expect(r.out).toContain('Rule ID: EXAMPLE_RULE');
  });

  it('testEnglishFile, StdIn1, StdIn2', async () => {
    const r = (await runAsync(['-l', 'en', enTestFile]));
    expect(r.err.indexOf('Expected text language: English')).toBe(0);
    expect(r.out).toContain('1.) Line 1, column 9, Rule ID: EN_A_VS_AN');
    for (const a of [['-l', 'en'], ['-l', 'en', '-']]) {
      const q = (await runAsync(a, 'This is an test.'));
      expect(q.err.indexOf('Expected text language: English')).toBe(0);
      expect(q.out).toContain('1.) Line 1, column 9, Rule ID: EN_A_VS_AN');
    }
  });

  it('testEnglishFileAutoDetect, testEnglishStdInAutoDetect', async () => {
    const r = (await runAsync(['-adl', enTestFile]));
    expect(r.err).toContain('Using English for file');
    expect(r.out).toContain('1.) Line 1, column 9, Rule ID: EN_A_VS_AN');
    const q = (await runAsync(['-adl'], 'This is an test.'));
    expect(q.err.indexOf('Working on STDIN...')).toBe(0);
    expect(q.err).toContain('Using English for');
    expect(q.out).toContain('1.) Line 1, column 9, Rule ID: EN_A_VS_AN');
  });

  it('testStdInWithExternalFalseFriends (en/de)', async () => {
    const r = (await runAsync(['-l', 'en', '--falsefriends', xxFalseFriendFile, '--level', 'PICKY', '-m', 'de', '-'], 'A gift!\n'));
    expect(r.err).toContain('Expected text language: English');
    expect(r.err).toContain('Working on STDIN...');
    expect(r.out).toContain('Rule ID: GIFT_EN_DE');
  });

  it('testEnglishFileVerbose', async () => {
    const r = (await runAsync(['-l', 'en', '-v', enTestFile]));
    expect(r.err.indexOf('Expected text language: English')).toBe(0);
    expect(r.out).toContain('1.) Line 1, column 9, Rule ID: EN_A_VS_AN');
    expect(r.err).toContain('<S> This[this/DT,B-NP-singular|E-NP-singular] is[be/VBZ,B-VP] an[a/DT,B-NP-singular] test[test/NN,E-NP-singular].[./.,</S>./PCT,O]');
  });

  it('testEnglishFileApplySuggestions, StdIn3', async () => {
    const r = (await runAsync(['-l', 'en', '--apply', enTestFile]));
    expect(r.out).toContain('This is a test.\n\nThis is a test of LanguageTool.\n\nThis is a test of LanguageTool.');
    expect((await runAsync(['-l', 'en', '-a', '-'], 'This is an test.')).out).toBe('This is a test.');
  });

  it('testEnglishStdIn4 / JsonOutput', async () => {
    const r = (await runAsync(['-l', 'en', '--json', '-'], 'This is an test.\n\nThis is a test of of language tool.\n\nThis is is a test of language tool.'));
    const o = r.out;
    expect(o).toContain('{"software":{"name":"LanguageTool","version":"');
    expect(o).toContain('"language":{"name":"English","code":"en"');
    expect(o).toContain('{"message":"Use \\"a\\" instead of \'an\' if the following word doesn\'t start with a vowel sound, e.g. \'a sentence\', \'a university\'."');
    expect(o).toContain('"replacements":[{"value":"a"}]');
    expect(o).toContain('"offset":8');
    expect(o).toContain('"length":2,');
    expect(o).toContain('"context":{"text":"This is an test.  This is a test of of language tool.  ..."');
    expect(o).toContain('{"id":"EN_A_VS_AN",');
    expect(o).toContain('{"id":"MISC","name":"Miscellaneous"}}');
    expect(o).toContain('{"id":"ENGLISH_WORD_REPEAT_RULE"');
    expect(o).toContain('"shortMessage":"Wrong article"');
    expect(o).toContain('"issueType":"misspelling"');
    expect(o).toContain('"sentence":"This is an test."');
    expect(o).not.toContain('Time: ');
    expect(o.endsWith('[]}')).toBe(true);
  });

  it('testEnglishLineMode, testEnglishParaMode', async () => {
    expect((await runAsync(['-l', 'en', '-a', '-b', '-'], 'This is what I mean\nand you know it.')).out).toBe('This is what I mean\nAnd you know it.');
    expect((await runAsync(['-l', 'en', '-a', '-'], 'This is what I mean\nand you know it.')).out).toBe('This is what I mean\nand you know it.');
  });

  it('testEnglishFileRuleDisabled / Enabled / FakeRuleEnabled', async () => {
    const d = (await runAsync(['-l', 'en', '-d', 'EN_A_VS_AN', enTestFile]));
    expect(d.err.indexOf('Expected text language: English')).toBe(0);
    expect(d.out).not.toContain(A_AN);
    expect((await runAsync(['-l', 'en', '-e', 'EN_A_VS_AN', enTestFile])).out).toContain(A_AN);
    expect((await runAsync(['-l', 'en', '-e', 'FOO_BAR_BLABLA', '-'], 'Zwuasdac?')).err.indexOf('Expected text language: English')).toBe(0);
  });

  it('testEnglishFileAPI', async () => {
    const o = (await runAsync(['-l', 'en', '--json', enTestFile])).out;
    expect(o).toContain('"EN_A_VS_AN"');
    expect(o).toContain('"MISC"');
    expect(o).toContain('https://languagetool.org/insights/post/indefinite-articles/');
  });

  it('testGermanFileWithURL', async () => {
    const input = path.join(dir, 'de.txt');
    writeFileSync(input, 'Ward ihr zufrieden damit?');
    const o = (await runAsync(['-l', 'de', '--json', input])).out;
    expect(o).toContain('"WARD_VS_WART"');
    expect(o).toContain('https://www.korrekturen.de/beliebte_fehler/ward.shtml');
    expect((await runAsync(['-l', 'de', input])).out).toContain('More info: https://www.korrekturen.de/beliebte_fehler/ward.shtml');
  });

  it('testEnglishTagger', async () => {
    const r = (await runAsync(['-l', 'en', '--taggeronly', enTestFile]));
    expect(r.err.indexOf('Expected text language: English')).toBe(0);
    expect(r.out).toContain('<S> This[this/DT,B-NP-singular|E-NP-singular] is[be/VBZ,B-VP] an[a/DT,B-NP-singular] test[test/NN,E-NP-singular].[./.,</S>./PCT,O]');
  });

  it('testListUnknown / testNoListUnknown', async () => {
    const t = 'This is a test of Wuerstelwasser.\n';
    expect((await runAsync(['-l', 'en-US', '-u', '-'], t)).out).toContain('Unknown words: [Wuerstelwasser]');
    expect((await runAsync(['-l', 'en-US', '-'], t)).out).not.toContain('Unknown words:');
  });

  it('testNoXmlFilteringByDefault / testXmlFiltering', async () => {
    const t = 'This is <b>an</b> test.';
    expect((await runAsync(['-l', 'en', '-'], t)).out).toMatch(/^Time: /);
    const f = (await runAsync(['-l', 'en', '--xmlfilter', '-'], t));
    expect(f.out).toContain('Rule ID: EN_A_VS_AN');
  });

  it('recursive (-r) reports a file in a directory', async () => {
    mkdirSync(path.join(dir, 'rec', 'sub'), { recursive: true });
    writeFileSync(path.join(dir, 'rec', 'sub', 'a.txt'), 'Hi  there.');
    const r = (await runAsync(['-l', 'en-US', ...RULES, '-r', 'rec']));
    expect(r.out).toContain('Rule ID: WHITESPACE_RULE');
    const n = (await runAsync(['-l', 'en-US', ...RULES, '-r', 'nodir']));
    expect(n.err).toContain('java.lang.IllegalArgumentException: ');
    expect(n.err).toContain('is not a directory, cannot use recursion');
  });

  // F65: bitext mode (MainTest.testBitext*, en->de instead of en->pl)
  const btInput = path.join(dir, 'bt.txt');
  writeFileSync(btInput, 'This is a test.\tDas ist ein Test.\nTest\tTest\nab\tVery strange data indeed, much longer than the input and so on and on\n');
  const btRuleFile = path.join(dir, 'bt-rule.xml');
  writeFileSync(btRuleFile, '<?xml version="1.0" encoding="UTF-8"?>\n<rules targetLang="de" xsi:noNamespaceSchemaLocation="../bitext.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">\n<category id="CAT1" name="idioms">\n<rule lang="de" id="red_herring" name="Ext bitext rule">\n<pattern>\n\t<source lang="en">\n\t\t<token>is</token>\n\t\t<token>a</token>\n\t\t<token>red</token>\n\t\t<token>herring</token>\n\t</source>\n\t<target>\n\t\t<token>ein</token>\n\t\t<token>roter</token>\n\t\t<token>Hering</token>\n\t</target>\n</pattern>\n<message>Meinten Sie <suggestion>ein Ablenkungsmanöver</suggestion>?</message>\n<example type="correct"><srcExample>is a red herring</srcExample>\n<trgExample>ok ok</trgExample></example>\n<example type="incorrect" correction="ein Ablenkungsmanöver"><srcExample><marker>is a red herring</marker></srcExample>\n<trgExample><marker>ein roter Hering</marker></trgExample></example>\n</rule></category></rules>\n');

  it('testBitextMode', async () => {
    const r = await runAsync(['-l', 'de-DE', '-c', 'UTF-8', '--bitext', '-m', 'en', btInput]);
    expect(r.err.indexOf('Expected text language: German')).toBe(0);
    expect(r.out).toContain('Line 3, column 3, Rule ID: TRANSLATION_LENGTH');
  });

  it('testBitextModeWithDisabledRule', async () => {
    const r = await runAsync(['-l', 'de-DE', '--bitext', '-m', 'en', '-d', 'TRANSLATION_LENGTH', btInput]);
    expect(r.out).not.toContain('Rule ID: TRANSLATION_LENGTH');
  });

  it('testBitextModeWithEnabledRule', async () => {
    const r = await runAsync(['-l', 'de-DE', '--bitext', '-m', 'en', '-e', 'TRANSLATION_LENGTH', btInput]);
    expect(r.out).toContain('Rule ID: TRANSLATION_LENGTH');
  });

  it('testBitextModeApply', async () => {
    const f = path.join(dir, 'bt-apply.txt');
    writeFileSync(f, 'There is a dog.\tDas ist ein Hund.');
    const r = await runAsync(['-l', 'de-DE', '--bitext', '-m', 'en', '--apply', f]);
    expect(r.out.startsWith('Das ist ein Hund.')).toBe(true);
  });

  it('testBitextWithExternalRule', async () => {
    const f = path.join(dir, 'bt-ext.txt');
    writeFileSync(f, 'This is a red herring.\tDas ist ein roter Hering.');
    const r = await runAsync(['-l', 'de-DE', '-c', 'UTF-8', '--bitext', '-m', 'en', '--bitextrules', btRuleFile, f]);
    expect(r.out).toContain('Rule ID: red_herring');
  });

  it('bitext without -m (CLI-0061)', async () => {
    const r = await runAsync(['-l', 'de-DE', '--bitext', btInput]);
    expect(r.err).toContain('You have to set the source language (as mother tongue) in bitext mode');
  });
});
