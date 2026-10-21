// Java: org.languagetool.language.Slovak
import { Language } from '../../../core/Language.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../../core/rules/GenericUnpairedBracketsRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { CompoundRule } from '../rules/CompoundRule.js';
import { MorfologikSlovakSpellerRule } from '../rules/MorfologikSlovakSpellerRule.js';
import { SlovakTagger } from '../tagging/SlovakTagger.js';
import { SlovakSynthesizer } from '../synthesis/SlovakSynthesizer.js';

const RULE_FILES = ['grammar-typography.xml'];

// Java: Slovak
export class Slovak extends Language {
  static FQCN = 'org.languagetool.language.Slovak';

  // Java: Slovak#getName()
  getName() {
    return 'Slovak';
  }

  // Java: Slovak#getShortCode()
  getShortCode() {
    return 'sk';
  }

  // Java: Slovak#getCountries()
  getCountries() {
    return ['SK'];
  }

  // Java: Slovak#createDefaultTagger()
  createDefaultTagger() {
    return new SlovakTagger();
  }

  // Java: Slovak#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return SlovakSynthesizer.INSTANCE;
  }

  // Java: Slovak#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Slovak#getMaintainers()
  getMaintainers() {
    return [new Contributor('Zdenko Podobný', 'http://sk-spell.sk.cx')];
  }

  // Java: Slovak#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages),
      new DoublePunctuationRule(messages),
      new GenericUnpairedBracketsRule(messages,
        ['[', '(', '{', '„', '»', '«', '"'],
        [']', ')', '}', '“', '«', '»', '"']),
      new UppercaseSentenceStartRule(messages, this),
      new WordRepeatRule(messages, this),
      new MultipleWhitespaceRule(messages, this),
      // specific to Slovak:
      new CompoundRule(messages, this, userConfig),
      new MorfologikSlovakSpellerRule(messages, this, userConfig, altLanguages),
    ];
  }

  // Java: Slovak#getRuleFileNames()
  getRuleFileNames() {
    const ruleFileNames = super.getRuleFileNames();
    const dirBase = `${getDataBroker().getRulesDir()}/${this.getShortCode()}/`;
    for (const ruleFile of RULE_FILES) {
      ruleFileNames.push(dirBase + ruleFile);
    }
    return ruleFileNames;
  }

  // Java: Slovak#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikSlovakSpellerRule(messages, this, null, null);
  }
}

registerClass(Slovak.FQCN, Slovak);
