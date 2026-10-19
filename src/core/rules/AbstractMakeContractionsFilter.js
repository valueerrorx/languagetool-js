// org.languagetool.rules.AbstractMakeContractionsFilter
import { AbstractMethodError } from '../../lib/java/errors.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: AbstractMakeContractionsFilter
export class AbstractMakeContractionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractMakeContractionsFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractMakeContractionsFilter()' }];

  // Java: AbstractMakeContractionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match) {
    const newMatch = match;
    const newSugestions = [];
    for (const suggestion of match.getSuggestedReplacements()) {
      newSugestions.push(this.fixContractions(suggestion));
    }
    newMatch.setSuggestedReplacements(newSugestions);
    return newMatch;
  }

  // Java: AbstractMakeContractionsFilter#fixContractions(String) (abstract)
  fixContractions() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractMakeContractionsFilter.fixContractions');
  }
}
