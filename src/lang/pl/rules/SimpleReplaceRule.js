// Java: org.languagetool.rules.pl.SimpleReplaceRule
import { AbstractSimpleReplaceRule } from '../../../core/rules/AbstractSimpleReplaceRule.js';
import { Category, CategoryId } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Locale } from '../../../lib/java/Locale.js';

let wrongWords = null; // Java: static wrongWords = loadFromPath("/pl/replace.txt")
const PL_LOCALE = new Locale('pl');

// Java: SimpleReplaceRule (pl)
export class SimpleReplaceRule extends AbstractSimpleReplaceRule {
  static FQCN = 'org.languagetool.rules.pl.SimpleReplaceRule';
  static POLISH_SIMPLE_REPLACE_RULE = 'PL_SIMPLE_REPLACE';

  // Java: SimpleReplaceRule#getWrongWords()
  getWrongWords() {
    if (wrongWords === null) wrongWords = AbstractSimpleReplaceRule.loadFromPath('/pl/replace.txt');
    return wrongWords;
  }

  // Java: SimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    SimpleReplaceRule.prototype.getWrongWords.call(this); // Java: static initializer runs at class load
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.setCategory(new Category(new CategoryId('PRAWDOPODOBNE_LITEROWKI'), 'Prawdopodobne literówki'));
    this.setCheckLemmas(false);
    this.addExamplePair(Example.wrong('Uspokój <marker>sei</marker>.'),
      Example.fixed('Uspokój <marker>się</marker>.'));
  }

  // Java: SimpleReplaceRule#getId()
  getId() {
    return SimpleReplaceRule.POLISH_SIMPLE_REPLACE_RULE;
  }

  // Java: SimpleReplaceRule#getDescription()
  getDescription() {
    return 'Typowe literówki i niepoprawne wyrazy (domowi, sie, niewiadomo, duh, cie…)';
  }

  // Java: SimpleReplaceRule#getShort()
  getShort() {
    return 'Literówka';
  }

  // Java: SimpleReplaceRule#getMessage(String,List)
  getMessage(tokenStr, replacements) {
    return 'Wyraz „' + tokenStr + '” to najczęściej literówka; poprawnie pisze się: '
        + replacements.join(', ') + '.';
  }

  // Java: SimpleReplaceRule#isCaseSensitive()
  isCaseSensitive() {
    return false;
  }

  // Java: SimpleReplaceRule#getLocale()
  getLocale() {
    return PL_LOCALE;
  }
}
