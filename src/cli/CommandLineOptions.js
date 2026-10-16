// Java: org.languagetool.commandline.CommandLineOptions (bean; categories kept in HashSet order, CLI-0070)
import { JLanguageTool } from '../core/JLanguageTool.js';
import { CategoryId } from '../core/rules/model/Category.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { Objects } from '../lib/java/Objects.js';

// Java: CommandLineOptions.OutputFormat
export const OutputFormat = Object.freeze({ PLAINTEXT: 'PLAINTEXT', JSON: 'JSON', XML: 'XML' });

// Java: CommandLineOptions
export class CommandLineOptions {
  static FQCN = 'org.languagetool.commandline.CommandLineOptions';
  static OutputFormat = OutputFormat;

  enabledCategories = new JavaHashMap(); // Set<CategoryId>: key -> true
  disabledCategories = new JavaHashMap();
  outputFormat = OutputFormat.PLAINTEXT;
  disabledRules = [];
  enabledRules = [];
  useEnabledOnly = false;
  level = JLanguageTool.Level.DEFAULT;

  printUsage = false;
  printVersion = false;
  verbose = false;
  lineByLine = false;
  enableTempOff = false;
  cleanOverlapping = false;
  recursive = false;
  taggerOnly = false;
  singleLineBreakMarksParagraph = false;
  listUnknown = false;
  applySuggestions = false;
  profile = false;
  bitext = false;
  autoDetect = false;
  language = null;
  motherTongue = null;
  languageModel = null;
  fasttextModel = null;
  fasttextBinary = null;
  ruleFile = null;
  remoteRulesFile = null;
  encoding = null;
  filename = null;
  xmlFiltering = false;
  printLanguages = false;
  falseFriendFile = null;
  bitextRuleFile = null;

  // Java: CommandLineOptions#isPrintUsage()
  isPrintUsage() {
    return this.printUsage;
  }

  // Java: CommandLineOptions#setPrintUsage(boolean)
  setPrintUsage(printUsage) {
    this.printUsage = printUsage;
  }

  // Java: CommandLineOptions#isPrintVersion()
  isPrintVersion() {
    return this.printVersion;
  }

  // Java: CommandLineOptions#setPrintVersion(boolean)
  setPrintVersion(printVersion) {
    this.printVersion = printVersion;
  }

  // Java: CommandLineOptions#isVerbose()
  isVerbose() {
    return this.verbose;
  }

  // Java: CommandLineOptions#setVerbose(boolean)
  setVerbose(verbose) {
    this.verbose = verbose;
  }

  // Java: CommandLineOptions#isLineByLine()
  isLineByLine() {
    return this.lineByLine;
  }

  // Java: CommandLineOptions#setLineByLine(boolean)
  setLineByLine(lineByLine) {
    this.lineByLine = lineByLine;
  }

  // Java: CommandLineOptions#isEnableTempOff()
  isEnableTempOff() {
    return this.enableTempOff;
  }

  // Java: CommandLineOptions#setEnableTempOff(boolean)
  setEnableTempOff(enableTempOff) {
    this.enableTempOff = enableTempOff;
  }

  // Java: CommandLineOptions#isCleanOverlapping()
  isCleanOverlapping() {
    return this.cleanOverlapping;
  }

  // Java: CommandLineOptions#setCleanOverlapping(boolean)
  setCleanOverlapping(cleanOverlapping) {
    this.cleanOverlapping = cleanOverlapping;
  }

  // Java: CommandLineOptions#isRecursive()
  isRecursive() {
    return this.recursive;
  }

  // Java: CommandLineOptions#setRecursive(boolean)
  setRecursive(recursive) {
    this.recursive = recursive;
  }

  // Java: CommandLineOptions#isTaggerOnly()
  isTaggerOnly() {
    return this.taggerOnly;
  }

  // Java: CommandLineOptions#setTaggerOnly(boolean)
  setTaggerOnly(taggerOnly) {
    this.taggerOnly = taggerOnly;
  }

  // Java: CommandLineOptions#isSingleLineBreakMarksParagraph()
  isSingleLineBreakMarksParagraph() {
    return this.singleLineBreakMarksParagraph;
  }

  // Java: CommandLineOptions#setSingleLineBreakMarksParagraph(boolean)
  setSingleLineBreakMarksParagraph(singleLineBreakMarksParagraph) {
    this.singleLineBreakMarksParagraph = singleLineBreakMarksParagraph;
  }

  // Java: CommandLineOptions#isListUnknown()
  isListUnknown() {
    return this.listUnknown;
  }

  // Java: CommandLineOptions#setListUnknown(boolean)
  setListUnknown(listUnknown) {
    this.listUnknown = listUnknown;
  }

  // Java: CommandLineOptions#isApplySuggestions()
  isApplySuggestions() {
    return this.applySuggestions;
  }

  // Java: CommandLineOptions#setApplySuggestions(boolean)
  setApplySuggestions(applySuggestions) {
    this.applySuggestions = applySuggestions;
  }

  // Java: CommandLineOptions#isProfile()
  isProfile() {
    return this.profile;
  }

  // Java: CommandLineOptions#setProfile(boolean)
  setProfile(profile) {
    this.profile = profile;
  }

  // Java: CommandLineOptions#isBitext()
  isBitext() {
    return this.bitext;
  }

  // Java: CommandLineOptions#setBitext(boolean)
  setBitext(bitext) {
    this.bitext = bitext;
  }

  // Java: CommandLineOptions#isAutoDetect()
  isAutoDetect() {
    return this.autoDetect;
  }

  // Java: CommandLineOptions#setAutoDetect(boolean)
  setAutoDetect(autoDetect) {
    this.autoDetect = autoDetect;
  }

  // Java: CommandLineOptions#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: CommandLineOptions#setLanguage(Object)
  setLanguage(language) {
    this.language = language;
  }

  // Java: CommandLineOptions#getMotherTongue()
  getMotherTongue() {
    return this.motherTongue;
  }

  // Java: CommandLineOptions#setMotherTongue(Object)
  setMotherTongue(motherTongue) {
    this.motherTongue = motherTongue;
  }

  // Java: CommandLineOptions#getLanguageModel()
  getLanguageModel() {
    return this.languageModel;
  }

  // Java: CommandLineOptions#setLanguageModel(Object)
  setLanguageModel(languageModel) {
    this.languageModel = languageModel;
  }

  // Java: CommandLineOptions#getFasttextModel()
  getFasttextModel() {
    return this.fasttextModel;
  }

  // Java: CommandLineOptions#setFasttextModel(Object)
  setFasttextModel(fasttextModel) {
    this.fasttextModel = fasttextModel;
  }

  // Java: CommandLineOptions#getFasttextBinary()
  getFasttextBinary() {
    return this.fasttextBinary;
  }

  // Java: CommandLineOptions#setFasttextBinary(Object)
  setFasttextBinary(fasttextBinary) {
    this.fasttextBinary = fasttextBinary;
  }

  // Java: CommandLineOptions#getRuleFile()
  getRuleFile() {
    return this.ruleFile;
  }

  // Java: CommandLineOptions#setRuleFile(Object)
  setRuleFile(ruleFile) {
    this.ruleFile = ruleFile;
  }

  // Java: CommandLineOptions#getRemoteRulesFile()
  getRemoteRulesFile() {
    return this.remoteRulesFile;
  }

  // Java: CommandLineOptions#setRemoteRulesFile(Object)
  setRemoteRulesFile(remoteRulesFile) {
    this.remoteRulesFile = remoteRulesFile;
  }

  // Java: CommandLineOptions#getEncoding()
  getEncoding() {
    return this.encoding;
  }

  // Java: CommandLineOptions#setEncoding(Object)
  setEncoding(encoding) {
    this.encoding = encoding;
  }

  // Java: CommandLineOptions#getFilename()
  getFilename() {
    return this.filename;
  }

  // Java: CommandLineOptions#setFilename(Object)
  setFilename(filename) {
    this.filename = filename;
  }

  // Java: CommandLineOptions#isXmlFiltering()
  isXmlFiltering() {
    return this.xmlFiltering;
  }

  // Java: CommandLineOptions#setXmlFiltering(boolean)
  setXmlFiltering(xmlFiltering) {
    this.xmlFiltering = xmlFiltering;
  }

  // Java: CommandLineOptions#isPrintLanguages()
  isPrintLanguages() {
    return this.printLanguages;
  }

  // Java: CommandLineOptions#setPrintLanguages(boolean)
  setPrintLanguages(printLanguages) {
    this.printLanguages = printLanguages;
  }

  // Java: CommandLineOptions#getFalseFriendFile()
  getFalseFriendFile() {
    return this.falseFriendFile;
  }

  // Java: CommandLineOptions#setFalseFriendFile(Object)
  setFalseFriendFile(falseFriendFile) {
    this.falseFriendFile = falseFriendFile;
  }

  // Java: CommandLineOptions#getBitextRuleFile()
  getBitextRuleFile() {
    return this.bitextRuleFile;
  }

  // Java: CommandLineOptions#setBitextRuleFile(Object)
  setBitextRuleFile(bitextRuleFile) {
    this.bitextRuleFile = bitextRuleFile;
  }

  // Java: CommandLineOptions#getLevel()
  getLevel() {
    return this.level;
  }

  // Java: CommandLineOptions#setLevel(Object)
  setLevel(level) {
    this.level = level;
  }

  // Java: CommandLineOptions#isJsonFormat()
  isJsonFormat() {
    return this.outputFormat === OutputFormat.JSON;
  }

  // Java: CommandLineOptions#setJsonFormat()
  setJsonFormat() {
    this.outputFormat = OutputFormat.JSON;
  }

  // Java: CommandLineOptions#getDisabledRules()
  getDisabledRules() {
    return this.disabledRules;
  }

  // Java: CommandLineOptions#setDisabledRules(List)
  setDisabledRules(disabledRules) {
    this.disabledRules = Objects.requireNonNull(disabledRules);
  }

  // Java: CommandLineOptions#getEnabledRules()
  getEnabledRules() {
    return this.enabledRules;
  }

  // Java: CommandLineOptions#setEnabledRules(List)
  setEnabledRules(enabledRules) {
    this.enabledRules = Objects.requireNonNull(enabledRules);
  }

  // Java: CommandLineOptions#setEnabledCategories(List)
  setEnabledCategories(categoryIds) {
    for (const categoryId of categoryIds) {
      this.enabledCategories.put(new CategoryId(categoryId), true);
    }
  }

  // Java: CommandLineOptions#getEnabledCategories() (unmodifiable Set, HashSet iteration order)
  getEnabledCategories() {
    return Object.freeze(this.enabledCategories.keySet());
  }

  // Java: CommandLineOptions#setDisabledCategories(List)
  setDisabledCategories(categoryIds) {
    for (const categoryId of categoryIds) {
      this.disabledCategories.put(new CategoryId(categoryId), true);
    }
  }

  // Java: CommandLineOptions#getDisabledCategories() (unmodifiable Set, HashSet iteration order)
  getDisabledCategories() {
    return Object.freeze(this.disabledCategories.keySet());
  }

  // Java: CommandLineOptions#isUseEnabledOnly()
  isUseEnabledOnly() {
    return this.useEnabledOnly;
  }

  // Java: CommandLineOptions#setUseEnabledOnly()
  setUseEnabledOnly() {
    this.useEnabledOnly = true;
  }
}
