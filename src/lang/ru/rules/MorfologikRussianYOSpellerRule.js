// Java: org.languagetool.rules.ru.MorfologikRussianYOSpellerRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleOption } from '../../../core/rules/model/RuleOption.js';

const RULE_ID = 'MORFOLOGIK_RULE_RU_RU_YO';
const RESOURCE_FILENAME = '/ru/hunspell/ru_RU_yo.dict';
const RUSSIAN_LETTERS = Pattern.compile('[-а-яёо́а́е́у́и́ы́э́ю́я́о̀а̀ѐу̀ѝы̀э̀ю̀я̀ʼА-ЯЁ]*');
const DEFAULT_MIN_RU_VALUE = 0;
const lcDoNotSuggestWords = new Set([
  // words with 'NOSUGGEST' flag:
  'блоггер', 'елка', 'дрочим', 'анальный', 'орочем',
]);

// Java: MorfologikRussianYOSpellerRule
export class MorfologikRussianYOSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.ru.MorfologikRussianYOSpellerRule';
  static RULE_ID = RULE_ID;

  // Java: MorfologikRussianYOSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.setDefaultOff();
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

  // Java: MorfologikRussianYOSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikRussianYOSpellerRule#getId()
  getId() {
    return RULE_ID;
  }

  // Java: MorfologikRussianYOSpellerRule#filterNoSuggestWords(List)
  filterNoSuggestWords(l) {
    return l.filter((k) => !lcDoNotSuggestWords.has(toLowerCase(k.getReplacement())));
  }

  // Java: MorfologikRussianYOSpellerRule#ignoreToken(AnalyzedTokenReadings[],int)
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

  // Java: MorfologikRussianYOSpellerRule#getDescription()
  getDescription() {
    return 'Проверка орфографии. Только «Ё» (экспериментальное правило).';
  }

  // Java: MorfologikRussianYOSpellerRule#isLatinScript()
  isLatinScript() {
    return false;
  }

  // Java: MorfologikRussianYOSpellerRule#getConfigureText()
  getConfigureText() {
    return 'Проверять слова на латинице, только термины (0/1)';
  }

  // Java: MorfologikRussianYOSpellerRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(DEFAULT_MIN_RU_VALUE, this.getConfigureText(), 0, 1)];
  }
}

registerComponent(MorfologikRussianYOSpellerRule.FQCN, (...args) => new MorfologikRussianYOSpellerRule(...args));
