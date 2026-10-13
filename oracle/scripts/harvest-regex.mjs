// Harvests every regex used at runtime in wave-1 scope (core, cli, server, de/en/fr) -> oracle/cases/X-REGEX/harvest/*.json
// Runtime part: harness op regex-harvest walks all loaded rules (token/postag/exception/antipattern/regexp-rule/Match/chunk).
// Static part: Java literals (best effort), filter args in rule XML, wrongWordInContext.txt, ProhibitedCompoundRule blacklist.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';
import { walk, scanFile, FLAG, evalString, collectConsts, stripComments, parseArgs } from './lib-java-literals.mjs';

const J = path.join(ROOT, 'oracle/java-src');
const OUT = path.join(ROOT, 'oracle/cases/X-REGEX/harvest');
mkdirSync(OUT, { recursive: true });
const LANGS = ['de-DE', 'de-AT', 'de-CH', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'fr', 'fr-CA', 'fr-CH', 'fr-BE'];
const CI = FLAG.CASE_INSENSITIVE | FLAG.UNICODE_CASE;
const entries = []; // {source, kind, pattern, flags, where, examples?}

// ---- A. runtime (rules loaded by the original) ----
execFileSync(path.join(ROOT, 'oracle/scripts/build-trace-shim.sh'), { stdio: 'inherit' });
const r = await runHarness({ shim: true, ops: LANGS.map((l) => ({ op: 'regex-harvest', args: { lang: l } })) });
const lines = r.responses.split('\n').filter(Boolean);
if (lines.length !== LANGS.length) throw new Error('harvest: missing responses\n' + r.stderr.toString().slice(-2000));
lines.forEach((l, i) => {
  const j = JSON.parse(l);
  if (!j.ok) throw new Error(`harvest ${LANGS[i]}: ${JSON.stringify(j.error)}`);
  for (const e of j.result) {
    const src = e.kind.startsWith('disamb-') ? 'xml-disambiguation' : e.kind.startsWith('grammar-') ? 'xml-grammar' : 'xml';
    entries.push({ source: src, kind: e.kind, pattern: e.pattern, flags: e.flags, where: e.srcs.slice(0, 2), examples: e.examples });
  }
});
const runtimeRaw = entries.length;

// ---- B. static Java literals ----
const DIRS = ['languagetool-core', 'languagetool-commandline', 'languagetool-server', 'languagetool-language-modules/de', 'languagetool-language-modules/en', 'languagetool-language-modules/fr'];
const dynamic = [];
for (const d of DIRS) {
  for (const f of walk(path.join(J, d, 'src/main/java'), '.java').sort()) {
    const rel = path.relative(J, f);
    const { found, dynamic: dyn } = scanFile(f);
    for (const x of found) entries.push({ source: x.kind.startsWith('java-') ? 'java-helper' : 'java-literal', kind: x.kind, pattern: x.pattern, flags: x.flags, where: [`${rel}:${x.line}`] });
    for (const x of dyn) dynamic.push({ kind: x.kind, expr: x.expr, where: `${rel}:${x.line}` });
  }
}

// ProhibitedCompoundRule blacklistRegex (String.matches(".*" + k + ".*"))
{
  const f = path.join(J, 'languagetool-language-modules/de/src/main/java/org/languagetool/rules/de/ProhibitedCompoundRule.java');
  const src = stripComments(readFileSync(f, 'utf8'));
  const i = src.indexOf('blacklistRegex = Arrays.asList(');
  const { args } = parseArgs(src, i + 'blacklistRegex = Arrays.asList('.length);
  const consts = collectConsts(src);
  for (const a of args) { const v = evalString(a, consts); if (v !== null) entries.push({ source: 'text-list', kind: 'text-list-blacklistRegex', pattern: '.*' + v + '.*', flags: 0, where: ['ProhibitedCompoundRule.blacklistRegex'] }); }
}

// ---- C. text lists: wrongWordInContext.txt (\b(word)\b, (?i) hoisted) ----
for (const lang of ['de', 'en', 'fr']) {
  const dir = path.join(J, `languagetool-language-modules/${lang}/src/main/resources/org/languagetool/rules/${lang}`);
  let files = [];
  try { files = readdirSync(dir).filter((x) => x === 'wrongWordInContext.txt'); } catch { /* none */ }
  for (const fn of files) {
    const text = readFileSync(path.join(dir, fn), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim() || line[0] === '#') continue;
      const col = line.split('\t');
      if (col.length < 6) continue;
      for (const c of [col[0], col[1], col[4], col[5]]) {
        let s = c; let ic = '';
        if (s.startsWith('(?i)')) { s = s.slice(4); ic = '(?i)'; }
        entries.push({ source: 'text-list', kind: 'text-list-wrongWordInContext', pattern: `${ic}\\b(${s})\\b`, flags: 0, where: [`${lang}/${fn}`] });
      }
    }
  }
}

// ---- D. filter args in rule XML (best effort) ----
const FILTER_KEYS = new Set(['desiredpostag', 'removesuggestionsregexp', 'postagselect', 'lemmaselect', 'requireregexp', 'antipatterns', 'regexp']);
for (const lang of ['de', 'en', 'fr']) {
  const dir = path.join(J, `languagetool-language-modules/${lang}/src/main/resources/org/languagetool/rules/${lang}`);
  for (const fn of readdirSync(dir).filter((x) => x.endsWith('.xml')).sort()) {
    const text = readFileSync(path.join(dir, fn), 'utf8');
    for (const m of text.matchAll(/<filter\s[^>]*?args="([^"]*)"/g)) {
      const args = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      for (const kv of args.split(/\s+/)) {
        const k = kv.indexOf(':');
        if (k < 1) continue;
        const key = kv.slice(0, k);
        if (FILTER_KEYS.has(key.toLowerCase())) entries.push({ source: 'xml-filter-arg', kind: `filter-arg:${key}`, pattern: kv.slice(k + 1), flags: 0, where: [`${lang}/${fn}`] });
      }
    }
  }
}

// ---- E. dedupe ----
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const bySource = {};
const map = new Map();
for (const e of entries) {
  bySource[e.source] ??= { raw: 0, newDistinct: 0 };
  bySource[e.source].raw++;
  const key = `${e.flags}\u0000${e.pattern}`;
  let p = map.get(key);
  if (!p) { p = { pattern: e.pattern, flags: e.flags, kinds: new Set(), sources: new Set(), where: [], examples: [] }; map.set(key, p); bySource[e.source].newDistinct++; }
  p.kinds.add(e.kind); p.sources.add(e.source);
  if (p.where.length < 3) for (const w of e.where) if (p.where.length < 3 && !p.where.includes(w)) p.where.push(w);
  if (e.examples) for (const x of e.examples) if (p.examples.length < 8 && !p.examples.includes(x)) p.examples.push(x);
}
const pats = [...map.values()].sort((a, b) => cmp(a.pattern, b.pattern) || a.flags - b.flags);
pats.forEach((p, i) => { p.id = `r${String(i).padStart(5, '0')}`; p.kinds = [...p.kinds].sort(); p.sources = [...p.sources].sort(); });
writeFileSync(path.join(OUT, 'patterns.json'), JSON.stringify(pats));
writeFileSync(path.join(OUT, 'dynamic-sites.json'), JSON.stringify(dynamic, null, 1));
const perFlags = {};
for (const p of pats) perFlags[p.flags] = (perFlags[p.flags] ?? 0) + 1;
const report = { runtimeRaw, totalRaw: entries.length, distinct: pats.length, bySource, perFlags, dynamicSites: dynamic.length, languages: LANGS };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
