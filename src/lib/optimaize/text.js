// Java: com.optimaize.langdetect.text.* and cybozu.util.CharNormalizer/Messages (text normalisation before detection)
import { UnicodeBlock, UnicodeScript } from '../java/Character.js';
import { MissingResourceException } from '../java/errors.js';
import { Locale } from '../java/Locale.js';
import { ResourceBundle } from '../java/ResourceBundle.js';
import { getResourceAsStream } from './classpath.js';

const BUNDLE_NAME = 'com.optimaize.langdetect.cybozu.util.messages';
let bundle = null;

// Java: com.optimaize.langdetect.cybozu.util.Messages#getString(String)
function getString(key) {
  if (bundle === null) bundle = ResourceBundle.getBundle(BUNDLE_NAME, Locale.getDefault(), getResourceAsStream);
  try {
    return bundle.getString(key);
  } catch (e) {
    if (e instanceof MissingResourceException) return `!${key}!`;
    throw e;
  }
}

// Java: CharNormalizer#CJK_CLASS (keys in source order; later classes overwrite earlier ones in cjk_map)
const CJK_KEYS = ('1_0 1_2 1_4 1_8 1_11 1_12 1_13 1_14 1_16 1_18 1_22 1_27 1_29 1_31 1_35 2_0 2_1 2_4 2_9 2_10 2_11 2_12 2_13 2_15 2_16 2_18 2_21 '
  + '2_22 2_23 2_28 2_29 2_30 2_31 2_32 2_35 2_36 2_37 2_38 3_1 3_2 3_3 3_4 3_5 3_8 3_9 3_11 3_12 3_13 3_15 3_16 3_18 3_19 3_22 3_23 3_27 3_29 '
  + '3_30 3_31 3_32 3_35 3_36 3_37 3_38 4_0 4_9 4_10 4_16 4_17 4_18 4_22 4_24 4_28 4_34 4_39 5_10 5_11 5_12 5_13 5_14 5_18 5_26 5_29 5_34 5_39 '
  + '6_0 6_3 6_9 6_10 6_11 6_12 6_16 6_18 6_20 6_21 6_22 6_23 6_25 6_28 6_29 6_30 6_32 6_34 6_35 6_37 6_39 7_0 7_3 7_6 7_7 7_9 7_11 7_12 7_13 '
  + '7_16 7_18 7_19 7_20 7_21 7_23 7_25 7_28 7_29 7_32 7_33 7_35 7_37').split(' ');

let cn = null; // Java: CharNormalizer static state (LATIN1_EXCLUDED, cjk_map, block constants) + JS per-char result cache

// Java: CharNormalizer.<clinit>
function charNormalizer() {
  if (cn === null) {
    const cjkMap = new Map();
    for (const k of CJK_KEYS) {
      const cjkList = getString(`NGram.KANJI_${k}`);
      const representative = cjkList.charCodeAt(0);
      for (let i = 0; i < cjkList.length; ++i) cjkMap.set(cjkList.charCodeAt(i), representative);
    }
    cn = {
      LATIN1_EXCLUDED: getString('NGram.LATIN1_EXCLUDE'),
      cjkMap,
      BASIC_LATIN: UnicodeBlock.of(0x0041),
      LATIN_1_SUPPLEMENT: UnicodeBlock.of(0x00c0),
      GENERAL_PUNCTUATION: UnicodeBlock.of(0x2000),
      ARABIC: UnicodeBlock.of(0x0600),
      LATIN_EXTENDED_ADDITIONAL: UnicodeBlock.of(0x1e00),
      HIRAGANA: UnicodeBlock.of(0x3040),
      KATAKANA: UnicodeBlock.of(0x30a0),
      BOPOMOFO: UnicodeBlock.of(0x3100),
      BOPOMOFO_EXTENDED: UnicodeBlock.of(0x31a0),
      CJK_UNIFIED_IDEOGRAPHS: UnicodeBlock.of(0x4e00),
      HANGUL_SYLLABLES: UnicodeBlock.of(0xac00),
      cache: new Uint16Array(0x10000), // 0 = not computed (normalize never returns U+0000)
    };
  }
  return cn;
}

// Java: CharNormalizer#normalize(char) (uncached)
function normalizeUncached(c, ch) {
  const block = UnicodeBlock.of(ch);
  if (block === c.BASIC_LATIN) {
    if (ch < 0x41 || (ch < 0x61 && ch > 0x5a) || ch > 0x7a) ch = 0x20;
  } else if (block === c.LATIN_1_SUPPLEMENT) {
    if (c.LATIN1_EXCLUDED.indexOf(String.fromCharCode(ch)) >= 0) ch = 0x20;
  } else if (block === c.GENERAL_PUNCTUATION) {
    ch = 0x20;
  } else if (block === c.ARABIC) {
    if (ch === 0x06cc) ch = 0x064a;
  } else if (block === c.LATIN_EXTENDED_ADDITIONAL) {
    if (ch >= 0x1ea0) ch = 0x1ec3;
  } else if (block === c.HIRAGANA) {
    ch = 0x3042;
  } else if (block === c.KATAKANA) {
    ch = 0x30a2;
  } else if (block === c.BOPOMOFO || block === c.BOPOMOFO_EXTENDED) {
    ch = 0x3105;
  } else if (block === c.CJK_UNIFIED_IDEOGRAPHS) {
    if (c.cjkMap.has(ch)) ch = c.cjkMap.get(ch);
  } else if (block === c.HANGUL_SYLLABLES) {
    ch = 0xac00;
  }
  return ch;
}

// Java: CharNormalizer#normalize(char) (char code in, char code out)
export function normalizeChar(ch) {
  const c = charNormalizer();
  let r = c.cache[ch];
  if (r === 0) {
    r = normalizeUncached(c, ch);
    c.cache[ch] = r;
  }
  return r;
}

// Java: com.optimaize.langdetect.text.MultiTextFilter
export class MultiTextFilter {
  // Java: MultiTextFilter#MultiTextFilter(List)
  constructor(filters) {
    this.filters = filters.length === 0 ? null : [...filters];
  }

  // Java: MultiTextFilter#filter(CharSequence)
  filter(text) {
    if (this.filters === null) return String(text);
    let modified = String(text);
    for (const f of this.filters) modified = f.filter(modified);
    return modified;
  }
}

// Java: com.optimaize.langdetect.text.RemoveMinorityScriptsTextFilter
export class RemoveMinorityScriptsTextFilter {
  // Java: RemoveMinorityScriptsTextFilter#RemoveMinorityScriptsTextFilter(double)
  constructor(threshold) {
    this.threshold = threshold;
  }

  // Java: RemoveMinorityScriptsTextFilter#forThreshold(double)
  static forThreshold(threshold) {
    return new RemoveMinorityScriptsTextFilter(threshold);
  }

  // Java: RemoveMinorityScriptsTextFilter#filter(CharSequence) (HashMap/HashSet only feed order-free max and membership)
  filter(text) {
    const counts = this.countByScript(text);
    if (counts.size <= 1) return String(text); // nothing to do
    const most = this.findMost(counts);
    const toRemove = new Set();
    for (const [script, n] of counts) {
      if (n === most) continue;
      const ratio = n / most;
      if (ratio <= this.threshold) toRemove.add(script);
    }
    if (toRemove.size === 0) return String(text);
    return this.remove(text, toRemove);
  }

  // Java: RemoveMinorityScriptsTextFilter#remove(CharSequence,Set)
  remove(text, toRemove) {
    let remaining = '';
    let last = null;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      const unicodeScript = UnicodeScript.of(c);
      if (unicodeScript === UnicodeScript.INHERITED) {
        if (toRemove.has(last)) continue; // remove, don't update 'last'
      }
      last = unicodeScript;
      if (toRemove.has(unicodeScript)) continue; // remove it
      remaining += text[i];
    }
    return remaining;
  }

  // Java: RemoveMinorityScriptsTextFilter#findMost(Map)
  findMost(counts) {
    let max = 0;
    for (const n of counts.values()) if (n > max) max = n;
    return max;
  }

  // Java: RemoveMinorityScriptsTextFilter#countByScript(CharSequence)
  countByScript(text) {
    const counter = new Map();
    let last = null;
    for (let i = 0; i < text.length; i++) {
      const unicodeScript = UnicodeScript.of(text.charCodeAt(i));
      if (unicodeScript === UnicodeScript.INHERITED) {
        if (last !== null) counter.set(last, (counter.get(last) ?? 0) + 1); // counts as what the last was
      } else if (unicodeScript === UnicodeScript.COMMON || unicodeScript === UnicodeScript.UNKNOWN) {
        // don't count it
      } else {
        counter.set(unicodeScript, (counter.get(unicodeScript) ?? 0) + 1);
        last = unicodeScript;
      }
    }
    return counter;
  }
}

// Java: com.optimaize.langdetect.text.TextObject (StringBuilder as a JS string)
export class TextObject {
  // Java: TextObject#TextObject(TextFilter,int)
  constructor(textFilter, maxTextLength) {
    this.textFilter = textFilter;
    this.maxTextLength = maxTextLength;
    this.sb = '';
  }

  // Java: TextObject#append(CharSequence)
  append(text) {
    if (this.maxTextLength > 0 && this.sb.length >= this.maxTextLength) return this;
    text = this.textFilter.filter(text);
    // unfortunately this code can't be put into a TextFilter (limit, last char of the builder)
    let pre = this.sb.length === 0 ? 0 : this.sb.charCodeAt(this.sb.length - 1);
    const out = [];
    let len = this.sb.length;
    for (let i = 0; i < text.length && (this.maxTextLength === 0 || len < this.maxTextLength); i++) {
      const c = normalizeChar(text.charCodeAt(i));
      if (c !== 0x20 || pre !== 0x20) {
        out.push(c);
        len++;
      }
      pre = c;
    }
    let s = '';
    for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode.apply(null, out.slice(i, i + 8192));
    this.sb += s;
    return this;
  }

  // Java: TextObject#length()
  length() {
    return this.sb.length;
  }

  // Java: TextObject#toString()
  toString() {
    return this.sb;
  }
}

// Java: com.optimaize.langdetect.text.TextObjectFactory
export class TextObjectFactory {
  // Java: TextObjectFactory#TextObjectFactory(TextFilter,int)
  constructor(textFilter, maxTextLength) {
    this.textFilter = textFilter;
    this.maxTextLength = maxTextLength;
  }

  // Java: TextObjectFactory#create()
  create() {
    return new TextObject(this.textFilter, this.maxTextLength);
  }

  // Java: TextObjectFactory#forText(CharSequence)
  forText(text) {
    return this.create().append(text);
  }
}

// Java: com.optimaize.langdetect.text.TextObjectFactoryBuilder
export class TextObjectFactoryBuilder {
  constructor() {
    this.maxTextLength_ = 0;
    this.textFilters = [];
  }

  // Java: TextObjectFactoryBuilder#maxTextLength(int)
  maxTextLength(maxTextLength) {
    this.maxTextLength_ = maxTextLength;
    return this;
  }

  // Java: TextObjectFactoryBuilder#withTextFilter(TextFilter)
  withTextFilter(textFilter) {
    this.textFilters.push(textFilter);
    return this;
  }

  // Java: TextObjectFactoryBuilder#build()
  build() {
    return new TextObjectFactory(new MultiTextFilter(this.textFilters), this.maxTextLength_);
  }
}
