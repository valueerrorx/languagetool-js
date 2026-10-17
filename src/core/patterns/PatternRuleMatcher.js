// org.languagetool.rules.patterns.PatternRuleMatcher (sequence part: match driver + immunization; createRuleMatch/RuleWithMaxFilter come with F29)
import { Throwable, IOException, RuntimeException } from '../../lib/java/errors.js';
import { notPortedYet } from '../language/components.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { AbstractPatternRulePerformer } from './AbstractPatternRulePerformer.js';

// Java: PatternRuleMatcher
export class PatternRuleMatcher extends AbstractPatternRulePerformer {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleMatcher';
  static MISTAKE = '<mistake/>';

  // Java: PatternRuleMatcher(AbstractTokenBasedRule,boolean) / (AbstractTokenBasedRule,boolean,Unifier)
  constructor(rule, useList, unifier = rule.getLanguage().getUnifier()) {
    super(rule, unifier);
    this.useList = useList;
  }

  // Java: PatternRuleMatcher#match(AnalyzedSentence) / match(AnalyzedSentence,int,int)
  match(sentence, minStartIndex = 0, maxStartIndex = 2147483647) {
    const ruleMatches = [];
    try {
      const tokens = this.isInterpretPosTagsPreDisambiguation()
        ? sentence.getPreDisambigTokensWithoutWhitespace()
        : sentence.getTokensWithoutWhitespace();
      this.doMatch(sentence, tokens, minStartIndex, maxStartIndex, (tokenPositions, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken) => {
        const ruleMatch = this.createRuleMatch(tokenPositions, tokens, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken, sentence);
        if (ruleMatch !== null) {
          ruleMatches.push(ruleMatch);
        }
      });
      if (ruleMatches.length > 0) throw notPortedYet('RuleWithMaxFilter (F29)'); // unreachable until createRuleMatch exists
      return RuleMatch.EMPTY_ARRAY;
    } catch (e) {
      if (!(e instanceof Throwable)) throw e; // notPorted and internal errors pass through unwrapped
      if (e instanceof IOException) {
        throw new IOException(`Error analyzing sentence: '${sentence}'`, e);
      }
      throw new RuntimeException(`Error analyzing sentence: '${sentence}' with rule ${this.rule.getFullId()}`, e);
    }
  }

  // Java: PatternRuleMatcher#testAllReadings(AnalyzedTokenReadings[],PatternTokenMatcher,PatternTokenMatcher,int,int,int)
  testAllReadings(tokens, matcher, prevElement, tokenNo, firstMatchToken, prevSkipNext) {
    if (arrayGet(tokens, tokenNo).isImmunized()) return false;

    return super.testAllReadings(tokens, matcher, prevElement, tokenNo, firstMatchToken, prevSkipNext);
  }

  // Java: PatternRuleMatcher#createRuleMatch(int[],AnalyzedTokenReadings[],int,int,int,int,AnalyzedSentence)
  createRuleMatch() {
    throw notPortedYet('PatternRuleMatcher#createRuleMatch (F29)');
  }
}
