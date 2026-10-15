// java.util.Locale subset for bundle lookup (language/country/variant; default en_US per D-018).
import { NullPointerException } from './errors.js';

// ASCII-only lower/upper case (LocaleUtils.toLowerString/toUpperString)
const asciiLower = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
const asciiUpper = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 32));

// Java: java.util.Locale
export class Locale {
  // Java: Locale#Locale(String,String,String)
  constructor(language, country = '', variant = '') {
    if (language === null || language === undefined || country === null || country === undefined || variant === null || variant === undefined) {
      throw new NullPointerException();
    }
    // Java: Locale#convertOldISOCodes(String)
    const l = asciiLower(language);
    this.language = l === 'iw' ? 'he' : l === 'ji' ? 'yi' : l === 'in' ? 'id' : l;
    this.country = asciiUpper(country);
    this.variant = variant;
  }

  // Java: Locale#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: Locale#getCountry()
  getCountry() {
    return this.country;
  }

  // Java: Locale#getVariant()
  getVariant() {
    return this.variant;
  }

  // Java: Locale#equals(Object)
  equals(o) {
    return o instanceof Locale && o.language === this.language && o.country === this.country && o.variant === this.variant;
  }

  // Java: Locale#toString() (no script/extensions)
  toString() {
    const l = this.language.length !== 0;
    const r = this.country.length !== 0;
    const v = this.variant.length !== 0;
    let result = this.language;
    if (r || (l && v)) result += `_${this.country}`;
    if (v && (l || r)) result += `_${this.variant}`;
    return result;
  }

  // Java: Locale#getDefault()
  static getDefault() {
    return Locale.US;
  }
}

Locale.ROOT = new Locale('', '');
Locale.ENGLISH = new Locale('en', '');
Locale.US = new Locale('en', 'US');
Locale.GERMAN = new Locale('de', '');
Locale.GERMANY = new Locale('de', 'DE');
Locale.FRENCH = new Locale('fr', '');
Locale.FRANCE = new Locale('fr', 'FR');
Locale.UK = new Locale('en', 'GB');
