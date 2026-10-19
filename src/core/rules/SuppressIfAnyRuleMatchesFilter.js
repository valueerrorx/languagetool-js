// org.languagetool.rules.SuppressIfAnyRuleMatchesFilter
import { javaSplit, substring } from '../../lib/java/strings.js';
import { listGet } from '../../lib/java/arrays.js';
import { AnalyzedSentence } from '../AnalyzedSentence.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { castToPatternRule } from './filterCasts.js';

// Java: SuppressIfAnyRuleMatchesFilter (suppress the match if the new suggestion creates any new match with the rule IDs provided)
export class SuppressIfAnyRuleMatchesFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.SuppressIfAnyRuleMatchesFilter';

  // Java: SuppressIfAnyRuleMatchesFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const ruleIDs = javaSplit(this.getRequired('ruleIDs', arguments_), ',');
    const fastOnly = 'true' === this.getOptional('fastOnly', arguments_, 'false');
    const language = castToPatternRule(match.getRule()).getLanguage();
    const lt = language.createDefaultJLanguageTool();
    const sentence = match.getSentence().getText();
    for (const replacement of match.getSuggestedReplacements()) {
      // Fast path: reuse the already analyzed sentence and only replace the matched token.
      const partiallyAnalyzed = SuppressIfAnyRuleMatchesFilter.replaceTokenInAnalyzedSentence(match, replacement, language);
      if (partiallyAnalyzed !== null) {
        if (SuppressIfAnyRuleMatchesFilter.anyRuleMatches(lt, ruleIDs, partiallyAnalyzed, match)) {
          return null;
        }
        // With fastOnly the fast path is authoritative: if it does not match, the rule fires.
        if (fastOnly) {
          continue;
        }
      }
      // Exact path: analyze the whole sentence with the replacement applied.
      const newSentence = substring(sentence, 0, match.getFromPos()) + replacement + substring(sentence, match.getToPos());
      const analyzedSentence = listGet(lt.analyzeText(newSentence), 0);
      if (SuppressIfAnyRuleMatchesFilter.anyRuleMatches(lt, ruleIDs, analyzedSentence, match)) {
        return null;
      }
    }
    return match;
  }

  // Java: SuppressIfAnyRuleMatchesFilter#anyRuleMatches(JLanguageTool,List,AnalyzedSentence,RuleMatch) (private static)
  static anyRuleMatches(lt, ruleIDs, analyzedSentence, match) {
    for (const r of lt.getAllActiveRules()) {
      if (ruleIDs.includes(r.getId())) {
        const matches = r.match(analyzedSentence);
        for (const m of matches) {
          if ((m.getToPos() >= match.getFromPos() && m.getToPos() <= match.getToPos())
            || (match.getToPos() >= m.getFromPos() && match.getToPos() <= m.getToPos())) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Java: SuppressIfAnyRuleMatchesFilter#replaceTokenInAnalyzedSentence(RuleMatch,String,Language) (private static; null = full analysis needed)
  static replaceTokenInAnalyzedSentence(match, replacement, language) {
    const fromPos = match.getFromPos();
    const toPos = match.getToPos();
    if (replacement.length !== toPos - fromPos || replacement.indexOf(' ') >= 0) {
      return null;
    }
    const sentence = match.getSentence();
    const tokens = sentence.getTokens();
    let idx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (!tokens[i].isWhitespace() && tokens[i].getStartPos() === fromPos) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      return null;
    }
    const tagged = language.getTagger().tag([replacement]);
    if (tagged.length !== 1) {
      return null;
    }
    const newTokens = [...tokens];
    newTokens[idx] = new AnalyzedTokenReadings(tokens[idx], tagged[0].getReadings(), 'SuppressIfAnyRuleMatchesFilter');
    const newPreDisambigTokens = [...sentence.getPreDisambigTokens()];
    newPreDisambigTokens[idx] = newTokens[idx];
    return new AnalyzedSentence(newTokens, newPreDisambigTokens);
  }
}
