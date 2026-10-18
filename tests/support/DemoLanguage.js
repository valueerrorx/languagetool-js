// Stand-in for org.languagetool.language.Demo (short code xx); rule files from tests/resources/rules/xx; no-op disambiguator (DemoDisambiguator2 needs XmlRuleDisambiguator, F32).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi, beforeAll, afterAll } from 'vitest';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { ResourceUrl } from '../../src/core/resources/ResourceDataBroker.js';
import { registerClass } from '../../src/core/resources/ClassBroker.js';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { RuleFilter } from '../../src/core/patterns/RuleFilter.js';
import { notPortedYet } from '../../src/core/language/components.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { Language } from '../../src/core/Language.js';
import { sharedComponent } from '../../src/core/language/components.js';
import { ChunkTag } from '../../src/core/chunking/ChunkTag.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';

export const XX_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../resources/rules/xx');

// Java: org.languagetool.chunking.xx.DemoChunker (assigns chunk B-NP-singular to the word chunkbar)
export class DemoChunker {
  static FQCN = 'org.languagetool.chunking.xx.DemoChunker';

  // Java: DemoChunker#addChunkTags(List)
  addChunkTags(tokenReadings) {
    for (const tokenReading of tokenReadings) {
      if (tokenReading.getToken() === 'chunkbar') {
        tokenReading.setChunkTags([new ChunkTag('B-NP-singular')]);
      }
    }
  }
}

// Java: Demo
export class DemoLanguage extends Language {
  static FQCN = 'org.languagetool.language.Demo';
  static SHORT_CODE = 'xx';

  // Java: Demo#getLocale()
  getLocale() { return new Locale('en'); }

  // Java: Demo#createDefaultDisambiguator()
  createDefaultDisambiguator() { return new NoopDisambiguator(); }

  // Java: Demo#getName()
  getName() { return 'Testlanguage'; }

  // Java: Demo#getShortCode()
  getShortCode() { return DemoLanguage.SHORT_CODE; }

  // Java: Demo#getCountries()
  getCountries() { return ['XX']; }

  // Java: Demo#createDefaultTagger()
  createDefaultTagger() { return sharedComponent('org.languagetool.tagging.xx.DemoTagger'); }

  // Java: Demo#createDefaultChunker()
  createDefaultChunker() { return new DemoChunker(); }

  // Java: Demo#getMaintainers()
  getMaintainers() { return null; }

  // Java: Demo#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() { return []; }
}

export const getDemoLanguage = () => new DemoLanguage();

// Java: DemoPatternRuleTest.DemoWithGrammarFile
export class DemoWithGrammarFile extends DemoLanguage {
  // Java: DemoWithGrammarFile(String)
  constructor(filename) {
    super();
    this.filename = filename;
  }

  // Java: DemoWithGrammarFile#getRuleFileNames()
  getRuleFileNames() {
    return [`/org/languagetool/rules/xx/${this.filename}`];
  }
}

// Java: org.languagetool.rules.DemoPartialPosTagFilter (core test class; PartialPosTagFilter not ported yet, so it only loads)
class DemoPartialPosTagFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.DemoPartialPosTagFilter';

  // Java: DemoPartialPosTagFilter (PartialPosTagFilter#acceptRuleMatch)
  acceptRuleMatch() {
    throw notPortedYet('PartialPosTagFilter#acceptRuleMatch');
  }
}

const XX_PREFIX = '/org/languagetool/rules/xx/';

// makes the Java test resources /org/languagetool/rules/xx/* (copied to tests/resources/rules/xx) visible through the data broker
export function useXxTestResources() {
  let spy;
  let urlSpy;
  beforeAll(() => {
    registerClass(DemoPartialPosTagFilter.FQCN, DemoPartialPosTagFilter);
    registerClass(DemoLanguage.FQCN, DemoLanguage); // Java: Demo is listed in the test classpath's language-module.properties
    Languages.getOrAddLanguageByClassName(DemoLanguage.FQCN);
    const broker = getDataBroker();
    const orig = broker.getAsStream.bind(broker);
    const origUrl = broker.getAsURL.bind(broker);
    const xxFile = (p) => path.join(XX_DIR, p.substring(XX_PREFIX.length));
    spy = vi.spyOn(broker, 'getAsStream').mockImplementation((p) => {
      if (!p.startsWith(XX_PREFIX)) return orig(p);
      return existsSync(xxFile(p)) ? readFileSync(xxFile(p)) : null;
    });
    urlSpy = vi.spyOn(broker, 'getAsURL').mockImplementation((p) => {
      if (!p.startsWith(XX_PREFIX)) return origUrl(p);
      return existsSync(xxFile(p)) ? new ResourceUrl(xxFile(p)) : null;
    });
  });
  afterAll(() => {
    spy.mockRestore();
    urlSpy.mockRestore();
    resetDynamicLanguages();
  });
}
