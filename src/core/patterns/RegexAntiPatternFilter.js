// org.languagetool.rules.patterns.RegexAntiPatternFilter (drops regex rule matches overlapping an antipattern regex)
import { RuntimeException } from '../../lib/java/errors.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { RegexRuleFilter } from './RegexRuleFilter.js';

// Java: RegexAntiPatternFilter
export class RegexAntiPatternFilter extends RegexRuleFilter {
  static FQCN = 'org.languagetool.rules.patterns.RegexAntiPatternFilter';

  // Java: RegexAntiPatternFilter#acceptRuleMatch(RuleMatch,Map,AnalyzedSentence,Matcher)
  acceptRuleMatch(match, args, sentenceObj) {
    const antiPatternStr = args.get('antipatterns');
    if (antiPatternStr === null || antiPatternStr === undefined) {
      throw new RuntimeException(`Missing 'antiPatterns:' in 'args' in <filter> of rule ${match.getRule().getFullId()}`);
    }
    const antiPatterns = Pattern.compile('\\|').split(antiPatternStr);
    for (const antiPattern of antiPatterns) {
      const p = Pattern.compile(antiPattern);
      const matcher = p.matcher(sentenceObj.getText());
      while (matcher.find()) {
        // partial overlap is enough to filter out a match:
        if (matcher.start() <= match.getToPos() && matcher.end() >= match.getToPos()
            || matcher.start() <= match.getFromPos() && matcher.end() >= match.getFromPos()) {
          return null;
        }
      }
    }
    return match;
  }
}
