// Shared code of the X-RULEINFRA adapters: JS twins of RuleInfraOps helpers (docs/review/F30-oracle.md).
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { lang, loadFile, inline, sentences } from './_unify-common.mjs';
import { RegexPatternRule } from '../../src/core/patterns/RegexPatternRule.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { notPortedYet } from '../../src/core/language/components.js';
import { listGet } from '../../src/lib/java/arrays.js';

export { lang, loadFile, inline, sentences };

// Java: RuleInfraOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const causes = [];
  for (let c = t.getCause?.() ?? null; c && causes.length < 20; c = c.getCause?.() ?? null) {
    const cc = c.javaClass ?? `js:${c.constructor.name}`;
    causes.push({ class: cc, message: cc === 'java.lang.NullPointerException' ? null : (c.message ?? null) });
  }
  const cls = t.javaClass ?? `js:${t.constructor.name}`;
  return { error: { class: cls, message: cls === 'java.lang.NullPointerException' ? null : (t.message ?? null), causes } };
}

// Dynamic import of a port module that may not exist yet -> notPorted (per request)
export async function optional(rel, what) {
  const f = path.resolve(import.meta.dirname, '../../src', rel);
  if (!existsSync(f)) throw notPortedYet(what);
  return import(pathToFileURL(f).href);
}

// Java: RuleInfraOps#rules(JsonNode)
export function rules(a) {
  const l = lang(a.lang);
  if (a.xml !== undefined) return inline(l, a.xml);
  const names = l.getRuleFileNames();
  const all = [];
  if (a.files !== undefined) {
    for (const f of a.files) all.push(...loadFile(l, listGet(names, f)));
  } else {
    for (const n of names) {
      try { all.push(...loadFile(l, n)); } catch (t) { if (t && t.notPorted === true) throw t; }
    }
  }
  return all;
}

// Java: RuleInfraOps#resolve(JsonNode,JsonNode)
export function resolve(src, a) {
  const l = lang(a.lang);
  const list = src.file === undefined ? rules({ ...a, files: undefined }) : loadFile(l, listGet(l.getRuleFileNames(), src.file));
  return listGet(list, src.rule ?? 0);
}

// Java: RuleInfraOps#kind(AbstractPatternRule)
export function kind(r) {
  if (r instanceof RegexPatternRule) return 'regex';
  if (r instanceof PatternRule) return 'pattern';
  return r.constructor.FQCN ?? r.javaClass ?? r.constructor.name;
}

// Java: getClass().getName()
export const className = (o) => o.constructor.FQCN ?? o.javaClass ?? o.constructor.name;

// Java: RuleInfraOps#sentences(Language,String)
export function splitSentences(l, code, text) {
  const info = [];
  const lt = sentencesTool(l, code);
  const parts = lt.sentenceTokenize(text);
  const out = sentences(l, code, parts, info);
  for (let i = 0; i < out.length; i++) if (out[i] === null) throw new Error(`sentence ${i}: ${JSON.stringify(info[i])}`);
  return out;
}

import { newTool } from './_check-pipe-common.mjs';
const TOOLS = new Map();
function sentencesTool(l, code) {
  if (!TOOLS.has(code)) TOOLS.set(code, newTool(l));
  return TOOLS.get(code);
}
