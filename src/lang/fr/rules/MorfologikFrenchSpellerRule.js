// org.languagetool.rules.fr.MorfologikFrenchSpellerRule
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { removeDiacritics, splitCamelCase, splitDigitsAtEnd } from '../../../core/text/StringTools.js';
import { registerComponent } from '../../../core/language/components.js';
import { FrenchTagger } from '../tagging/FrenchTagger.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaSplit, toLowerCase } from '../../../lib/java/strings.js';

const SPELLING_FILE = '/fr/hunspell/spelling.txt';

const flags = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
const TOKEN_AT_START = ['non', 'en', 'a', 'le', 'la', 'les', 'pour', 'de',
  'du', 'des', 'un', 'une', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'leur', 'leurs', 'ce', 'cet'];
const PREFIX_WITH_WHITESPACE = ['agro', 'anti', 'archi', 'auto', 'aéro',
  'cardio', 'co', 'cyber', 'demi', 'ex', 'extra', 'géo', 'hospitalo', 'hydro', 'hyper', 'hypo', 'infra', 'inter',
  'macro', 'mega', 'meta', 'mi', 'micro', 'mini', 'mono', 'multi', 'musculo', 'méga', 'méta', 'néo', 'omni', 'pan',
  'para', 'pluri', 'poly', 'post', 'prim', 'pro', 'proto', 'pré', 'pseudo', 'psycho', 'péri', 're', 'retro', 'ré',
  'semi', 'simili', 'socio', 'super', 'supra', 'sus', 'trans', 'tri', 'télé', 'ultra', 'uni', 'vice', 'éco'];
// grand, haut, nord, sud, sous, sur l|d|s|t
const exceptionsEgrave = ['burkinabè', 'koinè', 'épistémè'];
const APOSTROF_INICI_VERBS = Pattern.compile("^([lnts])(h?[aeiouàéèíòóú].*[^è])$", flags);
const APOSTROF_INICI_VERBS_M = Pattern.compile("^(m)(h?[aeiouàéèíòóú].*[^è])$", flags);
const APOSTROF_INICI_VERBS_C = Pattern.compile("^(c)([eiéèê].*)$", flags);
const APOSTROF_INICI_NOM_SING = Pattern.compile("^([ld])(h?[aeiouàéèíòóú]...+)$", flags);
const APOSTROF_INICI_NOM_PLURAL = Pattern.compile("^(d)(h?[aeiouàéèíòóú].+)$", flags);
const APOSTROF_INICI_VERBS_INF = Pattern.compile("^([lntsmd]|nous|vous)(h?[aeiouàéèíòóú].*[^è])$", flags);
const HYPHEN_ON = Pattern.compile("^([\\p{L}]+[^aeiou])[’']?(il|elle|ce|on)$", flags);
const HYPHEN_JE = Pattern.compile("^([\\p{L}]+[^e])[’']?(je)$", flags);
const HYPHEN_TU = Pattern.compile("^([\\p{L}]+)[’']?(tu)$", flags);
const HYPHEN_NOUS = Pattern.compile("^([\\p{L}]+)[’']?(nous)$", flags);
const HYPHEN_VOUS = Pattern.compile("^([\\p{L}]+)[’']?(vous)$", flags);
const HYPHEN_ILS = Pattern.compile("^([\\p{L}]+)[’']?(ils|elles)$", flags);
const VERB_INDSUBJ = Pattern.compile("V .*(ind|sub).*");
const VERB_IMP = Pattern.compile("V.* imp .*");
const VERB_INF = Pattern.compile("V.* inf");
const VERB_INDSUBJ_M = Pattern.compile("V .* [123] s|V .* [23] p");
const VERB_INDSUBJ_C = Pattern.compile("V .* 3 s");
const NOM_SING = Pattern.compile("[NJZ] .* (s|sp)|V .inf|V .*ppa.* s");
const NOM_PLURAL = Pattern.compile("[NJZ] .* (p|sp)|V .*ppa.* p");
const ANY_TAG = Pattern.compile("[NAZJPD].*");
const VERB_1S = Pattern.compile("V .*(ind).* 1 s");
const VERB_2S = Pattern.compile("V .*(ind).* 2 s");
const VERB_3S = Pattern.compile("V .*(ind).* 3 s");
const VERB_1P = Pattern.compile("V .*(ind).* 1 p");
const VERB_2P = Pattern.compile("V .*(ind).* 2 p");
const VERB_3P = Pattern.compile("V .*(ind).* 3 p");
const HYPHEN_OR_QUOTE = Pattern.compile("['-]");
const IMPERATIVE_HYPHEN = Pattern.compile(
  "^([\\p{L}]+)[’']?(moi|toi|le|la|lui|nous|vous|les|leur|y|en)$", flags); //|vs|y
const SPLIT_DIGITS_AT_END = ['et', 'ou', 'de', 'en', 'à', 'aux', 'des'];
const DICT_FILE = '/fr/french.dict';

// Java: MorfologikFrenchSpellerRule
export class MorfologikFrenchSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.fr.MorfologikFrenchSpellerRule';

  // Java: MorfologikFrenchSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.setIgnoreTaggedWords();
  }

  // Java: MorfologikFrenchSpellerRule#getFileName()
  getFileName() {
    return DICT_FILE;
  }

  // Java: MorfologikFrenchSpellerRule#getSpellingFileName()
  getSpellingFileName() {
    return SPELLING_FILE;
  }

  // Java: MorfologikFrenchSpellerRule#getId()
  getId() {
    return 'FR_SPELLING_RULE'; // same name just for diffs
  }

  // Use this rule in LO/OO extension despite being a spelling rule
  // Java: MorfologikFrenchSpellerRule#useInOffice()
  useInOffice() {
    return true;
  }

  // Java: MorfologikFrenchSpellerRule#orderSuggestions(List,String)
  orderSuggestions(suggestions, word) {
    // move some run-on-words suggestions to the top
    const newSuggestions = [];
    const wordWithouDiacriticsString = removeDiacritics(word);
    for (let i = 0; i < suggestions.length; i++) {
      const parts = javaSplit(toLowerCase(suggestions[i].getReplacement()), ' ');

      // remove wrong split prefixes
      if (parts.length === 2 && PREFIX_WITH_WHITESPACE.includes(parts[0])) {
        continue;
      }
      if (parts[0].length === 1 && parts[0] !== 'a' && parts[0] !== 'à' && parts[0] !== 'y') {
        continue;
      }
      // remove: informè V ind pres 1 s
      if (toLowerCase(suggestions[i].getReplacement()).endsWith('è')
        && !exceptionsEgrave.includes(toLowerCase(suggestions[i].getReplacement()))) {
        continue;
      }

      // Don't change first suggestions if they match word without diacritics
      let posNewSugg = 0;
      while (newSuggestions.length > posNewSugg
          && equalsIgnoreCase(removeDiacritics(newSuggestions[posNewSugg].getReplacement()), wordWithouDiacriticsString)) {
        posNewSugg++;
      }
      // move some split words to first place
      if (parts.length === 2 && TOKEN_AT_START.includes(parts[0]) && parts[1].length > 1) {
        newSuggestions.splice(posNewSugg, 0, suggestions[i]);
        continue;
      }

      const suggWithoutDiacritics = removeDiacritics(suggestions[i].getReplacement());
      if (equalsIgnoreCase(wordWithouDiacriticsString, suggWithoutDiacritics)) {
        newSuggestions.splice(posNewSugg, 0, suggestions[i]);
        continue;
      }

      // move words with apostrophe or hyphen to second position
      const cleanSuggestion = HYPHEN_OR_QUOTE.matcher(suggestions[i].getReplacement()).replaceAll('');
      if (i > 1 && suggestions.length > 2 && equalsIgnoreCase(cleanSuggestion, word)) {
        if (posNewSugg === 0) {
          posNewSugg = 1;
        }
        newSuggestions.splice(posNewSugg, 0, suggestions[i]);
        continue;
      }
      newSuggestions.push(suggestions[i]);
    }
    return newSuggestions;
  }

  // Java: MorfologikFrenchSpellerRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    const suggestionsList = suggestions.map((s) => s.getReplacement());
    return SuggestedReplacement.convert(this.getAdditionalTopSuggestionsString(suggestionsList, word));
  }

  // Java: MorfologikFrenchSpellerRule#getAdditionalTopSuggestionsString(List,String)
  getAdditionalTopSuggestionsString(suggestions, word) {
    if (word === 'voulai') {
      return ['voulais', 'voulait'];
    } else if (equalsIgnoreCase(word, 'mm2')) {
      return ['mm²'];
    } else if (equalsIgnoreCase(word, 'cm2')) {
      return ['cm²'];
    } else if (equalsIgnoreCase(word, 'dm2')) {
      return ['dm²'];
    } else if (equalsIgnoreCase(word, 'm2')) {
      return ['m²'];
    } else if (equalsIgnoreCase(word, 'km2')) {
      return ['km²'];
    } else if (equalsIgnoreCase(word, 'mm3')) {
      return ['mm³'];
    } else if (equalsIgnoreCase(word, 'cm3')) {
      return ['cm³'];
    } else if (equalsIgnoreCase(word, 'dm3')) {
      return ['dm³'];
    } else if (equalsIgnoreCase(word, 'm3')) {
      return ['m³'];
    } else if (equalsIgnoreCase(word, 'km3')) {
      return ['km³'];
    }
    let parts = splitCamelCase(word);
    if (parts.length > 1 && parts[0].length > 1) {
      let isNotMisspelled = true;
      for (const part of parts) {
        isNotMisspelled = !this.speller1.isMisspelled(part) && isNotMisspelled; // Java: isNotMisspelled &= ... (no short-circuit)
      }
      if (isNotMisspelled) {
        return [parts.join(' ')];
      }
    }
    parts = splitDigitsAtEnd(word);
    if (parts.length > 1) {
      if (FrenchTagger.INSTANCE.tag([parts[0]])[0].isTagged()
        && (parts[0].length > 2 || SPLIT_DIGITS_AT_END.includes(toLowerCase(parts[0])))) {
        return [parts.join(' ')];
      }
    }
    const newSuggestions = [];
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_VERBS, VERB_INDSUBJ, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_VERBS_M, VERB_INDSUBJ_M, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_VERBS_C, VERB_INDSUBJ_C, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_VERBS_INF, VERB_INF, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_NOM_SING, NOM_SING, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, APOSTROF_INICI_NOM_PLURAL, NOM_PLURAL, 2, "'", true));
    newSuggestions.push(...this.findSuggestion(word, IMPERATIVE_HYPHEN, VERB_IMP, 1, '-', true));

    newSuggestions.push(...this.findSuggestion(word, HYPHEN_JE, VERB_1S, 1, '-', true));
    newSuggestions.push(...this.findSuggestion(word, HYPHEN_TU, VERB_2S, 1, '-', true));
    newSuggestions.push(...this.findSuggestion(word, HYPHEN_ON, VERB_3S, 1, '-', true));
    newSuggestions.push(...this.findSuggestion(word, HYPHEN_NOUS, VERB_1P, 1, '-', true));
    newSuggestions.push(...this.findSuggestion(word, HYPHEN_VOUS, VERB_2P, 1, '-', true));
    newSuggestions.push(...this.findSuggestion(word, HYPHEN_ILS, VERB_3P, 1, '-', true));

    if (newSuggestions.length !== 0) {
      return newSuggestions;
    }
    return [];
  }

  // Java: MorfologikFrenchSpellerRule#findSuggestion(String,Pattern,Pattern,int,String,boolean)
  findSuggestion(word, wordPattern, postagPattern, suggestionPosition, separator, recursive) {
    const newSuggestions = [];
    const matcher = wordPattern.matcher(word);
    if (matcher.matches()) {
      const newSuggestion = matcher.group(suggestionPosition);
      const newatr = FrenchTagger.INSTANCE.tag([newSuggestion])[0];
      if (this.matchPostagRegexp(newatr, postagPattern)) {
        newSuggestions.push(matcher.group(1) + separator + matcher.group(2));
        return newSuggestions;
      }
      if (recursive) {
        const moreSugg = this.speller1.getSuggestions(newSuggestion);
        if (moreSugg.length > 0) {
          for (let i = 0; i < moreSugg.length; i++) {
            let newWord;
            if (suggestionPosition === 1) {
              newWord = moreSugg[i] + matcher.group(2); // .toLowerCase()
            } else {
              newWord = matcher.group(1) + moreSugg[i];
            }
            const newSugg = this.findSuggestion(newWord, wordPattern, postagPattern, suggestionPosition, separator, false);
            if (newSugg.length !== 0) {
              newSuggestions.push(...newSugg);
            }
            if (i > 5) {
              break;
            }
          }
        }
      }
    }
    if (newSuggestions.length !== 0) {
      return newSuggestions;
    }
    return [];
  }

  // Match POS tag with regular expression
  // Java: MorfologikFrenchSpellerRule#matchPostagRegexp(AnalyzedTokenReadings,Pattern)
  matchPostagRegexp(aToken, pattern) {
    for (const analyzedToken of aToken.getReadings()) {
      let posTag = analyzedToken.getPOSTag();
      if (posTag === null) {
        posTag = 'UNKNOWN';
      }
      const m = pattern.matcher(posTag);
      if (m.matches()) {
        return true;
      }
    }
    return false;
  }
}
registerComponent(MorfologikFrenchSpellerRule.FQCN, (...args) => new MorfologikFrenchSpellerRule(...args));
