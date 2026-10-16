// JS twin of harness op "check-rules" (CheckPipeOps#checkRules, docs/review/F16-oracle.md); the language rule lists are mirrored here until F17.
import { runCase } from './check2.mjs';
import { languageFor, newTool, withNoopAnalysis } from './_check-pipe-common.mjs';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { Example } from '../../src/core/rules/model/Examples.js';
import { getUrl, selectRules } from '../../src/core/Tools.js';
import { CommaWhitespaceRule } from '../../src/core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../src/core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../src/core/rules/GenericUnpairedBracketsRule.js';
import { GenericUnpairedQuotesRule } from '../../src/core/rules/GenericUnpairedQuotesRule.js';
import { UppercaseSentenceStartRule } from '../../src/core/rules/UppercaseSentenceStartRule.js';
import { WordRepeatRule } from '../../src/core/rules/WordRepeatRule.js';
import { MultipleWhitespaceRule } from '../../src/core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../src/core/rules/SentenceWhitespaceRule.js';
import { WhitespaceBeforePunctuationRule } from '../../src/core/rules/WhitespaceBeforePunctuationRule.js';
import { EnglishUnpairedBracketsRule } from '../../src/lang/en/rules/EnglishUnpairedBracketsRule.js';
import { EnglishUnpairedQuotesRule } from '../../src/lang/en/rules/EnglishUnpairedQuotesRule.js';
import { EnglishWordRepeatRule } from '../../src/lang/en/rules/EnglishWordRepeatRule.js';
import { GermanCommaWhitespaceRule } from '../../src/lang/de/rules/GermanCommaWhitespaceRule.js';
import { GermanDoublePunctuationRule } from '../../src/lang/de/rules/GermanDoublePunctuationRule.js';
import { GermanUnpairedBracketsRule } from '../../src/lang/de/rules/GermanUnpairedBracketsRule.js';
import { GermanUnpairedQuotesRule } from '../../src/lang/de/rules/GermanUnpairedQuotesRule.js';
import { GermanWordRepeatRule } from '../../src/lang/de/rules/GermanWordRepeatRule.js';
import { SentenceWhitespaceRule as GermanSentenceWhitespaceRule } from '../../src/lang/de/rules/SentenceWhitespaceRule.js';

const CORE = [CommaWhitespaceRule, DoublePunctuationRule, GenericUnpairedBracketsRule, GenericUnpairedQuotesRule, UppercaseSentenceStartRule,
  WordRepeatRule, MultipleWhitespaceRule, SentenceWhitespaceRule, WhitespaceBeforePunctuationRule];
// core classes that have a (ResourceBundle, Language) constructor
const WITH_LANGUAGE = new Set([UppercaseSentenceStartRule, WordRepeatRule, MultipleWhitespaceRule]);

// Java: English#getRelevantRules / French#getRelevantRules / German#getRelevantRules (the entries of the F16 rule classes, list order)
function languageRules(l, messages) {
  const code = l.getShortCode();
  if (code === 'en') {
    return [
      new CommaWhitespaceRule(messages,
        Example.wrong('We had coffee<marker> ,</marker> cheese and crackers and grapes.'),
        Example.fixed('We had coffee<marker>,</marker> cheese and crackers and grapes.')),
      new DoublePunctuationRule(messages, getUrl('https://languagetool.org/insights/post/punctuation-guide/#what-are-periods')),
      new UppercaseSentenceStartRule(messages, l,
        Example.wrong('This house is old. <marker>it</marker> was built in 1950.'),
        Example.fixed('This house is old. <marker>It</marker> was built in 1950.'),
        getUrl('https://languagetool.org/insights/post/spelling-capital-letters/')),
      new MultipleWhitespaceRule(messages, l),
      new SentenceWhitespaceRule(messages, 2),
      new EnglishUnpairedBracketsRule(messages, l),
      new EnglishUnpairedQuotesRule(messages, l),
      new EnglishWordRepeatRule(messages, l),
    ];
  }
  if (code === 'fr') {
    return [
      new CommaWhitespaceRule(messages, false),
      new DoublePunctuationRule(messages),
      new GenericUnpairedBracketsRule(messages, ['[', '(', '{'], [']', ')', '}']),
      new UppercaseSentenceStartRule(messages, l),
      new MultipleWhitespaceRule(messages, l),
      new SentenceWhitespaceRule(messages),
    ];
  }
  if (code === 'de') {
    return [
      new GermanCommaWhitespaceRule(messages,
        Example.wrong('Die Partei<marker> ,</marker> die die letzte Wahl gewann.'),
        Example.fixed('Die Partei<marker>,</marker> die die letzte Wahl gewann.'),
        getUrl('https://languagetool.org/insights/de/beitrag/grammatik-leerzeichen/#fehler-1-leerzeichen-vor-und-nach-satzzeichen')),
      new GermanUnpairedBracketsRule(messages, l),
      new GermanUnpairedQuotesRule(messages, l),
      new UppercaseSentenceStartRule(messages, l,
        Example.wrong('Das Haus ist alt. <marker>es</marker> wurde 1950 gebaut.'),
        Example.fixed('Das Haus ist alt. <marker>Es</marker> wurde 1950 gebaut.'),
        getUrl('https://languagetool.org/insights/de/beitrag/gross-klein-schreibung-rechtschreibung/#1-satzanf%C3%A4nge-schreiben-wir-gro%C3%9F')),
      new MultipleWhitespaceRule(messages, l),
      new GermanSentenceWhitespaceRule(messages),
      new GermanDoublePunctuationRule(messages),
      new GermanWordRepeatRule(messages, l),
    ];
  }
  throw Object.assign(new Error(`check-rules: no rule list for ${code}`), { notPorted: true });
}

// Java: CheckPipeOps#checkRules(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const cls = (a.classes ?? []).map((n) => {
    const c = [...CORE, EnglishUnpairedBracketsRule, EnglishUnpairedQuotesRule, EnglishWordRepeatRule].find((k) => k.FQCN === n);
    if (c === undefined) throw Object.assign(new Error(`check-rules: class ${n} not ported`), { notPorted: true });
    return c;
  });
  return withNoopAnalysis(l, true, () => {
    const messages = getMessageBundleForLanguage(l);
    const lt = newTool(l, null);
    lt.setCleanOverlappingMatches(false);
    const enabled = new Set(a.ruleIds ?? []);
    const selected = [];
    for (const r of languageRules(l, messages)) {
      let m = enabled.has(r.getId());
      for (const c of cls) if (r instanceof c) m = true;
      if (m) {
        enabled.add(r.getId());
        selected.push(`${r.getFullId()}|${r.constructor.name}`);
        lt.addRule(r);
      }
    }
    if (enabled.size === 0) {
      // no language instance: instantiate the core class itself (messages bundle of the language)
      for (const c of cls) {
        const r = WITH_LANGUAGE.has(c) ? new c(messages, l) : new c(messages);
        lt.addRule(r);
        enabled.add(r.getId());
        selected.push(`${r.getFullId()}|${r.constructor.name}|instantiated`);
      }
    }
    if (enabled.size > 0) selectRules(lt, [], [], new Set(), enabled, true, false);
    const active = lt.getAllActiveRules().map((r) => r.getFullId());
    return { selected, active, cases: a.cases.map((c) => runCase(lt, c)) };
  });
}
