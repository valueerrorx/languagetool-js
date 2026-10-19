// org.languagetool.rules.WhitespaceCheckFilter
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: WhitespaceCheckFilter
export class WhitespaceCheckFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.WhitespaceCheckFilter';

  // Java: WhitespaceCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const wsChar = this.getRequired('whitespaceChar', arguments_);
    const pos = Integer.parseInt(this.getRequired('position', arguments_));
    if (pos < 1 || pos > patternTokens.length) {
      throw new IllegalArgumentException('Wrong position in WhitespaceCheckFilter: ' + pos + ', must be 1 to ' + patternTokens.length);
    }
    if (patternTokens[pos - 1].getWhitespaceBefore() !== wsChar) {
      return match;
    }
    return null;
  }
}
