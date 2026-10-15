// org.languagetool.rules.de.SentenceWhitespaceRule
import { SentenceWhitespaceRule as CoreSentenceWhitespaceRule } from '../../../core/rules/SentenceWhitespaceRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

// Java: org.languagetool.rules.de.SentenceWhitespaceRule
export class SentenceWhitespaceRule extends CoreSentenceWhitespaceRule {
  static FQCN = 'org.languagetool.rules.de.SentenceWhitespaceRule';

  // Java: SentenceWhitespaceRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.MISC.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Whitespace);
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/grammatik-leerzeichen/#fehler-1-leerzeichen-vor-und-nach-satzzeichen'));
    this.addExamplePair(Example.wrong('Hier steht ein Satz.<marker>Das</marker> ist ein weiterer Satz.'),
      Example.fixed('Hier steht ein Satz.<marker> Das</marker> ist ein weiterer Satz.'));
  }

  // Java: SentenceWhitespaceRule#getId()
  getId() {
    return 'DE_SENTENCE_WHITESPACE';
  }

  // Java: SentenceWhitespaceRule#getDescription()
  getDescription() {
    return 'Fehlendes Leerzeichen zwischen Sätzen oder nach Ordnungszahlen';
  }

  // Java: SentenceWhitespaceRule#getMessage(boolean)
  getMessage(prevSentenceEndsWithNumber) {
    if (prevSentenceEndsWithNumber) {
      return 'Fügen Sie nach Ordnungszahlen (1., 2. usw.) ein Leerzeichen ein.';
    }
    return 'Fügen Sie zwischen Sätzen ein Leerzeichen ein.';
  }
}
