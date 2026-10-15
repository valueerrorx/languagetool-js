// Java: org.languagetool.Languages (registry of all languages; language classes are registered via src/lang/register.js)
import { ClassNotFoundException, IllegalArgumentException, JavaError, NullPointerException, RuntimeException } from '../lib/java/errors.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { javaCompare, javaSplit, equalsIgnoreCase } from '../lib/java/strings.js';
import { getResources } from './resources/ResourceDataBroker.js';
import { getClassBroker } from './resources/LtStatics.js';
import { assureSet } from './text/StringTools.js';
import { MultiKeyProperties } from './tools/MultiKeyProperties.js';
import { DICTIONARY_FILENAME_EXTENSION } from './JLanguageTool.js';
import { Language } from './Language.js';
import { DynamicHunspellLanguage, DynamicMorfologikLanguage } from './DynamicLanguage.js';
import { NoopLanguage } from './noop/NoopLanguage.js';
import { ref } from './languagesRef.js';

const PROPERTIES_PATH = 'META-INF/org/languagetool/language-module.properties';
const PROPERTIES_KEY = 'languageClasses';
// DEV-006: capacity of the Java HashMap of getLongCodeToLangMapping() for the full distribution (46 entries -> table 64), keeps the order of the in-scope entries
const LONG_CODE_MAP_CAPACITY = 64;

let state = null; // Java: static fields NOOP_LANGUAGE, languages, dynLanguages, staticAndDynamicLanguages

// Java: Languages.<clinit>
function getState() {
  if (state === null) {
    const noop = new NoopLanguage();
    const languages = getAllLanguages();
    state = { noop, languages, dynLanguages: [], staticAndDynamicLanguages: [...languages] };
  }
  return state;
}

// Java: Premium#isPremiumVersion() (class org.languagetool.PremiumOn is not part of this distribution)
function isPremiumVersion() {
  try {
    getClassBroker().forName('org.languagetool.PremiumOn');
    return true;
  } catch (e) {
    if (e instanceof ClassNotFoundException) return false;
    throw new RuntimeException("Object for class 'org.languagetool.PremiumOn' could not be created", e);
  }
}

// Java: Languages#getAllLanguages()
function getAllLanguages() {
  const languages = [];
  const languageClassNames = new Set();
  const propertyFiles = getResources(PROPERTIES_PATH);
  for (const url of propertyFiles) {
    // We want to be able to read properties file with duplicate key, as produced by Maven when merging files:
    const props = new MultiKeyProperties(url.openStream());
    const classNamesStr = props.getProperty(PROPERTIES_KEY);
    if (classNamesStr === null) {
      throw new RuntimeException(`Key '${PROPERTIES_KEY}' not found in ${url}`);
    }
    for (const classNames of classNamesStr) {
      const classNamesSplit = javaSplit(classNames, '\\s*,\\s*');
      for (const className of classNamesSplit) {
        if (languageClassNames.has(className) || languageClassNames.has(`${className}Premium`)) {
          // avoid duplicates - this way we are robust against problems with the maven assembly
          // plugin which aggregates files more than once
          continue;
        }
        languages.push(createLanguageObjects(url, className));
        if (isPremiumVersion() && hasPremium(className)) {
          languageClassNames.add(`${className}Premium`);
        } else {
          languageClassNames.add(className);
        }
      }
    }
  }
  return languages;
}

// Java: Languages#createLanguageObjects(URL,String)
function createLanguageObjects(url, className) {
  try {
    if (isPremiumVersion() && hasPremium(className)) {
      className = `${className}Premium`;
    }
    const aClass = getClassBroker().forName(className);
    return new aClass();
  } catch (e) {
    if (e instanceof ClassNotFoundException) {
      throw new RuntimeException(`Class '${className}' specified in ${url} could not be found in classpath`, e);
    }
    if (e instanceof JavaError) throw e;
    throw new RuntimeException(`Object for class '${className}' specified in ${url} could not be created`, e);
  }
}

// Java: Languages#hasPremium(String)
function hasPremium(className) {
  return /^org\.languagetool\.language\.(Portuguese|AngolaPortuguese|BrazilianPortuguese|MozambiquePortuguese|PortugalPortuguese|German|GermanyGerman|AustrianGerman|SwissGerman|Dutch|French|Spanish|English|AustralianEnglish|AmericanEnglish|BritishEnglish|CanadianEnglish|NewZealandEnglish|SouthAfricanEnglish)$/.test(className);
}

// Java: Languages#getStaticAndDynamicLanguages()
function getStaticAndDynamicLanguages() {
  return getState().staticAndDynamicLanguages;
}

// Java: Languages#getLangCodes()
function getLangCodes() {
  const codes = [];
  for (const realLanguage of getStaticAndDynamicLanguages()) {
    codes.push(realLanguage.getShortCodeWithCountryAndVariant());
  }
  const longCodeToLang = Languages.getLongCodeToLangMapping();
  for (const [key] of longCodeToLang.entrySet()) {
    if (!codes.includes(key)) {
      codes.push(key);
    }
  }
  codes.sort(javaCompare);
  return codes;
}

// Java: Languages#getLanguageForShortCodeOrNull(String)
function getLanguageForShortCodeOrNull(langCode) {
  assureSet(langCode, 'langCode');
  let result = null;
  if (langCode.includes('-x-')) {
    // e.g. "de-DE-x-simple-language"
    for (const element of getStaticAndDynamicLanguages()) {
      if (equalsIgnoreCase(element.getShortCode(), langCode)) {
        return element;
      }
    }
  } else if (langCode.includes('-')) {
    const parts = javaSplit(langCode, '-');
    if (parts.length === 2) { // e.g. en-US
      for (const element of getStaticAndDynamicLanguages()) {
        if (equalsIgnoreCase(parts[0], element.getShortCode())
            && element.getCountries().length === 1
            && equalsIgnoreCase(parts[1], element.getCountries()[0])) {
          result = element;
          break;
        }
      }
    } else if (parts.length === 3) { // e.g. ca-ES-valencia
      for (const element of getStaticAndDynamicLanguages()) {
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
    for (const element of getStaticAndDynamicLanguages()) {
      if (langCode === 'global') {
        // for disambiguation-global.xml take any language
        result = element;
        break;
      }
      if (equalsIgnoreCase(langCode, element.getShortCode())) {
        result = element;
        /* TODO: It should return the DefaultLanguageVariant, not the first language found */
        break;
      }
    }
  }
  return result;
}

// Java: Languages#getLanguageForLanguageNameAndCountry(Locale)
function getLanguageForLanguageNameAndCountry(locale) {
  for (const language of getStaticAndDynamicLanguages()) {
    if (locale === null) throw new NullPointerException('Cannot invoke "java.util.Locale.getLanguage()" because "locale" is null');
    if (language.getShortCode() === locale.getLanguage()) {
      const countryVariants = language.getCountries();
      if (countryVariants.includes(locale.getCountry())) {
        return language;
      }
    }
  }
  return null;
}

// Java: Languages#getLanguageForLanguageNameOnly(Locale)
function getLanguageForLanguageNameOnly(locale) {
  // use default variant if available:
  for (const language of getStaticAndDynamicLanguages()) {
    if (language.getShortCode() === locale.getLanguage() && language.hasVariant()) {
      const defaultVariant = language.getDefaultLanguageVariant();
      if (defaultVariant !== null) {
        return defaultVariant;
      }
    }
  }
  // use the first match otherwise (which should be the only match):
  for (const language of getStaticAndDynamicLanguages()) {
    if (language.getShortCode() === locale.getLanguage() && !language.hasVariant()) {
      return language;
    }
  }
  return null;
}

// Java: Languages
export class Languages {
  static FQCN = 'org.languagetool.Languages';

  // Java: Languages#addLanguage(String,String,File)
  static addLanguage(name, code, dictPath) {
    let lang;
    if (dictPath === null || dictPath === undefined) {
      throw new NullPointerException('Cannot invoke "java.io.File.getName()" because "dictPath" is null');
    }
    if (dictPath.getName().endsWith(DICTIONARY_FILENAME_EXTENSION)) {
      lang = new DynamicMorfologikLanguage(name, code, dictPath);
    } else if (dictPath.getName().endsWith('.dic')) {
      lang = new DynamicHunspellLanguage(name, code, dictPath);
    } else {
      throw new RuntimeException(`Please specify a dictPath that ends in '.dict' (Morfologik binary dictionary) or '.dic' (Hunspell dictionary): ${dictPath}`);
    }
    getState().dynLanguages.push(lang);
    getState().staticAndDynamicLanguages.push(lang);
    return lang;
  }

  // Java: Languages#get()
  static get() {
    const result = [];
    for (const lang of getStaticAndDynamicLanguages()) {
      if (lang.getShortCode() !== 'xx' && lang.getShortCode() !== 'zz') { // skip demo and noop language
        result.push(lang);
      }
    }
    return Object.freeze(result);
  }

  // Java: Languages#getWithDemoLanguage() (snapshot instead of a live view)
  static getWithDemoLanguage() {
    return Object.freeze([...getStaticAndDynamicLanguages()]);
  }

  // Java: Languages#getOrAddLanguageByClassName(String)
  static getOrAddLanguageByClassName(className) {
    for (const element of getStaticAndDynamicLanguages()) {
      if (className === null || className === undefined) throw new NullPointerException('Cannot invoke "String.equals(Object)" because "className" is null');
      if (className === element.constructor.FQCN) {
        return element;
      }
    }
    try {
      const aClass = getClassBroker().forName(className);
      const language = new aClass();
      if (!(language instanceof Language)) throw new RuntimeException(`${aClass.FQCN} cannot be cast to org.languagetool.Language`);
      getState().dynLanguages.push(language);
      getState().staticAndDynamicLanguages.push(language);
      return language;
    } catch (e) {
      if (e instanceof ClassNotFoundException) {
        throw new RuntimeException(`Class '${className} could not be found in classpath`, e);
      }
      if (e instanceof JavaError) throw e;
      throw new RuntimeException(`Object for class '${className} could not be created`, e);
    }
  }

  // Java: Languages#getLanguageForName(String)
  static getLanguageForName(languageName) {
    for (const element of getStaticAndDynamicLanguages()) {
      if (languageName === null || languageName === undefined) throw new NullPointerException('Cannot invoke "String.equals(Object)" because "languageName" is null');
      if (languageName === element.getName()) {
        return element;
      }
    }
    return null;
  }

  // Java: Languages#getLanguageForShortCode(String) / (String,List)
  static getLanguageForShortCode(langCode, noopLanguageCodes = []) {
    let language = getLanguageForShortCodeOrNull(langCode);
    if (language === null) {
      // e.g. 'fr-FR' requested (happens with LibreOffice 7.4):
      language = Languages.getLongCodeToLangMapping().get(langCode);
    }
    if (language === null) {
      if (noopLanguageCodes.includes(langCode)) {
        return getState().noop;
      }
      throw new IllegalArgumentException(`'${langCode}' is not a language code known to LanguageTool.`
        + ` Supported language codes are: ${getLangCodes().join(', ')}. The list of languages is read from ${PROPERTIES_PATH}`
        + ' in the Java classpath. See https://dev.languagetool.org/java-api for details.');
    }
    return language;
  }

  // Java: Languages#isLanguageSupported(String)
  static isLanguageSupported(langCode) {
    return getLanguageForShortCodeOrNull(langCode) !== null;
  }

  // Java: Languages#getLanguageForLocale(Locale)
  static getLanguageForLocale(locale) {
    const language = getLanguageForLanguageNameAndCountry(locale);
    if (language !== null) {
      return language;
    }
    const firstFallbackLanguage = getLanguageForLanguageNameOnly(locale);
    if (firstFallbackLanguage !== null) {
      return firstFallbackLanguage;
    }
    for (const aLanguage of getState().languages) {
      if (aLanguage.getShortCodeWithCountryAndVariant() === 'en-US') {
        return aLanguage;
      }
    }
    throw new RuntimeException(`No appropriate language found, not even en-US. Supported languages: [${Languages.get().map((l) => l.toString()).join(', ')}]`);
  }

  // Java: Languages#getLongCodeToLangMapping()
  static getLongCodeToLangMapping() {
    const map = new JavaHashMap(LONG_CODE_MAP_CAPACITY);
    const languages = Languages.get();
    for (const language of languages) {
      if (language.getCountries().length > 0 && language.getCountries()[0].length !== 0) {
        map.put(`${language.getShortCode()}-${language.getCountries()[0]}`, language);
      }
    }
    return map;
  }
}

ref.Languages = Languages;

// test support (no Java counterpart): drops languages added at runtime, as a fresh JVM per case would
export function resetDynamicLanguages() {
  if (state === null) return;
  state.dynLanguages = [];
  state.staticAndDynamicLanguages = [...state.languages];
}
