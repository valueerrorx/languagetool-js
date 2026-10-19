// org.languagetool.rules.PartialPosTagFilter
import { AbstractMethodError, RuntimeException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaMatches } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: PartialPosTagFilter
export class PartialPosTagFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.PartialPosTagFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.PartialPosTagFilter()' }];

  // Java: PartialPosTagFilter#tag(String) (abstract, may return null)
  tag() {
    throw new AbstractMethodError('org.languagetool.rules.PartialPosTagFilter.tag');
  }

  // Java: PartialPosTagFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens) {
    if (!(args.containsKey('no') && args.containsKey('regexp') && args.containsKey('postag_regexp'))) {
      throw new RuntimeException("Set 'no', 'regexp' and 'postag_regexp' for filter PartialPosTagFilter");
    }
    const tokenPos = Integer.parseInt(args.get('no'));
    const pattern = Pattern.compile(args.get('regexp'));
    const requiredTagRegexp = args.get('postag_regexp');
    const negatePos = args.containsKey('negate_pos');
    const twoGroupsRegexp = args.containsKey('two_groups_regexp');

    let prefix = '';
    let suffix = '';
    if (args.containsKey('prefix')) {
      prefix = args.get('prefix');
    }
    if (args.containsKey('suffix')) {
      suffix = args.get('suffix');
    }

    const token = prefix + arrayGet(patternTokens, tokenPos - 1).getToken() + suffix;

    const matcher = pattern.matcher(token);
    if ((matcher.groupCount() !== 1) && !(twoGroupsRegexp)) {
      throw new RuntimeException('Got ' + matcher.groupCount() + " groups for regex '" + pattern.pattern() + "', expected 1");
    }
    if ((matcher.groupCount() !== 2) && (twoGroupsRegexp)) {
      throw new RuntimeException('Got ' + matcher.groupCount() + " groups for regex '" + pattern.pattern() + "', expected 2");
    }
    if (matcher.matches()) {
      let partialToken = matcher.group(1);
      if (matcher.groupCount() === 2) {
        partialToken += matcher.group(2);
      }
      const tags = this.tag(partialToken);
      if (tags !== null && tags !== undefined && this.partialTagHasRequiredTag(tags, requiredTagRegexp, negatePos)) {
        return match;
      }
      return null;
    }
    return null;
  }

  // Java: PartialPosTagFilter#partialTagHasRequiredTag(List,String,boolean) (private)
  partialTagHasRequiredTag(tags, requiredTagRegexp, negatePos) {
    // Without negate_pos=yes: return true if any postag matches the regexp.
    // With negate_pos=yes:    return true if there are postag and none them matches the regexp.
    let postagCount = 0;
    for (const tag of tags) {
      for (const analyzedToken of tag.getReadings()) {
        if (analyzedToken.getPOSTag() !== null) {
          if (negatePos) {
            postagCount++;
            if (javaMatches(analyzedToken.getPOSTag(), requiredTagRegexp)) {
              return false;
            }
          } else if (javaMatches(analyzedToken.getPOSTag(), requiredTagRegexp)) {
            return true;
          }
        }
      }
    }
    return postagCount === 0 ? false : negatePos;
  }
}
