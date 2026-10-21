// org.languagetool.rules.de.SimilarNameRule
import { endsWith } from '../../../lib/java/strings.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { levenshteinDistance } from '../../../lib/java/LevenshteinDistance.js';
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { startsWithUppercase } from '../../../core/text/StringTools.js';

const MIN_LENGTH = 4;
const MAX_DIFF = 1;

// Java: SimilarNameRule
export class SimilarNameRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.SimilarNameRule';

  // Java: SimilarNameRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.TYPOS.getCategory(messages));
    this.addExamplePair(Example.wrong('Angela Müller ist CEO. <marker>Miller</marker> wurde in Hamburg geboren.'),
      Example.fixed('Angela Müller ist CEO. <marker>Müller</marker> wurde in Hamburg geboren.'));
    this.setDefaultOff();
  }

  // Java: SimilarNameRule#getId()
  getId() {
    return 'DE_SIMILAR_NAMES';
  }

  // Java: SimilarNameRule#getDescription()
  getDescription() {
    return 'Mögliche Tippfehler in Namen finden';
  }

  // Java: SimilarNameRule#match(List)
  match(sentences) {
    const namesSoFar = new JavaHashSet();
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (const token of tokens) {
        const word = token.getToken();
        // not tagged = too many correct words are not known so we cannot use that:
        const isMaybeName = word.length >= MIN_LENGTH
                && ((token.hasPartialPosTag('EIG:') && !token.hasPartialPosTag(':COU')) || token.isPosTagUnknown())
                && word !== 'Dein' && word !== 'Deine' && word !== 'Deinen' && word !== 'Deiner' && word !== 'Deines' && word !== 'Deinem'
                && word !== 'Ihr' && word !== 'Ihre' && word !== 'Ihren' && word !== 'Ihrer' && word !== 'Ihres' && word !== 'Ihrem';
        if (isMaybeName && startsWithUppercase(word)) {
          const similarName = this.similarName(word, namesSoFar);
          if (similarName !== null) {
            const msg = "'" + word + "' ähnelt dem vorher benutzten '" + similarName + "', handelt es sich evtl. um einen Tippfehler?";
            const ruleMatch = new RuleMatch(this, sentence, pos + token.getStartPos(), pos + token.getEndPos(), msg);
            ruleMatch.setSuggestedReplacement(similarName);
            ruleMatches.push(ruleMatch);
          }
          namesSoFar.add(word);
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: SimilarNameRule#similarName(String,Set)
  similarName(nameHere, namesSoFar) {
    for (const name of namesSoFar) {
      if (name === nameHere) {
        continue;
      }
      const lenDiff = Math.abs(name.length - nameHere.length);
      const nameEndsWithS = endsWith(name, 's') && !endsWith(nameHere, 's');
      const otherNameEndsWithS = !endsWith(name, 's') && endsWith(nameHere, 's');
      const nameEndsWithN = endsWith(name, 'n') && !endsWith(nameHere, 'n'); // probably a dative
      const otherNameEndsWithN = !endsWith(name, 'n') && endsWith(nameHere, 'n');
      if (nameEndsWithS || otherNameEndsWithS || nameEndsWithN || otherNameEndsWithN) {
        // we assume this is a genitive, e.g. "Angela Merkels Ehemann"
        continue;
      }
      if (lenDiff <= MAX_DIFF && levenshteinDistance(name, nameHere) <= MAX_DIFF) {
        return name;
      }
    }
    return null;
  }

  // Java: SimilarNameRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
