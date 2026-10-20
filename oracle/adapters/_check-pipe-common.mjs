// Shared code of the X-CHECK-PIPE adapters: JS twin of CheckPipeOps helpers (match dump, errors, selection, AnnotatedText, cancel callback).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { ToneTag } from '../../src/core/rules/model/Tag.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';
import { NullPointerException } from '../../src/lib/java/errors.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { PREFIX } from './_synth-rules.mjs';

// Java: Languages#getLanguageForShortCode(String) (German variants enabled since F22)
export function languageFor(code) {
  if (/-x-simple-language/.test(code)) throw Object.assign(new Error(`language ${code} is out of scope (DEV-006)`), { notPorted: true });
  return Languages.getLanguageForShortCode(code);
}

// Java: new JLanguageTool(l, mt): JS has no built-in rule lists yet (F17); Java's built-ins are filtered/disabled by the harness (R3)
export function newTool(l, mt = null, customRules = []) {
  return new JLanguageTool(l, [], mt, null, null, null, true, false, customRules);
}

// Runs fn with the language's disambiguator (and raw chunker if asked) replaced by no-ops; synthetic rules read token text only (R4)
export function withNoopAnalysis(l, replaceChunker, fn) {
  const d = l.getDisambiguator();
  const c = l.getChunker();
  l.setDisambiguator(new NoopDisambiguator());
  if (replaceChunker) l.setChunker(new NoopChunker());
  try {
    return fn();
  } finally {
    l.setDisambiguator(d);
    if (replaceChunker) l.setChunker(c);
  }
}

// Java: CheckPipeOps#errorOf(Throwable)
export function errorOf(t) {
  if (t && t.notPorted === true) throw t;
  const causes = [];
  for (let c = t.getCause ? t.getCause() : null; c !== null && c !== undefined && causes.length < 10; c = c.getCause ? c.getCause() : null) {
    causes.push({ class: c.javaClass ?? `js:${c.constructor.name}`, message: c.message ?? null });
  }
  return { error: { class: t.javaClass ?? `js:${t.constructor.name}`, message: t.message ?? null, causes } };
}

// Java: Map<String,?> -> JSON object
const mapObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m);

// Java: ContentOps#match(RuleMatch) + fullId (CheckPipeOps#matchDump)
export function matchDump(m) {
  const r = m.getRule();
  const c = r.getCategory();
  return {
    ruleId: r.getId(),
    subId: r.getSubId(),
    specificRuleId: m.getSpecificRuleId(),
    ruleDescription: r.getDescription(),
    categoryId: c === null ? null : c.getId().toString(),
    categoryName: c === null ? null : c.getName(),
    issueType: r.getLocQualityIssueType() === null ? null : r.getLocQualityIssueType().toString(),
    type: m.getType() === null ? null : m.getType().name(),
    tags: r.getTags().map((t) => t.name()),
    toneTags: r.getToneTags().map((t) => t.name()),
    fromPos: m.getFromPos(),
    toPos: m.getToPos(),
    fromPosSentence: m.getFromPosSentence(),
    toPosSentence: m.getToPosSentence(),
    patternFromPos: m.getPatternFromPos(),
    patternToPos: m.getPatternToPos(),
    line: m.getLine(),
    endLine: m.getEndLine(),
    column: m.getColumn(),
    endColumn: m.getEndColumn(),
    message: m.getMessage(),
    shortMessage: m.getShortMessage(),
    suggestions: m.getSuggestedReplacementObjects().map((s) => ({ replacement: s.getReplacement(), shortDescription: s.getShortDescription(), suffix: s.getSuffix() })),
    sentence: m.getSentence() === null ? null : m.getSentence().getText(),
    url: m.getUrl() === null ? null : m.getUrl().toString(),
    ruleUrl: r.getUrl() === null ? null : r.getUrl().toString(),
    autoCorrect: m.isAutoCorrect(),
    features: mapObj(m.getFeatures()),
    newLanguageMatches: mapObj(m.getNewLanguageMatches()),
    fullId: r.getFullId(),
  };
}

// Java: ContentOps#strs(JsonNode,String)
export const strs = (a, k) => (a && Array.isArray(a[k]) ? a[k].map(String) : []);

// Java: CheckPipeOps#select(JLanguageTool,JsonNode,List); stdout captured while Tools.selectRules runs
export function select(lt, sel, stdoutLines) {
  if (sel === undefined || sel === null) return;
  const dcs = new Map();
  const ecs = new Map();
  for (const x of strs(sel, 'disabledCategories')) if (!dcs.has(x)) dcs.set(x, new CategoryId(x));
  for (const x of strs(sel, 'enabledCategories')) if (!ecs.has(x)) ecs.set(x, new CategoryId(x));
  const only = sel.enabledOnly === true;
  const tempOff = sel.enableTempOff === true;
  let out = '';
  const old = process.stdout.write;
  process.stdout.write = (chunk) => { out += String(chunk); return true; };
  try {
    selectRules(lt, [...dcs.values()], [...ecs.values()], new Set(strs(sel, 'disabledRules')), new Set(strs(sel, 'enabledRules')), only, tempOff);
  } finally {
    process.stdout.write = old;
  }
  if (stdoutLines !== null && stdoutLines !== undefined) {
    for (const line of out.split('\n')) if (line.startsWith(`Activating ${PREFIX}`)) stdoutLines.push(line);
  }
}

// Java: CheckPipeOps#annotated(JsonNode)
export function annotated(c) {
  const b = new AnnotatedTextBuilder();
  if (c.parts !== undefined) {
    for (const p of c.parts) {
      const t = String(p.text);
      if (p.type === 'text') b.addText(t);
      else if (p.interpretAs !== undefined && p.interpretAs !== null) b.addMarkup(t, String(p.interpretAs));
      else b.addMarkup(t);
    }
  } else {
    b.addText(String(c.text));
  }
  return b.build();
}

// Java: CheckPipeOps#tones(JsonNode)
export const tones = (c) => new Set(strs(c, 'toneTags').map((x) => ToneTag.valueOf(x)));

// Java: CheckPipeOps.CancelAfter: counts only calls made directly from a JLanguageTool frame (stack inspection as the harness)
export class CancelAfter {
  constructor(n) {
    this.n = n;
    this.direct = 0;
    this.calls = [];
  }

  checkCancelled() {
    const frame = String(new Error().stack).split('\n')[2] ?? '';
    const m = /at (?:JLanguageTool|TextCheckCallable)\.#?([A-Za-z0-9_$]+) /.exec(frame);
    if (m === null) return false;
    this.direct++;
    this.calls.push(m[1]);
    return this.direct > this.n;
  }
}

// Java: CheckPipeOps#ids(List)
export function ids(rules) {
  const l = [];
  for (const r of rules) {
    if (r === null || r === undefined) throw new NullPointerException('Cannot invoke "org.languagetool.rules.Rule.getId()" because "<local3>" is null');
    if (r.getId().startsWith(PREFIX)) l.push(r.getFullId());
  }
  return l;
}

// Java: CheckPipeOps#categories(JLanguageTool)
export function categories(lt) {
  const m = new Map();
  for (const [key, c] of lt.getCategories().entrySet()) {
    if (!key.toString().startsWith(PREFIX)) continue;
    m.set(key.toString(), [c.getId().toString(), c.getName(), String(c.getLocation()), c.isDefaultOff(), c.getTabName()]);
  }
  return [...m.keys()].sort(javaCompare).map((k) => m.get(k));
}

// Java: CheckPipeOps#filteredSet(Collection)
export function filteredSet(c) {
  const l = [];
  for (const x of c) if (x.startsWith(PREFIX)) l.push(x);
  return l.sort(javaCompare);
}
