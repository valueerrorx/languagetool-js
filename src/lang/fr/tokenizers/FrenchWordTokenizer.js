// Java: org.languagetool.tokenizers.fr.FrenchWordTokenizer
import { Pattern } from '../../../lib/java/regex/index.js';
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';
import '../tagging/FrenchTagger.js';

const wordCharacters = '§©@€£\\$_\\p{L}\\d\\-̀-ͯ¨⁰-₟°%‰‱&�­¬';
const tokenizerPattern = Pattern.compile(`[${wordCharacters}]+|[^${wordCharacters}]`);

const CI = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
const TYPEWRITER_APOSTROPHE = Pattern.compile('([\\p{L}])\'([\\p{L}1"‘“«])', CI);
const TYPOGRAPHIC_APOSTROPHE = Pattern.compile('([\\p{L}])’([\\p{L}1"‘“«])', CI);
const NEARBY_HYPHENS = Pattern.compile('([\\p{L}])-([\\p{L}])-([\\p{L}])', CI);
const HYPHENS = Pattern.compile('([\\p{L}])-([\\p{L}\\d])', CI);
const DECIMAL_POINT = Pattern.compile('([\\d])\\.([\\d])', CI);
const DECIMAL_COMMA = Pattern.compile('([\\d]),([\\d])', CI);
const SPACE_DIGITS0 = Pattern.compile('([\\d]{4}) ', CI);
const SPACE_DIGITS = Pattern.compile('([\\d]) ([\\d][\\d][\\d])\\b', CI);
const SPACE_DIGITS2 = Pattern.compile('([\\d]) ([\\d][\\d][\\d]) ([\\d][\\d][\\d])\\b', CI);

const doNotSplit = ['mers-cov', 'mcgraw-hill', 'sars-cov-2', 'sars-cov',
  'ph-metre', 'ph-metres', 'anti-ivg', 'anti-uv', 'anti-vih', 'al-qaïda', "c'est-à-dire", 'add-on', 'add-ons',
  'rendez-vous', 'garde-à-vous', 'chez-eux', 'chez-moi', 'chez-nous', 'chez-soi', 'chez-toi', 'chez-vous', "m'as-tu-vu"];

const maxPatterns = 7;
const patterns = [
  Pattern.compile("^(c['’]te?|m['’]as-tu-vu|c['’]est-à-dire|add-on|add-ons|rendez-vous|garde-à-vous|chez-eux|chez-moi|chez-nous|chez-soi|chez-toi|chez-vous)$", CI),
  Pattern.compile(
    "^([cç]['’]|j['’]|n['’]|m['’]|t['’]|s['’]|l['’]|d['’]|qu['’]|jusqu['’]|lorsqu['’]|puisqu['’]|quoiqu['’])([^\\-]*)(-ce|-elle|-t-elle|-elles|-t-elles|-en|-il|-t-il|-ils|-t-ils|-je|-la|-le|-les|-leur|-lui|-moi|-nous|-on|-t-on|-toi|-tu|-vous|-vs|-y)$",
    CI),
  Pattern.compile(
    "^([cç]['’]|j['’]|n['’]|m['’]|t['’]|s['’]|l['’]|d['’]|qu['’]|jusqu['’]|lorsqu['’]|puisqu['’]|quoiqu['’])([^'’\\-].*)$",
    CI),
  Pattern.compile(
    '^([^\\-\\d]+)(-ce|-t-elle|-t-elles|-elle|-elles|-en|-il|-t-il|-ils|-t-ils|-je|-la|-le|-les|-leur|-lui|-moi|-nous|-on|-t-on|-toi|-tu|-vous|-vs|-y)(-ce|-elle|-t-elle|-elles|-t-elles|-en|-il|-t-il|-ils|-t-ils|-je|-la|-le|-les|-leur|-lui|-moi|-nous|-on|-t-on|-toi|-tu|-vous|-vs|-y)$',
    CI),
  Pattern.compile("^([^\\-]*)(-t|-m)(['’]en|['’]y)$", CI),
  Pattern.compile('^(.*)(-t-elle|-t-elles|-t-il|-t-ils|-t-on)$', CI),
  Pattern.compile(
    '^(.*)(-ce|-elle|-t-elle|-elles|-t-elles|-en|-il|-t-il|-ils|-t-ils|-je|-la|-le|-les|-leur|-lui|-moi|-nous|-on|-t-on|-toi|-tu|-vous|-vs|-y)$',
    CI),
];

// Java: FrenchWordTokenizer
export class FrenchWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.fr.FrenchWordTokenizer';

  // Java: FrenchWordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    if (text === null || text === undefined) throw new NullPointerException('Cannot invoke "String.replace(char, char)" because "text" is null');
    let auxText = text.replaceAll('‐', '-');
    auxText = auxText.replaceAll('‑', '-');
    let matcher = TYPEWRITER_APOSTROPHE.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_APOS_TYPEWxx$2');
    matcher = TYPOGRAPHIC_APOSTROPHE.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_APOS_TYPOGxx$2');
    matcher = NEARBY_HYPHENS.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_HYPHENxx$2xxFR_HYPHENxx$3');
    matcher = HYPHENS.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_HYPHENxx$2');
    matcher = DECIMAL_POINT.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_DECIMALPOINTxx$2');
    matcher = DECIMAL_COMMA.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_DECIMALCOMMAxx$2');
    matcher = SPACE_DIGITS2.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_SPACExx$2xxFR_SPACExx$3');
    matcher = SPACE_DIGITS0.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_SPACE0xx');
    matcher = SPACE_DIGITS.matcher(auxText);
    auxText = matcher.replaceAll('$1xxFR_SPACExx$2');
    auxText = auxText.replaceAll('xxFR_SPACE0xx', ' ');

    const tokenizerMatcher = tokenizerPattern.matcher(auxText);
    while (tokenizerMatcher.find()) {
      let s = tokenizerMatcher.group();
      if (l.length > 0 && s.length === 1 && s.codePointAt(0) >= 0xFE00 && s.codePointAt(0) <= 0xFE0F) {
        l[l.length - 1] = l[l.length - 1] + s;
        continue;
      }
      s = s.replaceAll('xxFR_APOS_TYPEWxx', "'")
        .replaceAll('xxFR_APOS_TYPOGxx', '’')
        .replaceAll('xxFR_HYPHENxx', '-')
        .replaceAll('xxFR_DECIMALPOINTxx', '.')
        .replaceAll('xxFR_DECIMALCOMMAxx', ',')
        .replaceAll('xxFR_SPACExx', ' ');
      let matchFound = false;
      while (s.length > 1 && s.startsWith('-')) {
        l.push('-');
        s = s.substring(1);
      }
      let hyphensAtEnd = 0;
      while (s.length > 1 && s.endsWith('-')) {
        s = s.substring(0, s.length - 1);
        hyphensAtEnd++;
      }
      let j = 0;
      while (j < maxPatterns && !matchFound) {
        matcher = patterns[j].matcher(s);
        matchFound = matcher.find();
        j++;
      }
      if (matchFound) {
        for (let i = 1; i <= matcher.groupCount(); i++) {
          const groupStr = matcher.group(i);
          l.push(...this.wordsToAdd(groupStr));
        }
      } else {
        l.push(...this.wordsToAdd(s));
      }
      while (hyphensAtEnd > 0) {
        l.push('-');
        hyphensAtEnd--;
      }
    }
    return this.joinEMailsAndUrls(l);
  }

  // Java: FrenchWordTokenizer#wordsToAdd(String)
  wordsToAdd(s) {
    const l = [];
    if (s === null) throw new NullPointerException('Cannot invoke "String.isEmpty()" because "s" is null');
    if (s.length !== 0) {
      if (!s.includes('-')) {
        l.push(s);
      } else {
        let normalized = s.replaceAll('­', '');
        normalized = normalized.replaceAll('’', "'");
        if (sharedComponent('org.languagetool.tagging.fr.FrenchTagger').tag([normalized])[0].isTagged()) {
          l.push(s);
        } else if (doNotSplit.includes(toLowerCase(s))) {
          l.push(s);
        } else {
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

registerComponent(FrenchWordTokenizer.FQCN, () => new FrenchWordTokenizer());
