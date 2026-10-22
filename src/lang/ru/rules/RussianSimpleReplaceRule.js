// Java: org.languagetool.rules.ru.RussianSimpleReplaceRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Category, CategoryId } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Locale } from '../../../lib/java/Locale.js';
import { Russian } from '../language/Russian.js';

const RU_LOCALE = new Locale('ru');

// Java: RussianSimpleReplaceRule
export class RussianSimpleReplaceRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.ru.RussianSimpleReplaceRule';
  static RUSSIAN_SIMPLE_REPLACE_RULE = 'RU_SIMPLE_REPLACE';

  // Java: RussianSimpleReplaceRule(ResourceBundle)
  constructor(messages) {
    super(messages, Russian.getInstance());
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.setCategory(new Category(new CategoryId('MISC'), 'Общие правила'));
    this.addExamplePair(Example.wrong('<marker>Экспрессо</marker> – крепкий кофе, приготовленный из хорошо обжаренных и тонко помолотых кофейных зёрен.'),
      Example.fixed('<marker>Эспрессо</marker> – крепкий кофе, приготовленный из хорошо обжаренных и тонко помолотых кофейных зёрен.'));
  }

  // Java: RussianSimpleReplaceRule#getFileNames()
  getFileNames() {
    return ['/ru/replace.txt'];
  }

  // Java: RussianSimpleReplaceRule#getId()
  getId() {
    return RussianSimpleReplaceRule.RUSSIAN_SIMPLE_REPLACE_RULE;
  }

  // Java: RussianSimpleReplaceRule#getDescription()
  getDescription() {
    return 'Поиск просторечий и ошибочных фраз';
  }

  // Java: RussianSimpleReplaceRule#getShort()
  getShort() {
    return 'Ошибка?';
  }

  // Java: RussianSimpleReplaceRule#getMessage()
  getMessage() {
    return '«$match» — просторечие, исправление: $suggestions';
  }

  // Java: RussianSimpleReplaceRule#getLocale()
  getLocale() {
    return RU_LOCALE;
  }
}
