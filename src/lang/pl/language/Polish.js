// Java: org.languagetool.language.Polish
import { Language } from '../../../core/Language.js';
import { MARCIN_MILKOWSKI } from '../../../core/language/Contributors.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { createComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../../core/rules/SentenceWhitespaceRule.js';
import { PolishUnpairedBracketsRule } from '../rules/PolishUnpairedBracketsRule.js';
import { MorfologikPolishSpellerRule } from '../rules/MorfologikPolishSpellerRule.js';
import { PolishWordRepeatRule } from '../rules/PolishWordRepeatRule.js';
import { CompoundRule } from '../rules/CompoundRule.js';
import { SimpleReplaceRule } from '../rules/SimpleReplaceRule.js';
import { WordCoherencyRule } from '../rules/WordCoherencyRule.js';
import { DashRule } from '../rules/DashRule.js';
import { PolishTagger } from '../tagging/PolishTagger.js';
import { PolishWordTokenizer } from '../tokenizers/PolishWordTokenizer.js';
import { PolishSynthesizer } from '../synthesis/PolishSynthesizer.js';

// Java: Polish
export class Polish extends Language {
  static FQCN = 'org.languagetool.language.Polish';

  // Java: Polish#getName()
  getName() {
    return 'Polish';
  }

  // Java: Polish#getShortCode()
  getShortCode() {
    return 'pl';
  }

  // Java: Polish#getCountries()
  getCountries() {
    return ['PL'];
  }

  // Java: Polish#createDefaultTagger()
  createDefaultTagger() {
    return new PolishTagger();
  }

  // Java: Polish#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Polish#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    const wordTokenizer = new PolishWordTokenizer();
    wordTokenizer.setTagger(this.getTagger());
    return wordTokenizer;
  }

  // Java: Polish#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return createComponent('org.languagetool.tagging.disambiguation.pl.PolishHybridDisambiguator');
  }

  // Java: Polish#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return PolishSynthesizer.INSTANCE;
  }

  // Java: Polish#getMaintainers()
  getMaintainers() {
    return [MARCIN_MILKOWSKI];
  }

  // Java: Polish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages),
      new UppercaseSentenceStartRule(messages, this),
      new WordRepeatRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
      new SentenceWhitespaceRule(messages),
      // specific to Polish:
      new PolishUnpairedBracketsRule(messages, this),
      new MorfologikPolishSpellerRule(messages, this, userConfig, altLanguages),
      new PolishWordRepeatRule(messages),
      new CompoundRule(messages, this, userConfig),
      new SimpleReplaceRule(messages, this),
      new WordCoherencyRule(messages),
      new DashRule(messages),
    ];
  }

  // Java: Polish#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: Polish#getPriorityForId(String)
  getPriorityForId(id) {
    if (id === 'ZDANIA_ZLOZONE') return -1; // so that it does not override more important rules
    return super.getPriorityForId(id);
  }

  // Java: Polish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikPolishSpellerRule(messages, this, null, null);
  }
}

registerClass(Polish.FQCN, Polish);
