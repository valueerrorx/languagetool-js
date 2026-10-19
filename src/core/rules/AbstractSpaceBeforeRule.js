// org.languagetool.rules.AbstractSpaceBeforeRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';

// Java: AbstractSpaceBeforeRule (abstract: getConjunctions)
export class AbstractSpaceBeforeRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractSpaceBeforeRule';

  // Java: AbstractSpaceBeforeRule(ResourceBundle,Language); the Java constructor calls Rule() without messages
  constructor(messages) {
    super();
    this.setCategory(Categories.MISC.getCategory(messages));
  }

  // Java: AbstractSpaceBeforeRule#getId()
  getId() {
    return 'SPACE_BEFORE_CONJUNCTION';
  }

  // Java: AbstractSpaceBeforeRule#getDescription()
  getDescription() {
    return 'Checks for missing space before some conjunctions';
  }

  // Java: AbstractSpaceBeforeRule#getShort()
  getShort() {
    return 'Missing white space';
  }

  // Java: AbstractSpaceBeforeRule#getSuggestion()
  getSuggestion() {
    return 'Missing white space before conjunction';
  }

  // Java: AbstractSpaceBeforeRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokens();

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      const matcher = this.getConjunctions().matcher(token);
      if (matcher.matches()) {
        const previousToken = tokens[i - 1].getToken();
        if (!(previousToken === ' ' || previousToken === '(')) {
          const replacement = ' ' + token;
          const msg = this.getSuggestion();
          const pos = tokens[i].getStartPos();
          const potentialRuleMatch = new RuleMatch(this, sentence, pos, pos + token.length, msg, this.getShort());
          potentialRuleMatch.setSuggestedReplacement(replacement);
          ruleMatches.push(potentialRuleMatch);
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
