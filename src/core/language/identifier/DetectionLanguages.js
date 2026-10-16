// D-051/DEV-008: Java Languages view over ALL distribution languages for detection (port objects in scope, descriptors otherwise).
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { equalsIgnoreCase, javaCompare, javaSplit, stringHashCode } from '../../../lib/java/strings.js';
import { getResourceAsStream } from '../../resources/ResourceDataBroker.js';
import { assureSet } from '../../text/StringTools.js';
import { Languages } from '../../Languages.js';

const PROPERTIES_PATH = 'META-INF/org/languagetool/language-module.properties';
const DESCRIPTORS = '/ltjs/detection-languages.json'; // written by `npm run resources` (scripts/lib/language-descriptors.mjs)

// detection descriptor of a distribution language without a port (DEV-008): identity data only, no rules
export class DetectionLanguage {
  constructor(d, registry) {
    this.d = d;
    this.registry = registry;
  }

  // Java: Language#getShortCode()
  getShortCode() {
    return this.d.shortCode;
  }

  // Java: Language#getName()
  getName() {
    return this.d.name;
  }

  // Java: Language#getCountries()
  getCountries() {
    return [...this.d.countries];
  }

  // Java: Language#getVariant()
  getVariant() {
    return this.d.variant;
  }

  // Java: Language#getShortCodeWithCountryAndVariant()
  getShortCodeWithCountryAndVariant() {
    return this.d.code;
  }

  // Java: Language#getDefaultLanguageVariant() (an instance with the code of the Java result)
  getDefaultLanguageVariant() {
    if (this.d.defaultVariant === this.d.code) return this;
    return this.registry.byLongCode(this.d.defaultVariant);
  }

  // Java: Language#isVariant() over the full distribution list
  isVariant() {
    for (const language of this.registry.get()) {
      const skip = language.getShortCodeWithCountryAndVariant() === this.getShortCodeWithCountryAndVariant();
      if (!skip && this.d.superclasses.includes(languageClassName(language))) return true;
    }
    return false;
  }

  // Java: Language#isSpellcheckOnlyLanguage()
  isSpellcheckOnlyLanguage() {
    return this.d.spellcheckOnly;
  }

  // Java: Language#getCommonWordsPath()
  getCommonWordsPath() {
    return this.d.commonWordsPath;
  }

  // Java: Language#toString()
  toString() {
    return this.getName();
  }

  // Java: Language#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (!(o instanceof DetectionLanguage) || o.d.class !== this.d.class) return false;
    return this.getShortCodeWithCountryAndVariant() === o.getShortCodeWithCountryAndVariant();
  }

  // Java: Language#hashCode()
  hashCode() {
    return stringHashCode(this.getShortCodeWithCountryAndVariant());
  }
}

// Java: Object#getClass().getName() for port languages and detection descriptors
export function languageClassName(l) {
  return l instanceof DetectionLanguage ? l.d.class : l.constructor.FQCN;
}

let registry = null;

// Java: Languages (static list) for the full distribution
class Registry {
  constructor() {
    const buf = getResourceAsStream(DESCRIPTORS);
    if (buf === null) throw new Error(`missing ${DESCRIPTORS} (run npm run resources)`);
    const ported = new Map(Languages.getWithDemoLanguage().map((l) => [l.constructor.FQCN, l]));
    this.languages = JSON.parse(buf.toString('utf8')).map((d) => ported.get(d.class) ?? new DetectionLanguage(d, this));
    this.staticSet = new Set(this.languages);
  }

  // Java: Languages#getStaticAndDynamicLanguages() (dynamic languages come from the port registry)
  staticAndDynamic() {
    const dyn = Languages.getWithDemoLanguage().filter((l) => !this.staticSet.has(l));
    return dyn.length === 0 ? this.languages : [...this.languages, ...dyn];
  }

  // Java: Languages#get()
  get() {
    return this.staticAndDynamic().filter((l) => l.getShortCode() !== 'xx' && l.getShortCode() !== 'zz');
  }

  // lookup of a static entry by getShortCodeWithCountryAndVariant()
  byLongCode(code) {
    return this.languages.find((l) => l.getShortCodeWithCountryAndVariant() === code) ?? null;
  }
}

// the full distribution registry (lazy)
export function detectionLanguages() {
  if (registry === null) registry = new Registry();
  return registry;
}

// Java: Languages#get() over all distribution languages
export function getAll() {
  return detectionLanguages().get();
}

// Java: Languages#getLanguageForShortCodeOrNull(String) (same algorithm as src/core/Languages.js, full list)
function getLanguageForShortCodeOrNull(langCode) {
  assureSet(langCode, 'langCode');
  const all = detectionLanguages().staticAndDynamic();
  let result = null;
  if (langCode.includes('-x-')) {
    // e.g. "de-DE-x-simple-language"
    for (const element of all) {
      if (equalsIgnoreCase(element.getShortCode(), langCode)) return element;
    }
  } else if (langCode.includes('-')) {
    const parts = javaSplit(langCode, '-');
    if (parts.length === 2) { // e.g. en-US
      for (const element of all) {
        if (equalsIgnoreCase(parts[0], element.getShortCode())
            && element.getCountries().length === 1
            && equalsIgnoreCase(parts[1], element.getCountries()[0])) {
          result = element;
          break;
        }
      }
    } else if (parts.length === 3) { // e.g. ca-ES-valencia
      for (const element of all) {
        if (equalsIgnoreCase(parts[0], element.getShortCode())
            && element.getCountries().length === 1
            && equalsIgnoreCase(parts[1], element.getCountries()[0])
            && equalsIgnoreCase(parts[2], element.getVariant())) {
          result = element;
          break;
        }
      }
    } else {
      throw new IllegalArgumentException(`'${langCode}' isn't a valid language code`);
    }
  } else {
    for (const element of all) {
      if (langCode === 'global') {
        // for disambiguation-global.xml take any language
        result = element;
        break;
      }
      if (equalsIgnoreCase(langCode, element.getShortCode())) {
        result = element;
        break;
      }
    }
  }
  return result;
}

// Java: Languages#getLongCodeToLangMapping() (lookups and sorted key use only: plain Map)
function getLongCodeToLangMapping() {
  const map = new Map();
  for (const language of getAll()) {
    if (language.getCountries().length > 0 && language.getCountries()[0].length !== 0) {
      map.set(`${language.getShortCode()}-${language.getCountries()[0]}`, language);
    }
  }
  return map;
}

// Java: Languages#getLangCodes()
function getLangCodes() {
  const codes = [];
  for (const realLanguage of detectionLanguages().staticAndDynamic()) codes.push(realLanguage.getShortCodeWithCountryAndVariant());
  for (const key of getLongCodeToLangMapping().keys()) {
    if (!codes.includes(key)) codes.push(key);
  }
  codes.sort(javaCompare);
  return codes;
}

// Java: Languages#getLanguageForShortCode(String) / (String,List) over all distribution languages
export function getLanguageForShortCode(langCode, noopLanguageCodes = []) {
  let language = getLanguageForShortCodeOrNull(langCode);
  if (language === null) {
    // e.g. 'fr-FR' requested (happens with LibreOffice 7.4):
    language = getLongCodeToLangMapping().get(langCode) ?? null;
  }
  if (language === null) {
    if (noopLanguageCodes.includes(langCode)) {
      return Languages.getLanguageForShortCode('zz', ['zz']); // Java: Languages.NOOP_LANGUAGE (the port's singleton)
    }
    throw new IllegalArgumentException(`'${langCode}' is not a language code known to LanguageTool.`
      + ` Supported language codes are: ${getLangCodes().join(', ')}. The list of languages is read from ${PROPERTIES_PATH}`
      + ' in the Java classpath. See https://dev.languagetool.org/java-api for details.');
  }
  return language;
}

// Java: Languages#isLanguageSupported(String) over all distribution languages
export function isLanguageSupported(langCode) {
  return getLanguageForShortCodeOrNull(langCode) !== null;
}
