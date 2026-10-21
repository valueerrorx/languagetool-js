// org.languagetool.rules.de.CompoundCoherencyRule
import * as Character from '../../../lib/java/Character.js';
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { isNumeric } from '../../../lib/java/StringUtils.js';
import { javaReplace, toLowerCase, equalsIgnoreCase, charAt } from '../../../lib/java/strings.js';

// Java: CompoundCoherencyRule
export class CompoundCoherencyRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.CompoundCoherencyRule';

  // Java: CompoundCoherencyRule(ResourceBundle)
  constructor(messages) {
    super();
    super.setCategory(Categories.STYLE.getCategory(messages));
    this.addExamplePair(Example.wrong('Ein Helpdesk gliedert sich in verschiedene Level. Die Qualität des <marker>Help-Desks</marker> ist wichtig.'),
      Example.fixed('Ein Helpdesk gliedert sich in verschiedene Level. Die Qualität des <marker>Helpdesks</marker> ist wichtig.'));
  }

  // Java: CompoundCoherencyRule#getId()
  getId() {
    return 'DE_COMPOUND_COHERENCY';
  }

  // Java: CompoundCoherencyRule#getDescription()
  getDescription() {
    return 'Einheitliche Schreibweise bei Komposita (mit oder ohne Bindestrich)';
  }

  // Java: CompoundCoherencyRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    const normToTextOccurrences = new Map();
    let pos = 0;
    for (const sentence of sentences) {
      const tokens = sentence.getTokensWithoutWhitespace();
      for (const atr of tokens) {
        const lemmaOrNull = this.getLemma(atr);
        const token = atr.getToken();
        if (token.length === 0) {
          continue;
        }
        // The whole implementation could be simpler, but this way we also catch cases where
        // the word (and thus its lemma) isn't known.
        const lemma = lemmaOrNull !== null ? lemmaOrNull : token;
        const normToken = toLowerCase(javaReplace(lemma, '-', ''));
        if (isNumeric(normToken)) {
          // avoid messages about "2-3" and "23" both being used
          break;
        }
        const textOcc = normToTextOccurrences.get(normToken);
        if (textOcc !== undefined) {
          if (textOcc.every((f) => !equalsIgnoreCase(f, lemma))) {
            const other = textOcc[0];
            if (this.containsHyphenInside(other) || this.containsHyphenInside(token)) {
              const msg = "Uneinheitliche Verwendung von Bindestrichen. Der Text enthält sowohl '" + token + "' als auch '" + other + "'.";
              const ruleMatch = new RuleMatch(this, sentence, pos + atr.getStartPos(), pos + atr.getEndPos(), msg);
              if (equalsIgnoreCase(javaReplace(token, '-', ''), javaReplace(other, '-', ''))) {
                // might be different inflected forms, so only suggest if really just the hyphen is different:
                ruleMatch.setSuggestedReplacement(other);
              }
              ruleMatches.push(ruleMatch);
            }
          }
        } else {
          normToTextOccurrences.set(normToken, [lemma]);
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: CompoundCoherencyRule#containsHyphenInside(String)
  containsHyphenInside(token) {
    return token.includes('-') && !token.startsWith('-') && !token.endsWith('-');
  }

  // Java: CompoundCoherencyRule#getLemma(AnalyzedTokenReadings)
  getLemma(atr) {
    const lemmaOrNull = atr.hasSameLemmas() && atr.getReadingsLength() > 0 ? atr.getReadings()[0].getLemma() : null;
    if (lemmaOrNull !== null && lemmaOrNull !== undefined) {
      // our analysis gets lemma "Jugendfoto" for "Jugend-Fotos", we 'fix' that here
      const token = atr.getToken();
      if (!lemmaOrNull.includes('-') && token.includes('-')) {
        let lemmaBuilder = '';
        for (let lemmaPos = 0, tokenPos = 0; lemmaPos < lemmaOrNull.length; lemmaPos++, tokenPos++) {
          if (tokenPos >= token.length) {
            break;
          }
          const lemmaChar = charAt(lemmaOrNull, lemmaPos);
          const tokenChar = charAt(token, tokenPos);
          if (lemmaChar === tokenChar) {
            lemmaBuilder += String.fromCharCode(lemmaChar);
          } else if (charAt(token, tokenPos) === 0x2d) {
            tokenPos++; // skip hyphen
            lemmaBuilder += '-';
            if (lemmaPos + 1 < token.length && Character.isUpperCase(charAt(token, tokenPos))) {
              lemmaBuilder += String.fromCharCode(Character.toUpperCase(lemmaChar));
            } else {
              lemmaBuilder += String.fromCharCode(lemmaChar);
            }
          }
        }
        return lemmaBuilder;
      }
      return lemmaOrNull;
    }
    return null;
  }

  // Java: CompoundCoherencyRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
