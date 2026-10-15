// Java: org.languagetool.noop.NoopLanguage
import { Locale } from '../../lib/java/Locale.js';
import { Language } from '../Language.js';
import { sharedComponent } from '../language/components.js';
import { NoopChunker } from './NoopChunker.js';
import { NoopDisambiguator } from './NoopDisambiguator.js';

// Java: NoopLanguage#createDefaultSentenceTokenizer() anonymous SentenceTokenizer
class NoopSentenceTokenizer {
  static FQCN = 'org.languagetool.noop.NoopLanguage$1';

  // Java: NoopLanguage$1#tokenize(String)
  tokenize(text) {
    return [text];
  }

  // Java: NoopLanguage$1#setSingleLineBreaksMarksParagraph(boolean)
  setSingleLineBreaksMarksParagraph() {
  }

  // Java: NoopLanguage$1#singleLineBreaksMarksPara()
  singleLineBreaksMarksPara() {
    return false;
  }
}

// Java: NoopLanguage#createDefaultWordTokenizer() lambda Tokenizer
class NoopWordTokenizer {
  static FQCN = 'org.languagetool.noop.NoopLanguage$$Lambda';

  // Java: lambda text -> new ArrayList<>() (result must be modifiable)
  tokenize() {
    return [];
  }
}

// Java: NoopLanguage
export class NoopLanguage extends Language {
  static FQCN = 'org.languagetool.noop.NoopLanguage';
  static SHORT_CODE = 'zz';

  // Java: NoopLanguage#getLocale()
  getLocale() {
    return new Locale('en');
  }

  // Java: NoopLanguage#createDefaultDisambiguator()
  createDefaultDisambiguator() {
    return new NoopDisambiguator();
  }

  // Java: NoopLanguage#getName()
  getName() {
    return 'NoopLanguage';
  }

  // Java: NoopLanguage#getShortCode()
  getShortCode() {
    return NoopLanguage.SHORT_CODE;
  }

  // Java: NoopLanguage#getCountries()
  getCountries() {
    return [];
  }

  // Java: NoopLanguage#createDefaultTagger()
  createDefaultTagger() {
    return sharedComponent('org.languagetool.tagging.xx.DemoTagger');
  }

  // Java: NoopLanguage#createDefaultChunker()
  createDefaultChunker() {
    return new NoopChunker();
  }

  // Java: NoopLanguage#getMaintainers()
  getMaintainers() {
    return null;
  }

  // Java: NoopLanguage#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    return [];
  }

  // Java: NoopLanguage#getPatternRules()
  getPatternRules() {
    return [];
  }

  // Java: NoopLanguage#createDefaultSentenceTokenizer()
  createDefaultSentenceTokenizer() {
    return new NoopSentenceTokenizer();
  }

  // Java: NoopLanguage#createDefaultWordTokenizer()
  createDefaultWordTokenizer() {
    return new NoopWordTokenizer();
  }
}
