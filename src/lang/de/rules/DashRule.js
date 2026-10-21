// org.languagetool.rules.de.DashRule
import * as Character from '../../../lib/java/Character.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';
import { equalsAny, countMatches } from '../../../lib/java/StringUtils.js';
import { charAt } from '../../../lib/java/strings.js';

// Java: DashRule
export class DashRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.DashRule';

  // Java: DashRule(ResourceBundle)
  constructor(messages) {
    super();
    super.setCategory(Categories.COMPOUNDING.getCategory(messages));
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/grammatik-leerzeichen/#fehler-1-leerzeichen-vor-und-nach-satzzeichen'));
    this.addExamplePair(Example.wrong('Bundestag beschließt <marker>Diäten- Erhöhung</marker>'),
      Example.fixed('Bundestag beschließt <marker>Diäten-Erhöhung</marker>'));
  }

  // Java: DashRule#getId()
  getId() {
    return 'DE_DASH';
  }

  // Java: DashRule#getDescription()
  getDescription() {
    return "Keine Leerzeichen in Bindestrich-Komposita (wie z.B. in 'Diäten- Erhöhung')";
  }

  // Java: DashRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let prevToken = null;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      if (prevToken !== null
          && prevToken.endsWith('-')
          && prevToken !== '-'
          && !prevToken.includes('--')
          && !prevToken.includes('–-') // first char is some special kind of dash, found in Wikipedia
      ) {
        const firstChar = charAt(token, 0);
        if (Character.isUpperCase(firstChar)) {
          if (!equalsAny(token, 'UND', 'ODER', 'BZW')) { // ignore "NORD- UND SÜDKOREA"
            const msg = "Möglicherweise fehlt ein 'und' oder ein Komma, oder es wurde nach dem Wort "
              + 'ein überflüssiges Leerzeichen eingefügt. Eventuell haben Sie auch versehentlich einen Bindestrich statt eines Punktes eingefügt.';
            const shortMsg = "Fehlendes 'und' oder Komma oder überflüssiges Leerzeichen?";
            const fromPos = tokens[i - 1].getStartPos();
            const ruleMatch = new RuleMatch(this, sentence, fromPos,
              tokens[i].getEndPos(), msg, shortMsg);
            ruleMatch.addSuggestedReplacement(tokens[i - 1].getToken() + tokens[i].getToken());
            if (countMatches(tokens[i - 1].getToken(), '-') + countMatches(tokens[i].getToken(), '-') <= 1) {
              ruleMatch.addSuggestedReplacement(tokens[i - 1].getToken() + ', ' + tokens[i].getToken());
            }
            ruleMatches.push(ruleMatch);
          }
        }
      }
      prevToken = token;
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
