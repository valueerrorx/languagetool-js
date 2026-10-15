// Java: org.languagetool.tokenizers.SimpleSentenceTokenizer
import { Language } from '../../Language.js';
import { registerComponent } from '../../language/components.js';
import { SRXSentenceTokenizer } from './SRXSentenceTokenizer.js';

// Java: SimpleSentenceTokenizer$AnyLanguage
class AnyLanguage extends Language {
  static FQCN = 'org.languagetool.tokenizers.SimpleSentenceTokenizer$AnyLanguage';

  // Java: AnyLanguage#getShortCode()
  getShortCode() {
    return 'xx';
  }

  // Java: AnyLanguage#getName()
  getName() {
    return 'FakeLanguage';
  }

  // Java: AnyLanguage#getCountries()
  getCountries() {
    return [];
  }

  // Java: AnyLanguage#getMaintainers()
  getMaintainers() {
    return [];
  }

  // Java: AnyLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    return [];
  }
}

export class SimpleSentenceTokenizer extends SRXSentenceTokenizer {
  static FQCN = 'org.languagetool.tokenizers.SimpleSentenceTokenizer';

  // Java: SimpleSentenceTokenizer#SimpleSentenceTokenizer()
  constructor() {
    super(new AnyLanguage(), '/org/languagetool/tokenizers/segment-simple.srx');
  }
}

registerComponent(SimpleSentenceTokenizer.FQCN, () => new SimpleSentenceTokenizer());
