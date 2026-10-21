// Interim rule list of French (the ported F16 core rules); replaced by Language#getRelevantRules when F63 lands (English F50, German F59).
import { getMessageBundleForLanguage } from '../core/resources/ResourceBundleTools.js';
import { NoopDisambiguator } from '../core/noop/NoopDisambiguator.js';
import { NoopChunker } from '../core/noop/NoopChunker.js';
import { CommaWhitespaceRule } from '../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../core/rules/SentenceWhitespaceRule.js';

// Java: French#getRelevantRules (the entries of the F16 rule classes, list order); null = use the language real rule list (en, de)
export function interimRules(l) {
  const messages = getMessageBundleForLanguage(l);
  const code = l.getShortCode();
  if (code === 'en') return null; // English: real Language#getRelevantRules + XML pattern rules + speller (F50)
  if (code === 'de') return null; // German: real Language#getRelevantRules + XML pattern rules + speller (F59)
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
  return [];
}

// Interim analysis (disambiguation/chunking of the language steps are not ported yet): runs fn with the no-op disambiguator and chunker (shared by server and CLI)
export function withInterimAnalysis(lang, fn) {
  if (lang.getShortCode() === 'en') return fn(); // English: real EnglishHybridDisambiguator and EnglishChunker (F45)
  if (lang.getShortCode() === 'de') return fn(); // German: real GermanRuleDisambiguator and GermanChunker (F51)
  if (lang.getShortCode() === 'fr') return fn(); // French: real FrenchHybridDisambiguator (F60)
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
