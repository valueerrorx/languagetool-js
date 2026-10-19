// org.languagetool.rules.spelling.VagueSpellChecker (fast spell check without suggestions, used to guess the language of short texts)
import { Speller } from '../../../lib/fsa/Speller.js';
import { Dictionary } from '../../../lib/fsa/DictionaryLookup.js';
import { RuntimeException, IOException } from '../../../lib/java/errors.js';
import { JLanguageTool } from '../../JLanguageTool.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { SpellingCheckRule } from './SpellingCheckRule.js';
import { MorfologikSpellerRule } from './morfologik/MorfologikSpellerRule.js';

// Java: HashMap<Language,...> keys (Language#equals: same class and same shortCodeWithCountryAndVariant)
const langKey = (lang) => `${lang.constructor.FQCN ?? lang.constructor.name}|${lang.getShortCodeWithCountryAndVariant()}`;

const langToRule = new Map(); // Java: VagueSpellChecker#langToRule
const langToDict = new Map(); // Java: VagueSpellChecker#langToDict

// Java: VagueSpellChecker$NonThreadSafeSpellRule (private inner class)
class NonThreadSafeSpellRule extends SpellingCheckRule {
  // Java: NonThreadSafeSpellRule(ResourceBundle,Language,UserConfig)
  constructor(messages, language, userConfig) {
    super(messages, language, userConfig);
  }

  // Java: NonThreadSafeSpellRule#getId()
  getId() {
    return 'FAKE_FOR_VAGUE_SPELL_CHECKER';
  }

  // Java: NonThreadSafeSpellRule#getDescription()
  getDescription() {
    return 'internal';
  }

  // Java: NonThreadSafeSpellRule#match(AnalyzedSentence)
  match() {
    throw new RuntimeException('not implemented');
  }

  // Java: NonThreadSafeSpellRule#isMisspelled(String)
  isMisspelled(word) {
    try {
      let dict = langToDict.get(langKey(this.language)); // Dictionary itself is thread-safe, so it can be cached and re-used
      if (dict === undefined) {
        const spellingRule = getSpellingCheckRule(this.language);
        dict = Dictionary.read(getDataBroker().getFromResourceDirAsUrl(spellingRule.getFileName()));
        langToDict.set(langKey(this.language), dict);
      }
      const speller = new Speller(dict, 1);
      return !speller.isMisspelled(word);
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }
}

// Java: VagueSpellChecker#getSpellingCheckRule(Language) (private)
function getSpellingCheckRule(lang) {
  const lt = new JLanguageTool(lang);
  let spellRule = null;
  for (const r of lt.getAllActiveRules()) {
    // Java: r instanceof HunspellRule || r instanceof MorfologikSpellerRule (HunspellRule is ported in F43)
    if (r instanceof MorfologikSpellerRule || isHunspellRule(r)) {
      spellRule = r;
      // TODO: what if there's more than one spell rule?
      break;
    }
  }
  if (spellRule === null) {
    throw new RuntimeException(`No spelling rule found for language ${lang.getShortCodeWithCountryAndVariant()} - make sure to set 'preferredVariants' so a variant with a spell checker can be selected`);
  }
  return spellRule;
}

// Java: r instanceof HunspellRule (HunspellRule.FQCN is registered by F43; false while the class does not exist)
function isHunspellRule(r) {
  const H = VagueSpellChecker.hunspellRuleClass;
  return H !== null && r instanceof H;
}

// Java: VagueSpellChecker
export class VagueSpellChecker {
  static FQCN = 'org.languagetool.rules.spelling.VagueSpellChecker';
  static hunspellRuleClass = null; // set by the HunspellRule port (F43)

  // Java: VagueSpellChecker#isValidWord(String,Language)
  isValidWord(word, lang) {
    let rule = langToRule.get(langKey(lang));
    if (rule === undefined || rule === null) {
      const tempRule = getSpellingCheckRule(lang);
      if (isHunspellRule(tempRule)) {
        rule = tempRule;
      } else if (tempRule instanceof MorfologikSpellerRule) {
        rule = new NonThreadSafeSpellRule(JLanguageTool.getMessageBundle(), lang, null);
      }
      langToRule.set(langKey(lang), rule ?? null);
    }
    if (rule instanceof NonThreadSafeSpellRule) {
      // indicates a Morfologik-based speller - it's not thread-safe, so re-create Speller in isMisspelled():
      return rule.isMisspelled(word);
    } else if (isHunspellRule(rule)) {
      // it's okay to use a cached rule, as hunspell-based "isMisspelled()" is thread-safe
      return !rule.isMisspelled(word);
    }
    throw new RuntimeException(`Unknown rule type for language ${lang.getShortCodeWithCountryAndVariant()}: ${rule === null || rule === undefined ? 'null' : rule}`);
  }
}
