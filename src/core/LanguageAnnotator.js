// Java: org.languagetool.LanguageAnnotator
import { Objects } from '../lib/java/Objects.js';
import { javaTrim } from '../lib/java/strings.js';
import { javaMatches } from '../lib/java/regex/index.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { FragmentWithLanguage } from './FragmentWithLanguage.js';
import { VagueSpellChecker } from './rules/spelling/VagueSpellChecker.js';

const MIN_TOKENS = 4; // fragments shorter than this will get the previous fragment's language

// Java: AbstractCollection#toString() of a List
const listToString = (l) => `[${l.map((x) => String(x)).join(', ')}]`;

// Java: LanguageAnnotator
export class LanguageAnnotator {
  static FQCN = 'org.languagetool.LanguageAnnotator';

  // Java: LanguageAnnotator#LanguageAnnotator()
  constructor() {
  }

  // Java: LanguageAnnotator#detectLanguages(String,Language,List)
  detectLanguages(input, mainLang, secondLangs) {
    const tokens = this.getTokensWithPotentialLanguages(input, mainLang, secondLangs);
    const tokenRanges = this.getTokenRanges(tokens); // split at boundaries like "."
    const tokenRangesWithLang = this.getTokenRangesWithLang(tokenRanges, mainLang, secondLangs);
    let curLang;
    let prevLang = mainLang;
    let curPos = 0;
    let fromPos = 0;
    const result = [];
    for (const tokenRange of tokenRangesWithLang) {
      curLang = tokenRange.lang;
      if (tokenRange.tokens.length === 1 && isQuote(tokenRange.tokens[0])) {
        // assign single quote the language of the previous element, assuming it belongs there
        curLang = prevLang;
      } else if (curLang !== prevLang) {
        result.push(new FragmentWithLanguage(prevLang.getShortCodeWithCountryAndVariant(), input.substring(fromPos, curPos)));
        fromPos = curPos;
      }
      prevLang = curLang;
      curPos += tokenRange.tokens.reduce((sum, t) => sum + t.length, 0);
    }
    result.push(new FragmentWithLanguage(prevLang.getShortCodeWithCountryAndVariant(), input.substring(fromPos)));
    return result;
  }

  // Java: LanguageAnnotator#getTokensWithPotentialLanguages(String,Language,List)
  getTokensWithPotentialLanguages(input, mainLang, secondLangs) {
    const tokens = [];
    // TODO (Java): tokenizing might be different for languages...
    const speller = new VagueSpellChecker();
    const mainLangTokens = mainLang.getWordTokenizer().tokenize(input);
    for (const token of mainLangTokens) {
      if (isWord(token) && speller.isValidWord(token, mainLang)) {
        tokens.push(new TokenWithLanguages(token, mainLang));
      } else {
        tokens.push(new TokenWithLanguages(token));
      }
    }
    for (const secondLang of secondLangs) {
      let i = 0;
      for (const token of [...tokens]) {
        if (isWord(token.token) && speller.isValidWord(token.token, secondLang)) {
          const langs = [...token.langs];
          langs.push(secondLang);
          tokens[i] = TokenWithLanguages.ofList(token.token, langs);
        }
        i++;
      }
    }
    return tokens;
  }

  // Java: LanguageAnnotator#getTokenRanges(List)
  getTokenRanges(tokens) {
    const result = [];
    let l = [];
    let inQuote = false;
    for (const token of tokens) {
      if (isQuote(token.token) && !inQuote) {
        // this is an opening quote - add to next range
        if (l.length > 0) {
          result.push(l);
        }
        l = [];
        l.push(token);
      } else if (this.isBoundary(token)) {
        l.push(token);
        result.push(l);
        l = [];
      } else {
        l.push(token);
      }
      if (isQuote(token.token)) {
        inQuote = !inQuote;
      }
    }
    if (l.length > 0) {
      result.push(l);
    }
    return result;
  }

  // For each range, assign the language that has most tokens there. For ambiguous parts
  // (no winning language), use the top language of the next non-ambiguous part:
  // Java: LanguageAnnotator#getTokenRangesWithLang(List,Language,List)
  getTokenRangesWithLang(tokenRanges, mainLang, secondLangs) {
    const result = [];
    let i = 0;
    let prevTopLang = null;
    for (const tokens of tokenRanges) {
      let topLang = null;
      const allAmbiguous = tokens.every((k) => k.ambiguous());
      if (allAmbiguous) {
        for (let j = i + 1; j < tokenRanges.length; j++) {
          const nextTokens = tokenRanges[j];
          const nextAllAmbiguous = nextTokens.every((k) => k.ambiguous());
          if (!nextAllAmbiguous) {
            topLang = this.getTopLang(mainLang, secondLangs, nextTokens);
            break;
          }
        }
      }
      if (topLang === null) {
        if (tokens.length < MIN_TOKENS && prevTopLang !== null) {
          topLang = prevTopLang;
        } else {
          topLang = this.getTopLang(mainLang, secondLangs, tokens);
        }
      }
      const tokenList = tokens.map((k) => k.token);
      result.push(new TokenRangeWithLanguage(tokenList, topLang));
      prevTopLang = topLang;
      i++;
    }
    return result;
  }

  // Java: LanguageAnnotator#getTopLang(Language,List,List)
  getTopLang(mainLang, secondLangs, tokens) {
    const langToCount = new JavaHashMap();
    langToCount.put(mainLang, tokens.reduce((s, k) => s + (containsLang(k.langs, mainLang) ? 1 : 0), 0));
    for (const lang of secondLangs) {
      const langCount = tokens.reduce((s, k) => s + (containsLang(k.langs, lang) ? 1 : 0), 0);
      langToCount.put(lang, langCount);
    }
    let max = 0;
    let topLang = mainLang;
    for (const [key, value] of langToCount.entrySet()) {
      if (value > max) {
        topLang = key;
        max = value;
      }
    }
    return topLang;
  }

  // Java: LanguageAnnotator#isBoundary(TokenWithLanguages)
  isBoundary(token) {
    return javaMatches(token.token, '[.?!;:"„“»«()\\[\\]\n]'); // TODO (Java): " - "
  }
}

// Java: List#contains(Object) with Language#equals
const containsLang = (langs, lang) => langs.some((x) => Objects.equals(x, lang));

// Java: LanguageAnnotator#isQuote(String)
function isQuote(token) {
  return javaMatches(token, '["„“”»«]');
}

// Java: LanguageAnnotator#isWord(String)
function isWord(s) {
  return javaTrim(s).length !== 0 && javaMatches(s, '\\w+');
}

// Java: LanguageAnnotator.TokenWithLanguages
export class TokenWithLanguages {
  // Java: TokenWithLanguages(String,Language...)
  constructor(token, ...langs) {
    this.token = Objects.requireNonNull(token);
    this.langs = [...Objects.requireNonNull(langs)];
  }

  // Java: TokenWithLanguages(String,List)
  static ofList(token, langs) {
    const t = new TokenWithLanguages(token);
    t.langs = Objects.requireNonNull(langs);
    return t;
  }

  // Java: TokenWithLanguages#ambiguous()
  ambiguous() {
    return this.langs.length !== 1;
  }

  // Java: TokenWithLanguages#toString()
  toString() {
    if (isWord(this.token)) {
      return `${this.token}/${this.langs.map((k) => k.getShortCodeWithCountryAndVariant()).join('/')}`;
    }
    return this.token;
  }

  // Java: TokenWithLanguages#getToken()
  getToken() {
    return this.token;
  }

  // Java: TokenWithLanguages#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.token === o.token && this.langs.length === o.langs.length && this.langs.every((l, i) => Objects.equals(l, o.langs[i]));
  }

  // Java: TokenWithLanguages#hashCode() (Objects.hash(token, langs))
  hashCode() {
    let h = 31 + Objects.hashCode(this.token);
    let lh = 1;
    for (const l of this.langs) lh = (Math.imul(31, lh) + Objects.hashCode(l)) | 0;
    h = (Math.imul(31, h) + lh) | 0;
    return h;
  }
}

// Java: LanguageAnnotator.TokenRangeWithLanguage
export class TokenRangeWithLanguage {
  // Java: TokenRangeWithLanguage(List,Language)
  constructor(tokens, lang) {
    this.tokens = Objects.requireNonNull(tokens);
    this.lang = Objects.requireNonNull(lang);
  }

  // Java: TokenRangeWithLanguage#toString()
  toString() {
    return `${this.lang.getShortCodeWithCountryAndVariant()}: ${listToString(this.tokens)}`;
  }
}

export { listToString };
