// Stand-in for org.languagetool.language.Demo (short code xx); rule files from tests/resources/rules/xx; no-op disambiguator/chunker (DemoDisambiguator2/DemoChunker not ported).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi, beforeAll, afterAll } from 'vitest';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { registerClass } from '../../src/core/resources/ClassBroker.js';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { RuleFilter } from '../../src/core/patterns/RuleFilter.js';
import { notPortedYet } from '../../src/core/language/components.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { Language } from '../../src/core/Language.js';
import { sharedComponent } from '../../src/core/language/components.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';

export const XX_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../resources/rules/xx');

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
  createDefaultChunker() { return new NoopChunker(); }

  // Java: Demo#getMaintainers()
  getMaintainers() { return null; }

  // Java: Demo#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() { return []; }
}

export const getDemoLanguage = () => new DemoLanguage();

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
  beforeAll(() => {
    registerClass(DemoPartialPosTagFilter.FQCN, DemoPartialPosTagFilter);
    registerClass(DemoLanguage.FQCN, DemoLanguage); // Java: Demo is listed in the test classpath's language-module.properties
    Languages.getOrAddLanguageByClassName(DemoLanguage.FQCN);
    const broker = getDataBroker();
    const orig = broker.getAsStream.bind(broker);
    spy = vi.spyOn(broker, 'getAsStream').mockImplementation((p) => (p.startsWith(XX_PREFIX)
      ? readFileSync(path.join(XX_DIR, p.substring(XX_PREFIX.length))) : orig(p)));
  });
  afterAll(() => {
    spy.mockRestore();
    resetDynamicLanguages();
  });
}
