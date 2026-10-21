// org.languagetool.rules.de.WiederVsWiderRule
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';

// Java: WiederVsWiderRule
export class WiederVsWiderRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.WiederVsWiderRule';

  // Java: WiederVsWiderRule(ResourceBundle)
  constructor(messages) {
    super();
    super.setCategory(Categories.TYPOS.getCategory(messages));
    this.addExamplePair(Example.wrong('Das spiegelt die Situation in Deutschland <marker>wieder</marker>.'),
      Example.fixed('Das spiegelt die Situation in Deutschland <marker>wider</marker>.'));
  }

  // Java: WiederVsWiderRule#getId()
  getId() {
    return 'DE_WIEDER_VS_WIDER';
  }

  // Java: WiederVsWiderRule#getDescription()
  getDescription() {
    return "Möglicher Tippfehler 'spiegeln ... wieder (wider)'";
  }

  // Java: WiederVsWiderRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 0;
  }

  // Java: WiederVsWiderRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let foundSpiegelt = false;
    let foundWieder = false;
    let foundWider = false;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      if (tokens[i].hasLemma('spiegeln')) {
        foundSpiegelt = true;
      } else if (equalsIgnoreCase(token, 'wieder') && foundSpiegelt) {
        foundWieder = true;
      } else if (equalsIgnoreCase(token, 'wider') && foundSpiegelt) {
        foundWider = true;
      }
      if (foundSpiegelt && foundWieder && !foundWider
          && !(tokens.length > i + 2 && (tokens[i + 1].getToken() === 'wider' || tokens[i + 2].getToken() === 'wider'))
      ) {
        const msg = "'wider' in 'widerspiegeln' wird mit 'i' statt mit 'ie' "
          + "geschrieben, z.B. 'Das spiegelt die Situation gut wider.'";
        const shortMsg = "'wider' in 'widerspiegeln' wird mit 'i' geschrieben";
        const pos = tokens[i].getStartPos();
        const ruleMatch = new RuleMatch(this, sentence, pos, pos + token.length, msg, shortMsg);
        ruleMatch.setSuggestedReplacement('wider');
        ruleMatches.push(ruleMatch);
        foundSpiegelt = false;
        foundWieder = false;
        foundWider = false;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
