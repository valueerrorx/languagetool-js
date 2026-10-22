// Java: org.languagetool.language.Russian (rule list holds the rules ported so far, W26-W27 add the rest)
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { Languages } from '../../../core/Languages.js';
import { LanguageWithModel } from '../../../core/LanguageWithModel.js';
import { LanguageMaintainedState } from '../../../core/LanguageMaintainedState.js';
import { Contributor } from '../../../core/language/Contributor.js';
import { createComponent, sharedComponent } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { SRXSentenceTokenizer } from '../../../core/text/tokenizers/SRXSentenceTokenizer.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';
import { UppercaseSentenceStartRule } from '../../../core/rules/UppercaseSentenceStartRule.js';
import { MultipleWhitespaceRule } from '../../../core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../../core/rules/SentenceWhitespaceRule.js';
import { WhiteSpaceBeforeParagraphEnd } from '../../../core/rules/WhiteSpaceBeforeParagraphEnd.js';
import { WhiteSpaceAtBeginOfParagraph } from '../../../core/rules/WhiteSpaceAtBeginOfParagraph.js';
import { LongSentenceRule } from '../../../core/rules/LongSentenceRule.js';
import { LongParagraphRule } from '../../../core/rules/LongParagraphRule.js';
import { ParagraphRepeatBeginningRule } from '../../../core/rules/ParagraphRepeatBeginningRule.js';
import { PunctuationMarkAtParagraphEnd2 } from '../../../core/rules/PunctuationMarkAtParagraphEnd2.js';
import { MorfologikRussianSpellerRule } from '../rules/MorfologikRussianSpellerRule.js';
import { MorfologikRussianYOSpellerRule } from '../rules/MorfologikRussianYOSpellerRule.js';
import { RussianTagger } from '../tagging/RussianTagger.js';
import { RussianSynthesizer } from '../synthesis/RussianSynthesizer.js';
import { RussianWordTokenizer } from '../tokenizers/RussianWordTokenizer.js';

const LANGUAGE_SHORT_CODE = 'ru';

let instantiationTrace = null; // Java: Russian#instantiationTrace

// Rules still to be added to getRelevantRules by W26/W27 (position in the Java list in brackets)
// [11] RussianFillerWordsRule(messages, this, userConfig) (after ParagraphRepeatBeginningRule)
// [14] RussianUnpairedBracketsRule(messages, this), [15] RussianCompoundRule(messages, this, userConfig), [16] RussianSimpleReplaceRule(messages),
// [17] RussianSimpleWordRepeatRule(messages, this), [18] RussianWordCoherencyRule(messages), [19] RussianWordRepeatRule(messages),
// [20] RussianWordRootRepeatRule(messages), [21] RussianVerbConjugationRule(messages), [22] RussianDashRule(messages), [23] RussianSpecificCaseRule(messages)

// Java: Russian
export class Russian extends LanguageWithModel {
  static FQCN = 'org.languagetool.language.Russian';

  // Java: Russian#Russian() / protected Russian(boolean) (fake constructor overload for subclasses)
  constructor(fakeValue) {
    super();
    if (fakeValue === undefined) {
      const trace = instantiationTrace;
      if (trace !== null) {
        throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
      }
      instantiationTrace = new Throwable();
    }
  }

  // Java: Russian#getIgnoredCharactersRegex()
  getIgnoredCharactersRegex() {
    return Pattern.compile('[­́̀]');
  }

  // Java: Russian#getName()
  getName() {
    return 'Russian';
  }

  // Java: Russian#getShortCode()
  getShortCode() {
    return LANGUAGE_SHORT_CODE;
  }

  // Java: Russian#getCountries()
  getCountries() {
    return ['RU'];
  }

  // Java: Russian#createDefaultTagger()
  createDefaultTagger() {
    return RussianTagger.INSTANCE;
  }

  // Java: Russian#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return sharedComponent('org.languagetool.tagging.disambiguation.ru.RussianHybridDisambiguator'); // lazy singleton, avoids an import cycle
  }

  // Java: Russian#createDefaultPostDisambiguationChunker()
  createDefaultPostDisambiguationChunker() {
    return createComponent('org.languagetool.chunking.RussianChunker');
  }

  // Java: Russian#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return RussianSynthesizer.INSTANCE;
  }

  // Java: Russian#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new SRXSentenceTokenizer(this);
  }

  // Java: Russian#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return new RussianWordTokenizer();
  }

  // Java: Russian#getMaintainers()
  getMaintainers() {
    return [new Contributor('Yakov Reztsov', 'http://myooo.ru/content/view/83/43/')];
  }

  // Java: Russian#getOpeningDoubleQuote()
  getOpeningDoubleQuote() {
    return '«';
  }

  // Java: Russian#getClosingDoubleQuote()
  getClosingDoubleQuote() {
    return '»';
  }

  // Java: Russian#getOpeningSingleQuote()
  getOpeningSingleQuote() {
    return '‘';
  }

  // Java: Russian#getClosingSingleQuote()
  getClosingSingleQuote() {
    return '’';
  }

  // Java: Russian#isAdvancedTypographyEnabled()
  isAdvancedTypographyEnabled() {
    return true;
  }

  // Java: Russian#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return [
      new CommaWhitespaceRule(messages,
        Example.wrong('Не род<marker> ,</marker> а ум поставлю в воеводы.'),
        Example.fixed('Не род<marker>,</marker> а ум поставлю в воеводы.')),
      new UppercaseSentenceStartRule(messages, this,
        Example.wrong('Закончилось лето. <marker>дети</marker> снова сели за школьные парты.'),
        Example.fixed('Закончилось лето. <marker>Дети</marker> снова сели за школьные парты.')),
      new MorfologikRussianSpellerRule(messages, this, userConfig, altLanguages),
      new MultipleWhitespaceRule(messages, this),
      new SentenceWhitespaceRule(messages),
      new WhiteSpaceBeforeParagraphEnd(messages, this),
      new WhiteSpaceAtBeginOfParagraph(messages),
      new LongSentenceRule(messages, userConfig, 50),
      new LongParagraphRule(messages, this, userConfig),
      new ParagraphRepeatBeginningRule(messages, this),
      // TODO(W27): RussianFillerWordsRule(messages, this, userConfig)
      new PunctuationMarkAtParagraphEnd2(messages, this),
      // specific to Russian:
      new MorfologikRussianYOSpellerRule(messages, this, userConfig, altLanguages), // This rule must set off by default!!!
      // TODO(W26/W27): RussianUnpairedBracketsRule, RussianCompoundRule, RussianSimpleReplaceRule, RussianSimpleWordRepeatRule,
      // RussianWordCoherencyRule, RussianWordRepeatRule, RussianWordRootRepeatRule, RussianVerbConjugationRule, RussianDashRule, RussianSpecificCaseRule
    ];
  }

  // Java: Russian#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules() {
    return []; // RussianConfusionProbabilityRule needs a language model (ngram, DEV-001); DEV-026: null model gives an empty list
  }

  // Java: Russian#getMaintainedState()
  getMaintainedState() {
    return LanguageMaintainedState.ActivelyMaintained;
  }

  // Java: Russian#getPriorityForId(String)
  getPriorityForId(id) {
    switch (id) {
      case 'RU_DASH_RULE': return 12; // higher prio than RU_COMPOUNDS
      case 'RU_COMPOUNDS': return 11;
      case 'RUSSIAN_SIMPLE_REPLACE_RULE': return 10; // higher prio than spell checker
      case 'RUSSIAN_SPECIFIC_CASE': return 9; // higher prio than spell checker
      case 'MORFOLOGIC_RULE_RU_RU_YO': return 2; // spell checker yo
      case 'MORFOLOGIC_RULE_RU_RU': return 1; // standard spell checker yo+ie
      case 'Word_root_repeat': return -1;
      case 'PUNCT_DPT_2': return -2;
      case 'TOO_LONG_PARAGRAPH': return -15;
      default: return super.getPriorityForId(id);
    }
  }

  // Java: Russian#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return new MorfologikRussianSpellerRule(messages, this, null, null);
  }

  // Java: Russian#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(LANGUAGE_SHORT_CODE));
    if (language instanceof Russian) {
      return language;
    }
    throw new RuntimeException(`Russian language expected, got ${language}`);
  }
}

registerClass(Russian.FQCN, Russian);
