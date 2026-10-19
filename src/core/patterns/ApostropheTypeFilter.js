// org.languagetool.rules.patterns.ApostropheTypeFilter
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { equalsIgnoreCase } from '../../lib/java/strings.js';
import { RuleFilter } from './RuleFilter.js';

// Java: ApostropheTypeFilter
export class ApostropheTypeFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.patterns.ApostropheTypeFilter';

  // Java: ApostropheTypeFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const wordFrom = this.getRequired('wordFrom', arguments_);
    const hasTypographicalApostrophe = equalsIgnoreCase(this.getRequired('hasTypographicalApostrophe', arguments_), 'true');
    if (wordFrom !== null) {
      let posWord = 0;
      if (wordFrom === 'marker') {
        while (posWord < patternTokens.length && patternTokens[posWord].getStartPos() < match.getFromPos()) {
          posWord++;
        }
        posWord++;
      } else {
        posWord = Integer.parseInt(wordFrom);
      }
      if (posWord < 1 || posWord > patternTokens.length) {
        throw new IllegalArgumentException('ApostropheTypeFilter: Index out of bounds in '
            + match.getRule().getFullId() + ', wordFrom: ' + posWord);
      }
      const atrWord = patternTokens[posWord - 1];
      if (hasTypographicalApostrophe === atrWord.hasTypographicApostrophe()) {
        return match;
      }
    }
    return null;
  }
}
