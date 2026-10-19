// Java: org.languagetool.rules.DemoRule
import { valueOf } from '../../lib/java/Objects.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: DemoRule
export class DemoRule extends Rule {
  static FQCN = 'org.languagetool.rules.DemoRule';

  // Java: DemoRule#getId()
  getId() {
    return 'DEMO_RULE';
  }

  // Java: DemoRule#getDescription()
  getDescription() {
    return 'A demo rule that just prints the text analysis';
  }

  // Java: DemoRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    for (const token of tokens) {
      process.stdout.write(`Token: ${token.getToken()}\n`);
      for (const analyzedToken of token.getReadings()) {
        process.stdout.write(`  Lemma: ${valueOf(analyzedToken.getLemma())}\n`);
        process.stdout.write(`  POS: ${valueOf(analyzedToken.getPOSTag())}\n`);
      }
      if (token.getToken() === 'demo') {
        const ruleMatch = new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), 'The demo rule thinks this looks wrong');
        ruleMatch.setSuggestedReplacement('blablah');
        ruleMatches.push(ruleMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
