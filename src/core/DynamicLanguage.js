// Java: org.languagetool.DynamicLanguage, DynamicHunspellLanguage, DynamicMorfologikLanguage (languages added at runtime for spell checking only)
import { File } from '../lib/java/io/File.js';
import { Objects } from '../lib/java/Objects.js';
import { Pattern } from '../lib/java/regex/index.js';
import { Language } from './Language.js';
import { notPortedYet } from './language/components.js';

const DASH = Pattern.compile('-.*');

// Java: DynamicLanguage (abstract)
export class DynamicLanguage extends Language {
  static FQCN = 'org.languagetool.DynamicLanguage';

  // Java: DynamicLanguage#DynamicLanguage(String,String,File)
  constructor(name, code, dictPath) {
    super();
    this.name = Objects.requireNonNull(name);
    this.code = Objects.requireNonNull(code);
    this.dictPath = Objects.requireNonNull(dictPath);
  }

  // Java: DynamicLanguage#getShortCode()
  getShortCode() {
    return DASH.matcher(this.code).replaceFirst('');
  }

  // Java: DynamicLanguage#getName()
  getName() {
    return this.name;
  }

  // Java: DynamicLanguage#getRuleFileNames()
  getRuleFileNames() {
    return [];
  }

  // Java: DynamicLanguage#getPatternRules()
  getPatternRules() {
    return [];
  }

  // Java: DynamicLanguage#getCommonWordsPath()
  getCommonWordsPath() {
    return new File(this.dictPath.getParentFile(), 'common_words.txt').getAbsolutePath();
  }

  // Java: DynamicLanguage#getCountries()
  getCountries() {
    return [];
  }

  // Java: DynamicLanguage#getMaintainers()
  getMaintainers() {
    return [];
  }

  // Java: DynamicLanguage#isSpellcheckOnlyLanguage()
  isSpellcheckOnlyLanguage() {
    return true;
  }
}

// Java: DynamicHunspellLanguage
export class DynamicHunspellLanguage extends DynamicLanguage {
  static FQCN = 'org.languagetool.DynamicHunspellLanguage';

  // Java: DynamicHunspellLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('DynamicHunspellLanguage#getRelevantRules (HunspellRule, F43)');
  }
}

// Java: DynamicMorfologikLanguage
export class DynamicMorfologikLanguage extends DynamicLanguage {
  static FQCN = 'org.languagetool.DynamicMorfologikLanguage';

  // Java: DynamicMorfologikLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('DynamicMorfologikLanguage#getRelevantRules (MorfologikSpellerRule, F41)');
  }
}
