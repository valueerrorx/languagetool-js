// Interim rule lists of French and German (the ported F16 core rules); replaced by Language#getRelevantRules when the language rule steps land (English done in F50).
import { getMessageBundleForLanguage } from '../core/resources/ResourceBundleTools.js';
import { NoopDisambiguator } from '../core/noop/NoopDisambiguator.js';
import { NoopChunker } from '../core/noop/NoopChunker.js';
import { Example } from '../core/rules/model/Examples.js';
import { getUrl } from '../core/Tools.js';
import { CommaWhitespaceRule } from '../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../core/rules/SentenceWhitespaceRule.js';
import { GermanCommaWhitespaceRule } from '../lang/de/rules/GermanCommaWhitespaceRule.js';
import { GermanDoublePunctuationRule } from '../lang/de/rules/GermanDoublePunctuationRule.js';
import { GermanUnpairedBracketsRule } from '../lang/de/rules/GermanUnpairedBracketsRule.js';
import { GermanUnpairedQuotesRule } from '../lang/de/rules/GermanUnpairedQuotesRule.js';
import { SentenceWhitespaceRule as GermanSentenceWhitespaceRule } from '../lang/de/rules/SentenceWhitespaceRule.js';

// Java: French#getRelevantRules / German#getRelevantRules (the entries of the F16 rule classes, list order); null = use the language's real rule list (en)
export function interimRules(l) {
  const messages = getMessageBundleForLanguage(l);
  const code = l.getShortCode();
  if (code === 'en') return null; // English: real Language#getRelevantRules + XML pattern rules + speller (F50)
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
    // GermanWordRepeatRule excluded: its ANTI_PATTERNS still throw notPorted
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
    ];
  }
  return [];
}

// Interim analysis (disambiguation/chunking of the language steps are not ported yet): runs fn with the no-op disambiguator and chunker (shared by server and CLI)
export function withInterimAnalysis(lang, fn) {
  if (lang.getShortCode() === 'en') return fn(); // English: real EnglishHybridDisambiguator and EnglishChunker (F45)
  if (lang.getShortCode() === 'de') return fn(); // German: real GermanRuleDisambiguator and GermanChunker (F51)
  const d = lang.getDisambiguator();
  const c = lang.getChunker();
  const pc = lang.postDisambiguationChunker; // raw field: the getter would create the unported default
  lang.setDisambiguator(new NoopDisambiguator());
  lang.setChunker(new NoopChunker());
  lang.setPostDisambiguationChunker(new NoopChunker());
  try {
    return fn();
  } finally {
    lang.setDisambiguator(d);
    lang.setChunker(c);
    lang.setPostDisambiguationChunker(pc);
  }
}
