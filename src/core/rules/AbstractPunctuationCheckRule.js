// org.languagetool.rules.AbstractPunctuationCheckRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';

// Java: AbstractPunctuationCheckRule (abstract: isPunctsJoinOk, isPunctuation)
export class AbstractPunctuationCheckRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractPunctuationCheckRule';

  // Java: AbstractPunctuationCheckRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.PUNCTUATION.getCategory(messages));
  }

  // Java: AbstractPunctuationCheckRule#getId()
  getId() {
    return 'PUNCTUATION_GENERIC_CHECK';
  }

  // Java: AbstractPunctuationCheckRule#getDescription()
  getDescription() {
    return 'Use of unusual combination of punctuation characters';
  }

  // Java: AbstractPunctuationCheckRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokens();

    let startTokenIdx = -1;
    let tkns = '';
    for (let i = 0; i < tokens.length; i++) {
      const tokenStr = tokens[i].getToken();

      if (this.isPunctuation(tokenStr)) {
        tkns += tokenStr;
        if (startTokenIdx === -1) {
          startTokenIdx = i;
        }
        if (i < tokens.length - 1) {
          continue;
        }
      }

      if (tkns.length >= 2 && !this.isPunctsJoinOk(tkns)) {
        const msg = 'bad duplication or combination of punctuation signs';
        const ruleMatch = new RuleMatch(this, sentence, tokens[startTokenIdx].getStartPos(),
          tokens[startTokenIdx].getStartPos() + tkns.length, msg,
          'Punctuation problem');
        ruleMatch.setSuggestedReplacement(tkns.substring(0, 1));
        ruleMatches.push(ruleMatch);
      }
      tkns = '';
      startTokenIdx = -1;
    }

    return this.toRuleMatchArray(ruleMatches);
  }
}
