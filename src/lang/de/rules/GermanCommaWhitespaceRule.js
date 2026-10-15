// org.languagetool.rules.de.GermanCommaWhitespaceRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { CommaWhitespaceRule } from '../../../core/rules/CommaWhitespaceRule.js';

const DOMAINS = Pattern.compile('[a-z]{2,10}-Domains?');

// Java: GermanCommaWhitespaceRule
export class GermanCommaWhitespaceRule extends CommaWhitespaceRule {
  static FQCN = 'org.languagetool.rules.de.GermanCommaWhitespaceRule';

  // Java: GermanCommaWhitespaceRule(ResourceBundle,IncorrectExample,CorrectExample,URL)
  constructor(messages, incorrectExample, correctExample, url) {
    super(messages, incorrectExample, correctExample, url);
  }

  // Java: GermanCommaWhitespaceRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, tokenIdx) {
    if (tokenIdx + 2 < tokens.length
        && tokens[tokenIdx].getToken() === '.'
        && DOMAINS.matcher(tokens[tokenIdx + 1].getToken()).matches()) {
      return true;
    }
    return false;
  }
}
