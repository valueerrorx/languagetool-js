// JS twin of harness op "style-check" (StyleOps#check, docs/review/F36-oracle.md).
// JS has no Language#getRelevantRules lists yet (F17): the native rule instances of en/de/fr are rebuilt here for the F36 rules;
// rules whose classes are not ported (de LongSentenceRule, German*/StyleTooOften*, pl/ru subclasses) make the request notPorted.
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { selectRules } from '../../src/core/Tools.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { LongSentenceRule } from '../../src/core/rules/LongSentenceRule.js';
import { LongParagraphRule } from '../../src/core/rules/LongParagraphRule.js';
import { EmptyLineRule } from '../../src/core/rules/EmptyLineRule.js';
import { PunctuationMarkAtParagraphEnd } from '../../src/core/rules/PunctuationMarkAtParagraphEnd.js';
import { PunctuationMarkAtParagraphEnd2 } from '../../src/core/rules/PunctuationMarkAtParagraphEnd2.js';
import { WhiteSpaceAtBeginOfParagraph } from '../../src/core/rules/WhiteSpaceAtBeginOfParagraph.js';
import { WhiteSpaceBeforeParagraphEnd } from '../../src/core/rules/WhiteSpaceBeforeParagraphEnd.js';
import { ParagraphRepeatBeginningRule } from '../../src/core/rules/ParagraphRepeatBeginningRule.js';
import { WordRepeatBeginningRule } from '../../src/core/rules/WordRepeatBeginningRule.js';
import { PhraseRepeatRule } from '../../src/core/rules/PhraseRepeatRule.js';
import { ReadabilityRule } from '../../src/core/rules/ReadabilityRule.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { errorOf, languageFor, withNoopAnalysis } from './_check-pipe-common.mjs';
import { recordPreLanguageFilter, runCase } from './check2.mjs';
import { notPorted } from './_pipe-common.mjs';
import { LongSentenceRule as EnLongSentenceRule } from '../../src/lang/en/rules/LongSentenceRule.js';
import { EnglishWordRepeatBeginningRule } from '../../src/lang/en/rules/EnglishWordRepeatBeginningRule.js';
import { EnglishRepeatedWordsRule } from '../../src/lang/en/rules/EnglishRepeatedWordsRule.js';
import { StyleTooOftenUsedVerbRule } from '../../src/lang/en/rules/StyleTooOftenUsedVerbRule.js';
import { StyleTooOftenUsedNounRule } from '../../src/lang/en/rules/StyleTooOftenUsedNounRule.js';
import { StyleTooOftenUsedAdjectiveRule } from '../../src/lang/en/rules/StyleTooOftenUsedAdjectiveRule.js';
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

// Java: English#getRelevantRules / German#getRelevantRules / French#getRelevantRules (F36 rules only, list order kept; np = shadow instance for config errors only)
function nativeRules(code, l, m, uc) {
  switch (code) {
    case 'en': return [
      new WhiteSpaceBeforeParagraphEnd(m, l), new WhiteSpaceAtBeginOfParagraph(m), new EmptyLineRule(m, l),
      new EnLongSentenceRule(m, uc, 40),
      new LongParagraphRule(m, l, uc), new ParagraphRepeatBeginningRule(m, l), new PunctuationMarkAtParagraphEnd(m, l),
      new PunctuationMarkAtParagraphEnd2(m, l), new EnglishWordRepeatBeginningRule(m, l), new ReadabilityRule(m, l, uc, false), new ReadabilityRule(m, l, uc, true),
      new EnglishRepeatedWordsRule(m), new StyleTooOftenUsedVerbRule(m, l, uc), new StyleTooOftenUsedNounRule(m, l, uc),
      new StyleTooOftenUsedAdjectiveRule(m, l, uc),
    ];
    case 'de': return [
      new WhiteSpaceBeforeParagraphEnd(m, l), new WhiteSpaceAtBeginOfParagraph(m), new EmptyLineRule(m, l),
      new LongParagraphRule(m, l, uc), new PunctuationMarkAtParagraphEnd(m, l),
    ];
    case 'fr': return [new LongSentenceRule(m, uc, 40), new LongParagraphRule(m, l, uc)];
    default: throw notPorted(`style-check: rule list of ${code}`);
  }
}

// Java: StyleOps#check(JsonNode); disambiguator/chunker of the languages are not ported (F32/F44): no-op analysis (R4), see docs/review/F36-porter.md
export function run(a, hook = null, xmlRules = false) {
  let l;
  try {
    l = languageFor(a.lang);
  } catch (e) {
    throw notPorted(`style-check: language ${a.lang}`);
  }
  // German post-disambiguation chunker (GermanChunker, F44) is replaced too; the F36 rules read no chunk tags
  // xmlRules (F49, en): the XML pattern rules of the language are loaded like in the Java HarnessLT
  if (l.getShortCode() === 'en') return check(a, l, hook, xmlRules); // English analysis is complete since F45
  const savedPost = l.postDisambiguationChunker;
  l.postDisambiguationChunker = new NoopChunker();
  try {
    return withNoopAnalysis(l, true, () => check(a, l, hook, false));
  } finally {
    l.postDisambiguationChunker = savedPost;
  }
}

// Java: StyleOps#check(JsonNode)
function check(a, l, hook, xmlRules) {
  const res = {};
  let lt;
  let natives;
  const m = getMessageBundleForLanguage(l);
  try {
    let uc = null;
    if (a.config !== undefined) {
      const cv = new Map();
      for (const [k, vs] of Object.entries(a.config)) cv.set(k, vs.map((v) => v));
      uc = new UserConfig(cv);
    }
    natives = nativeRules(l.getShortCode(), l, m, uc);
    if (hook !== null) natives = hook(l, m, uc, natives); // F37 rules (replace-check.mjs) merged into the list
    lt = new JLanguageTool(l, [], null, null, null, uc, true, false, []);
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    res.buildError = errorOf(t);
    return res;
  }
  lt.setCleanOverlappingMatches(false);
  if (hook !== null) recordPreLanguageFilter(lt);
  if (xmlRules) lt.activateDefaultPatternRules();
  const rules = natives.filter((r) => r.np === undefined);
  for (const r of rules) lt.addRule(r);
  const enabled = new Set(a.ids);
  // with the F37 hook the rule lists of en/de are complete for the requested ids: ids without a rule are absent in Java too (e.g. variant rules of other variants)
  if (hook === null) for (const id of a.ids) if (!rules.some((r) => r.getId() === id)) throw notPorted(`style-check: ${id} (rule class not ported)`);
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
