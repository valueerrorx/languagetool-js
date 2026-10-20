// org.languagetool.rules.de.AgreementRule (simple agreement checker for German noun phrases: DET/PRO [ADJ [ADJ]] NOUN)
import { Pattern } from '../../../lib/java/regex/index.js';
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase, substring, equalsIgnoreCase } from '../../../lib/java/strings.js';
import { equalsAny, endsWithAny, isNumeric } from '../../../lib/java/StringUtils.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { SENTENCE_START_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { getUrl } from '../../../core/Tools.js';
import { startsWithUppercase, lowercaseFirstChar } from '../../../core/text/StringTools.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { POSType } from '../tagging/GermanToken.js';
import { hasReadingOfType } from './GermanHelper.js';
import * as AgreementTools from './AgreementTools.js';
import { AgreementSuggestor2 } from './AgreementSuggestor2.js';
import { ANTI_PATTERNS as ANTI_PATTERNS_1 } from './AgreementRuleAntiPatterns1.js';
import { ANTI_PATTERNS as ANTI_PATTERNS_2 } from './AgreementRuleAntiPatterns2.js';
import { ANTI_PATTERNS as ANTI_PATTERNS_3 } from './AgreementRuleAntiPatterns3.js';

const MIT_MIR_ETC = Pattern.compile('mit (mir|dir|ihm|ihr|ihnen|uns|euch)');
const OHNE_MICH_ETC = Pattern.compile('ohne (mich|dich|ihn|sie|uns|euch)');
const ZUGESCHRIEBENEN_GENANNTEN = Pattern.compile('zugeschriebenen?|genannten?');
const VIEL_WEIT = Pattern.compile('viel|weit');
const WENIGER_EHER = Pattern.compile('weniger|eher');
const HERR_FRAU = Pattern.compile('Herr|Frau');

// Java: AgreementRule.GrammarCategory
export class GrammarCategory extends JavaEnum {
  static FQCN = 'org.languagetool.rules.de.AgreementRule.GrammarCategory';

  // Java: GrammarCategory#GrammarCategory(String)
  constructor(name, ordinal, displayName) {
    super(name, ordinal);
    this.displayName = displayName;
  }
}
GrammarCategory.KASUS = new GrammarCategory('KASUS', 0, "Kasus (Fall: Wer/Was, Wessen, Wem, Wen/Was - Beispiel: 'das Fahrrads' statt 'des Fahrrads')");
GrammarCategory.GENUS = new GrammarCategory('GENUS', 1, "Genus (männlich, weiblich, sächlich - Beispiel: 'der Fahrrad' statt 'das Fahrrad')");
GrammarCategory.NUMERUS = new GrammarCategory('NUMERUS', 2, "Numerus (Einzahl, Mehrzahl - Beispiel: 'das Fahrräder' statt 'die Fahrräder')");

// Java: AgreementRule.ReplacementType
export class ReplacementType extends JavaEnum {
  static FQCN = 'org.languagetool.rules.de.AgreementRule.ReplacementType';
}
ReplacementType.Ins = new ReplacementType('Ins', 0);
ReplacementType.Zur = new ReplacementType('Zur', 1);

const INS_REPLACEMENT = [new AnalyzedToken('das', 'ART:DEF:AKK:SIN:NEU', 'das')];
const ZUR_REPLACEMENT = [new AnalyzedToken('der', 'ART:DEF:DAT:SIN:FEM', 'der')];

const MSG = 'Möglicherweise passen das Nomen und die Wörter, die das Nomen beschreiben, grammatisch nicht zusammen.';
const MSG2 = 'Möglicherweise passen das Nomen und die Wörter, die das Nomen beschreiben, grammatisch nicht zusammen.';
const SHORT_MSG = 'Evtl. passen Wörter grammatisch nicht zusammen.';

const MODIFIERS = new Set([
    'zu',
    'überraschend',
    'ungeahnt',
    'absolut',
    'ausgesprochen',
    'außergewöhnlich',
    'außerordentlich',
    'äußerst',
    'besonders',
    'dringend',
    'echt',
    'einigermaßen',
    'enorm',
    'extrem',
    'fast',
    'ganz',
    'entschieden',
    'geradezu',
    'zeitweise',
    'halbwegs',
    'höchst',
    'komplett',
    'laufend',
    'recht',
    'relativ',
    'sehr',
    'total',
    'überaus',
    'ungewöhnlich',
    'unglaublich',
    //'viel',    // 'xxx, die viel Platz...'
    'völlig',
    'weit',
    'wirklich',
    'gerade',
    'vereint',
    'überwiegend',
    'gewollt',
    'angestrengt',
    'ziemlich'
]);

const VIELE_WENIGE_LOWERCASE = new Set([
    'manche',
    'jegliche',
    'jeglicher',
    'andere',
    'anderer',
    'anderen',
    'sämtliche',
    'sämtlicher',
    'etliche',
    'etlicher',
    'viele',
    'vieler',
    'wenige',
    'weniger',
    'einige',
    'einiger',
    'mehrerer',
    'mehrere'
]);

const REL_PRONOUN_LEMMAS = ['der', 'welch'];

const PRONOUNS_TO_BE_IGNORED = new Set([
    'nichts',
    'alles',   // 'Ruhe vor dem alles verheerenden Sturm', 'Alles Große und Edle ist einfacher Art.'
    'dies',
    'ebendies',
    'ich',
    'dir',
    'dich',
    'du',
    'd',
    'er', 'sie', 'es',
    'wir',
    'mich',
    'mir',
    'uns',
    'ihnen',
    'euch',
    'ihm',
    'ihr',
    'ihn',
    'dessen',
    'deren',
    'denen',
    'sich',
    'aller',
    'allen',  // 'das allen bekannte Wollnashorn'
    'man',
    'beide',
    'beiden',
    'beider',
    'wessen',
    'a',
    'alle',
    'etwas',
    'irgendetwas',
    'irgendwas',
    'irgendwer',
    'was',
    'wer',
    'wem',
    'jenen',      // '...und mit jenen anderer Arbeitsgruppen verwoben'
    'diejenigen',
    'irgendjemand', 'irgendjemandes',
    'jemand', 'jemandes',
    'niemand', 'niemandes'
]);

const NOUNS_TO_BE_IGNORED = new Set([
    'A',
    'Prozent',   // Plural 'Prozente', trotzdem ist 'mehrere Prozent' korrekt
    'Wollen',  // das Wollen
    'Gramm',
    'Kilogramm',
    'Flippers', // Band, die Flippers
    'Standart', // Caught by speller
    'Stellungsname', // Caught by speller
    'Kündigungsscheiben', // Caught by speller
    'Piepen', // Die Piepen
    'Badlands',
    'Visual', // englisch
    'Special', // englisch
    'Multiple', // englisch
    'Chief', // Chief Executive Officer
    'Carina', // Name
    'Wüstenrot', // Name
    'Rückgrad', // found by speller
    'Rückgrads', // found by speller
    'Anteilname', // found by speller
    'Aalen', // Plural form of 'Aal' but also large city in Germany
    'Meter', // Das Meter (Objekt zum Messen)
    'Boots', // 'Die neuen Boots' (englisch Stiefel)
    'Taxameter', // Beides erlaubt 'Das' und 'Die'
    'Bild', // die Bild (Zeitung)
    'Emirates', // 'Mit einem Flug der Emirates' (Fluggesellschaft)
    'Uhr',   // 'um ein Uhr'
    'cm', // 'Die letzten cm' können
    'km',
    'Nr',
    'KSC', // Abk
    'ANC', // Abk
    'DJK', // Der DJK Schweinfurt
    'RP' // 'Die RP (Rheinische Post)'
]);

const allAntiPatterns = [...ANTI_PATTERNS_1, ...ANTI_PATTERNS_2, ...ANTI_PATTERNS_3]; // Java: AgreementRule#allAntiPatterns

// Java: AgreementRule
export class AgreementRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.AgreementRule';

  // Java: AgreementRule(ResourceBundle,German)
  constructor(messages, language) {
    super();
    this.language = language;
    this.lt = null;
    this.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/deklination/'));
    this.addExamplePair(Example.wrong('<marker>Der Haus</marker> wurde letztes Jahr gebaut.'),
      Example.fixed('<marker>Das Haus</marker> wurde letztes Jahr gebaut.'));
    this.antiPatterns = Rule.cacheAntiPatterns(language, allAntiPatterns);
  }

  // Java: AgreementRule#getId()
  getId() {
    return 'DE_AGREEMENT';
  }

  // Java: AgreementRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return allAntiPatterns.reduce((max, l) => Math.max(max, l.length), 0);
  }

  // Java: AgreementRule#getDescription()
  getDescription() {
    return "Kongruenz von Nominalphrasen (unvollständig!), z.B. 'mein kleiner (kleines) Haus'";
  }

  // Java: AgreementRule#replacePrepositionsByArticle(AnalyzedTokenReadings[])
  replacePrepositionsByArticle(tokens) {
    const map = new Map();
    for (let i = 0; i < tokens.length; i++) {
      if (equalsAny(tokens[i].getToken(), 'ins', 'ans', 'aufs', 'vors', 'durchs', 'hinters', 'unters', 'übers', 'fürs', 'ums')) {
        tokens[i] = new AnalyzedTokenReadings(INS_REPLACEMENT, tokens[i].getStartPos());
        map.set(i, ReplacementType.Ins);
      } else if (equalsAny(tokens[i].getToken(), 'zur')) {
        tokens[i] = new AnalyzedTokenReadings(ZUR_REPLACEMENT, tokens[i].getStartPos());
        map.set(i, ReplacementType.Zur);
      }
    }
    return map;
  }

  // Java: AgreementRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    const origTokens = tokens.slice();
    const replMap = this.replacePrepositionsByArticle(tokens);
    for (let i = 0; i < tokens.length; i++) {
      const posToken = tokens[i].getAnalyzedToken(0).getPOSTag(); // TODO: check for all readings?
      if (SENTENCE_START_TAGNAME === posToken || tokens[i].isImmunized() || origTokens[i].isImmunized()) {
        continue;
      }
      if (this.couldBeRelativeOrDependentClause(tokens, i)) {
        continue;
      }
      if (i > 0) {
        const prevToken = toLowerCase(tokens[i - 1].getToken());
        if (equalsAny(prevToken, 'der', 'die', 'das', 'des', 'dieses') &&
            equalsAny(tokens[i].getToken(), 'eine', 'einen')) {
          // z.B. "Auf der einen Seite endlose Dünen"
          // TODO: "der eine Polizist" -> nicht ignorieren, sondern "der polizist" checken; "auf der einen Seite"
          // TODO: "Leute, die eine gewissen Sicherheit brauchen." -> nicht ignorieren
          continue;
        }
      }
      // avoid false alarm on "nichts Gutes" and "alles Gute"
      const tokenReadings = tokens[i];
      // avoid false alarm on "Art. 1" and "bisherigen Art. 1" (Art. = Artikel):
      const detAbbrev = i < tokens.length - 2 && tokens[i + 1].getToken() === 'Art' && tokens[i + 2].getToken() === '.';
      const detAdjAbbrev = i < tokens.length - 3 && tokens[i + 2].getToken() === 'Art' && tokens[i + 3].getToken() === '.';
      // "einen Hochwasser führenden Fluss", "die Gott zugeschriebenen Eigenschaften":
      const followingParticiple = i < tokens.length - 3 && (tokens[i + 2].hasPartialPosTag('PA1') || ZUGESCHRIEBENEN_GENANNTEN.matcher(tokens[i + 2].getToken()).matches());
      if (detAbbrev || detAdjAbbrev || followingParticiple) {
        continue;
      }
      if (hasReadingOfType(tokenReadings, POSType.DETERMINER) || this.isRelevantPronoun(tokens, i)) {
        const tokenPosAfterModifier = this.getPosAfterModifier(i + 1, tokens);
        let skippedStr = null;
        if (tokenPosAfterModifier > i + 1) {
          skippedStr = substring(sentence.getText(), tokens[i + 1].getStartPos(), tokens[tokenPosAfterModifier - 1].getEndPos());
        }
        let tokenPos = tokenPosAfterModifier;
        if (tokenPos >= tokens.length) {
          break;
        }
        const nextToken = tokens[tokenPos];
        let maybePreposition = i - 1 >= 0 ? tokens[i - 1] : null;
        if (i - 2 >= 0 && equalsIgnoreCase('was', tokens[i - 2].getToken())) {
          maybePreposition = null; // avoid preposition filtering on "Was für eine schöner Sonnenuntergang!"
        }
        if (this.isNonPredicativeAdjective(nextToken) || this.isParticiple(nextToken)) {
          tokenPos = tokenPosAfterModifier + 1;
          if (tokenPos >= tokens.length) {
            break;
          }
          if (hasReadingOfType(tokens[tokenPos], POSType.NOMEN)) {
            // TODO: add a case (checkAdjNounAgreement) for special cases like "deren",
            // e.g. "deren komisches Geschenke" isn't yet detected as incorrect
            if (i >= 2 && hasReadingOfType(tokens[i - 2], POSType.ADJEKTIV)
                       && 'als' === tokens[i - 1].getToken()
                       && 'das' === tokens[i].getToken()) {
              // avoid false alarm for e.g. "weniger farbenprächtig als das anderer Papageien"
              continue;
            }
            const allowSuggestion = tokenPos === i + 2; // prevent incomplete suggestion for e.g. "einen 142 Meter hoher Obelisken" (-> "einen hohen Obelisken")
            const ruleMatch = this.checkDetAdjNounAgreement(maybePreposition, tokens[i],
              nextToken, tokens[tokenPos], sentence, i, allowSuggestion ? replMap : null, skippedStr);
            if (ruleMatch !== null) {
              ruleMatches.push(ruleMatch);
            }
          } else if (tokenPos + 1 < tokens.length && hasReadingOfType(tokens[tokenPos + 1], POSType.NOMEN) && hasReadingOfType(tokens[tokenPos], POSType.ADJEKTIV)) {
            const ruleMatch = this.checkDetAdjAdjNounAgreement(maybePreposition, tokens[i],
              nextToken, tokens[tokenPos], tokens[tokenPos + 1], sentence, i, replMap, skippedStr);
            if (ruleMatch !== null) {
              ruleMatches.push(ruleMatch);
            }
          }
        } else if (hasReadingOfType(nextToken, POSType.NOMEN) && 'Herr' !== nextToken.getToken()) {
          const ruleMatch = this.checkDetNounAgreement(maybePreposition, tokens[i], nextToken, sentence, i, replMap, skippedStr);
          if (ruleMatch !== null) {
            ruleMatches.push(ruleMatch);
          }
        }
      }
    } // for each token
    return this.toRuleMatchArray(ruleMatches);
  }

  /**
   * Search for modifiers (such as "sehr", "1,4 Meter") which can expand a
   * determiner - adjective - noun group ("ein hohes Haus" -> "ein sehr hohes Haus",
   * "ein 500 Meter hohes Haus") and return the index of the first non-modifier token ("Haus")
   */
  // Java: AgreementRule#getPosAfterModifier(int,AnalyzedTokenReadings[])
  getPosAfterModifier(startAt, tokens) {
    if (startAt < tokens.length && tokens[startAt].getToken() === 'relativ' && startAt + 1 < tokens.length && tokens[startAt + 1].getToken() === 'gesehen') {
      startAt += 2;
    }
    if (startAt < tokens.length && VIEL_WEIT.matcher(tokens[startAt].getToken()).matches() && startAt + 1 < tokens.length && WENIGER_EHER.matcher(tokens[startAt + 1].getToken()).matches()) {
      startAt += 2;
    } else if (startAt + 1 < tokens.length && MODIFIERS.has(tokens[startAt].getToken())) {
      startAt++;
    }
    if (startAt + 1 < tokens.length) {
      const phrase = tokens[startAt].getToken() + ' ' + tokens[startAt + 1].getToken();
      if (MIT_MIR_ETC.matcher(toLowerCase(phrase)).matches()) {
        startAt += 2;
      } else if (OHNE_MICH_ETC.matcher(toLowerCase(phrase)).matches()) {
        startAt += 2;
      }
    }
    if (startAt + 1 < tokens.length && (isNumeric(tokens[startAt].getToken()) || tokens[startAt].hasPosTag('ZAL'))) {
      let posAfterModifier = startAt + 1;
      if (startAt + 3 < tokens.length && ',' === tokens[startAt + 1].getToken() && isNumeric(tokens[startAt + 2].getToken())) {
        posAfterModifier = startAt + 3;
      }
      if (endsWithAny(tokens[posAfterModifier].getToken(), 'gramm', 'Gramm', 'Meter', 'meter')) {
        return posAfterModifier + 1;
      }
    }
    return startAt;
  }

  // Java: AgreementRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: AgreementRule#isNonPredicativeAdjective(AnalyzedTokenReadings)
  isNonPredicativeAdjective(tokensReadings) {
    for (const reading of tokensReadings.getReadings()) {
      const posTag = reading.getPOSTag();
      if (posTag !== null && posTag.startsWith('ADJ') && !posTag.includes('PRD')) {
        return true;
      }
    }
    return false;
  }

  // Java: AgreementRule#isParticiple(AnalyzedTokenReadings)
  isParticiple(tokensReadings) {
    return tokensReadings.hasPartialPosTag('PA1') || tokensReadings.hasPartialPosTag('PA2');
  }

  // Java: AgreementRule#isRelevantPronoun(AnalyzedTokenReadings[],int)
  isRelevantPronoun(tokens, pos) {
    const analyzedToken = tokens[pos];
    let relevantPronoun = hasReadingOfType(analyzedToken, POSType.PRONOMEN);
    // avoid false alarms:
    const token = tokens[pos].getToken();
    if (PRONOUNS_TO_BE_IGNORED.has(toLowerCase(token)) ||
        (pos > 0 && equalsIgnoreCase(tokens[pos - 1].getToken(), 'vor') && equalsIgnoreCase(token, 'allem'))) {
      relevantPronoun = false;
    }
    return relevantPronoun;
  }

  // Java: AgreementRule#couldBeRelativeOrDependentClause(AnalyzedTokenReadings[],int) (TODO: improve this so it only returns true for real relative clauses)
  couldBeRelativeOrDependentClause(tokens, pos) {
    let comma;
    let relPronoun;
    if (pos >= 1) {
      // avoid false alarm: "Das Wahlrecht, das Frauen zugesprochen bekamen." etc:
      comma = tokens[pos - 1].getToken() === ',';
      relPronoun = comma && tokens[pos].hasAnyLemma(...REL_PRONOUN_LEMMAS);
      if (relPronoun && pos + 3 < tokens.length) {
        return true;
      }
    }
    if (pos >= 2) {
      // avoid false alarm: "Der Mann, in dem quadratische Fische schwammen."
      // or: "Die Polizei erwischte die Diebin, weil diese Ausweis und Visitenkarte hinterließ."
      comma = tokens[pos - 2].getToken() === ',';
      if (comma) {
        const prep = tokens[pos - 1].hasPosTagStartingWith('PRP:');
        relPronoun = tokens[pos].hasAnyLemma(...REL_PRONOUN_LEMMAS);
        return prep && relPronoun || (tokens[pos - 1].hasPosTag('KON:UNT') && (tokens[pos].hasLemma('jen') || tokens[pos].hasLemma('dies') || tokens[pos].hasLemma('ebendies')));
      }
    }
    return false;
  }

  // Java: AgreementRule#checkDetNounAgreement(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence,int,Map,String)
  checkDetNounAgreement(maybePreposition, token1, token2, sentence, tokenPos, replMap, skippedStr) {
    // TODO: remove "-".equals(token2.getToken()) after the bug fix
    // see Daniel's comment from 20.12.2016 at https://github.com/languagetool-org/languagetool/issues/635
    if (token2.isImmunized() || NOUNS_TO_BE_IGNORED.has(token2.getToken()) || '-' === token2.getToken()) {
      return null;
    }

    let set1;
    if (token1.getReadings().length === 1 &&
        token1.getReadings()[0].getPOSTag() !== null &&
        token1.getReadings()[0].getPOSTag().endsWith(':STV')) {
      // catch the error in "Meiner Chef raucht."
      set1 = new Set();
    } else {
      set1 = this.getAgreementCategories(token1);
    }
    const set2 = this.getAgreementCategories(token2);
    AgreementTools.retainAll(set1, set2);
    let ruleMatch = null;
    if (set1.size === 0 && !this.isException(token1, token2)) {
      const compoundMatch = this.getCompoundError2(token1, token2, tokenPos, sentence);
      if (compoundMatch !== null) {
        return compoundMatch;
      }
      /*
      List<String> errorCategories = getCategoriesCausingError(token1, token2);
      String errorDetails = errorCategories.isEmpty() ?
            "Kasus, Genus oder Numerus" : String.join(" und ", errorCategories);
      String msg = "Möglicherweise fehlende grammatische Übereinstimmung des " + errorDetails + ".";
      String shortMsg = "Evtl. keine Übereinstimmung von Kasus, Genus oder Numerus";
      */

      const msg = 'Möglicherweise passen das Nomen und die Wörter, die das Nomen beschreiben, grammatisch nicht zusammen.';
      const shortMsg = 'Evtl. passen Wörter grammatisch nicht zusammen.';
      ruleMatch = new RuleMatch(this, sentence, token1.getStartPos(), token2.getEndPos(), msg, shortMsg);
      // this will not give a match for compounds that are not in the dictionary...
      //ruleMatch.setUrl(Tools.getUrl("https://www.korrekturen.de/flexion/deklination/" + token2.getToken() + "/"));
      const suggestor = new AgreementSuggestor2(this.language.getSynthesizer(), token1, token2, replMap.get(tokenPos) ?? null);
      suggestor.setPreposition(maybePreposition);
      suggestor.setSkipped(skippedStr);
      ruleMatch.setSuggestedReplacements(suggestor.getSuggestions(true));
    }
    return ruleMatch;
  }

  // Java: AgreementRule#getCompoundError(AnalyzedTokenReadings,AnalyzedTokenReadings,int,AnalyzedSentence) (z.B. "die Original Mail" -> "die Originalmail")
  getCompoundError2(token1, token2, tokenPos, sentence) {
    if (tokenPos !== -1 && tokenPos + 2 < sentence.getTokensWithoutWhitespace().length) {
      const nextToken = sentence.getTokensWithoutWhitespace()[tokenPos + 2];
      if (startsWithUppercase(nextToken.getToken())) {
        if (token2.getStartPos() === nextToken.getStartPos()) {
          // avoids a strange bug that suggests e.g. "Pflegende-Pflegende" in sentence like this:
          // "Das passiert nur, wenn der zu Pflegende bereit ist."
          return null;
        }
        const potentialCompound = token2.getToken() + lowercaseFirstChar(nextToken.getToken());
        const origToken1 = sentence.getTokensWithoutWhitespace()[tokenPos].getToken(); // before 'ins' etc. replacement
        const testPhrase = origToken1 + ' ' + potentialCompound;
        const hyphenPotentialCompound = token2.getToken() + '-' + nextToken.getToken();
        const hyphenTestPhrase = origToken1 + ' ' + hyphenPotentialCompound;
        return this.getRuleMatch(token1, nextToken, sentence, testPhrase, hyphenTestPhrase);
      }
    }
    return null;
  }

  // Java: AgreementRule#getCompoundError(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,int,AnalyzedSentence) (z.B. "die neue Original Mail" -> "die neue Originalmail")
  getCompoundError3(token1, token2, token3, tokenPos, sentence) {
    if (tokenPos !== -1 && tokenPos + 3 < sentence.getTokensWithoutWhitespace().length) {
      const nextToken = sentence.getTokensWithoutWhitespace()[tokenPos + 3];
      if (startsWithUppercase(nextToken.getToken())) {
        if (token3.getStartPos() === nextToken.getStartPos()) {
          // avoids a strange bug, see above
          return null;
        }
        const potentialCompound = token3.getToken() + lowercaseFirstChar(nextToken.getToken());
        const origToken1 = sentence.getTokensWithoutWhitespace()[tokenPos].getToken(); // before 'ins' etc. replacement
        const testPhrase = origToken1 + ' ' + token2.getToken() + ' ' + potentialCompound;
        const hyphenPotentialCompound = token3.getToken() + '-' + nextToken.getToken();
        const hyphenTestPhrase = origToken1 + ' ' + token2.getToken() + ' ' + hyphenPotentialCompound;
        return this.getRuleMatch(token1, nextToken, sentence, testPhrase, hyphenTestPhrase);
      }
    }
    return null;
  }

  // Java: AgreementRule#getCompoundError(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,int,AnalyzedSentence,String)
  // (z.B. "die ganz neue Original Mail" -> "die ganz neue Originalmail", "ein sehr interessantes kostenloses Slot Spiel" -> "ein sehr interessantes kostenloses Slot-Spiel")
  getCompoundError4(token1, token2, token3, token4, tokenPos, sentence, skippedStr) {
    const idx = tokenPos + 4 + (skippedStr !== null ? 1 : 0);
    if (tokenPos !== -1 && idx < sentence.getTokensWithoutWhitespace().length) {
      const nextToken = sentence.getTokensWithoutWhitespace()[idx];
      const potentialCompound = token4.getToken() + lowercaseFirstChar(nextToken.getToken());
      if (startsWithUppercase(token4.getToken()) && startsWithUppercase(nextToken.getToken())) {
        if (token4.getStartPos() === nextToken.getStartPos()) {
          // avoids a strange bug that suggests e.g. "Machtmach" in sentences like this:
          // "Denn die einzelnen sehen sich einer sehr verschieden starken Macht des..."
          return null;
        }
        const origToken1 = sentence.getTokensWithoutWhitespace()[tokenPos].getToken(); // before 'ins' etc. replacement
        const testPhrase = origToken1 + (skippedStr !== null ? ' ' + skippedStr + ' ' : ' ') + token2.getToken() + ' ' + token3.getToken() + ' ' + potentialCompound;
        const hyphenPotentialCompound = token4.getToken() + '-' + nextToken.getToken();
        const hyphenTestPhrase = origToken1 + (skippedStr !== null ? ' ' + skippedStr + ' ' : ' ') + token2.getToken() + ' ' + token3.getToken() + ' ' + hyphenPotentialCompound;
        return this.getRuleMatch(token1, nextToken, sentence, testPhrase, hyphenTestPhrase);
      }
    }
    return null;
  }

  // Java: AgreementRule#getRuleMatch(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence,String,String)
  getRuleMatch(token, token2, sentence, testPhrase, hyphenTestPhrase) {
    try {
      this.initLt();
      if (token2.getReadings().every((k) => k.getPOSTag() !== null && !k.getPOSTag().startsWith('SUB'))) {
        return null;
      }
      const replacements = [];
      if (this.lt.check(testPhrase).length === 0 && token2.isTagged()) {
        replacements.push(testPhrase);
      }
      if (this.lt.check(hyphenTestPhrase).length === 0 && token2.isTagged()) {
        replacements.push(hyphenTestPhrase);
      }
      if (replacements.length > 0) {
        const message = 'Wenn es sich um ein zusammengesetztes Nomen handelt, wird es zusammengeschrieben.';
        const ruleMatch = new RuleMatch(this, sentence, token.getStartPos(), token2.getEndPos(), message);
        ruleMatch.addSuggestedReplacements(replacements);
        ruleMatch.setUrl(getUrl('https://dict.leo.org/grammatik/deutsch/Rechtschreibung/Regeln/Getrennt-zusammen/Nomen.html#grammarAnchor-Nomen-49575'));
        return ruleMatch;
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
    return null;
  }

  // Java: AgreementRule#initLt()
  initLt() {
    if (this.lt === null) {
      this.lt = new JLanguageTool(this.language);
      for (const rule of this.lt.getAllActiveRules()) {
        if (rule.getId() !== 'DE_AGREEMENT' && rule.getId() !== 'GERMAN_SPELLER_RULE') {
          this.lt.disableRule(rule.getId());
        }
      }
    }
  }

  // Java: AgreementRule#isException(AnalyzedTokenReadings,AnalyzedTokenReadings)
  isException(token1, token2) {
    return 'allen' === token1.getToken() && 'Grund' === token2.getToken();
  }

  // Java: AgreementRule#getCategoriesCausingError(AnalyzedTokenReadings,AnalyzedTokenReadings)
  getCategoriesCausingError(token1, token2) {
    const categories = [];
    const categoriesToCheck = [GrammarCategory.KASUS, GrammarCategory.GENUS, GrammarCategory.NUMERUS];
    for (const category of categoriesToCheck) {
      if (this.agreementWithCategoryRelaxation(token1, token2, category)) {
        categories.push(category.displayName);
      }
    }
    return categories;
  }

  // Java: AgreementRule#checkDetAdjNounAgreement(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence,int,Map,String)
  checkDetAdjNounAgreement(maybePreposition, token1, token2, token3, sentence, tokenPos, replMap, skippedStr) {
    // TODO: remove (token3 == null || token3.getToken().length() < 2)
    // see Daniel's comment from 20.12.2016 at https://github.com/languagetool-org/languagetool/issues/635
    if (token3 === null || token3.getToken().length < 2) {
      return null;
    }
    const set = this.retainCommonCategories3(token1, token2, token3);
    let ruleMatch = null;
    if (set.size === 0) {
      if (HERR_FRAU.matcher(token3.getToken()).matches() && tokenPos + 3 < sentence.getTokensWithoutWhitespace().length) {
        const token4 = sentence.getTokensWithoutWhitespace()[tokenPos + 3];
        if (!token4.isTagged() || token4.hasPosTagStartingWith('EIG:')) {
          // 'Aber das ignorierte Herr Grey bewusst.'
          return null;
        }
      }
      if (tokenPos + 4 < sentence.getTokensWithoutWhitespace().length) {
        const compoundMatch = this.getCompoundError4(sentence.getTokensWithoutWhitespace()[tokenPos],
          sentence.getTokensWithoutWhitespace()[tokenPos + 1],
          sentence.getTokensWithoutWhitespace()[tokenPos + 2],
          sentence.getTokensWithoutWhitespace()[tokenPos + 3], tokenPos, sentence, null);
        if (compoundMatch !== null) {
          return compoundMatch;
        }
      }
      const compoundMatch = this.getCompoundError3(token1, token2, token3, tokenPos, sentence);
      if (compoundMatch !== null) {
        return compoundMatch;
      }
      if (token3.hasPosTagStartingWith('ABK')) {
        return null;
      }
      ruleMatch = new RuleMatch(this, sentence, token1.getStartPos(), token3.getEndPos(), MSG, SHORT_MSG);
      const suggestor = new AgreementSuggestor2(this.language.getSynthesizer(), token1, token2, token3, replMap !== null ? (replMap.get(tokenPos) ?? null) : null);
      suggestor.setPreposition(maybePreposition);
      suggestor.setSkipped(skippedStr);
      ruleMatch.setSuggestedReplacements(suggestor.getSuggestions(true));
    }
    return ruleMatch;
  }

  // Java: AgreementRule#checkDetAdjAdjNounAgreement(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence,int,Map,String)
  checkDetAdjAdjNounAgreement(maybePreposition, token1, token2, token3, token4, sentence, tokenPos, replMap, skippedStr) {
    const set = this.retainCommonCategories4(token1, token2, token3, token4);
    let ruleMatch = null;
    if (set.size === 0) {
      const compoundMatch = this.getCompoundError4(token1, token2, token3, token4, tokenPos, sentence, skippedStr);
      if (compoundMatch !== null) {
        return compoundMatch;
      }
      if (token4.hasPosTagStartingWith('ABK')) {
        return null;
      }
      ruleMatch = new RuleMatch(this, sentence, token1.getStartPos(), token4.getEndPos(), MSG2, SHORT_MSG);
      if (replMap !== null) {
        const suggestor = new AgreementSuggestor2(this.language.getSynthesizer(), token1, token2, token3, token4, replMap.get(tokenPos) ?? null);
        suggestor.setPreposition(maybePreposition);
        suggestor.setSkipped(skippedStr);
        ruleMatch.setSuggestedReplacements(suggestor.getSuggestions(true));
      }
    }
    return ruleMatch;
  }

  // Java: AgreementRule#agreementWithCategoryRelaxation(AnalyzedTokenReadings,AnalyzedTokenReadings,GrammarCategory)
  agreementWithCategoryRelaxation(token1, token2, categoryToRelax) {
    let categoryToRelaxSet;
    if (categoryToRelax !== null) {
      categoryToRelaxSet = new Set([categoryToRelax]);
    } else {
      categoryToRelaxSet = new Set();
    }
    const set1 = AgreementTools.getAgreementCategories(token1, categoryToRelaxSet, true);
    const set2 = AgreementTools.getAgreementCategories(token2, categoryToRelaxSet, true);
    AgreementTools.retainAll(set1, set2);
    return set1.size !== 0;
  }

  // Java: AgreementRule#retainCommonCategories(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings)
  retainCommonCategories3(token1, token2, token3) {
    const categoryToRelaxSet = new Set();
    const skipSol = !VIELE_WENIGE_LOWERCASE.has(toLowerCase(token1.getToken()));
    const set1 = AgreementTools.getAgreementCategories(token1, categoryToRelaxSet, skipSol);
    const set2 = AgreementTools.getAgreementCategories(token2, categoryToRelaxSet, skipSol);
    const set3 = AgreementTools.getAgreementCategories(token3, categoryToRelaxSet, true);
    AgreementTools.retainAll(set1, set2);
    AgreementTools.retainAll(set1, set3);
    return set1;
  }

  // Java: AgreementRule#retainCommonCategories(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedTokenReadings)
  retainCommonCategories4(token1, token2, token3, token4) {
    const categoryToRelaxSet = new Set();
    const skipSol = !VIELE_WENIGE_LOWERCASE.has(toLowerCase(token1.getToken()));
    const set1 = AgreementTools.getAgreementCategories(token1, categoryToRelaxSet, skipSol);
    const set2 = AgreementTools.getAgreementCategories(token2, categoryToRelaxSet, skipSol);
    const set3 = AgreementTools.getAgreementCategories(token3, categoryToRelaxSet, skipSol);
    const set4 = AgreementTools.getAgreementCategories(token4, categoryToRelaxSet, true);
    AgreementTools.retainAll(set1, set2);
    AgreementTools.retainAll(set1, set3);
    AgreementTools.retainAll(set1, set4);
    return set1;
  }

  // Java: AgreementRule#getAgreementCategories(AnalyzedTokenReadings)
  getAgreementCategories(aToken) {
    return AgreementTools.getAgreementCategories(aToken, new Set(), false);
  }
}
