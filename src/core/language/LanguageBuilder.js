// Java: org.languagetool.language.LanguageBuilder (languages defined by an external rules-xx-language.xml file)
import { ArrayIndexOutOfBoundsException } from '../../lib/java/errors.js';
import { Locale } from '../../lib/java/Locale.js';
import { Objects } from '../../lib/java/Objects.js';
import { javaReplace, javaSplit } from '../../lib/java/strings.js';
import { Language } from '../Language.js';
import { Languages } from '../Languages.js';
import { RuleFilenameException } from './RuleFilenameException.js';

// Java: LanguageBuilder$1 (anonymous Language for a language unknown to the registry)
class AdditionalLanguage extends Language {
  static FQCN = 'org.languagetool.language.LanguageBuilder$1';

  // Java: captured variables parts, file, isAdditional
  constructor(parts, file, isAdditional) {
    super();
    this.parts = parts;
    this.file = file;
    this.isAdditional = isAdditional;
  }

  // Java: LanguageBuilder$1#getLocale()
  getLocale() {
    return new Locale(this.getShortCode());
  }

  // Java: LanguageBuilder$1#getMaintainers()
  getMaintainers() {
    return null;
  }

  // Java: LanguageBuilder$1#getShortCode()
  getShortCode() {
    if (this.parts[1].length === 2) {
      return this.parts[1];
    }
    const split = javaSplit(this.parts[1], '_');
    if (split.length < 1) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
    return split[0]; // en as in en_US
  }

  // Java: LanguageBuilder$1#getCountries()
  getCountries() {
    if (this.parts[1].length === 2) {
      return [''];
    }
    const split = javaSplit(this.parts[1], '_');
    if (split.length < 2) throw new ArrayIndexOutOfBoundsException(`Index 1 out of bounds for length ${split.length}`);
    return [split[1]]; // US as in en_US
  }

  // Java: LanguageBuilder$1#getName()
  getName() {
    return javaReplace(this.parts[2], '.xml', '');
  }

  // Java: LanguageBuilder$1#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    return [];
  }

  // Java: LanguageBuilder$1#getRuleFileNames()
  getRuleFileNames() {
    const ruleFiles = [];
    ruleFiles.push(this.file.getAbsolutePath());
    return ruleFiles;
  }

  // Java: LanguageBuilder$1#isExternal()
  isExternal() {
    return this.isAdditional;
  }
}

// Java: LanguageBuilder.ExtendedLanguage
class ExtendedLanguage extends Language {
  static FQCN = 'org.languagetool.language.LanguageBuilder$ExtendedLanguage';

  // Java: ExtendedLanguage#ExtendedLanguage(Language,String,File)
  constructor(baseLanguage, name, ruleFile) {
    super();
    this.baseLanguage = baseLanguage;
    this.name = name;
    this.ruleFile = ruleFile;
  }

  // Java: ExtendedLanguage#getName()
  getName() {
    return this.name;
  }

  // Java: ExtendedLanguage#getRuleFileNames()
  getRuleFileNames() {
    const ruleFiles = [];
    ruleFiles.push(...this.baseLanguage.getRuleFileNames());
    ruleFiles.push(this.ruleFile.getAbsolutePath());
    return ruleFiles;
  }

  // Java: ExtendedLanguage#isExternal()
  isExternal() {
    return true;
  }

  // Java: ExtendedLanguage#getLocale()
  getLocale() {
    return this.baseLanguage.getLocale();
  }

  // Java: ExtendedLanguage#getMaintainers()
  getMaintainers() {
    return this.baseLanguage.getMaintainers();
  }

  // Java: ExtendedLanguage#getShortCode()
  getShortCode() {
    return this.baseLanguage.getShortCode();
  }

  // Java: ExtendedLanguage#getCountries()
  getCountries() {
    return this.baseLanguage.getCountries();
  }

  // Java: ExtendedLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules(messages, userConfig, motherTongue, altLanguages) {
    return this.baseLanguage.getRelevantRules(messages, null, motherTongue, altLanguages);
  }

  // Java: ExtendedLanguage#getVariant()
  getVariant() {
    return this.baseLanguage.getVariant();
  }

  // Java: ExtendedLanguage#getDefaultEnabledRulesForVariant()
  getDefaultEnabledRulesForVariant() {
    return this.baseLanguage.getDefaultEnabledRulesForVariant();
  }

  // Java: ExtendedLanguage#getDefaultDisabledRulesForVariant()
  getDefaultDisabledRulesForVariant() {
    return this.baseLanguage.getDefaultDisabledRulesForVariant();
  }

  // Java: ExtendedLanguage#getLanguageModel(File)
  getLanguageModel(indexDir) {
    return this.baseLanguage.getLanguageModel(indexDir);
  }

  // Java: ExtendedLanguage#getRelevantLanguageModelRules(ResourceBundle,LanguageModel,UserConfig)
  getRelevantLanguageModelRules(messages, languageModel, userConfig) {
    return this.baseLanguage.getRelevantLanguageModelRules(messages, languageModel, userConfig);
  }

  // Java: ExtendedLanguage#getLocaleWithCountryAndVariant()
  getLocaleWithCountryAndVariant() {
    return this.baseLanguage.getLocaleWithCountryAndVariant();
  }

  // Java: ExtendedLanguage#getDefaultLanguageVariant()
  getDefaultLanguageVariant() {
    return this.baseLanguage.getDefaultLanguageVariant();
  }

  // Java: ExtendedLanguage#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return this.baseLanguage.createDefaultDisambiguator();
  }

  // Java: ExtendedLanguage#createDefaultTagger()
  createDefaultTagger() {
    return this.baseLanguage.createDefaultTagger();
  }

  // Java: ExtendedLanguage#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return this.baseLanguage.createDefaultSentenceTokenizer();
  }

  // Java: ExtendedLanguage#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return this.baseLanguage.createDefaultWordTokenizer();
  }

  // Java: ExtendedLanguage#createDefaultChunker()
  createDefaultChunker() {
    return this.baseLanguage.createDefaultChunker();
  }

  // Java: ExtendedLanguage#createDefaultPostDisambiguationChunker()
  createDefaultPostDisambiguationChunker() {
    return this.baseLanguage.createDefaultPostDisambiguationChunker();
  }

  // Java: ExtendedLanguage#createDefaultSynthesizer()
  createDefaultSynthesizer() {
    return this.baseLanguage.createDefaultSynthesizer();
  }
}

// Java: LanguageBuilder
export class LanguageBuilder {
  static FQCN = 'org.languagetool.language.LanguageBuilder';

  // Java: LanguageBuilder#makeAdditionalLanguage(File)
  static makeAdditionalLanguage(file) {
    return makeLanguage(file, true);
  }
}

// Java: LanguageBuilder#makeLanguage(File,boolean)
function makeLanguage(file, isAdditional) {
  Objects.requireNonNull(file, 'file cannot be null');
  if (!file.getName().endsWith('.xml')) {
    throw new RuleFilenameException(file);
  }
  const parts = javaSplit(file.getName(), '-');
  const startsWithRules = parts[0] === 'rules';
  const secondPartHasCorrectLength = parts.length === 3
    && (parts[1].length === 'en'.length || parts[1].length === 'ast'.length || parts[1].length === 'en_US'.length);
  if (!startsWithRules || !secondPartHasCorrectLength) {
    throw new RuleFilenameException(file);
  }
  // TODO (Java): when the XML file is mergeable with other rules, subclass the existing language

  let newLanguage;
  if (Languages.isLanguageSupported(parts[1])) {
    // Java: Class#newInstance() on the class of the registered language (may throw "already instantiated")
    const baseLanguage = new (Languages.getLanguageForShortCode(parts[1]).constructor)();
    newLanguage = new ExtendedLanguage(baseLanguage, javaReplace(parts[2], '.xml', ''), file);
  } else {
    newLanguage = new AdditionalLanguage(parts, file, isAdditional);
  }
  return newLanguage;
}
