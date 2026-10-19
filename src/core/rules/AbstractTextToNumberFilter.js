// org.languagetool.rules.AbstractTextToNumberFilter
import { AbstractMethodError } from '../../lib/java/errors.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { d2l, l2f } from '../../lib/java/casts.js';
import { floatToString } from '../../lib/java/toString.js';
import { pow } from '../../lib/java/libm.js';
import { toLowerCase } from '../../lib/java/strings.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

const f32 = Math.fround;

// Java: AbstractTextToNumberFilter
export class AbstractTextToNumberFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractTextToNumberFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractTextToNumberFilter()' }];
  // Map<String, Float> (HashMap); float values are kept as Math.fround numbers
  static numbers = new JavaHashMap();
  static multipliers = new JavaHashMap();

  // Java: AbstractTextToNumberFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const { numbers, multipliers } = AbstractTextToNumberFilter;
    let posWord = 0;
    let total = 0; // float
    let current = 0; // float
    let totalDecimal = 0; // float
    let currentDecimal = 0; // float
    let addedZeros = 0;
    let percentage = false;
    let decimal = false;
    while (posWord < patternTokens.length && patternTokens[posWord].getEndPos() <= match.getToPos()) {
      // inside <marker>
      if (patternTokens[posWord].getStartPos() >= match.getFromPos()
          && patternTokens[posWord].getEndPos() <= match.getToPos()) {
        const form = toLowerCase(patternTokens[posWord].getToken());
        if (posWord > 0 && this.isPercentage(patternTokens, posWord)) {
          percentage = true;
          break;
        }
        if (this.isComma(form)) {
          decimal = true;
          posWord++;
          continue;
        }
        const forms = this.tokenize(form);
        for (const subForm of forms) {
          if (!decimal) {
            if (numbers.containsKey(subForm)) {
              current = f32(current + numbers.get(subForm));
            } else if (multipliers.containsKey(subForm)) {
              if (current === 0) { // mil
                current = 1;
              }
              total = f32(total + f32(current * multipliers.get(subForm)));
              current = 0;
            }
          } else if (numbers.containsKey(subForm)) {
            const zerosToAdd = this.format(numbers.get(subForm), false).length;
            currentDecimal = f32(currentDecimal + numbers.get(subForm) / pow(10, addedZeros + zerosToAdd));
            addedZeros++;
          } /* else: multipliers after the decimal comma are not expected */
        }
      }
      posWord++;
    }
    total = f32(total + current);
    totalDecimal = f32(totalDecimal + currentDecimal);
    total = f32(total + totalDecimal); /* / (Float.toString(totalDecimal).length() + addedZeros) */
    const ruleMatch = match;
    const sugg = this.format(total, percentage);

    ruleMatch.addSuggestedReplacement(sugg);
    return ruleMatch;
  }

  // Java: AbstractTextToNumberFilter#format(float,boolean) (private)
  format(d, percentage) {
    let result;
    if (d === l2f(d2l(d))) { // d == (long) d
      result = d2l(d).toString(); // String.format("%d", (long) d)
    } else {
      result = floatToString(d); // String.format("%s", d)
    }
    if (percentage) {
      result = result + ' %'; // narrow non-breaking space + percentage
    }
    return this.formatResult(result);
  }

  // Java: AbstractTextToNumberFilter#isComma(String) (abstract)
  isComma() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractTextToNumberFilter.isComma');
  }

  // Java: AbstractTextToNumberFilter#isPercentage(AnalyzedTokenReadings[],int) (abstract)
  isPercentage() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractTextToNumberFilter.isPercentage');
  }

  // Java: AbstractTextToNumberFilter#formatResult(String)
  formatResult(s) {
    return s;
  }

  // Java: AbstractTextToNumberFilter#tokenize(String)
  tokenize(s) {
    return [s];
  }
}
