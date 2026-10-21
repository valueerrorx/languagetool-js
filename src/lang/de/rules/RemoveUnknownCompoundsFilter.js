// org.languagetool.rules.de.RemoveUnknownCompoundsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { GermanyGerman } from './GermanyGermanLazy.js';

// Java: RemoveUnknownCompoundsFilter
export class RemoveUnknownCompoundsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.RemoveUnknownCompoundsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.RemoveUnknownCompoundsFilter()' }];

  // Java: RemoveUnknownCompoundsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const part2 = arguments_.get('part2');
    if (part2 === null || part2 === undefined) throw new NullPointerException();
    const compound = arguments_.get('part1') + toLowerCase(part2); // String concatenation: null part1 gives "null..."
    if (GermanyGerman.getInstance().getDefaultSpellingRule().isMisspelled(compound)) {
      return null;
    }
    // TODO (Java): use ngrams. no occurrences for compound = don't show error
    return match;
  }
}

registerClass(RemoveUnknownCompoundsFilter.FQCN, RemoveUnknownCompoundsFilter);
