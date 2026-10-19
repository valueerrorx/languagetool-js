// org.languagetool.rules.AbstractNumberInWordFilter
import { AbstractMethodError, NullPointerException } from '../../lib/java/errors.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace } from '../../lib/java/strings.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: AbstractNumberInWordFilter
export class AbstractNumberInWordFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractNumberInWordFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = []; // the only constructor is protected
  static typoPattern = Pattern.compile('[0-9]');

  // Java: AbstractNumberInWordFilter#AbstractNumberInWordFilter(Language) (protected)
  constructor(language) {
    super();
    this.language = language;
  }

  // Java: AbstractNumberInWordFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const word = arguments_.get('word');
    if (word === null || word === undefined) {
      throw new NullPointerException(); // word.replace(...) on null
    }
    const wordReplacingZeroO = javaReplace(word, '0', 'o');
    const wordWithoutNumberCharacter = AbstractNumberInWordFilter.typoPattern.matcher(word).replaceAll('');
    const replacements = [];

    if (!this.isMisspelled(wordReplacingZeroO) && word !== wordReplacingZeroO) {
      replacements.push(wordReplacingZeroO);
    }
    if (!this.isMisspelled(wordWithoutNumberCharacter)) {
      replacements.push(wordWithoutNumberCharacter);
    }
    if (replacements.length === 0) {
      const suggestions = this.getSuggestions(wordWithoutNumberCharacter);
      replacements.push(...suggestions);
    }
    if (replacements.length !== 0) {
      const ruleMatch = new RuleMatch(match);
      ruleMatch.setSuggestedReplacements(replacements);
      return ruleMatch;
    }
    return null;
  }

  // Java: AbstractNumberInWordFilter#isMisspelled(String) (abstract)
  isMisspelled() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractNumberInWordFilter.isMisspelled');
  }

  // Java: AbstractNumberInWordFilter#getSuggestions(String) (abstract)
  getSuggestions() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractNumberInWordFilter.getSuggestions');
  }
}
