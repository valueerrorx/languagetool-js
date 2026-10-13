// Comparator unit tests on real X-ORACLE-CHECK fixtures: self-compare passes, injected diffs are detected.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getComparator } from '../../oracle/comparators/index.mjs';
import { compareCheck } from '../../oracle/comparators/check.mjs';
import { compareApi } from '../../oracle/comparators/api.mjs';
import { compareCli } from '../../oracle/comparators/cli.mjs';
import { deepDiff, sameNumber } from '../../oracle/comparators/deep.mjs';
import { normalize } from '../../oracle/lib/normalizers.mjs';

const G = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../golden/X-ORACLE-CHECK');
const clone = (x) => JSON.parse(JSON.stringify(x));
const lines = (c) => readFileSync(path.join(G, c, 'responses.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const caseJson = (c) => JSON.parse(readFileSync(path.join(G, c, 'case.json'), 'utf8'));
const cases = existsSync(G) ? readdirSync(G).filter((c) => !c.startsWith('.')) : [];
const harnessCases = cases.filter((c) => caseJson(c).kind === 'harness');

describe('harness comparators: self-compare', () => {
  for (const c of harnessCases) {
    it(c, async () => {
      const cmp = await getComparator(caseJson(c).compare);
      expect(cmp(lines(c), clone(lines(c)))).toEqual([]);
    });
  }
});

describe('check comparator detects injected diffs', () => {
  const base = () => clone(lines('check-de-DE')[3]);
  const cmp = async (a) => (await getComparator('check'))([lines('check-de-DE')[3]], [a]);
  it('changed offset', async () => { const a = base(); a.result.matches[0].fromPos += 1; expect((await cmp(a)).join()).toMatch(/fromPos/); });
  it('changed suggestion order', async () => { const a = base(); a.result.matches[0].suggestions.reverse(); expect((await cmp(a)).length).toBeGreaterThan(0); });
  it('missing match', async () => { const a = base(); a.result.matches.pop(); expect((await cmp(a)).join()).toMatch(/count/); });
  it('match order', async () => {
    const e = lines('check-en-US')[3]; const a = clone(e); a.result.matches.reverse();
    expect(e.result.matches.length).toBe(2);
    expect(((await getComparator('check'))([e], [a])).length).toBeGreaterThan(0);
  });
  it('changed message', async () => { const a = base(); a.result.matches[0].message += 'x'; expect((await cmp(a)).join()).toMatch(/message/); });
  it('missing key', async () => { const a = base(); delete a.result.matches[0].shortMessage; expect((await cmp(a)).join()).toMatch(/shortMessage/); });
  it('sentence range', async () => { const a = base(); a.result.sentenceRanges[0][1] += 1; expect((await cmp(a)).length).toBeGreaterThan(0); });
  it('extended sentence range', async () => { const a = base(); a.result.extendedSentenceRanges[0].toPos += 1; expect((await cmp(a)).length).toBeGreaterThan(0); });
  it('error vs result', async () => { const a = base(); a.ok = false; a.error = { class: 'x', message: 'y', causes: [] }; expect((await cmp(a)).join()).toMatch(/ok/); });
  it('expected error path self-compares', async () => {
    const e = lines('check-options')[4];
    expect(e.ok).toBe(false);
    expect((await getComparator('check'))([e], [clone(e)])).toEqual([]);
    const a = clone(e); a.error.message += '!';
    expect((await getComparator('check'))([e], [a]).length).toBeGreaterThan(0);
  });
});

describe('analyze comparator detects injected diffs', () => {
  const e = lines('analyze-en')[0];
  const run = async (mut) => { const a = clone(e); mut(a.result); return (await getComparator('analyze'))([e], [a]); };
  it('lemma', async () => { expect((await run((r) => { r.sentences[0].tokens[3].readings[0].lemma = 'x'; })).join()).toMatch(/lemma/); });
  it('pos order', async () => { expect((await run((r) => { r.sentences[0].tokens[1].readings.reverse(); })).length).toBeGreaterThan(0); });
  it('startPos', async () => { expect((await run((r) => { r.sentences[0].tokens[3].startPos++; })).join()).toMatch(/startPos/); });
  it('chunk tag', async () => { expect((await run((r) => { r.sentences[0].tokens[1].chunkTags = []; })).join()).toMatch(/chunkTags/); });
  it('flag', async () => { expect((await run((r) => { r.sentences[0].tokens[1].immunized = true; })).join()).toMatch(/immunized/); });
  it('pre-disambiguation tokens', async () => { expect((await run((r) => { r.sentences[0].preDisambigTokens[1].readings.pop(); })).length).toBeGreaterThan(0); });
  it('historicalAnnotations not compared', async () => { expect(await run((r) => { r.sentences[0].tokens[1].historicalAnnotations = 'zz'; })).toEqual([]); });
});

describe('rule-examples / disambiguation-examples detect injected diffs', () => {
  it('restricted match', async () => {
    const e = lines('rule-examples-fr-sample')[0];
    const a = clone(e); a.result.examples.find((x) => x.restricted?.length).restricted[0].toPos++;
    expect((await getComparator('rule-examples'))([e], [a]).join()).toMatch(/restricted/);
  });
  it('unrestricted match removed', async () => {
    const e = lines('rule-examples-fr-sample')[0];
    const a = clone(e); a.result.examples.find((x) => x.unrestricted?.matches.length).unrestricted.matches.pop();
    expect((await getComparator('rule-examples'))([e], [a]).join()).toMatch(/unrestricted/);
  });
  it('disambiguation actual', async () => {
    const e = lines('disambiguation-examples-de-sample')[0];
    const a = clone(e); a.result.examples.find((x) => x.kind === 'ambiguous').actual += 'x';
    expect((await getComparator('disambiguation-examples'))([e], [a]).join()).toMatch(/actual/);
  });
});

describe('api comparator', () => {
  const exp = JSON.parse(readFileSync(path.join(G, 'http-check/responses.json'), 'utf8'));
  it('self-compare', () => { expect(compareApi(exp, clone(exp))).toEqual([]); });
  it('ignores software version/buildDate (D-023), number text and key order', () => {
    const a = clone(exp);
    a[0].software = undefined;
    a[0].body.software.version = '9.9'; a[0].body.software.buildDate = 'other';
    a[0].body = Object.fromEntries(Object.entries(a[0].body).reverse());
    expect(compareApi(exp, a)).toEqual([]);
  });
  it('detects status, offset, replacement order, text body, content type', () => {
    let a = clone(exp); a[3].status = 500; expect(compareApi(exp, a).join()).toMatch(/status/);
    a = clone(exp); a[0].body.matches[0].offset++; expect(compareApi(exp, a).join()).toMatch(/offset/);
    a = clone(exp); a[0].body.matches[0].replacements.reverse(); expect(compareApi(exp, a).length).toBeGreaterThan(0);
    a = clone(exp); a[3].body += ' '; expect(compareApi(exp, a).join()).toMatch(/text body/);
    a = clone(exp); a[5].contentType = 'application/json'; expect(compareApi(exp, a).join()).toMatch(/contentType/);
    a = clone(exp); a[0].body.language.code = 'x'; expect(compareApi(exp, a).length).toBeGreaterThan(0);
    a = clone(exp); a[0].body.matches.pop(); expect(compareApi(exp, a).join()).toMatch(/count/);
  });
});

describe('cli comparator', () => {
  const load = (c) => ({
    exitCode: Number(readFileSync(path.join(G, c, 'exit.txt'), 'utf8')),
    stdout: readFileSync(path.join(G, c, 'stdout.txt'), 'utf8'),
    stderr: readFileSync(path.join(G, c, 'stderr.txt'), 'utf8'),
    files: JSON.parse(readFileSync(path.join(G, c, 'files.json'), 'utf8')),
  });
  for (const c of cases.filter((x) => caseJson(x).kind === 'cli')) {
    it(`self-compare ${c}`, () => {
      const cs = caseJson(c);
      const n = { normalizers: cs.normalize, json: cs.args.includes('--json') };
      const e = load(c);
      expect(compareCli(e, clone(e), n)).toEqual([]);
    });
  }
  it('detects exit code, stdout, stderr and json diffs', () => {
    const e = load('cli-check');
    expect(compareCli(e, { ...clone(e), exitCode: 1 })[0]).toMatch(/exit/);
    expect(compareCli(e, { ...clone(e), stdout: e.stdout.replace('column 13', 'column 14') })[0]).toMatch(/stdout/);
    expect(compareCli(e, { ...clone(e), stderr: e.stderr + 'x' })[0]).toMatch(/stderr/);
    const j = load('cli-check-json');
    const bad = JSON.parse(j.stdout); bad.matches[0].offset++;
    expect(compareCli(j, { ...clone(j), stdout: JSON.stringify(bad) }, { json: true }).join()).toMatch(/offset/);
    const ok = JSON.parse(j.stdout); ok.software.buildDate = 'x'; ok.software.version = 'y';
    expect(compareCli(j, { ...clone(j), stdout: JSON.stringify(ok, null, 4) }, { json: true })).toEqual([]);
  });
  it('stack frames are removed, Caused by lines kept', () => {
    const e = load('cli-error');
    const a = clone(e); a.stderr = a.stderr.replace(/\tat .*\n/g, '');
    expect(compareCli(e, a)).toEqual([]);
    a.stderr = a.stderr.replace('FileNotFoundException', 'IOException');
    expect(compareCli(e, a).length).toBeGreaterThan(0);
  });
});

describe('normalisers', () => {
  it('buildDate and commit', () => {
    expect(normalize(['buildDate', 'commit'], 'LanguageTool version 6.9-SNAPSHOT (2026-10-12 18:33:54 +0200, 9b0be9d)'))
      .toBe('LanguageTool version 6.9-SNAPSHOT (<BUILDDATE>, <COMMIT>)');
    expect(normalize(['buildDate'], '{"buildDate":"2026-01-01"}')).toBe('{"buildDate":"<BUILDDATE>"}');
  });
  it('durations', () => { expect(normalize(['durations'], 'Time: 5207ms for 2 sentences (0.4 sentences/sec)\nkeep 12')).toBe('Time: #ms for # sentences (# sentences/sec)\nkeep 12'); });
  it('paths and stackFrames', () => {
    expect(normalize([], '/tmp/x/home/f', { workDir: '/tmp/x' })).toBe('<CASE>/home/f');
    expect(normalize(['stackFrames'], 'E: m\n\tat a.B.c(B.java:1)\nCaused by: X\n\t... 3 more')).toBe('E: m\nCaused by: X');
  });
});

describe('deepDiff', () => {
  it('floats equal after fround, integers exact', () => {
    expect(sameNumber(0.1, Math.fround(0.1))).toBe(true);
    expect(sameNumber(1, 2)).toBe(false);
    expect(deepDiff({ a: 1.0 }, { a: 1 })).toEqual([]);
  });
});
