// org.languagetool.rules.TextLevelRule
import { AbstractMethodError, RuntimeException } from '../../../lib/java/errors.js';
import { Rule } from './Rule.js';

export class TextLevelRule extends Rule {
  static FQCN = 'org.languagetool.rules.TextLevelRule';

  // Java: TextLevelRule#match(AnalyzedSentence) is final: subclasses only implement match(List); a call with a sentence throws
  constructor(...args) {
    super(...args);
    const impl = this.match;
    if (impl !== TextLevelRule.prototype.match) {
      this.match = function match(sentences, annotatedText) {
        if (!Array.isArray(sentences)) {
          throw new RuntimeException('Not implemented for a text-level rule');
        }
        return impl.call(this, sentences, annotatedText);
      };
    }
  }

  // Java: TextLevelRule#match(List,AnnotatedText) delegates to match(List) (abstract, overridden as match(sentences); the 2nd argument is ignored);
  // Java: TextLevelRule#match(AnalyzedSentence) is final and throws
  match(sentences) {
    if (!Array.isArray(sentences)) {
      throw new RuntimeException('Not implemented for a text-level rule');
    }
    throw new AbstractMethodError('org.languagetool.rules.TextLevelRule.match(List)');
  }

  // Java: TextLevelRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return -1;
  }

  // Java: TextLevelRule#minToCheckParagraph() (abstract)
  minToCheckParagraph() {
    throw new AbstractMethodError('org.languagetool.rules.TextLevelRule.minToCheckParagraph()');
  }
}
