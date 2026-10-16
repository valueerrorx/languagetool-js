// org.languagetool.rules.patterns.RuleFilter (base class of XML <filter> classes)
import { AbstractMethodError, ClassCastException, IllegalArgumentException, RuntimeException } from '../../lib/java/errors.js';
import { Rule } from '../rules/model/Rule.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { isPunctuationMark } from '../text/StringTools.js';
import { javaReplace } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { Integer } from '../../lib/java/int.js';
import { AbstractPatternRule } from './AbstractPatternRule.js';
import { PatternRule } from './PatternRule.js';

// Java: RuleFilter.FakeRule
class FakeRule extends Rule {
  getId() { return 'FAKE-RULE-FOR-FILTER'; }

  getDescription() { return '<none>'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

// Java: RuleFilter
export class RuleFilter {
  static FQCN = 'org.languagetool.rules.patterns.RuleFilter';

  constructor() {
    this.language = null;
  }

  // Java: RuleFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List) (abstract)
  acceptRuleMatch() {
    throw new AbstractMethodError('org.languagetool.rules.patterns.RuleFilter.acceptRuleMatch');
  }

  // Java: RuleFilter#matches(Map,AnalyzedTokenReadings[],int,List)
  matches(args, patternTokens, firstMatchToken, tokenPositions) {
    const fakeMatch = new RuleMatch(new FakeRule(), null, 0, 1, '(internal rule)');
    return this.acceptRuleMatch(fakeMatch, args, firstMatchToken, patternTokens, tokenPositions) !== null;
  }

  // Java: RuleFilter#getRequired(String,Map)
  getRequired(key, map) {
    const result = map.get(key);
    if (result === null || result === undefined) {
      throw new IllegalArgumentException(`Missing key '${key}'`);
    }
    return result;
  }

  // Java: RuleFilter#getOptional(String,Map) / getOptional(String,Map,String)
  getOptional(key, map, defaultValue = null) {
    const value = map.get(key);
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return value;
  }

  // Java: RuleFilter#getPosition(String,AnalyzedTokenReadings[],RuleMatch)
  getPosition(fromStr, patternTokens, match) {
    let i;
    if (fromStr.startsWith('marker')) {
      i = 0;
      while (i < patternTokens.length && patternTokens[i].getStartPos() < match.getFromPos()
        || arrayGet(patternTokens, i).isSentenceStart()) {
        i++;
      }
      i++;
      if (fromStr.length > 6) {
        i += Integer.parseInt(javaReplace(fromStr, 'marker', ''));
      }
    } else {
      i = Integer.parseInt(fromStr);
    }
    if (i < 1 || i > patternTokens.length) {
      throw new IllegalArgumentException('RuleFilter: Index out of bounds in '
        + match.getRule().getFullId() + ', value: ' + fromStr);
    }
    return i - 1;
  }

  // Java: RuleFilter#isMatchAtSentenceStart(AnalyzedTokenReadings[],RuleMatch)
  isMatchAtSentenceStart(tokens, match) {
    let i = 0;
    while (i < tokens.length && tokens[i].getStartPos() < match.getFromPos()) {
      i++;
    }
    while (i > 0 && isPunctuationMark(arrayGet(tokens, i).getToken())) {
      i--;
    }
    return i === 0;
  }

  // Java: RuleFilter#getSkipCorrectedReference(List,int)
  getSkipCorrectedReference(tokenPositions, refNumber) {
    if (refNumber < 0) {
      return refNumber;
    }
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

  // Java: RuleFilter#getLanguageFromRuleMatch(RuleMatch)
  getLanguageFromRuleMatch(match) {
    const rule = match.getRule();
    if (this.language !== null) {
      return this.language;
    }
    if (rule instanceof AbstractPatternRule) {
      if (!(rule instanceof PatternRule)) { // Java: (PatternRule) cast
        throw new ClassCastException(`class ${rule.constructor.FQCN} cannot be cast to class org.languagetool.rules.patterns.PatternRule `
          + `(${rule.constructor.FQCN} and org.languagetool.rules.patterns.PatternRule are in unnamed module of loader 'app')`);
      }
      return rule.getLanguage();
    }
    throw new RuntimeException('AbstractAdvancedSynthesizerFilter only works with pattern rules. ' + rule.getFullId() + ' is not a pattern rule');
  }

  // Java: RuleFilter#getSynthesizerFromRuleMatch(RuleMatch)
  getSynthesizerFromRuleMatch(match) {
    return this.getLanguageFromRuleMatch(match).getSynthesizer();
  }

  // Java: RuleFilter#getTaggerFromRuleMatch(RuleMatch)
  getTaggerFromRuleMatch(match) {
    return this.getLanguageFromRuleMatch(match).getTagger();
  }

  // Java: RuleFilter#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: RuleFilter#setLanguage(Language)
  setLanguage(language) {
    this.language = language;
  }
}
