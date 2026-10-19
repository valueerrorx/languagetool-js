// Interim rule lists of English and French (the ported F16 core rules); replaced by Language#getRelevantRules when the language rule steps land.
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
import { EnglishUnpairedBracketsRule } from '../lang/en/rules/EnglishUnpairedBracketsRule.js';
import { EnglishUnpairedQuotesRule } from '../lang/en/rules/EnglishUnpairedQuotesRule.js';
import { GermanCommaWhitespaceRule } from '../lang/de/rules/GermanCommaWhitespaceRule.js';
import { GermanDoublePunctuationRule } from '../lang/de/rules/GermanDoublePunctuationRule.js';
import { GermanUnpairedBracketsRule } from '../lang/de/rules/GermanUnpairedBracketsRule.js';
import { GermanUnpairedQuotesRule } from '../lang/de/rules/GermanUnpairedQuotesRule.js';
import { SentenceWhitespaceRule as GermanSentenceWhitespaceRule } from '../lang/de/rules/SentenceWhitespaceRule.js';
import { EnglishWordRepeatRule } from '../lang/en/rules/EnglishWordRepeatRule.js';

// Java: English#getRelevantRules / French#getRelevantRules (the entries of the F16 rule classes, list order); other languages: no rules yet
export function interimRules(l) {
  const messages = getMessageBundleForLanguage(l);
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
