// Java: org.languagetool.language.identifier.detector.CommonWordsDetector (all distribution languages, D-051/DEV-008)
import { isSpaceChar } from '../../../../lib/java/Character.js';
import { IOException } from '../../../../lib/java/errors.js';
import { decodeUtf8, scannerLines } from '../../../../lib/java/io.js';
import { Pattern } from '../../../../lib/java/regex/index.js';
import { javaMatches, toLowerCase } from '../../../../lib/java/strings.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { getResourceAsStream } from '../../../resources/ResourceDataBroker.js';
import { getAll, getLanguageForShortCode } from '../DetectionLanguages.js';

let word2langs = null; // Java: static Map<String, List<Language>> word2langs (filled once)
let statics = null; // Java: static esLang, caLang, ptLang

const numberPattern = Pattern.compile('[0-9.,%-]+');
// but -cion can be Esperanto; ía(n) can be Galician
const spanishPattern = Pattern.compile('^[a-zñ]+(ón|cion|aban|ábamos|ábais|íamos|íais|[úí]a[sn]?|úe[ns]?)$');
const notSpanishPattern = Pattern.compile("^[lmndts]['’].*$|^.*(ns|[áéó].i[oa]s?)$|^.*(ss|[çàèòïâêôãõìù]|l·l).*$");
const notCatalanPattern = Pattern.compile('^.*([áéó].i[oa]s?|d[oa]s)$|^.*[áâêôãõìùñ].*$');
const portuguesePattern = Pattern.compile('^.*([áó]ri[oa]|ério)s?$'); // éria can be French
const PUNCT_PATTERN = Pattern.compile('[(),.:;!?„“"¡¿\\s\\[\\]{}-«»”]');
const CHARS_PATTERN = Pattern.compile('\\p{L}+$');
const SPACE_OR_HYPHEN_PATTERN = Pattern.compile('[ -]');

// Java: CommonWordsDetector static initializers of esLang/caLang/ptLang
function getStatics() {
  if (statics === null) {
    statics = { esLang: getLanguageForShortCode('es'), caLang: getLanguageForShortCode('ca'), ptLang: getLanguageForShortCode('pt') };
  }
  return statics;
}

// Java: StringUtils#countMatches(CharSequence,CharSequence) for a one-char needle
function countMatches(s, ch) {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) n++;
  return n;
}

// Java: org.languagetool.language.identifier.detector.CommonWordsDetector
export class CommonWordsDetector {
  // Java: CommonWordsDetector#CommonWordsDetector()
  constructor() {
    getStatics();
    if (word2langs !== null) return;
    const map = new Map();
    for (const lang of getAll()) {
      if (lang.isVariant() && lang.getShortCode() !== 'no') { // ugly hack to quick fix languagetool-premium#822
        continue;
      }
      const dataBroker = getDataBroker();
      const path = lang.getCommonWordsPath();
      let stream;
      if (path !== null) {
        if (dataBroker.resourceExists(path)) {
          stream = dataBroker.getFromResourceDirAsStream(path);
        } else {
          // the Java fs fallback read the same class-path name from disk; the broker resolves it identically
          stream = getResourceAsStream(dataBroker.getCompleteResourceUrl(path));
          if (stream === null) {
            throw new IOException(`Common words file not found for ${lang}: ${path}`);
          }
        }
      } else {
        if (!javaMatches(lang.getShortCode(), 'ja|km')) {
          process.stdout.write(`WARN: no common words file defined for ${lang} - this language might not be correctly auto-detected\n`);
        }
        continue;
      }
      for (const line of scannerLines(decodeUtf8(stream))) {
        if (line.length === 0 || line.startsWith('#')) continue;
        const key = toLowerCase(line);
        if (key.length === 1 && isSpaceChar(key.charCodeAt(0))) continue;
        const languages = map.get(key);
        if (languages === undefined) {
          map.set(key, [lang]);
        } else if (!languages.some((l) => l.equals(lang))) {
          languages.push(lang);
        }
      }
    }
    word2langs = map;
  }

  // Java: CommonWordsDetector#getKnownWordsPerLanguage(String) (HashMap<Language,Integer>; callers do not depend on its order)
  getKnownWordsPerLanguage(text) {
    const { esLang, caLang, ptLang } = getStatics();
    const result = new Map();
    const inc = (lang, d) => result.set(lang, (result.get(lang) ?? 0) + d);
    let auxText = PUNCT_PATTERN.matcher(text).replaceAll(' ');
    if (!auxText.endsWith(' ') && countMatches(auxText, ' ') > 0) {
      // last word might not be finished yet, so ignore
      auxText = CHARS_PATTERN.matcher(auxText).replaceFirst('');
    }
    // Proper per-language tokenizing might help, but then the common_words.txt
    // will also need to be tokenized the same way. Also, this is quite fast.
    const words = SPACE_OR_HYPHEN_PATTERN.split(auxText);
    for (const word of words) {
      if (numberPattern.matcher(word).matches()) continue;
      const lcWord = toLowerCase(word);
      const languages = word2langs.get(lcWord) ?? null;
      if (languages !== null) {
        for (const lang of languages) inc(lang, 1);
      }
      // Portuguese
      if ((languages === null || !languages.includes(ptLang)) && portuguesePattern.matcher(lcWord).matches()) inc(ptLang, 1);
      // Spanish
      if ((languages === null || !languages.includes(esLang)) && spanishPattern.matcher(lcWord).matches()) inc(esLang, 1);
      if ((languages === null || !languages.includes(esLang)) && notSpanishPattern.matcher(lcWord).matches()) inc(esLang, -1);
      // Catalan
      if ((languages === null || !languages.includes(caLang)) && notCatalanPattern.matcher(lcWord).matches()) inc(caLang, -1);
    }
    return result;
  }
}

// test support (no Java counterpart): forget the static word map, as a fresh JVM would
export function resetCommonWords() {
  word2langs = null;
  statics = null;
}
