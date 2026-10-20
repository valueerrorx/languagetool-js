// org.languagetool.rules.de.AgreementRule2 (SENT_START ADJ NOUN agreement, e.g. "Wirtschaftlicher Wachstum")
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';
import * as AgreementTools from './AgreementTools.js';

const ADJ_GRU = 'Allgemein|Ausgiebig|Stilvoll|Link|Direkt|Gegenseitig|Offensichtlich|Weitgehend|Frei|Prinzipiell|Regelrecht|Kostenlos|Gleichzeitig|Ganzjährig|Überraschend|Entsprechend|Ordentlich|Gelangweilt';

// Java: AgreementRule2#ANTI_PATTERNS
const ANTI_PATTERNS = [
    [csRegex("Willkommen|Link|Aktuell|Diverse|Flächendeckend|Entsprechende|Angeblich|Gelegentlich|Antizyklisch|Unbedingt|Zusätzlich|Natürlich|Äußerlich|Erfolgreich|" +
      "Spät|Länger|Vorrangig|Rechtzeitig|Typisch|Allwöchentlich|Wöchentlich|Inhaltlich|Tagtäglich|Täglich|Komplett|" +
      "Genau|Gerade|Bewusst|Vereinzelt|Gänzlich|Ständig|Okay|Meist|Generell|Ausreichend|Genügend|Reichlich|" +
      "Regelmäßig(e|es)?|Unregelmäßig|Hauptsächlich"), posRegex("SUB:.*")],  // "Regelmäßig Kiwis und Ananas zu essen...", "Reichlich Inspiration bietet..."
    [csRegex(ADJ_GRU), posRegex("SUB:.*"), posRegex("VER:.*")],  // "Überraschend Besuch bekommt er dann von ..."
    [csRegex(ADJ_GRU), posRegex("SUB:.*"), posRegex("PRP.*")],  // "Prinzipiell Anrecht auf eine Vertretung..."
    [csRegex(ADJ_GRU), posRegex("SUB:.*"), token(",")],  // "Weitgehend Konsens, auch über ..."
    [csRegex("Gut|Schlecht|Existenziell|Ganz|Gering|Viel|Wenig"), posRegex("SUB:.*ADJ")],  // "Existenziell Bedrohte kriegen..."
    [regex("Nachhaltig|Direkt"), posRegex("SUB:NOM:.*"), posRegex("VER:INF:(SFT|NON)")],  // 'nachhaltig Yoga praktizieren'
    [regex("\\d0er"), regex("Jahren?")],
    [token("Liebe"), token("Mai")],   // Mai = auch Eigenname
    [token("Ganz"), token("Ohr")],
    [token("Klar"), token("Schiff")],
    [token("Echt"), tokenRegex("Scheiße|Mist")],
    [token("Dickes"), token("Danke")],
    [token("Personal"), token("Shopper")],
    [token("Schwäbisch"), token("Hall")],
    [token("Herzlich"), token("Willkommen")],
    [token("Gut"), tokenRegex("Ding|Holz")],  // "Gut Ding will Weile haben"
    [token("Urban"), token("Mining")],
    [token("Responsive"), token("Design")],
    [token("Dual"), token("Studierende")],
    [token("Deutsche"), csRegex("Grammophon|Wohnen")],
    [posRegex("ADJ.*"), tokenRegex(".+beamte")],  // "Alarmierte Polizeibeamte"
    [new PatternTokenBuilder().token("Anderen").setSkip(5).build(), posRegex("VER:INF:(SFT|NON)")],  // "Anderen Brot und Arbeit ermöglichen - ..."
    [regex("echt|absolut|voll|total"), regex("Wahnsinn|Klasse")],
    [pos("SENT_START"), pos("ADJ:PRD:GRU"), posRegex("SUB:NOM:SIN:NEU:INF")],  // "Ruhig Schlafen & Zentral Wohnen"
    [tokenRegex("voll|voller"), posRegex("SUB:NOM:SIN:.*")],  // "Voller Mitleid", "Voller Mitleid"
    [token("einzig"), posRegex("SUB:NOM:.*")],  // "Einzig Fernschüsse brachten Erfolgsaussichten"
    [tokenRegex("Intelligent|Urban"), token("Design")],
    [token("Alternativ"), token("Berufserfahrung")],  // "Alternativ Berufserfahrung im Bereich ..."
    [token("Maritim"), token("Hotel")],
    [csToken("Russisch"), csToken("Brot")],
    [token("ruhig"), csToken("Blut")],
    [token("Blind"), regex("Dates?")],
    [token("Fair"), token("Trade")],
    [token("Frei"), token("Haus")],
    [token("Global"), token("Player")],
    [token("psychisch"), regex("Kranken?")],
    [token("sportlich"), regex("Aktiven?")],
    [token("politisch"), regex("Interessierten?")],
    [token("voraussichtlich"), regex("Ende|Anfang")],
    [regex("gesetzlich|privat|freiwillig"), regex("(Kranken)?Versicherten?")],
    [token("typisch"), posRegex("SUB:.*"), regex("[!?.]")],  // "Typisch November!"
    [token("lecker"), token("Essen")],  // "Lecker Essen an Weihnachten."
    [token("erneut"), posRegex("SUB:.*")],  // "Erneut Ausgangssperre beschlossen"
    [token("Gesetzlich"), regex("Krankenversicherten?")],
    [token("weitgehend"), token("Einigkeit")],      // feste Phrase
    [token("Ernst")],      // Vorname
    [token("Anders")],     // Vorname
    [token("wirklich")],   // "Wirklich Frieden herrscht aber noch nicht"
    [token("gemeinsam")],   // "Gemeinsam Sportler anfeuern"
    [token("wenig")],      // "Wenig Geld - ..."
    [token("weniger")],      // "Weniger Geld - ..."
    [token("unaufgefordert")],      // Unaufgefordert Dinge erledigen
    [token("richtig")],    // "Richtig Kaffee kochen ..."
    [token("weiß")],       // "Weiß Papa, dass ..."
    [token("speziell")],   // "Speziell Flugfähigkeit hat sich unabhängig voneinander ..."
    [token("proaktiv")],   // "Speziell Flugfähigkeit hat sich unabhängig voneinander ..."
    [token("halb")],       // "Halb Traum, halb Wirklichkeit"
    [token("hinter")],     // "Hinter Bäumen"
    [token("vermutlich")], // "Vermutlich Ende 1813 erkrankte..."
    [token("eventuell")], // "Eventuell Ende 1813 erkrankte..."
    [token("ausschließlich")],
    [token("ausschliesslich")],
    [token("bloß")],       // "Bloß Anhängerkupplung und solche Dinge..."
    [token("einfach")],    // "Einfach Bescheid sagen ..."
    [token("egal")],
    [token("endlich")],    // "Endlich Mittagspause!"
    [token("unbemerkt")],    // "Unbemerkt Süßigkeiten essen"
    [token("Typisch"), tokenRegex("Mann|Frau")],    // "Einfach Bescheid sagen ..."
    [token("Ausreichend"), tokenRegex("Bewegung")],    // "Ausreichend Bewegung ..."
    [token("Genau"), token("Null")],
    [token("wohl")],       // "Wohl Anfang 1725 begegnete Bach ..."
    [token("erst")],       // "Erst X, dann ..."
    [token("lieber")],     // "Lieber X als Y"
    [token("besser")],     // "Besser Brot ohne Butter..."
    [token("laut")],       // "Laut Fernsehen"
    [token("research")],   // engl.
    [token("researchs")],  // engl.
    [token("security")],   // engl.
    [token("business")],   // oft engl.
    [token("Universal")],   // oft engl.
    [token("voll"), token("Sorge")],
    [token("Total"), tokenRegex("Tankstellen?")],
    [token("Ganz"), token("Gentleman")],
    [token("Kurz"), token("Zeit"), tokenRegex("für|um")], // Kurz Zeit für einen Call?
    [token("Golden"), token("Gate")],
    [token("Wirtschaftlich"), tokenRegex("Berechtigte[rn]?")],
    [token("Russisch"), token("Roulette")],
    [token("Clever"), tokenRegex("Shuttles?")], // name
    [token("Personal"), tokenRegex("(Computer|Coach|Trainer|Brand).*")],
    [tokenRegex("Digital|Fair|Regional|Global|Bilingual|International|National|Visual|Final|Rapid|Dual|Golden|Human"), tokenRegex("(Initiative|Office|Connection|Bootcamp|Leadership|Sales|Community|Service|Management|Board|Identity|City|Paper|Transfer|Transformation|Power|Shopping|Brand|Master|Gate|Drive|Learning|Publishing|Signage|Value|Entertainment|Museum|Register|Society|Union|Institute|Symposium|Style|Design|Edition).*")],
    [token("Smart")],
    [token("International"), tokenRegex("Society|Olympic|Space")],
    [token("GmbH")]
  ];


// Java: AgreementRule2
export class AgreementRule2 extends Rule {
  static FQCN = 'org.languagetool.rules.de.AgreementRule2';

  // Java: AgreementRule2(ResourceBundle,Language)
  constructor(messages, language) {
    super();
    this.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.addExamplePair(Example.wrong('<marker>Kleiner Haus</marker> am Waldrand'),
      Example.fixed('<marker>Kleines Haus</marker> am Waldrand'));
    this.antiPatterns = Rule.cacheAntiPatterns(language, ANTI_PATTERNS);
  }

  // Java: AgreementRule2#getId()
  getId() {
    return 'DE_AGREEMENT2';
  }

  // Java: AgreementRule2#getDescription()
  getDescription() {
    return "Kongruenz von Adjektiv und Nomen (unvollständig!), z.B. 'kleiner (kleines) Haus'";
  }

  // Java: AgreementRule2#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return ANTI_PATTERNS.reduce((max, l) => Math.max(max, l.length), 0);
  }

  // Java: AgreementRule2#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: AgreementRule2#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].getToken();
      if (!tokens[i].isSentenceStart() && !equalsAny(token, '"', '„', '»', '«')) {
        // skip quotes, as these are not relevant
        if (i + 1 < tokens.length && tokens[i].hasPosTagStartingWith('ADJ') && tokens[i + 1].hasPosTagStartingWith('SUB') && !tokens[i + 1].hasPosTagStartingWith('EIG')) {
          if (tokens[i].isImmunized() || tokens[i + 1].isImmunized() || equalsIgnoreCase(tokens[i].getToken(), 'unter')) {
            continue;
          }
          const nextToken = i + 2 < tokens.length ? tokens[i + 2] : null;
          if (nextToken !== null && nextToken.hasPosTagStartingWith('SUB')) {
            // no alarm for e.g. "Deutscher Taschenbuch Verlag"
            break;
          }
          const ruleMatch = this.checkAdjNounAgreement(tokens[i], tokens[i + 1], sentence);
          if (ruleMatch !== null) {
            const suggestions = this.getSuggestions(tokens, i);
            ruleMatch.setSuggestedReplacements(suggestions);
            ruleMatches.push(ruleMatch);
            break;
          }
        } else {
          // rule only works at sentence start (minus quotes)
          break;
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AgreementRule2#getSuggestions(AnalyzedTokenReadings[],int)
  getSuggestions(tokens, i) {
    const suggestions = [];
    const adjToken = tokens[i].getAnalyzedToken(0);
    for (const nounToken of tokens[i + 1].getReadings()) {
      if (nounToken.getPOSTag() === null) {
        continue;
      }
      try {
        const gender = getGender(nounToken);
        if (gender === null) {
          continue;
        }
        const number = getNumber(nounToken);
        if (number === null) {
          continue;
        }
        const forms = GermanSynthesizer.INSTANCE.synthesize(adjToken, 'ADJ:NOM:' + number + ':' + gender + ':GRU:SOL', true);
        for (const s of forms) {
          const fullSugg = uppercaseFirstChar(s) + ' ' + nounToken.getToken();
          if (!suggestions.includes(fullSugg)) {
            suggestions.push(fullSugg);
          }
        }
      } catch (e) {
        if (e instanceof IOException) throw new RuntimeException(e);
        throw e;
      }
    }
    return suggestions;
  }

  // Java: AgreementRule2#checkAdjNounAgreement(AnalyzedTokenReadings,AnalyzedTokenReadings,AnalyzedSentence)
  checkAdjNounAgreement(token1, token2, sentence) {
    const set = this.retainCommonCategories(token1, token2);
    let ruleMatch = null;
    if (set.size === 0) {
      const msg = 'Möglicherweise fehlende grammatikalische Übereinstimmung zwischen Adjektiv und ' +
            "Nomen bezüglich Kasus, Numerus oder Genus. Beispiel: 'kleiner Haus' statt 'kleines Haus'";
      const shortMsg = 'Möglicherweise keine Übereinstimmung bezüglich Kasus, Numerus oder Genus';
      ruleMatch = new RuleMatch(this, sentence, token1.getStartPos(), token2.getEndPos(), msg, shortMsg);
    }
    return ruleMatch;
  }

  // Java: AgreementRule2#retainCommonCategories(AnalyzedTokenReadings,AnalyzedTokenReadings)
  retainCommonCategories(token1, token2) {
    const categoryToRelaxSet = new Set();
    // finds more error but also more false alarms? see commented out cases in testSuggestion():
    //Set<String> set1 = AgreementTools.getAgreementSOLCategories(token1, categoryToRelaxSet);
    const set1 = AgreementTools.getAgreementCategories(token1, categoryToRelaxSet, false);
    const set2 = AgreementTools.getAgreementCategories(token2, categoryToRelaxSet, false);
    AgreementTools.retainAll(set1, set2);
    return set1;
  }
}

// Java: AgreementRule2#getGender(AnalyzedToken)
function getGender(nounToken) {
  let gender;
  if (nounToken.getPOSTag().includes(':MAS')) {
    gender = 'MAS';
  } else if (nounToken.getPOSTag().includes(':FEM')) {
    gender = 'FEM';
  } else if (nounToken.getPOSTag().includes(':NEU')) {
    gender = 'NEU';
  } else {
    return null;
  }
  return gender;
}

// Java: AgreementRule2#getNumber(AnalyzedToken)
function getNumber(nounToken) {
  let number;
  if (nounToken.getPOSTag().includes(':SIN:')) {
    number = 'SIN';
  } else if (nounToken.getPOSTag().includes(':PLU:')) {
    number = 'PLU';
  } else {
    return null;
  }
  return number;
}
