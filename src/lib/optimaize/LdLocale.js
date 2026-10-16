// Java: com.optimaize.langdetect.i18n.LdLocale
import { IllegalArgumentException } from '../java/errors.js';
import { stringHashCode } from '../java/hash.js';
import { javaMatches } from '../java/strings.js';

const ABSENT_HASH = 0x79a31aac; // Guava Optional.absent().hashCode()
const PRESENT_HASH = 0x598df91c; // Guava Optional.of(x).hashCode() = this + x.hashCode()

// Guava Optional<String>#hashCode()
const optionalHash = (o) => (o === null ? ABSENT_HASH : (PRESENT_HASH + stringHashCode(o)) | 0);

// Java: com.optimaize.langdetect.i18n.LdLocale
export class LdLocale {
  static FQCN = 'com.optimaize.langdetect.i18n.LdLocale';

  // Java: LdLocale#LdLocale(String,Optional,Optional) (null = Optional.absent())
  constructor(language, script, region) {
    this.language = language;
    this.script = script;
    this.region = region;
  }

  // Java: LdLocale#fromString(String)
  static fromString(string) {
    if (string === null || string === undefined || string.length === 0) throw new IllegalArgumentException('At least a language is required!');
    let language = null;
    let script; // undefined = Java null (not yet assigned)
    let region;
    const strings = string.split('-'); // Guava Splitter.on('-').splitToList keeps empty parts
    for (let i = 0; i < strings.length; i++) {
      const chunk = strings[i];
      if (i === 0) {
        language = LdLocale.assignLang(chunk);
      } else if (script === undefined && region === undefined && LdLocale.looksLikeScriptCode(chunk)) {
        script = chunk;
      } else if (region === undefined && (LdLocale.looksLikeGeoCode3166_1(chunk) || LdLocale.looksLikeGeoCodeNumeric(chunk))) {
        region = chunk;
      } else {
        throw new IllegalArgumentException(`Unknown part: >>>${chunk}<<<!`);
      }
    }
    return new LdLocale(language, script ?? null, region ?? null);
  }

  // Java: LdLocale#looksLikeScriptCode(String)
  static looksLikeScriptCode(s) {
    return s.length === 4 && javaMatches(s, '[A-Z][a-z]{3}');
  }

  // Java: LdLocale#looksLikeGeoCode3166_1(String)
  static looksLikeGeoCode3166_1(s) {
    return s.length === 2 && javaMatches(s, '[A-Z]{2}');
  }

  // Java: LdLocale#looksLikeGeoCodeNumeric(String)
  static looksLikeGeoCodeNumeric(s) {
    return s.length === 3 && javaMatches(s, '[0-9]{3}');
  }

  // Java: LdLocale#assignLang(String)
  static assignLang(s) {
    if (!javaMatches(s, '[a-z]{2,3}')) throw new IllegalArgumentException(`Invalid language code syntax: >>>${s}<<<!`);
    return s;
  }

  // Java: LdLocale#toString()
  toString() {
    let sb = this.language;
    if (this.script !== null) sb += `-${this.script}`;
    if (this.region !== null) sb += `-${this.region}`;
    return sb;
  }

  // Java: LdLocale#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: LdLocale#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (!(o instanceof LdLocale)) return false;
    return this.language === o.language && this.region === o.region && this.script === o.script;
  }

  // Java: LdLocale#hashCode()
  hashCode() {
    let result = stringHashCode(this.language);
    result = (Math.imul(31, result) + optionalHash(this.script)) | 0;
    result = (Math.imul(31, result) + optionalHash(this.region)) | 0;
    return result;
  }
}
