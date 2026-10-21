// Java: org.languagetool.language.Slovenian
import { Language } from '../../../core/Language.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { MorfologikSlovenianSpellerRule } from '../rules/MorfologikSlovenianSpellerRule.js';

// Java: Slovenian (deprecated, unmaintained since 3.6)
export class Slovenian extends Language {
  static FQCN = 'org.languagetool.language.Slovenian';

  // Java: Slovenian#getName()
  getName() {
    return 'Slovenian';
  }

  // Java: Slovenian#getShortCode()
  getShortCode() {
    return 'sl';
  }

  // Java: Slovenian#getCountries()
  getCountries() {
    return ['SI'];
  }

  // Java: Slovenian#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Slovenian#getMaintainers()
  getMaintainers() {
    return [new Contributor('Martin Srebotnjak')];
  }

  // Java: Slovenian#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages),
      new DoublePunctuationRule(messages),
      new GenericUnpairedBracketsRule(messages,
        ['[', '(', '{', '„', '»', '«', '"'],
        [']', ')', '}', '”', '«', '»', '"']),
      new MorfologikSlovenianSpellerRule(messages, this, userConfig, altLanguages),
      new UppercaseSentenceStartRule(messages, this),
      new WordRepeatRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
    ];
  }

  // Java: Slovenian#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikSlovenianSpellerRule(messages, this, null, null);
  }
}

registerClass(Slovenian.FQCN, Slovenian);
