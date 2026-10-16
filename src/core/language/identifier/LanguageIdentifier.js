// Java: org.languagetool.language.identifier.LanguageIdentifier
import { IllegalArgumentException, NullPointerException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { replaceChar } from '../../../lib/java/strings.js';
import { abstractCollectionToString } from '../../../lib/java/toString.js';
import { CommonWordsDetector } from './detector/CommonWordsDetector.js';
import { UnicodeBasedDetector } from './detector/UnicodeBasedDetector.js';

const URL_REGEX = Pattern.compile('https?://[-_.?&~;+=/#%0-9A-Za-z]+'); // '%' has been added
const MAIL_REGEX = Pattern.compile('[-_.0-9A-Za-z]+@[-_0-9A-Za-z]+[-_.0-9A-Za-z]+');
const SIGNATURE = Pattern.compile('\n--[ \u00A0]\n.*', Pattern.DOTALL);
const MENTION = Pattern.compile('@[A-Za-z0-9_]+');
const NBSP_INVIS_SEPARATOR = Pattern.compile('[\uFEFF\u2063]+');
export const SCORE_THRESHOLD = Math.fround(0.85);
export const CONSIDER_ONLY_PREFERRED_THRESHOLD = 50;
export const NON_LATIN_CHARS_LANGUAGES = ['ar', 'fa', 'ru', 'uk', 'be', 'zh', 'ja', 'km', 'ta', 'el', 'hi', 'mr', 'th', 'he', 'ko'];

// Java: LanguageIdentifier#REMOVE_EMAIL_SIGNATURE_FILTER
export const REMOVE_EMAIL_SIGNATURE_FILTER = { filter: (text) => SIGNATURE.matcher(text).replaceFirst('') };
// Java: LanguageIdentifier#REMOVE_MENTION_FILTER
export const REMOVE_MENTION_FILTER = { filter: (text) => MENTION.matcher(text).replaceFirst('') };
// Java: LanguageIdentifier#REMOVE_NON_BREAKING_SPACES_FILTER
export const REMOVE_NON_BREAKING_SPACES_FILTER = { filter: (text) => replaceChar(String(text), 0xa0, 0x20) };
// Java: LanguageIdentifier#REMOVE_URL_FILTER
export const REMOVE_URL_FILTER = { filter: (text) => MAIL_REGEX.matcher(URL_REGEX.matcher(text).replaceAll(' ')).replaceAll(' ') };

export const UNICODE_BASED_LANG_IDENTIFIER = new UnicodeBasedDetector();
let commonWords = null;

// Java: LanguageIdentifier#COMMON_WORDS_LANG_IDENTIFIER (static init deferred to first use; only the fastText/ngram path reads it, DEV-001)
export function getCommonWordsLangIdentifier() {
  if (commonWords === null) commonWords = new CommonWordsDetector();
  return commonWords;
}

// Java: stream().map(k -> k.equals("nb") ? "no" : k) (NPE text of the lambda for a null element)
function mapNb(list) {
  return list.map((k) => {
    if (k === null || k === undefined) throw new NullPointerException('Cannot invoke "String.equals(Object)" because "k" is null');
    return k === 'nb' ? 'no' : k;
  });
}

// Java: org.languagetool.language.identifier.LanguageIdentifier
export class LanguageIdentifier {
  static FQCN = 'org.languagetool.language.identifier.LanguageIdentifier';

  // Java: LanguageIdentifier#LanguageIdentifier(int)
  constructor(maxLength) {
    if (maxLength < 10) {
      throw new IllegalArgumentException(`maxLength must be >= 10 (but values > 100 are recommended): ${maxLength}`);
    }
    this.maxLength = maxLength;
  }

  // Java: LanguageIdentifier#cleanAndShortenText(String)
  cleanAndShortenText(text) {
    let shortText = text.length > this.maxLength ? text.substring(0, this.maxLength) : text;
    shortText = NBSP_INVIS_SEPARATOR.matcher(shortText).replaceAll(' '); // used by the browser add-on to filter HTML etc.
    shortText = REMOVE_URL_FILTER.filter(shortText);
    shortText = REMOVE_EMAIL_SIGNATURE_FILTER.filter(shortText);
    shortText = REMOVE_MENTION_FILTER.filter(shortText);
    shortText = REMOVE_NON_BREAKING_SPACES_FILTER.filter(shortText);
    return shortText;
  }

  // Java: LanguageIdentifier#prepareDetectLanguage(String,List,List)
  prepareDetectLanguage(text, noopLangsTmp, preferredLangsTmp) {
    Objects.requireNonNull(noopLangsTmp);
    Objects.requireNonNull(preferredLangsTmp);
    // Chrome sends 'nn' (Nynorsk) or 'nb' (Bokmal), but fasttext detects 'no', so we have to map, and
    // Bokmal seems to be the standard variant:
    const additionalLangs = mapNb(noopLangsTmp);
    const preferredLangs = mapNb(preferredLangsTmp);
    if (preferredLangs.some((k) => k.includes('-'))) {
      throw new IllegalArgumentException(`preferredLanguages may only contain language codes without variants (e.g. 'en', but not 'en-US'): ${abstractCollectionToString(preferredLangs)}. Use 'preferredVariants' to specify variants.`);
    }
    const domLangCodes = UNICODE_BASED_LANG_IDENTIFIER.getDominantLangCodes(text);
    const domLangStr = domLangCodes.join(',');
    if (domLangStr === 'th' || domLangStr === 'he' || domLangStr === 'ko' || domLangStr === 'hi,mr') {
      // more than 50% of characters are ..., so assume we don't support this cleanText:
      return null;
    }
    if (!preferredLangs.includes('ru') && !preferredLangs.includes('uk') && !preferredLangs.includes('be') && !preferredLangs.includes('zh') && !preferredLangs.includes('hi') && !preferredLangs.includes('mr')) {
      // Cyrillic and Chinese are so different from Latin characters that we try to detect it even with preferredLangs not properly set:
      preferredLangs.push(...domLangCodes);
      additionalLangs.push(...domLangCodes);
    }
    return new ParsedLanguageLists(additionalLangs, preferredLangs);
  }

  // Java: LanguageIdentifier#getHighestScoringResult(Map) (entries [key, value]; first maximum in iteration order wins)
  getHighestScoringResult(probs) {
    let result = null;
    let max = -1;
    for (const [key, value] of probs) {
      if (value > max) {
        max = value;
        result = key;
      }
    }
    return [result, max];
  }

  // Java: LanguageIdentifier#getOrderedScores(Map,int) (stable sort by value, descending)
  getOrderedScores(scores, count) {
    const entries = [...scores];
    entries.sort((a, b) => (b[1] < a[1] ? -1 : (b[1] > a[1] ? 1 : 0)));
    const sortedScores = new Map();
    for (let i = 0; i < entries.length && i < count; i++) sortedScores.set(entries[i][0], entries[i][1]);
    return sortedScores;
  }
}

// Java: LanguageIdentifier.ParsedLanguageLists
export class ParsedLanguageLists {
  // Java: ParsedLanguageLists#ParsedLanguageLists(List,List)
  constructor(additionalLangs, preferredLangs) {
    this.additionalLangs = [...additionalLangs];
    this.preferredLangs = [...preferredLangs];
  }

  // Java: ParsedLanguageLists#getAdditionalLangs()
  getAdditionalLangs() {
    return this.additionalLangs;
  }

  // Java: ParsedLanguageLists#getPreferredLangs()
  getPreferredLangs() {
    return this.preferredLangs;
  }
}
