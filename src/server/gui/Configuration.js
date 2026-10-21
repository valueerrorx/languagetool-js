// Java: org.languagetool.gui.Configuration (gui-commons) - the loading part used by the server (rulesFile): per language disabled/enabled rules and categories, rule values
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Languages } from '../../core/Languages.js';
import { RuleOption } from '../../core/rules/model/RuleOption.js';
import { ITSIssueType } from '../../core/rules/model/ITSIssueType.js';
import { Integer } from '../../lib/java/int.js';
import { decodeLatin1, loadProperties } from '../../lib/java/Properties.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaSplit, javaTrim, javaReplaceAll } from '../../lib/java/strings.js';
import { NumberFormatException, RuntimeException } from '../../lib/java/errors.js';

const CURRENT_PROFILE_KEY = 'currentProfile';
const DEFINED_PROFILES_KEY = 'definedProfiles';
const DISABLED_RULES_KEY = 'disabledRules';
const ENABLED_RULES_KEY = 'enabledRules';
const DISABLED_CATEGORIES_KEY = 'disabledCategories';
const ENABLED_CATEGORIES_KEY = 'enabledCategories';
const ENABLED_RULES_ONLY_KEY = 'enabledRulesOnly';
const LANGUAGE_KEY = 'language';
const MOTHER_TONGUE_KEY = 'motherTongue';
const FIXED_LANGUAGE_KEY = 'fixedLanguage';
const NO_DEFAULT_CHECK_KEY = 'noDefaultCheck';
const PARA_CHECK_KEY = 'numberParagraphs';
const USE_DOC_LANG_KEY = 'useDocumentLanguage';
const FONT_STYLE_KEY = 'font.style';
const FONT_SIZE_KEY = 'font.size';
const SERVER_PORT_KEY = 'serverPort';
const CONFIGURABLE_RULE_VALUES_KEY = 'configurableRuleValues';
const ERROR_COLORS_KEY = 'errorColors';
const UNDERLINE_COLORS_KEY = 'underlineColors';
const UNDERLINE_RULE_COLORS_KEY = 'underlineRuleColors';
const UNDERLINE_TYPES_KEY = 'underlineTypes';
const UNDERLINE_RULE_TYPES_KEY = 'underlineRuleTypes';
const LT_VERSION_KEY = 'ltVersion';
const DELIMITER = ',';
const BLANK = '[ \t]';
const BLANK_REPLACE = '_';
const PROFILE_DELIMITER = '__';
const DEFAULT_SERVER_PORT = 8081;
const DEFAULT_NUM_CHECK_PARAS = 5;
const COLOR_SPLITTER_REGEXP = Pattern.compile('(?<=:#[0-9A-Fa-f]{6}),\\s*');
const COLOR_SPLITTER_REGEXP_COLON = Pattern.compile(':(?=#[0-9A-Fa-f]{6})');
const CONFIGURABLE_RULE_SPLITTER_REGEXP = Pattern.compile('(?<=[0-9]),\\s*');

// Java: String#split(Pattern-string) for the lookbehind splitters
const splitBy = (s, pattern) => javaSplit(s, pattern.pattern());

export class Configuration {
  static FQCN = 'org.languagetool.gui.Configuration';

  // Java: Configuration#Configuration(File,String,Language): loads baseDir/filename for the language (missing file: nothing configured)
  constructor(baseDir, filename, lang) {
    this.lang = lang;
    this.configFile = path.join(baseDir, filename);
    this.disabledRuleIds = new Set();
    this.enabledRuleIds = new Set();
    this.disabledCategoryNames = new Set();
    this.enabledCategoryNames = new Set();
    this.definedProfiles = [];
    this.configurableRuleValues = new Map();
    this.enabledRulesOnly = false;
    this.serverPort = DEFAULT_SERVER_PORT;
    this.numParasToCheck = DEFAULT_NUM_CHECK_PARAS;
    this.useDocLanguage = true;
    this.currentProfile = null;
    this.ltVersion = null;
    this.fixedLanguage = null;
    this.motherTongue = null;
    this.loadConfiguration();
  }

  // Java: Configuration#getQualifier(Language)
  getQualifier(lang) {
    let qualifier = '';
    if (lang !== null && lang !== undefined) {
      qualifier = `.${lang.getShortCodeWithCountryAndVariant()}`;
    }
    return qualifier;
  }

  // Java: Configuration#loadConfiguration()
  loadConfiguration() {
    const qualifier = this.getQualifier(this.lang);
    let buf;
    try {
      buf = readFileSync(this.configFile);
    } catch {
      return; // file not found: okay, leave disabledRuleIds empty
    }
    const props = loadProperties(decodeLatin1(buf));
    const curProfileStr = props.get(CURRENT_PROFILE_KEY);
    if (curProfileStr !== undefined) {
      this.currentProfile = curProfileStr;
    }
    this.definedProfiles.push(...this.getListFromProperties(props, DEFINED_PROFILES_KEY));
    this.ltVersion = props.has(LT_VERSION_KEY) ? props.get(LT_VERSION_KEY) : null;
    if (this.ltVersion !== null) {
      const motherTongueStr = props.get(MOTHER_TONGUE_KEY);
      if (motherTongueStr !== undefined && motherTongueStr !== 'xx') {
        this.motherTongue = Languages.getLanguageForShortCode(motherTongueStr);
      }
    }
    let prefix = this.currentProfile === null ? '' : this.currentProfile;
    if (prefix !== '') {
      prefix = javaReplaceAll(prefix, BLANK, BLANK_REPLACE);
      prefix += PROFILE_DELIMITER;
    }
    this.loadCurrentProfile(props, prefix, qualifier);
  }

  // Java: Configuration#loadCurrentProfile(Properties,String,String); GUI-only settings are not read
  loadCurrentProfile(props, prefix, qualifierIn) {
    let qualifier = qualifierIn;
    const useDocLangString = props.get(prefix + USE_DOC_LANG_KEY);
    if (useDocLangString !== undefined) {
      this.useDocLanguage = useDocLangString.toLowerCase() === 'true';
    }
    if (this.ltVersion === null) {
      const motherTongueStr = props.get(prefix + MOTHER_TONGUE_KEY);
      if (motherTongueStr !== undefined && motherTongueStr !== 'xx') {
        this.motherTongue = Languages.getLanguageForShortCode(motherTongueStr); // isOffice is false for the server
      }
    } else {
      const fixedLanguageStr = props.get(prefix + FIXED_LANGUAGE_KEY);
      if (fixedLanguageStr !== undefined) {
        this.fixedLanguage = Languages.getLanguageForShortCode(fixedLanguageStr);
      }
    }
    if (!this.useDocLanguage && this.fixedLanguage !== null) {
      qualifier = this.getQualifier(this.fixedLanguage);
    }
    for (const x of this.getListFromProperties(props, prefix + DISABLED_RULES_KEY + qualifier)) this.disabledRuleIds.add(x);
    for (const x of this.getListFromProperties(props, prefix + ENABLED_RULES_KEY + qualifier)) this.enabledRuleIds.add(x);
    for (const x of this.getListFromProperties(props, prefix + DISABLED_CATEGORIES_KEY + qualifier)) this.disabledCategoryNames.add(x);
    for (const x of this.getListFromProperties(props, prefix + ENABLED_CATEGORIES_KEY + qualifier)) this.enabledCategoryNames.add(x);
    this.enabledRulesOnly = props.get(prefix + ENABLED_RULES_ONLY_KEY) === 'true';
    const languageStr = props.get(prefix + LANGUAGE_KEY);
    if (languageStr !== undefined) {
      this.language = Languages.getLanguageForShortCode(languageStr);
    }
    for (const key of [FONT_STYLE_KEY, FONT_SIZE_KEY]) {
      if (props.get(prefix + key) !== undefined) {
        try {
          Integer.parseInt(props.get(prefix + key));
        } catch (e) {
          if (!(e instanceof NumberFormatException)) throw e; // Ignore
        }
      }
    }
    const serverPortString = props.get(prefix + SERVER_PORT_KEY);
    if (serverPortString !== undefined) {
      this.serverPort = Integer.parseInt(serverPortString);
    }
    let paraCheckString = props.get(prefix + NO_DEFAULT_CHECK_KEY);
    if (paraCheckString !== undefined && paraCheckString.toLowerCase() === 'true') {
      paraCheckString = props.get(prefix + PARA_CHECK_KEY);
      if (paraCheckString !== undefined) {
        this.numParasToCheck = Integer.parseInt(paraCheckString);
      }
    }
    let rulesValuesString = props.get(prefix + CONFIGURABLE_RULE_VALUES_KEY + qualifier);
    if (rulesValuesString === undefined) {
      rulesValuesString = props.get(prefix + CONFIGURABLE_RULE_VALUES_KEY);
    }
    this.parseConfigurableRuleValues(rulesValuesString);
    this.parseColors(props.get(prefix + ERROR_COLORS_KEY), true);
    this.parseColors(props.get(prefix + UNDERLINE_COLORS_KEY), false);
    this.parseColors(props.get(prefix + UNDERLINE_RULE_COLORS_KEY), false);
    this.parseUnderlineTypes(props.get(prefix + UNDERLINE_TYPES_KEY));
    this.parseUnderlineTypes(props.get(prefix + UNDERLINE_RULE_TYPES_KEY));
  }

  // Java: Configuration#parseErrorColors(String) / #parseUnderlineColors(String,Map)
  parseColors(colorsString, issueTypes) {
    if (colorsString !== undefined && colorsString !== null && colorsString !== '') {
      for (const typeToColor of splitBy(colorsString, COLOR_SPLITTER_REGEXP)) {
        const typeAndColor = splitBy(typeToColor, COLOR_SPLITTER_REGEXP_COLON);
        if (typeAndColor.length !== 2) {
          throw new RuntimeException(`Could not parse type and color, colon expected: '${typeToColor}'`);
        }
        if (issueTypes) ITSIssueType.getIssueType(typeAndColor[0]);
        Integer.decode(typeAndColor[1]); // Color.decode(String)
      }
    }
  }

  // Java: Configuration#parseUnderlineTypes(String,Map)
  parseUnderlineTypes(typesString) {
    if (typesString !== undefined && typesString !== null && typesString !== '') {
      for (const categoryToType of splitBy(typesString, CONFIGURABLE_RULE_SPLITTER_REGEXP)) {
        const categoryAndType = javaSplit(categoryToType, ':');
        if (categoryAndType.length !== 2) {
          throw new RuntimeException(`Could not parse category and type, colon expected: '${categoryToType}'`);
        }
        const v = Integer.parseInt(categoryAndType[1]); // Short.parseShort: range -32768..32767
        if (v < -32768 || v > 32767) throw new NumberFormatException(`Value out of range. Value:"${categoryAndType[1]}" Radix:10`);
      }
    }
  }

  // Java: Configuration#parseConfigurableRuleValues(String)
  parseConfigurableRuleValues(rulesValueString) {
    if (rulesValueString !== undefined && rulesValueString !== null && rulesValueString !== '') {
      for (let ruleToValue of javaSplit(rulesValueString, ',')) {
        ruleToValue = javaTrim(ruleToValue);
        if (ruleToValue !== '') {
          const ruleAndValue = javaSplit(ruleToValue, ':');
          if (ruleAndValue.length !== 2) {
            throw new RuntimeException(`Could not parse rule and value, colon expected: '${ruleToValue}'`);
          }
          const objects = RuleOption.stringToObjects(ruleAndValue[1]);
          this.configurableRuleValues.set(javaTrim(ruleAndValue[0]), objects);
        }
      }
    }
  }

  // Java: Configuration#getListFromProperties(Properties,String)
  getListFromProperties(props, key) {
    const value = props.get(key);
    const list = [];
    if (value !== undefined && value !== '') {
      list.push(...javaSplit(value, DELIMITER));
    }
    return list;
  }

  // Java: Configuration#getDisabledRuleIds()
  getDisabledRuleIds() {
    return this.disabledRuleIds;
  }

  // Java: Configuration#getEnabledRuleIds()
  getEnabledRuleIds() {
    return this.enabledRuleIds;
  }

  // Java: Configuration#getDisabledCategoryNames()
  getDisabledCategoryNames() {
    return this.disabledCategoryNames;
  }

  // Java: Configuration#getEnabledRulesOnly()
  getEnabledRulesOnly() {
    return this.enabledRulesOnly;
  }

  // Java: Configuration#getConfigurableValues()
  getConfigurableValues() {
    return this.configurableRuleValues;
  }
}
