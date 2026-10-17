// org.languagetool.rules.patterns.RegexRuleFilterEvaluator (resolves filter args and runs a RegexRuleFilter)
import { RuntimeException } from '../../lib/java/errors.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { substring } from '../../lib/java/strings.js';

// Java: RegexRuleFilterEvaluator
export class RegexRuleFilterEvaluator {
  static FQCN = 'org.languagetool.rules.patterns.RegexRuleFilterEvaluator';

  // Java: RegexRuleFilterEvaluator(RegexRuleFilter)
  constructor(filter) {
    this.filter = filter;
  }

  // Java: RegexRuleFilterEvaluator#runFilter(String,RuleMatch,AnalyzedSentence,Matcher)
  runFilter(filterArgs, ruleMatch, sentenceObj, patternMatcher) {
    const args = this.getResolvedArguments(filterArgs);
    return this.filter.acceptRuleMatch(ruleMatch, args, sentenceObj, patternMatcher);
  }

  // Java: RegexRuleFilterEvaluator#getResolvedArguments(String)
  getResolvedArguments(filterArgs) {
    const result = new JavaHashMap();
    const args = Pattern.compile('\\s+').split(filterArgs);
    for (const arg of args) {
      const delimPos = arg.indexOf(':');
      if (delimPos === -1) {
        throw new RuntimeException(`Invalid syntax for key/value, expected 'key:value', got: '${arg}'`);
      }
      const key = substring(arg, 0, delimPos);
      const val = substring(arg, delimPos + 1);
      result.put(key, val);
    }
    return result;
  }
}
