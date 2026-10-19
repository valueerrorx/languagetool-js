// Shared code of the X-BITEXT adapters (F39): JS twins of the BitextOps helpers (docs/review/F39-oracle.md).
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { BitextRule } from '../../src/core/bitext/BitextRule.js';
import { BitextPatternRule } from '../../src/core/bitext/BitextPatternRule.js';
import '../../src/core/bitext/bitextRules.js';
import { errorOf, matchDump, newTool } from './_check-pipe-common.mjs';
import { notPorted } from './_pipe-common.mjs';

export { errorOf, matchDump, notPorted };

// Java modules of the checkout; a language of these that the port lacks is notPorted, anything else a real error
const JAVA_LANGS = new Set('ar ast be br ca crh da de el en eo es fa fr ga gl is it ja km lt ml nl pl pt ro ru sk sl sr sv ta tl uk zh'.split(' '));

// Java: Languages#getLanguageForShortCode(String)
export function langFor(code) {
  try {
    return Languages.getLanguageForShortCode(code);
  } catch (e) {
    if (typeof code === 'string' && JAVA_LANGS.has(code.split('-')[0])) throw notPorted(`language ${code}`);
    throw e;
  }
}

const LTS = new Map();

// Java: BitextOps#lt(String,String); analysis only (the rule lists of the port are incomplete, F17/F45+)
export function lt(code, mt) {
  const key = `${code}|${mt}`;
  if (!LTS.has(key)) LTS.set(key, newTool(langFor(code), mt === null || mt === undefined ? null : langFor(mt)));
  return LTS.get(key);
}

export const s = (a, k) => (a[k] !== undefined && a[k] !== null ? String(a[k]) : null);

// Java: String#getBytes(String) for the encodings of the cases
function encode(text, enc) {
  if (enc === null || enc === 'UTF-8') return Buffer.from(text, 'utf8');
  if (enc === 'ISO-8859-1') return Buffer.from(Array.from(text, (c) => (c.codePointAt(0) > 255 ? 0x3f : c.codePointAt(0))));
  throw notPorted(`writeEncoding ${enc}`);
}

// Java: BitextOps#writeFile(JsonNode,String) relative to the work dir (cwd)
export function writeFile(a, name) {
  mkdirSync(path.dirname(path.resolve(name)), { recursive: true });
  writeFileSync(name, encode(a.content, s(a, 'writeEncoding')));
}

// runs fn in a fresh work dir (the harness cwd); its absolute path in the result becomes <CASE> as the paths normaliser does for Java
export function inWorkDir(fn) {
  const old = process.cwd();
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'ltjs-bitext-')));
  process.chdir(dir);
  try {
    return mask(fn(), dir);
  } finally {
    process.chdir(old);
    rmSync(dir, { recursive: true, force: true });
  }
}

function mask(v, dir) {
  if (typeof v === 'string') return v.split(dir).join('<CASE>');
  if (Array.isArray(v)) return v.map((x) => mask(x, dir));
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mask(x, dir)]));
  return v;
}

// Java: BitextOps#pair(StringPair)
export function pair(p) {
  return { source: p === null ? null : p.getSource(), target: p === null ? null : p.getTarget(), toString: p === null ? null : p.toString() };
}

// Java: BitextOps#ruleInfo(Rule)
export function ruleInfo(r) {
  const m = {};
  m.class = r.constructor.FQCN;
  m.id = r.getId();
  m.subId = r.getSubId();
  m.description = r.getDescription();
  const c = r.getCategory();
  m.categoryId = c === null ? null : c.getId().toString();
  m.categoryName = c === null ? null : c.getName();
  m.issueType = r.getLocQualityIssueType() === null ? null : r.getLocQualityIssueType().toString();
  m.defaultOff = r.isDefaultOff();
  m.url = r.getUrl() === null ? null : r.getUrl().toString();
  m.correctExamples = r.getCorrectExamples().map((e) => e.getExample());
  m.incorrectExamples = r.getIncorrectExamples().map((e) => [e.getExample(), e.getCorrections()]);
  if (r instanceof AbstractPatternRule) {
    m.message = r.getMessage();
    m.language = r.getLanguage() === null ? null : r.getLanguage().getShortCodeWithCountryAndVariant();
    m.startPositionCorrection = r.getStartPositionCorrection();
    m.endPositionCorrection = r.getEndPositionCorrection();
    m.tokenCount = r.getPatternTokens() === null ? null : r.getPatternTokens().length;
    m.toString = r.toString();
  }
  if (r instanceof BitextRule) {
    m.bitextMessage = r.getMessage();
    m.sourceLanguage = r.getSourceLanguage() === null ? null : r.getSourceLanguage().getShortCodeWithCountryAndVariant();
    m.correctBitextExamples = r.getCorrectBitextExamples() === null ? null : r.getCorrectBitextExamples().map(pair);
    m.incorrectBitextExamples = r.getIncorrectBitextExamples() === null ? null
      : r.getIncorrectBitextExamples().map((e) => [pair(e.getExample()), e.getCorrections(), e.toString()]);
  }
  if (r instanceof BitextPatternRule) {
    m.srcRule = ruleInfo(r.getSrcRule());
    m.trgRule = ruleInfo(r.getTrgRule());
  }
  return m;
}

// Java: BitextOps#bitextMatches(BitextRule,String,String,JLanguageTool,JLanguageTool)
export function bitextMatches(rule, src, trg, sl, tl) {
  const ms = rule.match(sl.getAnalyzedSentence(src), tl.getAnalyzedSentence(trg));
  if (ms === null) return [null];
  return ms.map(matchDump);
}
