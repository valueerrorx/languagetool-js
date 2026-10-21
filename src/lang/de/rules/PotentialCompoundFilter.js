// org.languagetool.rules.de.PotentialCompoundFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { isAllUppercase, isMixedCase, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { listGet } from '../../../lib/java/arrays.js';
import { GermanyGerman } from '../language/GermanyGerman.js';

// Java: PotentialCompoundFilter
export class PotentialCompoundFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.PotentialCompoundFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.PotentialCompoundFilter()' }];

  // Java: PotentialCompoundFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const part1 = arguments_.get('part1');
    const part2 = arguments_.get('part2');
    let part1capitalized = part1;
    let part2capitalized = part2;
    let part2lowercase = part2;
    if (!isMixedCase(part2) && !isAllUppercase(part2)) {
      part2lowercase = toLowerCase(part2);
      part2capitalized = uppercaseFirstChar(toLowerCase(part2));
    }
    if (!isMixedCase(part1) && !isAllUppercase(part1)) {
      part1capitalized = uppercaseFirstChar(toLowerCase(part1));
    }
    const joinedWord = part1capitalized + part2lowercase;
    const hyphenatedWord = part1capitalized + '-' + part2capitalized;
    const replacements = [];
    // create an AnalyzedSentence without instantiating a new JLanguageTool
    const tokens = [joinedWord];
    const tokensList = GermanyGerman.getInstance().getTagger().tag(tokens);
    const tokensArray = new Array(2);
    const sentenceStartToken = new AnalyzedToken('', 'SENT_START', null);
    const startTokenArray = [sentenceStartToken];
    tokensArray[0] = new AnalyzedTokenReadings(startTokenArray, 0);
    tokensArray[1] = listGet(tokensList, 0);
    const analyzedSentence = new AnalyzedSentence(tokensArray);
    // check with the spelling rule
    const matches = GermanyGerman.getInstance().getDefaultSpellingRule().match(analyzedSentence);
    if (matches.length === 0) {
      if (joinedWord.length > 20) {
        replacements.push(hyphenatedWord);
      }
      replacements.push(joinedWord);
    } else {
      replacements.push(hyphenatedWord);
    }
    if (replacements.length !== 0) {
      const message = match.getMessage();
      const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(),
        message, match.getShortMessage());
      ruleMatch.setType(match.getType());
      ruleMatch.setSuggestedReplacements(replacements);
      return ruleMatch;
    }
    return null;
  }
}

registerClass(PotentialCompoundFilter.FQCN, PotentialCompoundFilter);
