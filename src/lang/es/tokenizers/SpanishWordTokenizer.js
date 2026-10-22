// Java: org.languagetool.tokenizers.es.SpanishWordTokenizer
import { Pattern } from '../../../lib/java/regex/index.js';
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';

const wordCharacters = '§©@€£\\$_\\p{L}\\d·\\-̀-ͯ¨⁰-₟°%‰‱&�­¬';
const tokenizerPattern = Pattern.compile(`[${wordCharacters}]+|[^${wordCharacters}]`);
const CI = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
// decimal point between digits
const DECIMAL_POINT = Pattern.compile('([\\d])\\.([\\d])', CI);
// decimal comma between digits
const DECIMAL_COMMA = Pattern.compile('([\\d]),([\\d])', CI);
// ordinals
const ORDINAL_POINT = Pattern.compile('\\b([\\d]+)\\.(º|ª|o|a|er|os|as)\\b', CI | Pattern.UNICODE_CHARACTER_CLASS);

// Java: SpanishWordTokenizer
export class SpanishWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.es.SpanishWordTokenizer';

  // Java: SpanishWordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    // replace hyphen, non-break hyphen -> hyphen-minus
    let auxText = text.replaceAll('‐', '-');
    auxText = auxText.replaceAll('‑', '-');
    let matcher = DECIMAL_POINT.matcher(auxText);
    auxText = matcher.replaceAll('$1xxES_DECIMAL_POINTxx$2');
    matcher = DECIMAL_COMMA.matcher(auxText);
    auxText = matcher.replaceAll('$1xxES_DECIMAL_COMMAxx$2');
    matcher = ORDINAL_POINT.matcher(auxText);
    auxText = matcher.replaceAll('$1xxES_ORDINAL_POINTxx$2');

    const tokenizerMatcher = tokenizerPattern.matcher(auxText);
    while (tokenizerMatcher.find()) {
      let s = tokenizerMatcher.group();
      if (l.length > 0 && s.length === 1 && s.codePointAt(0) >= 0xFE00 && s.codePointAt(0) <= 0xFE0F) {
        l[l.length - 1] = l[l.length - 1] + s;
        continue;
      }
      s = s.replaceAll('xxES_DECIMAL_POINTxx', '.');
      s = s.replaceAll('xxES_DECIMAL_COMMAxx', ',');
      s = s.replaceAll('xxES_ORDINAL_POINTxx', '.');
      l.push(...this.wordsToAdd(s));
    }
    return this.joinEMailsAndUrls(l);
  }

  /* Splits a word containing hyphen(-) if it doesn't exist in the dictionary. */
  // Java: SpanishWordTokenizer#wordsToAdd(String)
  wordsToAdd(s) {
    const l = [];
    if (s.length !== 0) {
      if (!s.includes('-')) {
        l.push(s);
      } else {
        // words containing hyphen (-) are looked up in the dictionary
        if (sharedComponent('org.languagetool.tagging.es.SpanishTagger').tag([s.replaceAll('­', '').replaceAll('’', "'")])[0].isTagged()) {
          l.push(s);
        // some camel-case words containing hyphen (is there any better fix?)
        } else if (equalsIgnoreCase(s, 'mers-cov') || equalsIgnoreCase(s, 'mcgraw-hill')
            || equalsIgnoreCase(s, 'sars-cov-2') || equalsIgnoreCase(s, 'sars-cov') || equalsIgnoreCase(s, 'ph-metre')
            || equalsIgnoreCase(s, 'ph-metres')) {
          l.push(s);
        } else {
          // if not found, the word is split
          const st2 = new StringTokenizer(s, '-', true);
          while (st2.hasMoreElements()) {
            l.push(st2.nextToken());
          }
        }
      }
    }
    return l;
  }
}

registerComponent(SpanishWordTokenizer.FQCN, () => new SpanishWordTokenizer());
