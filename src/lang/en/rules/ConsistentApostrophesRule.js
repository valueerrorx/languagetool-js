// org.languagetool.rules.en.ConsistentApostrophesRule
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';
import { javaReplace } from '../../../lib/java/strings.js';

// Java: ConsistentApostrophesRule
export class ConsistentApostrophesRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.en.ConsistentApostrophesRule';

  // Java: ConsistentApostrophesRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setDefaultTempOff(); // TODO
    this.setUrl(getUrl('https://languagetool.org/insights/post/punctuation-guide/#what-is-an-apostrophe'));
    this.addExamplePair(Example.wrong('It\'s nice, but it <marker>doesn’t</marker> work.'),
      Example.fixed('It\'s nice, but it <marker>doesn\'t</marker> work.'));
  }

  // Java: ConsistentApostrophesRule#getId()
  getId() {
    return 'EN_CONSISTENT_APOS';
  }

  // Java: ConsistentApostrophesRule#getDescription()
  getDescription() {
    return 'Checks if the two types of apostrophes (\' and ’) are used consistently in a text.';
  }

  // Java: ConsistentApostrophesRule#match(List)
  match(sentences) {
    const matches = [];
    let pos = 0;
    const hasTwoTypes = this.hasTwoApostropheTypes(sentences);
    if (!hasTwoTypes) {
      return this.toRuleMatchArray(matches);
    }
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      for (const token of tokens) {
        let message = null;
        let repl = null;
        if (token !== null && token.getToken().includes('\'') && !token.hasTypographicApostrophe()) {
          message = 'You used a typewriter-style apostrophe here, but a typographic apostrophe elsewhere in this text.';
          repl = javaReplace(token.getToken(), '\'', '’');
        } else if (token !== null && token.getToken().includes('\'') && token.hasTypographicApostrophe()) {
          message = 'You used a typographic apostrophe here, but a typewriter-style apostrophe elsewhere in this text.';
          repl = token.getToken();
        }
        if (message !== null) {
          const match = new RuleMatch(this, sentence, pos + token.getStartPos(), pos + token.getEndPos(),
            message + ' Both are correct, but consider using the same type everywhere in your text.');
          match.setSuggestedReplacement(repl);
          matches.push(match);
        }
      }
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: ConsistentApostrophesRule#hasTwoApostropheTypes(List)
  hasTwoApostropheTypes(sentences) {
    let hasTypewriterStyle = false;
    let hasTypographicStyle = false;
    for (const sentence of sentences) {
      const tokens = sentence.getTokens();
      for (const token of tokens) {
        if (token !== null && token.getToken().includes('\'') && !token.hasTypographicApostrophe()) {
          hasTypewriterStyle = true;
        } else if (token !== null && token.getToken().includes('\'') && token.hasTypographicApostrophe()) {
          hasTypographicStyle = true;
        }
        if (hasTypewriterStyle && hasTypographicStyle) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: ConsistentApostrophesRule#minToCheckParagraph()
  minToCheckParagraph() {
    return -1;
  }
}
