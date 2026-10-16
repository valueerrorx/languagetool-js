// Interim rule lists of English and French (the ported F16 core rules); replaced by Language#getRelevantRules when the language rule steps land.
import { getMessageBundleForLanguage } from '../core/resources/ResourceBundleTools.js';
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
  return [];
}
