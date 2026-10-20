// JS twin of harness op "rule-examples" (ContentOps#ruleExamples).
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { RuleSet } from '../../src/core/patterns/RuleSet.js';
import { ExampleSentence } from '../../src/core/rules/model/Examples.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { lang, match, results, run as runCheck, strs, tool } from './_content-common.mjs';

export { beginCase } from './_content-common.mjs';

// Java: Throwable#toString() in "<class>: <message>"
const thrown = (t) => {
  if (t && t.notPorted === true) throw t;
  return `${t.javaClass ?? t.constructor.FQCN ?? `js:${t.constructor.name}`}: ${t.message ?? null}`;
};

// Java: ContentOps#exampleEntry(Rule,String,String,List,JLanguageTool,JLanguageTool,JsonNode)
function exampleEntry(r, kind, raw, corrections, lt, full, a) {
  const o = {};
  o.ruleId = r.getId();
  o.subId = r.getSubId();
  o.kind = kind;
  o.example = raw;
  const clean = ExampleSentence.cleanMarkersInExample(raw);
  o.text = clean;
  const ms = raw.indexOf('<marker>');
  const me = raw.indexOf('</marker>');
  o.markerStart = ms;
  o.markerEnd = me === -1 ? -1 : me - '<marker>'.length;
  o.corrections = corrections;
  try {
    const cr = lt.checkInternalWithCustomRules(RuleSet.plain([r]), new AnnotatedTextBuilder().addText(clean).build(), ParagraphHandling.NORMAL, null,
      Mode.ALL, Level.PICKY, new Set(), null, [clean], [lt.getAnalyzedSentence(clean)]);
    o.restricted = cr.getRuleMatches().map(match);
  } catch (t) {
    o.restricted = null;
    o.restrictedError = thrown(t);
  }
  if (a.unrestricted === undefined || a.unrestricted === true) {
    try {
      o.unrestricted = results(runCheck(full, clean, a));
    } catch (t) {
      o.unrestricted = null;
      o.unrestrictedError = thrown(t);
    }
  }
  return o;
}

// Java: ContentOps#ruleExamples(JsonNode)
export function run(a) {
  const lt = a.motherTongue !== undefined && a.motherTongue !== null ? new JLanguageTool(lang(a.lang), lang(a.motherTongue)) : new JLanguageTool(lang(a.lang));
  const full = tool(a);
  const ids = new Set(strs(a, 'ruleIds'));
  const offset = a.offset !== undefined ? a.offset : 0;
  const limit = a.limit !== undefined ? a.limit : 2147483647;
  const out = [];
  let idx = 0;
  let total = 0;
  for (const r of lt.getAllRules()) {
    if (ids.size !== 0 && !ids.has(r.getId()) && !ids.has(r.getFullId())) continue;
    if (r.getCorrectExamples().length === 0 && r.getIncorrectExamples().length === 0 && r.getErrorTriggeringExamples().length === 0) continue;
    total++;
    if (idx++ < offset || idx - 1 >= offset + limit) continue;
    for (const e of r.getCorrectExamples()) out.push(exampleEntry(r, 'correct', e.getExample(), [], lt, full, a));
    for (const e of r.getIncorrectExamples()) out.push(exampleEntry(r, 'incorrect', e.getExample(), e.getCorrections(), lt, full, a));
    for (const e of r.getErrorTriggeringExamples()) out.push(exampleEntry(r, 'triggers', e.getExample(), [], lt, full, a));
  }
  return { rulesWithExamples: total, examples: out };
}
