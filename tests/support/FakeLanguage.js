// Ported from FakeLanguage (languagetool-core test)
import { Language } from '../../src/core/Language.js';

// Java: FakeLanguage
export class FakeLanguage extends Language {
  static FQCN = 'org.languagetool.FakeLanguage';

  // Java: FakeLanguage() / FakeLanguage(String) / FakeLanguage(String,String)
  constructor(langCode = 'yy', country = 'YY') {
    super();
    this.langCode = langCode;
    this.country = country;
  }

  // Java: FakeLanguage#getPatternRules()
  getPatternRules() { return []; }

  // Java: FakeLanguage#getShortCode()
  getShortCode() { return this.langCode; }

  // Java: FakeLanguage#getName()
  getName() { return 'FakeLanguage'; }

  // Java: FakeLanguage#getCountries()
  getCountries() { return [this.country]; }

  // Java: FakeLanguage#getMaintainers()
  getMaintainers() { return null; }

  // Java: FakeLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() { return []; }
}
