// Ports of MainTest cases that need only ported rules (CLI-0005..0008, CLI-0036..0038, CLI-0042/0043, CLI-0046, CLI-0048, CLI-0066, CLI-0068), run as processes.
// Skipped (need rules/modules not ported yet): testFileWithExternalRule, testEnglishFile*/StdIn* EN_A_VS_AN texts, AutoDetect (EN_A_VS_AN), FalseFriends, Verbose, Apply, Json (EN_A_VS_AN), Line/ParaMode, Polish*, Bitext, Recursive, ListUnknown.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
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
});
