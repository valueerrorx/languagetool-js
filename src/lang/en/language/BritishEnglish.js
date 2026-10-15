// Java: org.languagetool.language.BritishEnglish
import { RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { Languages } from '../../../core/Languages.js';
import { createComponent, notPortedYet } from '../../../core/language/components.js';
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { English } from './English.js';
import { ID2PRIO_ENTRIES } from './id2prioBritishEnglish.js';

const LANGUAGE_SHORT_CODE = 'en-GB';

let instantiationTrace = null; // Java: BritishEnglish#instantiationTrace

const id2prio = new JavaHashMap(); // Java: BritishEnglish#id2prio
for (const [k, v] of ID2PRIO_ENTRIES) id2prio.put(k, v);

// Java: BritishEnglish
export class BritishEnglish extends English {
  static FQCN = 'org.languagetool.language.BritishEnglish';

  // Java: BritishEnglish#BritishEnglish() / protected BritishEnglish(boolean) (fake constructor overload for subclasses)
  constructor(fakeValue) {
    super();
    if (fakeValue === undefined) {
      const trace = instantiationTrace;
      if (trace !== null) {
        throw new RuntimeException('Language was already instantiated, see the cause stacktrace below.', trace);
      }
      instantiationTrace = new Throwable();
    }
  }

  // Java: BritishEnglish#getCountries()
  getCountries() {
    return ['GB'];
  }

  // Java: BritishEnglish#getName()
  getName() {
    return 'English (GB)';
  }

  // Java: BritishEnglish#getRelevantRules(ResourceBundle,UserConfig,Language,List)
  getRelevantRules() {
    throw notPortedYet('BritishEnglish#getRelevantRules (F17)');
  }

  // Java: BritishEnglish#createDefaultSpellingRule(ResourceBundle)
  createDefaultSpellingRule(messages) {
    return createComponent('org.languagetool.rules.en.MorfologikBritishSpellerRule', messages, this, null, []);
  }

  // Java: BritishEnglish#getRelevantLanguageModelCapableRules(ResourceBundle,LanguageModel,GlobalConfig,UserConfig,Language,List)
  getRelevantLanguageModelCapableRules() {
    throw notPortedYet('BritishEnglish#getRelevantLanguageModelCapableRules (F17)');
  }

  // Java: BritishEnglish#getPriorityMap()
  getPriorityMap() {
    return id2prio;
  }

  // Java: BritishEnglish#getPriorityForId(String)
  getPriorityForId(id) {
    const prio = id2prio.get(id);
    if (prio !== null) {
      return prio;
    }
    return super.getPriorityForId(id);
  }

  // Java: BritishEnglish#getInstance()
  static getInstance() {
    const language = Objects.requireNonNull(Languages.getLanguageForShortCode(LANGUAGE_SHORT_CODE));
    if (language instanceof English) {
      return language;
    }
    throw new RuntimeException(`BritishEnglish language expected, got ${language}`);
  }
}

registerClass(BritishEnglish.FQCN, BritishEnglish);
