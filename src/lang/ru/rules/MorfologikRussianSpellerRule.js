// Java: org.languagetool.rules.ru.MorfologikRussianSpellerRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleOption } from '../../../core/rules/model/RuleOption.js';

const RULE_ID = 'MORFOLOGIK_RULE_RU_RU';
const RESOURCE_FILENAME = '/ru/hunspell/ru_RU.dict';
const RUSSIAN_LETTERS = Pattern.compile('[-а-яёо́а́е́у́и́ы́э́ю́я́о̀а̀ѐу̀ѝы̀э̀ю̀я̀ʼА-ЯЁ]*');
const DEFAULT_MIN_RU_VALUE = 0;
const lcDoNotSuggestWords = new Set([
  // words with 'NOSUGGEST' flag:
  'блоггер', 'дрочим', 'анальный', 'орочем',
]);

// Java: MorfologikRussianSpellerRule
export class MorfologikRussianSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.ru.MorfologikRussianSpellerRule';
  static RULE_ID = RULE_ID;

  // Java: MorfologikRussianSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.conf_ru_Value = DEFAULT_MIN_RU_VALUE;
    this.addExamplePair(Example.wrong('Все счастливые семьи похожи друг на друга, <marker>каждя</marker> несчастливая семья несчастлива по-своему.'),
      Example.fixed('Все счастливые семьи похожи друг на друга, <marker>каждая</marker> несчастливая семья несчастлива по-своему.'));

    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      if (cf !== null && cf !== undefined) {
        this.conf_ru_Value = cf[0];
      }
    }
  }

  // Java: MorfologikRussianSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikRussianSpellerRule#getId()
  getId() {
    return RULE_ID;
  }

  // Java: MorfologikRussianSpellerRule#filterNoSuggestWords(List)
  filterNoSuggestWords(l) {
    return l.filter((k) => !lcDoNotSuggestWords.has(toLowerCase(k.getReplacement())));
  }

  // Java: MorfologikRussianSpellerRule#ignoreToken(AnalyzedTokenReadings[],int)
  ignoreToken(tokens, idx) {
    const word = tokens[idx].getToken();
    // don't check words that don't have letters
    if (this.conf_ru_Value !== 1 && !RUSSIAN_LETTERS.matcher(word).matches()) {
      return true;
    }

    const words = [];
    for (const token of tokens) {
      words.push(token.getToken());
    }

    return this.ignoreWordAt(words, idx);
  }

  // Java: MorfologikRussianSpellerRule#isLatinScript()
  isLatinScript() {
    return false;
  }

  // Java: MorfologikRussianSpellerRule#getConfigureText()
  getConfigureText() {
    return 'Проверять слова на латинице, только термины (0/1)';
  }

  // Java: MorfologikRussianSpellerRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(DEFAULT_MIN_RU_VALUE, this.getConfigureText(), 0, 1)];
  }
}

registerComponent(MorfologikRussianSpellerRule.FQCN, (...args) => new MorfologikRussianSpellerRule(...args));
