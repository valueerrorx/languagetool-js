// Java: org.languagetool.tokenizers.pl.PolishWordTokenizer
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { isDigit } from '../../../lib/java/Character.js';
import { javaSplit } from '../../../lib/java/strings.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { registerComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';

// Polish prefixes that should never be used to split parts of words
const prefixes = new Set([
  'arcy', 'neo', 'pre', 'anty', 'eks', 'bez', 'beze', 'ekstra', 'hiper', 'infra', 'kontr', 'maksi', 'midi', 'między',
  'mini', 'nad', 'nade', 'około', 'ponad', 'post', 'pro', 'przeciw', 'pseudo', 'super', 'śród', 'ultra', 'wice', 'wokół', 'wokoło',
]);

// Java: PolishWordTokenizer
export class PolishWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.pl.PolishWordTokenizer';

  // Java: PolishWordTokenizer#PolishWordTokenizer()
  constructor() {
    super();
    this.tagger = null;
    this.plTokenizing = `${super.getTokenizingCharacters()}–‚`; // n-dash
  }

  // Java: PolishWordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    const st = new StringTokenizer(text, this.plTokenizing, true);
    while (st.hasMoreElements()) {
      const token = st.nextToken();
      if (token.length > 1) {
        if (token.endsWith('-')) {
          l.push(token.substring(0, token.length - 1));
          l.push('-');
        } else if (token.charAt(0) === '-') {
          l.push('-');
          l.push(...this.tokenize(token.substring(1)));
        } else if (token.includes('-')) {
          const tokenParts = javaSplit(token, '-');
          if (prefixes.has(tokenParts[0]) || this.tagger === null) {
            l.push(token);
          } else if (isDigit(tokenParts[tokenParts.length - 1].charCodeAt(0))) {
            // split numbers at dash or minus sign, 1-10
            for (let i = 0; i < tokenParts.length; i++) {
              l.push(tokenParts[i]);
              if (i !== tokenParts.length - 1) {
                l.push('-');
              }
            }
          } else {
            const testedTokens = [...tokenParts, token];
            try {
              const taggedToks = this.tagger.tag(testedTokens);
              if (taggedToks.length === tokenParts.length + 1 && !taggedToks[tokenParts.length].isTagged()) {
                let isCompound = false;
                switch (tokenParts.length) {
                  case 2:
                    if ((taggedToks[0].hasPosTag('adja') // "niemiecko-indonezyjski"
                        && taggedToks[1].hasPartialPosTag('adj:'))
                        || (taggedToks[0].hasPartialPosTag('subst:') // "kobieta-wojownik"
                        && taggedToks[1].hasPartialPosTag('subst:'))
                        || (taggedToks[0].hasPartialPosTag('num:') // osiemnaście-dwadzieścia
                        && taggedToks[1].hasPartialPosTag('num:'))) {
                      isCompound = true;
                    }
                    break;
                  case 3:
                    if (taggedToks[0].hasPosTag('adja')
                        && taggedToks[1].hasPosTag('adja')
                        && taggedToks[2].hasPartialPosTag('adj:')) {
                      isCompound = true;
                    }
                    break;
                  default:
                    break;
                }
                if (isCompound) {
                  for (let i = 0; i < tokenParts.length; i++) {
                    l.push(tokenParts[i]);
                    if (i !== tokenParts.length - 1) {
                      l.push('-');
                    }
                  }
                } else {
                  l.push(token);
                }
              } else {
                l.push(token);
              }
            } catch (e) {
              if (e instanceof IOException) throw new RuntimeException(e);
              throw e;
            }
          }
        } else {
          l.push(token);
        }
      } else {
        l.push(token);
      }
    }
    return this.joinEMailsAndUrls(l);
  }

  // Java: PolishWordTokenizer#setTagger(Tagger)
  setTagger(tagger) {
    this.tagger = tagger;
  }
}

registerComponent(PolishWordTokenizer.FQCN, () => new PolishWordTokenizer());
