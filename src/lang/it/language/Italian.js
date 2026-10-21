// Java: org.languagetool.language.Italian
import { NullPointerException } from '../../../lib/java/errors.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { WhitespaceBeforePunctuationRule } from '../../../core/rules/WhitespaceBeforePunctuationRule.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { MorfologikItalianSpellerRule } from '../rules/MorfologikItalianSpellerRule.js';
import { ItalianWordRepeatRule } from '../rules/ItalianWordRepeatRule.js';
import { ItalianTagger } from '../tagging/ItalianTagger.js';
import { ItalianSynthesizer } from '../synthesis/ItalianSynthesizer.js';

// Java: Italian
export class Italian extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.Italian';

  // Java: Italian#getName()
  getName() {
    return 'Italian';
  }

  // Java: Italian#getShortCode()
  getShortCode() {
    return 'it';
  }

  // Java: Italian#getCountries()
  getCountries() {
    return ['IT', 'CH'];
  }

  // Java: Italian#createDefaultTagger()
  createDefaultTagger() {
    return new ItalianTagger();
  }

  // Java: Italian#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Italian#getMaintainers()
  getMaintainers() {
    return [new Contributor('Paolo Bianchini')];
  }

  // Java: Italian#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new WhitespaceBeforePunctuationRule(messages),
      new CommaWhitespaceRule(messages),
      new DoublePunctuationRule(messages),
      new GenericUnpairedBracketsRule(messages,
        ['[', '(', '{', '»', '«'],
        [']', ')', '}', '«', '»']),
      new MorfologikItalianSpellerRule(messages, this, userConfig, altLanguages),
      new UppercaseSentenceStartRule(messages, this),
      new ItalianWordRepeatRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
    ];
  }

  // Java: Italian#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules(messages, languageModel) {
    // ItalianConfusionProbabilityRule: the constructor dereferences the language model (Objects.requireNonNull)
    if (languageModel === null || languageModel === undefined) throw new NullPointerException();
    throw notPortedYet('Italian#getRelevantLanguageModelRules (ngram rules, DEV-001)');
  }

  // Java: Italian#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.disambiguation.rules.it.ItalianRuleDisambiguator');
  }

  // Java: Italian#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return ItalianSynthesizer.INSTANCE;
  }

  // Java: Italian#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: Italian#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikItalianSpellerRule(messages, this, null, null);
  }
}

registerClass(Italian.FQCN, Italian);
