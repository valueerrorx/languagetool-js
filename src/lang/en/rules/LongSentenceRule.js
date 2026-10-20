// org.languagetool.rules.en.LongSentenceRule
import { LongSentenceRule as CoreLongSentenceRule } from '../../../core/rules/LongSentenceRule.js';
import { getUrl } from '../../../core/Tools.js';

// Java: LongSentenceRule (en)
export class LongSentenceRule extends CoreLongSentenceRule {
  static FQCN = 'org.languagetool.rules.en.LongSentenceRule';

  // Java: LongSentenceRule(ResourceBundle,UserConfig,int)
  constructor(messages, userConfig, defaultWords) {
    super(messages, userConfig, defaultWords);
    this.setUrl(getUrl('https://languagetool.org/insights/post/splitting-long-sentences/'));
  }

  // Java: LongSentenceRule#getShortMessage()
  getShortMessage() {
    return 'Long sentence';
  }
}
