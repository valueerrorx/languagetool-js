// org.languagetool.rules.patterns.RuleFilterEvaluator (resolves filter args and runs a RuleFilter)
import { RuntimeException } from '../../lib/java/errors.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { Integer } from '../../lib/java/int.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { javaReplace, substring } from '../../lib/java/strings.js';

const WHITESPACE = Pattern.compile('\\s+');

// Java: RuleFilterEvaluator
export class RuleFilterEvaluator {
  static FQCN = 'org.languagetool.rules.patterns.RuleFilterEvaluator';

  // Java: RuleFilterEvaluator(RuleFilter)
  constructor(filter) {
    this.filter = filter;
  }

  // Java: RuleFilterEvaluator#runFilter(String,RuleMatch,AnalyzedTokenReadings[],int,List)
  runFilter(filterArgs, ruleMatch, patternTokens, patternTokenPos, tokenPositions) {
    const args = this.getResolvedArguments(filterArgs, patternTokens, patternTokenPos, tokenPositions);
    return this.filter.acceptRuleMatch(ruleMatch, args, patternTokenPos, patternTokens, tokenPositions);
  }

  // Java: RuleFilterEvaluator#getResolvedArguments(String,AnalyzedTokenReadings[],int,List)
  getResolvedArguments(filterArgs, patternTokens, patternTokenPos, tokenPositions) {
    const result = new JavaHashMap();
    const args = WHITESPACE.split(filterArgs);
    for (const arg of args) {
      const delimPos = arg.indexOf(':');
      if (delimPos === -1) {
        throw new RuntimeException(`Invalid syntax for key/value, expected 'key:value', got: '${arg}'`);
      }
      const key = substring(arg, 0, delimPos);
      const val = substring(arg, delimPos + 1);
      if (val.startsWith('\\')) {
        const refNumber = Integer.parseInt(javaReplace(val, '\\', ''));
        if (refNumber > tokenPositions.length) {
          throw new RuntimeException(`Your reference number ${refNumber} is bigger than the number of tokens: ${tokenPositions.length}`);
        }
        const correctedRef = this.getSkipCorrectedReference(tokenPositions, refNumber);
        if (correctedRef >= patternTokens.length) {
          throw new RuntimeException(`Your reference number ${refNumber} is bigger than number of matching tokens: ${patternTokens.length}`);
        }
        if (result.containsKey(key)) {
          throw new RuntimeException(`Duplicate key '${key}'`);
        }
        result.put(key, arrayGet(patternTokens, correctedRef).getToken());
      } else {
        result.put(key, val);
      }
    }
    return result;
  }

  // Java: RuleFilterEvaluator#getSkipCorrectedReference(List,int); when there's a 'skip', the reference number is adapted
  getSkipCorrectedReference(tokenPositions, refNumber) {
    let correctedRef = 0;
    let i = 0;
    for (const tokenPosition of tokenPositions) {
      if (i++ >= refNumber) {
        break;
      }
      correctedRef += tokenPosition;
    }
    return correctedRef - 1;
  }
}
