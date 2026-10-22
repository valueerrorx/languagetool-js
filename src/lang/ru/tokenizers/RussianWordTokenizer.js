// Java: org.languagetool.tokenizers.ru.RussianWordTokenizer
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { javaReplace } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';

// Java: RussianWordTokenizer
export class RussianWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.ru.RussianWordTokenizer';

  // Java: RussianWordTokenizer#getTokenizingCharacters()
  getTokenizingCharacters() {
    return `${super.getTokenizingCharacters()}'.`;
  }

  // Java: RussianWordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    let auxText = text;
    auxText = javaReplace(auxText, 'б/у', '\u0001\u0001SOCR_BU\u0001\u0001');
    auxText = javaReplace(auxText, 'б/н', '\u0001\u0001SOCR_BN\u0001\u0001');
    auxText = javaReplace(auxText, ' .. ', '\u0001\u0001SP_DDOT_SP\u0001\u0001');
    auxText = javaReplace(auxText, ' . ', '\u0001\u0001SP_DOT_SP\u0001\u0001');
    auxText = javaReplace(auxText, ' .', ' \u0001\u0001SP_DOT\u0001\u0001');
    auxText = javaReplace(auxText, '\u0001\u0001SP_DDOT_SP\u0001\u0001', ' .. ');
    auxText = javaReplace(auxText, '\u0001\u0001SP_DOT_SP\u0001\u0001', ' . ');

    const st = new StringTokenizer(auxText, this.getTokenizingCharacters(), true);
    while (st.hasMoreElements()) {
      let s = st.nextToken();
      s = javaReplace(s, '\u0001\u0001SOCR_BU\u0001\u0001', 'б/у');
      s = javaReplace(s, '\u0001\u0001SOCR_BN\u0001\u0001', 'б/н');
      s = javaReplace(s, '\u0001\u0001SP_DOT\u0001\u0001', '.');
      l.push(...this.wordsToAdd(s));
    }
    return this.joinEMailsAndUrls(l);
  }

  // Java: RussianWordTokenizer#wordsToAdd(String)
  wordsToAdd(s) {
    return [s];
  }
}

registerComponent(RussianWordTokenizer.FQCN, () => new RussianWordTokenizer());
