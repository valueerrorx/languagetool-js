// JS twin of harness op "rule-load" (RuleLoadOps#ruleLoad, docs/review/F25-oracle.md).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { PatternRuleBuilderHelper } from '../../src/core/patterns/PatternRuleBuilderHelper.js';
import { PatternRuleLoader } from '../../src/core/patterns/PatternRuleLoader.js';
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { File } from '../../src/lib/java/io/File.js';
import { UnifierConfiguration } from '../../src/core/patterns/UnifierConfiguration.js';
import { err, buildToken, tokenDump, lang, ruleDump, compactDump, groupSizes, features } from './_ruleload-common.mjs';

const CACHE = new Map();

// Java: RuleLoadOps#loadFile(Language,String)
function loadFile(l, fileName) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${fileName}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const ruleLoader = new PatternRuleLoader();
  let is = getDataBroker().getAsStream(fileName);
  if (is === null) is = readFileOrThrow(fileName);
  const rules = ruleLoader.getRules(is, fileName, l);
  CACHE.set(key, rules);
  return rules;
}

// Java: new FileInputStream(String)
function readFileOrThrow(fileName) {
  return readFileSync(fileName);
}

// Java: RuleLoadOps#file(JsonNode)
function file(a) {
  const l = lang(a.lang);
  const names = l.getRuleFileNames();
  const fi = a.file;
  const w = {};
  if (fi >= names.length) { w.file = null; w.total = 0; w.rules = []; return w; }
  const fn = names[fi];
  w.file = fn;
  try {
    const rules = loadFile(l, fn);
    const gs = groupSizes(rules);
    const off = a.offset !== undefined ? a.offset : 0;
    const lim = a.limit !== undefined ? a.limit : 2147483647;
    const detail = a.detail === true;
    w.total = rules.length;
    const out = [];
    const compact = a.compact === true;
    for (let i = off; i < rules.length && i < off + lim; i++) out.push(compact ? compactDump(rules[i]) : ruleDump(rules[i], gs, detail));
    w.rules = out;
  } catch (t) {
    w.error = err(t).error;
  }
  return w;
}

// Java: RuleLoadOps#tokens(JsonNode)
function tokens(a) {
  const l = lang(a.lang);
  const names = l.getRuleFileNames();
  const fi = a.file;
  const limit = a.limit !== undefined ? a.limit : 200;
  const extra = a.extraPerFeature !== undefined ? a.extraPerFeature : 2;
  const w = {};
  if (fi >= names.length) { w.file = null; w.rules = []; return w; }
  const fn = names[fi];
  w.file = fn;
  try {
    const rules = loadFile(l, fn);
    const gs = groupSizes(rules);
    const n = rules.length;
    const stride = Math.max(1, Math.trunc((n + limit - 1) / limit));
    const pick = new Set();
    for (let i = 0; i < n; i += stride) pick.add(i);
    const featCount = {};
    const why = new Map();
    for (let i = 0; i < n; i++) {
      for (const f of features(rules[i])) {
        const c = (featCount[f] = (featCount[f] ?? 0) + 1);
        if (c <= extra) {
          pick.add(i);
          if (!why.has(i)) why.set(i, []);
          why.get(i).push(f);
        }
      }
    }
    w.total = n;
    w.stride = stride;
    w.featureCounts = featCount;
    const out = [];
    for (const i of [...pick].sort((x, y) => x - y)) {
      const d = ruleDump(rules[i], gs, true);
      d.index = i;
      d.pickedFor = why.get(i) ?? [];
      out.push(d);
    }
    w.rules = out;
  } catch (t) {
    w.error = err(t).error;
  }
  return w;
}

// Java: new JLanguageTool(l) as used to activate the default rules; the constructor throws notPorted until F17 (language rule lists)
function activateDefaults(l) {
  return new JLanguageTool(l);
}

// Java: RuleLoadOps#patternRules(JsonNode)
function patternRules(a) {
  const l = lang(a.lang);
  const w = {};
  w.defaultEnabledForVariant = l.getDefaultEnabledRulesForVariant();
  w.defaultDisabledForVariant = l.getDefaultDisabledRulesForVariant();
  // fresh state from the loader
  const fresh = [];
  const loader = new PatternRuleLoader();
  for (const fn of l.getRuleFileNames()) {
    const is = getDataBroker().getAsStream(fn);
    if (is === null) continue;
    for (const r of loader.getRules(is, fn, l)) fresh.push(r);
  }
  activateDefaults(l);
  const shared = l.getPatternRules();
  w.count = shared.length;
  w.freshCount = fresh.length;
  const ids = [];
  const diffs = [];
  for (let i = 0; i < shared.length; i++) {
    const s = shared[i];
    ids.push(s.getFullId());
    if (i < fresh.length) {
      const f = fresh[i];
      if (f.getFullId() !== s.getFullId()) { diffs.push([i, 'idMismatch', f.getFullId(), s.getFullId()]); continue; }
      if (f.isDefaultOff() !== s.isDefaultOff() || f.isDefaultTempOff() !== s.isDefaultTempOff()) {
        diffs.push([i, s.getFullId(), f.isDefaultOff(), f.isDefaultTempOff(), s.isDefaultOff(), s.isDefaultTempOff()]);
      }
    }
  }
  w.fullIds = ids;
  w.defaultChangedByActivation = diffs;
  // second call returns the same shared list
  w.sameInstanceOnSecondCall = l.getPatternRules() === shared;
  return w;
}

// Java: RuleLoadOps#inline(JsonNode)
function inline(a) {
  const l = lang(a.lang !== undefined ? a.lang : 'en-US');
  const xml = a.xml;
  const filename = a.filename !== undefined ? a.filename : 'inline-test.xml';
  const relaxed = a.relaxed === true;
  const detail = a.detail === undefined || a.detail === true;
  const via = a.via !== undefined ? a.via : 'stream';
  const unifier = a.unifier === true;
  const w = {};
  if (unifier) l.unifierConfig = new UnifierConfiguration(); // Java: RuleLoadOps#resetUnifierConfig
  try {
    const loader = new PatternRuleLoader();
    loader.setRelaxedMode(relaxed);
    let rules;
    const bytes = Buffer.from(xml, 'utf8');
    if (via === 'file') {
      const dir = mkdtempSync(path.join(tmpdir(), 'ltjs-ruleload-'));
      const f = path.join(dir, `ruleload${String(Math.floor(Math.random() * 1e18))}.xml`); // File.createTempFile("ruleload", ".xml")
      try {
        writeFileSync(f, bytes);
        rules = loader.getRules(new File(f), l);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    } else {
      rules = loader.getRules(bytes, filename, l);
    }
    const gs = groupSizes(rules);
    w.rules = rules.map((r) => ruleDump(r, gs, detail));
    if (a.posDetail === true) w.posDetail = rules.map((r) => (r.getPatternTokens() === null ? null : r.getPatternTokens().map(posDetail)));
  } catch (t) {
    w.error = err(t).error;
  }
  if (unifier) w.unifier = unifierDump(l);
  return w;
}

const POS_PROBES = ['NN', 'UNKNOWN', 'N|B', 'N', 'B', 'A', 'VB', 'NNS', '', 'N\\', 'unknown', 'A|UNKNOWN', 'x'];
// Java: RuleLoadOps#posDetail(PatternToken)
function posDetail(t) {
  const o = {};
  const pt = t.posToken;
  if (pt === null || pt === undefined) o.posToken = null;
  else {
    o.tag = pt.posTag;
    o.posUnknown = pt.posUnknown;
    o.negation = pt.negation;
    const m = pt.posPattern;
    if (m === null || m === undefined) o.matcher = null;
    else {
      const pv = m.getPossibleValues();
      const probe = {};
      for (const s of POS_PROBES) {
        try { probe[s] = m.matches(s); } catch (e) { probe[s] = `ERR ${e.javaClass ?? e.constructor.name}`; }
      }
      o.matcher = { possibleValues: pv === null || pv === undefined ? null : [...pv], probe };
    }
  }
  o.exceptions = t.getExceptionList().map(posDetail);
  return o;
}

// Java: RuleLoadOps#unifierDump(Language)
function unifierDump(l) {
  const c = l.getUnifierConfiguration();
  const features = [];
  for (const [k, v] of c.getEquivalenceFeatures().entrySet()) features.push([k, [...v]]);
  const types = [];
  for (const [k, v] of c.getEquivalenceTypes().entrySet()) types.push({ feature: k.feature, type: k.type, token: tokenDump(v) });
  return { features, types };
}

// Java: RuleLoadOps#files(JsonNode)
function files() {
  const out = [];
  for (const l of Languages.get()) {
    const sc = l.getShortCode();
    if (!(sc === 'de' || sc === 'en' || sc === 'fr')) continue;
    const fs = [];
    for (const fn of l.getRuleFileNames()) {
      let is = null;
      try {
        is = getDataBroker().getAsStream(fn);
      } catch (t) {
        if (t && t.notPorted === true) throw t;
        // ignore
      }
      fs.push({ name: fn, inBroker: is !== null && is !== undefined });
    }
    out.push({ code: l.getShortCodeWithCountryAndVariant(), class: l.constructor.FQCN, files: fs });
  }
  return { languages: out };
}

// Java: RuleLoadOps#builder(JsonNode)
function builder(a) {
  const out = [];
  for (const spec of a.tokens) {
    let r;
    try {
      if (!Array.isArray(spec)) {
        // PatternRuleBuilderHelper statics
        const h = String(spec.helper);
        const arg = String(spec.arg);
        let t;
        switch (h) {
          case 'csToken': t = PatternRuleBuilderHelper.csToken(arg); break;
          case 'pos': t = PatternRuleBuilderHelper.pos(arg); break;
          case 'token': t = PatternRuleBuilderHelper.token(arg); break;
          case 'regex': t = PatternRuleBuilderHelper.regex(arg); break;
          case 'csRegex': t = PatternRuleBuilderHelper.csRegex(arg); break;
          default: throw new Error(`unknown helper: ${h}`);
        }
        r = tokenDump(t);
      } else {
        r = tokenDump(buildToken(spec));
      }
    } catch (t) {
      r = err(t);
    }
    out.push(r);
  }
  return { tokens: out };
}

// Java: RuleLoadOps#ruleLoad(JsonNode)
export function run(a) {
  switch (a.mode) {
    case 'files': return files();
    case 'builder': return builder(a);
    case 'file': return file(a);
    case 'tokens': return tokens(a);
    case 'patternRules': return patternRules(a);
    case 'inline': return inline(a);
    default: throw new Error(`unknown mode: ${a.mode}`);
  }
}
