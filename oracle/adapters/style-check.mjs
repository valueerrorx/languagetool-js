// JS twin of harness op "style-check" (StyleOps#check, docs/review/F36-oracle.md).
// en/de/fr use the real JLanguageTool (Language#getRelevantRules + XML pattern rules) like the Java HarnessLT; other languages are notPorted.
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { selectRules } from '../../src/core/Tools.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { EmptyLineRule } from '../../src/core/rules/EmptyLineRule.js';
import { PunctuationMarkAtParagraphEnd } from '../../src/core/rules/PunctuationMarkAtParagraphEnd.js';
import { PunctuationMarkAtParagraphEnd2 } from '../../src/core/rules/PunctuationMarkAtParagraphEnd2.js';
import { WhiteSpaceAtBeginOfParagraph } from '../../src/core/rules/WhiteSpaceAtBeginOfParagraph.js';
import { WhiteSpaceBeforeParagraphEnd } from '../../src/core/rules/WhiteSpaceBeforeParagraphEnd.js';
import { ParagraphRepeatBeginningRule } from '../../src/core/rules/ParagraphRepeatBeginningRule.js';
import { WordRepeatBeginningRule } from '../../src/core/rules/WordRepeatBeginningRule.js';
import { PhraseRepeatRule } from '../../src/core/rules/PhraseRepeatRule.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { errorOf, languageFor } from './_check-pipe-common.mjs';
import { recordPreLanguageFilter, runCase } from './check2.mjs';
import { notPorted } from './_pipe-common.mjs';
import { UnitConversionRule as EnUnitConversionRule } from '../../src/lang/en/rules/UnitConversionRule.js';
import { UnitConversionRuleUS } from '../../src/lang/en/rules/UnitConversionRuleUS.js';
import { UnitConversionRuleImperial } from '../../src/lang/en/rules/UnitConversionRuleImperial.js';

const EXTRA = {
  EmptyLineRule, PunctuationMarkAtParagraphEnd, PunctuationMarkAtParagraphEnd2, WhiteSpaceAtBeginOfParagraph,
  WhiteSpaceBeforeParagraphEnd, ParagraphRepeatBeginningRule, WordRepeatBeginningRule, PhraseRepeatRule,
  // fully qualified names (StyleOps `extra` accepts them; F38 unit conversion rules)
  'org.languagetool.rules.en.UnitConversionRule': EnUnitConversionRule,
  'org.languagetool.rules.en.UnitConversionRuleUS': UnitConversionRuleUS,
  'org.languagetool.rules.en.UnitConversionRuleImperial': UnitConversionRuleImperial,
};

// Java: StyleOps#check(JsonNode); all of en/de/fr analysis is real
export function run(a) {
  let l;
  try {
    l = languageFor(a.lang);
  } catch (e) {
    throw notPorted(`style-check: language ${a.lang}`);
  }
  const code = l.getShortCode();
  if (code === 'en' || code === 'de' || code === 'fr') return check(a, l);
  throw notPorted(`style-check: language ${a.lang}`);
}

// Java: StyleOps#check(JsonNode)
function check(a, l) {
  const res = {};
  let lt;
  const m = getMessageBundleForLanguage(l);
  try {
    let uc = null;
    if (a.config !== undefined) {
      const cv = new Map();
      for (const [k, vs] of Object.entries(a.config)) cv.set(k, vs.map((v) => v));
      uc = new UserConfig(cv);
    }
    lt = new JLanguageTool(l, null, null, uc); // Java: HarnessLT(Language,UserConfig)
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    res.buildError = errorOf(t);
    return res;
  }
  lt.setCleanOverlappingMatches(false);
  recordPreLanguageFilter(lt);
  const enabled = new Set(a.ids);
  const selected = [];
  for (const n of a.extra ?? []) {
    const k = EXTRA[n];
    if (k === undefined) throw notPorted(`style-check: ${n}`);
    const r = k === WhiteSpaceAtBeginOfParagraph ? new k(m) : new k(m, l);
    lt.addRule(r);
    enabled.add(r.getId());
    selected.push(`${r.getFullId()}|${r.constructor.name}|instantiated`);
  }
  for (const r of lt.getAllRules()) {
    if (enabled.has(r.getId()) && !selected.includes(`${r.getFullId()}|${r.constructor.name}|instantiated`)) {
      selected.push(`${r.getFullId()}|${r.constructor.name}|defaultOff=${r.isDefaultOff()}|officeOn=${r.isOfficeDefaultOn()}`);
    }
  }
  selectRules(lt, [], [], new Set(), enabled, true, false);
  res.selected = selected;
  res.active = lt.getAllActiveRules().map((r) => r.getFullId());
  res.cases = a.cases.map((c) => runCase(lt, c));
  return res;
}
