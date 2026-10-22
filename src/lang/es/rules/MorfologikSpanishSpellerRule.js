// Java: org.languagetool.rules.es.MorfologikSpanishSpellerRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaSplit, toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { SpellingCheckRule } from '../../../core/rules/spelling/SpellingCheckRule.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { removeDiacritics, splitCamelCase, splitDigitsAtEnd } from '../../../core/text/StringTools.js';
import { SpanishTagger } from '../tagging/SpanishTagger.js';

const REMOVE_FROM_SUGGESTIONS = new Set(['abu', 'abue', 'abus', 'anarco', 'anarcos',
  'arbi', 'arbis', 'arqui', 'arquis', 'Barna', 'bibe', 'bibes', 'biblio', 'biblios', 'bolche', 'bolches', 'cami',
  'camis', 'capi', 'capis', 'celu', 'celus', 'ceni', 'cenis', 'cerve', 'cerves', 'chiqui', 'chiquis', 'chuche',
  'chuches', 'chumi', 'chumis', 'cintu', 'cintus', 'comi', 'comis', 'compu', 'compus', 'confe', 'confes', 'confi',
  'confis', 'conge', 'conges', 'copi', 'copis', 'cosquis', 'coti', 'cotis', 'cíber', 'deco', 'decos', 'deli', 'delis',
  'depa', 'depas', 'díver', 'facu', 'facus', 'festi', 'festis', 'frigo', 'frigos', 'fácul', 'gili', 'gilis', 'gine',
  'gineco', 'ginecos', 'gines', 'Graná', 'hospi', 'hospis', 'ilu', 'ilus', 'impeque', 'impeques', 'inge', 'inges',
  'joputa', 'joputas', 'jueputa', 'jueputas', 'lesbi', 'lesbis', 'lipo', 'lipos', 'lito', 'litos', 'mani', 'manifa',
  'manifas', 'manis', 'mari', 'maris', 'masoca', 'masocas', 'milqui', 'milquis', 'munipa', 'munipas', 'ofi', 'ofis',
  'pandi', 'pandis', 'pasti', 'pastis', 'pelu', 'pelus', 'pendeviejo', 'pendeviejos', 'peni', 'penis', 'pisci',
  'piscis', 'piti', 'pitis', 'porfaplís', 'porfi', 'porfiplís', 'porfis', 'porsi', 'porsiaca', 'porsiacas', 'porsis',
  'prefe', 'prefes', 'prince', 'princes', 'pringui', 'pringuis', 'prosti', 'prostis', 'prota', 'protas', 'prote',
  'protes', 'psico', 'psicos', 'psiqui', 'psiquis', 'publi', 'publis', 'puti', 'putis', 'quillo', 'quillos', 'refri',
  'refris', 'regu', 'regus', 'repe', 'repes', 'resi', 'resis', 'ridi', 'ridis', 'rotu', 'rotus', 'sado', 'sados',
  'soco', 'socos', 'sufi', 'sufis', 'suje', 'sujes', 'tatu', 'tatus', 'torti', 'tortis', 'tranqui', 'tranquis',
  'trici', 'tricis', 'ulti', 'ultis', 'urba', 'urbas', 'vice', 'vices', 'vitro', 'vitros', 'ñero', 'ñeros']);
const PREFIX_WITH_WHITESPACE = new Set(['ultra', 'eco', 'tele', 'anti', 'auto', 'ex',
  'extra', 'macro', 'mega', 'meta', 'micro', 'multi', 'mono', 'mini', 'post', 'retro', 'semi', 'super', 'hiper',
  'trans', 're', 'g', 'l', 'm']);
const PRONOMBRE_INICIAL = new Set(['me', 'te', 'se', 'nos', 'os', 'lo', 'le', 'la', 'los', 'las']);
const PARTICULA_FINAL = new Set(['que', 'cual']);
const SPLIT_DIGITS_AT_END = new Set(['en', 'de', 'del', 'al', 'a', 'y', 'o', 'con']);
const VERB_INDSUBJ = Pattern.compile('V.[SI].*');

// Java: MorfologikSpanishSpellerRule
export class MorfologikSpanishSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.es.MorfologikSpanishSpellerRule';

  // Java: MorfologikSpanishSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.setIgnoreTaggedWords();
  }

  // Java: MorfologikSpanishSpellerRule#getFileName()
  getFileName() {
    return '/es/es-ES.dict';
  }

  // Java: MorfologikSpanishSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_ES';
  }

  // Use this rule in LO/OO extension despite being a spelling rule
  // Java: MorfologikSpanishSpellerRule#useInOffice()
  useInOffice() {
    return true;
  }

  // Java: MorfologikSpanishSpellerRule#getAdditionalSpellingFileNames()
  getAdditionalSpellingFileNames() {
    return [`/es/${SpellingCheckRule.CUSTOM_SPELLING_FILE}`, SpellingCheckRule.GLOBAL_SPELLING_FILE, '/es/multiwords.txt'];
  }

  // Java: MorfologikSpanishSpellerRule#orderSuggestions(List,String)
  orderSuggestions(suggestions, word) {
    const newSuggestions = [];
    const wordWithouDiacriticsString = removeDiacritics(word);
    for (let i = 0; i < suggestions.length; i++) {
      const replacement = toLowerCase(suggestions[i].getReplacement());
      if (REMOVE_FROM_SUGGESTIONS.has(replacement)) {
        continue;
      }
      const parts = javaSplit(replacement, ' ');
      // Don't change first suggestions if they match word without diacritics
      let posNewSugg = 0;
      while (newSuggestions.length > posNewSugg
        && equalsIgnoreCase(removeDiacritics(newSuggestions[posNewSugg].getReplacement()), wordWithouDiacriticsString)) {
        posNewSugg++;
      }
      if (parts.length === 2) {
        // remove wrong split prefixes
        if (parts[1] === 's') {
          continue;
        }
        if (PREFIX_WITH_WHITESPACE.has(parts[0])) {
          continue;
        }
        // move some split words to first place
        if (parts[1].length > 1 && PRONOMBRE_INICIAL.has(toLowerCase(parts[0]))) {
          const newSuggestion = parts[1];
          const atkn = SpanishTagger.INSTANCE.tag([newSuggestion]);
          if (atkn[0].matchesPosTagRegex(VERB_INDSUBJ)) {
            newSuggestions.splice(posNewSugg, 0, suggestions[i]);
            continue;
          }
        }

        // move some split words to first place
        if (PARTICULA_FINAL.has(parts[1])) {
          newSuggestions.splice(0, 0, suggestions[i]);
          continue;
        }
      }
      newSuggestions.push(suggestions[i]);
    }
    return newSuggestions;
  }

  // Java: MorfologikSpanishSpellerRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    const suggestionsList = suggestions.map((s) => s.getReplacement());
    return SuggestedReplacement.convert(this.getAdditionalTopSuggestionsString(suggestionsList, word));
  }

  // Java: MorfologikSpanishSpellerRule#getAdditionalTopSuggestionsString(List,String)
  getAdditionalTopSuggestionsString(suggestions, word) {
    let parts = splitCamelCase(word);
    if (parts.length > 1) {
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
      if (SpanishTagger.INSTANCE.tag([parts[0]])[0].isTagged()
        && (parts[0].length > 2 || SPLIT_DIGITS_AT_END.has(toLowerCase(parts[0])))) {
        return [parts.join(' ')];
      }
    }
    return [];
  }

  // Do not tokenize new words from spelling.txt...
  // Multi-token words should be in multiwords.txt
  // Java: MorfologikSpanishSpellerRule#tokenizeNewWords()
  tokenizeNewWords() {
    return false;
  }
}

registerComponent(MorfologikSpanishSpellerRule.FQCN, (...args) => new MorfologikSpanishSpellerRule(...args));
