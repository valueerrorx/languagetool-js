// org.languagetool.rules.de.CompoundInfinitivRule
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { tokenRegex, posRegex } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { getDictionaryWithCaching } from '../../../core/rules/spelling/morfologik/MorfologikSpeller.js';
import { Speller } from '../../../lib/fsa/Speller.js';
import { IllegalStateException } from '../../../lib/java/errors.js';
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { toLowerCase, equalsIgnoreCase } from '../../../lib/java/strings.js';
import { lowercaseFirstChar } from '../../../core/text/StringTools.js';
import { getUrl } from '../../../core/Tools.js';

// Java: CompoundInfinitivRule#token(String)
function token(s) {
  return new PatternTokenBuilder().token(s).build();
}

// Java: CompoundInfinitivRule#ANTI_PATTERNS
const ANTI_PATTERNS = [
  //
  // NOTE: antipatterns only work when they cover "zu":
  //
  [
    token('auf'),
    token('Nummer'),
    token('sicher'),
    token('zu'),
  ],
  [ // "Den richtigen Weg zu gehen bedeutet ab und an zu erkennen, dass man eventuell auf der falschen Spur ist."
    token('ab'),
    tokenRegex('und|&'),
    token('an'),
    token('zu'),
  ],
  [ // "Der diensthabende Kollege hatte ganz schön zu tun."
    token('ganz'),
    token('schön'),
    token('zu'),
  ],
  [ // "Fang dort an zu lesen, wo du aufgehört hast."
    tokenRegex('fang|fängst|fängt|fangt|fangen|fing|fingen'),
    posRegex('ADV.*'),
    token('an'),
    token('zu'),
  ],
  [
    tokenRegex('dazu|darüber'),
    token('zu'),
    token('machen'),
  ],
  [ // Da Frauen keine Gelegenheit übersehen, sich schön zu machen, pflückte sie eine Orchidee und steckte sie in ihr Haar. (compounding optional)
    token('schön'),
    token('zu'),
    token('machen'),
  ],
  [
    token('kurz'),
    token('davor'),
    token('zu'),
  ],
  [
    tokenRegex('Jahr|Monat|Zeit'),
    token('über'),
    token('zu'),
  ],
  [
    token('endlich'),
    token('wieder'),
    token('zu'),
  ],
  [
    token('bis'),
    token('hin'),
    token('zu'),
  ],
  [
    token('von'),
    tokenRegex('.*[a-z].*'),
    token('her'),
    token('zu'),
  ],
  [
    tokenRegex('sehr|ganz|äu(ss|ß)erst|zu|nicht|absolut|total|wirklich|möglichst'),
    posRegex('ADJ.*'),
    token('zu'),
  ],
  [
    token('Schritt'),
    token('weiter'),
    token('zu'),
  ],
  [
    token('und'),
    token('so'),
    token('weiter'),
  ],
  [
    token('darauf'),
    token('zu'),
    posRegex('VER.*'),
    token('dass'),
  ],
  [
    token('darauf'),
    token('zu'),
    posRegex('VER.*'),
    token(','),
  ],
  [ // "um dort die Nacht über zu stehen."
    tokenRegex('Spiel|Tag|Nacht|Morgen|Nachmittag|Abend|Zeit|.+zeit|Jahr(zehnt)?|Monat|.+tag|Mittwoch|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember'),
    token('über'),
    token('zu'),
  ],
  [
    token('kurz'),
    token('zu'),
    token('machen'),
  ],
  [
    // "ohne die Erlaubnis dazu zu haben"
    token('dazu'),
    token('zu'),
    token('haben'),
  ],
  [
    // "Er hatte nichts weiter zu sagen"
    tokenRegex('deutlich|viel|Stück|nichts|nix|noch'),
    token('weiter'),
    token('zu'),
  ],
  [
    // "Auf und ab zu schreiten"
    token('auf'),
    tokenRegex('und|&|oder|\\/'),
    new PatternTokenBuilder().posRegex('ADV.*').min(0).build(),
    token('ab'),
    token('zu'),
  ],
  [
    token('zu'),
    posRegex('ADJ.*'),
    token('zu'),
  ],
  [
    // "Hin und her zu laufen"
    token('hin'),
    tokenRegex('und|&|oder|\\/'),
    new PatternTokenBuilder().posRegex('ADV.*').min(0).build(),
    token('her'),
    token('zu'),
  ],
  [
    // "Hoch und runter zu laufen"
    tokenRegex('rauf|hoch'),
    tokenRegex('und|&|oder|\\/'),
    new PatternTokenBuilder().posRegex('ADV.*').min(0).build(),
    token('runter'),
    token('zu'),
  ],
  [
    // Sie scheint aus Spanien heraus zu kaufen
    new PatternTokenBuilder().token('aus').setSkip(3).build(),
    token('heraus'),
    token('zu'),
  ],
];

// Java: CompoundInfinitivRule#ADJ_EXCEPTION
const ADJ_EXCEPTION = [
  'schwer',
  'klar',
  'verloren',
  'bekannt',
  'rot',
  'blau',
  'gelb',
  'grün',
  'schwarz',
  'weiß',
  'fertig',
  'neu',
];

// Java: CompoundInfinitivRule#isInfinitiv(AnalyzedTokenReadings)
function isInfinitiv(token) {
  return token.hasPosTagStartingWith('VER:INF');
}

// Java: CompoundInfinitivRule
export class CompoundInfinitivRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.CompoundInfinitivRule';

  // Java: CompoundInfinitivRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super();
    super.setCategory(Categories.COMPOUNDING.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.addExamplePair(Example.wrong('Er überprüfte die Rechnungen noch einmal, um <marker>sicher zu gehen</marker>.'),
      Example.fixed('Er überprüfte die Rechnungen noch einmal, um <marker>sicherzugehen</marker>.'));
    this.lang = lang;
    this.speller = null;
    if (userConfig !== null && userConfig !== undefined) {
      this.linguServices = userConfig.getLinguServices();
    } else {
      this.linguServices = null;
    }
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/zu-zusammen-oder-getrennt/'));
    this.antiPatterns = Rule.cacheAntiPatterns(lang, ANTI_PATTERNS);
  }

  // Java: CompoundInfinitivRule#getId()
  getId() {
    return 'COMPOUND_INFINITIV_RULE';
  }

  // Java: CompoundInfinitivRule#getDescription()
  getDescription() {
    return 'Erweiterter Infinitiv mit zu (Zusammenschreibung)';
  }

  // Java: CompoundInfinitivRule#isMisspelled(String)
  isMisspelled(word) {
    word = lowercaseFirstChar(word);
    if (this.linguServices === null && this.speller !== null) {
      return this.speller.isMisspelled(word);
    } else if (this.linguServices !== null) {
      return !this.linguServices.isCorrectSpell(word, this.lang);
    }
    throw new IllegalStateException('LinguServices or Speller must be not null to check spelling in CompoundInfinitivRule');
  }

  // Java: CompoundInfinitivRule#isRelevant(AnalyzedTokenReadings)
  isRelevant(token) {
    return token.hasPosTag('ZUS') && !equalsIgnoreCase('um', token.getToken());
  }

  // Java: CompoundInfinitivRule#getLemma(AnalyzedTokenReadings)
  getLemma(token) {
    if (token !== null) {
      const readings = token.getReadings();
      for (const reading of readings) {
        const lemma = reading.getLemma();
        if (lemma !== null && lemma !== undefined) {
          return lemma;
        }
      }
    }
    return null;
  }

  // Java: CompoundInfinitivRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    if (tokens[n - 2].hasPosTagStartingWith('VER')) {
      return true;
    }
    for (const word of ADJ_EXCEPTION) {
      if (tokens[n - 1].getToken() === word) {
        return true;
      }
    }
    if ('sagen' === tokens[n + 1].getToken()
        && ('weiter' === tokens[n - 1].getToken() || 'dazu' === tokens[n - 1].getToken())) {
      return true;
    }
    if (('tragen' === tokens[n + 1].getToken() || 'machen' === tokens[n + 1].getToken())
        && 'davon' === tokens[n - 1].getToken()) {
      return true;
    }
    if ('geben' === tokens[n + 1].getToken() && 'daran' === tokens[n - 1].getToken()) {
      return true;
    }
    if ('gehen' === tokens[n + 1].getToken() && 'ab' === tokens[n - 1].getToken()) {
      return true;
    }
    if ('errichten' === tokens[n + 1].getToken() && 'wieder' === tokens[n - 1].getToken()) {
      return true;
    }
    let verb = null;
    for (let i = n - 2; i > 0 && !this.isPunctuation(tokens[i].getToken()); i--) {
      if (tokens[i].hasPosTagStartingWith('VER:IMP')) {
        const lemma = this.getLemma(tokens[i]);
        verb = lemma === null ? null : toLowerCase(lemma); // Java: StringUtils.lowerCase (null-safe)
      } else if (tokens[i].hasPosTagStartingWith('VER')) {
        verb = toLowerCase(tokens[i].getToken());
      } else if ('Fang' === tokens[i].getToken()) {
        verb = 'fangen';
      }
      if (verb !== null) {
        if (!this.isMisspelled(tokens[n - 1].getToken() + verb)) {
          return true;
        }
        break;
      }
    }
    if ('aus' === tokens[n - 1].getToken() || 'an' === tokens[n - 1].getToken()) {
      for (let i = n - 2; i > 0 && !this.isPunctuation(tokens[i].getToken()); i--) {
        if ('von' === tokens[i].getToken() || 'vom' === tokens[i].getToken()) {
          return true;
        }
      }
    }
    if ('her' === tokens[n - 1].getToken()) {
      for (let i = n - 2; i > 0 && !this.isPunctuation(tokens[i].getToken()); i--) {
        if ('vor' === tokens[i].getToken()) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: CompoundInfinitivRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: CompoundInfinitivRule#match(AnalyzedSentence)
  match(sentence) {
    if (this.linguServices === null && this.speller === null) {
      // speller can not initialized by constructor because of temporary initialization of LanguageTool in other rules,
      // which leads to problems in LO/OO extension
      this.speller = new Speller(getDictionaryWithCaching('/de/hunspell/de_DE.dict'));
    }
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    for (let i = 2; i < tokens.length - 1; i++) {
      if ('zu' === tokens[i].getToken()
        && isInfinitiv(tokens[i + 1])
        && this.isRelevant(tokens[i - 1])
        && !tokens[i].isImmunized()
        && !this.isException(tokens, i)
        && !this.isMisspelled(tokens[i - 1].getToken() + tokens[i + 1].getToken())) {
        const msg = "Wenn der erweiterte Infinitiv von dem Verb '" + tokens[i - 1].getToken() + tokens[i + 1].getToken()
          + "' abgeleitet ist, sollte er zusammengeschrieben werden.";
        const ruleMatch = new RuleMatch(this, sentence, tokens[i - 1].getStartPos(), tokens[i + 1].getEndPos(), msg);
        const suggestions = [];
        suggestions.push(tokens[i - 1].getToken() + tokens[i].getToken() + tokens[i + 1].getToken());
        ruleMatch.setSuggestedReplacements(suggestions);
        ruleMatches.push(ruleMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: CompoundInfinitivRule#isPunctuation(String)
  isPunctuation(word) {
    return word !== null
      && word.length === 1
      && equalsAny(word, '.', '?', '!', '…', ':', ';', ',', '(', ')', '[', ']');
  }
}
