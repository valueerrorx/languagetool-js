// org.languagetool.rules.de.VerbAgreementRule
import * as Character from '../../../lib/java/Character.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { levenshteinDistance } from '../../../lib/java/LevenshteinDistance.js';
import { TextLevelRule } from '../../../core/rules/model/TextLevelRule.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { AnalyzedSentence } from '../../../core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { SENTENCE_START_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { toLowerCase, charAt } from '../../../lib/java/strings.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';

// Java: VerbAgreementRule#ANTI_PATTERNS
const ANTI_PATTERNS =
[
    [ // "Ken dachte, du wärst ich."
      token('du'),
      token('wärst'),
      token('ich')
    ],
    [ // "*runterguck* das ist aber tief" (Inflektiv)
      token('*'),
      posRegex('VER:1:SIN:PRÄ:.*'),
      token('*')
    ],
    [ // "Weder Peter noch ich wollen das."
      new PatternTokenBuilder().token('weder').setSkip(8).build(),
      token('noch'),
      token('ich')
    ],
    [ // "Kümmerst dich ja gar nicht um sie." (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:PRÄ:.*'),
      posRegex('PRO:.*')
    ],
    [ // "Stehst einfach nicht zu mir." (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:PRÄ:.*'),
      tokenRegex('einfach|denn|schon')
    ],
    [ // "Stellst für deinen Dad etwas zu Essen bereit." (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:PRÄ:.*'),
      posRegex('PRP:.*')
    ],
    [ // "Springst weit, oder?" (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:PRÄ:.*'),
      posRegex('ADJ:PRD:.*')
    ],
    [ // "Siehst aus wie ein Wachhund." (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:PRÄ:.*'),
      pos('ZUS')
    ],
    [ // "Könntest was erfinden, wie dein Papa." (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      pos('VER:MOD:2:SIN:KJ2'),
      posRegex('PRO:.*')
    ],
    [ // "Darfst nicht so reden, Franz!" (okay for colloquial language)
      pos(SENTENCE_START_TAGNAME),
      pos('VER:MOD:2:SIN:PRÄ'),
      new PatternTokenBuilder().token('ich|er|sie|es|wir|ihr|sie').negate().build()
    ],
    [  // "sobald wir frische und neue Akkus haben."
      token('wir'),
      token('frische')
    ],
    [  // "wo der Stadtrat gleich mal zum Du übergeht."
      token('zum'),
      csToken('Du'),
      new PatternTokenBuilder().tokenRegex('wechseln|übergehen|schwenken').matchInflectedForms().build()
    ],
    [
      token('ich'),
      token('schlafen'),
      token('gehe')
    ],
    [
      // Ich bin du
      token('ich'),
      tokenRegex('bin|war'),
      token('du')
    ],
    [
      // Dann beende du den Auftrag und bring sie ihrem Vater.
      tokenRegex('darum|deswegen|dann|bitte|so|,|-'),
      posRegex('VER:IMP:SIN.*'),
      token('du')
    ],
    [
      // - Wirst du ausflippen?
      tokenRegex('[-–]'),
      posRegex('VER:.*(AUX|MOD).*'),
      token('du'),
      posRegex('VER:INF.*')
    ],
    [
      tokenRegex('-(du|ich|er|sie|wir|ihr)'),
      posRegex('VER.*')
    ],
    [
      tokenRegex('bin|war|wär'),
      tokenRegex('i|icke?')
    ],
    [
      tokenRegex('i|icke?'),
      tokenRegex('bin|war|wär')
    ],
    [
      token('du'),
      token('schlafen'),
      token('gehst')
    ],
    [
      token('per'),
      token('du'),
      tokenRegex('sind|waren|sein|wären|war|ist|gewesen')
    ],
    [
      token('schnellst'),
      token('möglich')
    ],
    [
      // "Da freut er sich, wenn er schlafen geht und was findet."
      token('er'),
      token('schlafen'),
      token('geht')
    ],
    [
      token('vermittelst')  // "Sie befestigen die Regalbretter vermittelst dreier Schrauben."
    ],
    [
      token('du'),
      token('denkst'),
      token('ich')
    ],
    [
      token('na'),
      token('komm')
    ],
    [
      tokenRegex('muß|mußten?|müßt?en?'), // alte rechtschreibung (andere fehler)
      tokenRegex('ich|wir|sie|er|es')
    ],
    [
      tokenRegex('ich|wir|sie|er|es'),
      posRegex('VER.*INF.*'),
      tokenRegex('muß|mußten?|müßt?en?') // alte rechtschreibung (andere fehler)
    ],
    [
      tokenRegex('mußt|müßtest|mußtest'), // alte rechtschreibung (andere fehler)
      token('du')
    ],
    [
      token('du'),
      posRegex('VER.*INF.*'),
      tokenRegex('mußt|müßtest|mußtest') // alte rechtschreibung (andere fehler)
    ],
    [
      token('ich'),
      tokenRegex('würd|könnt|werd|wollt|sollt|müsst|fürcht'),
      tokenRegex("['’`´‘]")
    ],
    [
      tokenRegex('wir|sie|zu'),
      tokenRegex('seh|steh|geh'),
      tokenRegex("['’`´‘]"),
      token('n')
    ],
    [
      token('ick'), // different error (berlinerisch)
      tokenRegex('bin|war|wär|hab|hatte')
    ],
    [
      // hash tag
      token('#'),
      posRegex('VER.*')
    ],
    [
      // wie du war ich auch
      token('wie'),
      tokenRegex('du|ihr|er|es|sie'),
      posRegex('VER.*')
    ],
    [
      tokenRegex('[-:]'),
      posRegex('VER.*(MOD|AUX).*')
    ],
    [
      // Arabic names: Aryat Abraha bin Sabah Kaaba
      posRegex('UNKNOWN|EIG.*'),
      token('bin'),
      posRegex('UNKNOWN|EIG.*')
    ],
    [
      // Du scheiß Idiot
      tokenRegex('du|sie'),
      tokenRegex('schei(ß|ss)'),
      posRegex('SUB.*|UNKNOWN')
    ],
     [
       token('Du'),
       tokenRegex('bist|warst|wärst')
     ],
     [
       token('als'),
       token('auch'),
       tokenRegex('er|sie|wir|du|ich|ihr')
     ],
     [
       tokenRegex('so|wie|zu'),
       token('lange'),
       tokenRegex('er|sie|wir|du|ich|ihr')
     ],
     [
       // Ich will nicht so wie er enden.
       new PatternTokenBuilder().tokenRegex('so|genauso|ähnlich').matchInflectedForms().setSkip(2).build(),
       token('wie'),
       tokenRegex('er|sie|du|ihr|ich'),
       posRegex('VER.*')
     ],
     [
       // Ich will wie er aussehen
       posRegex('VER.*(MOD|AUX).*'),
       token('wie'),
       tokenRegex('er|sie|du|ihr|ich'),
       posRegex('VER.*INF.*')
     ],
     [
       // Ich will wie er aussehen
       token('wie'),
       posRegex('ADJ:PRD:GRU.*'),
       tokenRegex('er|sie|du|ihr|ich'),
       posRegex('VER.*')
     ],
    [
      // "Bekommst sogar eine Sicherheitszulage"
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:.*'),
      posRegex('ART.*|ADV.*|PRO:POS.*')
    ],
    [
      // "A, B und auch ich"
      token(','),
      posRegex('EIG:.*|UNKNOWN'),
      regex('und|oder'),
      token('auch'),
      token('ich')
    ],
    [
      // "Dallun sagte nur, dass er gleich kommen wird und legte wieder auf."
      // "Sie fragte, ob er bereit für die zweite Runde ist."
      posRegex('VER.*'),  // z.B. "Bist"
      tokenRegex('er|sie|ich|wir|du|es|ihr'),
      tokenRegex('gleich|bereit|lange|schnelle?|halt|bitte|dank')  // ist hier kein Verb
    ],
    [
      // "Dallun sagte nur, dass er gleich kommen wird und legte wieder auf."
      posRegex('ADV.*|KON.*'),
      tokenRegex('er|sie|ich|wir|du|es|ihr'),
      tokenRegex('gleich|bereit|lange|schnelle?|halt|bitte|dank')  // ist hier kein Verb
    ],
    [
      // "Woraufhin ich verlegen lächelte"
      posRegex('ADV.*|KON.*'),
      tokenRegex('er|sie|ich|wir|du|es|ihr'),
      tokenRegex('verlegen'),
      posRegex('VER.*')
    ],
    [
      // "Bringst nicht einmal so etwas Einfaches zustande!"
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:2:SIN:.*'),
      token('nicht')
    ],
    [
      // "Da machte er auch vor dem eigenen Volk nicht halt."
      new PatternTokenBuilder().token('machen').matchInflectedForms().setSkip(-1).build(),
      token('halt')
    ],
    [  // "Ich hoffe du auch."
      posRegex('VER:.*'),
      tokenRegex('du|ihr'),
      token('auch')
    ],
    [
      // "Für Sie mache ich eine Ausnahme."
      token('für'),
      token('Sie'),
      pos('VER:3:SIN:KJ1:SFT'),
      token('ich')
      ],
    [
      // "Einer wie du kennt ...", "Aber wenn jemand wie Du daherkommt"
      tokenRegex('(irgend)?einer?|(irgend)?jemand'),
      token('wie'),
      token('du'),
      posRegex('VER:3:.*')
    ],
    [
      // "Kannst mich gerne anrufen" (ugs.)
      pos('VER:MOD:2:SIN:PRÄ'),
      posRegex('PRO:PER:.*')
    ],
    [
      tokenRegex('die|welche'),
      tokenRegex('.*'),
      tokenRegex('mehr|weniger'),
      token('als'),
      tokenRegex('ich|du|e[rs]|sie')
    ],
    [
      token('wenn'),
      token('du'),
      token('anstelle')
    ],
    [ // "Ok bin ab morgen bei euch." (umgangssprachlich, benötigt eigene Regel)
      tokenRegex('ok(ay)?|ja|nein|vielleicht|oh'),
      tokenRegex('bin|sind')
    ],
    [
      token('das'),
      csToken('Du'),
      new PatternTokenBuilder().token('anbieten').matchInflectedForms().build()
    ],
    [
      csToken('Du'),  // "jemanden mit Du anreden"
      new PatternTokenBuilder().tokenRegex('anreden|ansprechen').matchInflectedForms().build()
    ],
    [
      posRegex('SUB:.*PLU.*'),
      token('wie'),  // "Schreibtischtäter wie Du sind doch eher selten."
      token('Du'),
      posRegex('VER:3:PLU.*')
    ],
    [
      token('würd'),
      tokenRegex("[nm]ich|man|ichs|'")
    ],
    [
      token(','),
      posRegex('VER:MOD:2:.*')
    ],
    [
      csToken('Soll'),
      token('ich')
    ],
    [
      csToken('Solltest'),
      token('du')
    ],
    [
      csToken('Müsstest'), // Müsstest dir das mal genauer anschauen.
      token('dir')
    ],
    [
      csToken('Könntest'), // Könntest dir mal eine Scheibe davon abschneiden!
      token('dir')
    ],
    [
      csToken('Sollte'),
      tokenRegex('er|sie')
    ],
    [
      pos(SENTENCE_START_TAGNAME),  // "Bin gleich wieder da"
      tokenRegex('Bin|Kannst|Musst')
    ],
    [
      token(','),  // "..., hast aber keine Ahnung!"
      tokenRegex('bin|hast|kannst|musst')
    ],
    [
      token('er'),  // "egal, was er sagen wird, ..."
      posRegex('VER:.*'),
      token('wird')
    ],
    [
      tokenRegex('wie|als'),  // "Ein Mann wie ich braucht einen Hut"
      token('ich'),
      posRegex('VER:.*')
    ],
    [
      tokenRegex('glaube?|denke?|hoffe?|vermute?|behaupte?|wette?'),  // "Wir haben da ein monatliches Limit, in das wir glaube ich schon für September reingelaufen sind."
      token('ich'),
      posRegex('ADV.*|SUB.*|UNKNOWN|ADJ.*|PA[12].*|ART.*|PRP.*|PRO.*')
    ],
    [
      tokenRegex('ich'),  // "Ich weiß, was ich tun werde, falls etwas geschehen sollte."
      pos('VER:INF:NON'),
      token('werde')
    ],
    [
      posRegex('VER:IMP:SIN:.*'),  // "Kümmere du dich mal nicht darum!"
      token('du'),
      tokenRegex('dich|dein|deine[srnm]?|mal')
    ],
    [
      posRegex('VER:IMP:SIN:.*'),  // "Nee, geh du!"
      token('du'),
      token('!')
    ],
    [
      token('sei'),
      token('du'),
      token('selbst')
    ],
    [
      token('bin'),
      tokenRegex('dran|dabei')
    ],
    [
      token('als'),  // "Du bist in dem Moment angekommen, als ich gegangen bin."
      token('ich'),
      posRegex('PA2:.*'),
      token('bin')
    ],
    [
     token('als'),
     tokenRegex('du|e[rs]|sie|ich'),
     new PatternTokenBuilder().token('sein').matchInflectedForms().build(),
     tokenRegex('[\\.,]')
    ],
    [ // Musst du gehen?
     tokenRegex('D[au]rf.*|Muss.*'),
     posRegex('PRO:PER:NOM:.+'),
     posRegex('VER:INF:.+'),
     pos('PKT'),
     tokenRegex('(?!die).+')
    ],
    [
     csToken('('),
     posRegex('VER:2:SIN:.+'),
     csToken(')')
    ],
    [
     posRegex('VER:MOD:1:PLU:.+'),
     csToken('wir'),
     csToken('bitte')
    ],
    [ // Ohne sie hätte ich das nie geschafft.
     token('ohne'),
     token('sie'),
     token('hätte'),
     token('ich')
    ],
    [ // Geh du mal!
      pos(SENTENCE_START_TAGNAME),
      posRegex('VER:IMP:SIN.+'),
      token('du'),
      new PatternTokenBuilder().csToken('?').negate().build()
    ],
    [ // -Du fühlst dich unsicher?
      tokenRegex('[^a-zäöüß]+du'),
      pos('VER:2:SIN:PRÄ:SFT')
    ],
    [ // Mir ist bewusst, dass viele Menschen wie du empfinden.
      posRegex('PRO:IND.*'),
      posRegex('SUB:.+:PLU.*'),
      tokenRegex('wie|als'),
      posRegex('PRO:PER.+'),
      posRegex('VER:[1-3]:PLU.*')
    ],
    [ //Weniger als du arbeitet keiner.
      pos('ADV:MOD'),
      tokenRegex('als'),
      posRegex('PRO:PER.+'),
      posRegex('VER:3:SIN.*'),
      posRegex('PRO:IND:NOM:SIN.*')
    ],
    [ //So was wie er könnte ich nicht machen, dich einfach dann zu verlassen
      posRegex('PRO:IND.*'),
      tokenRegex('wie'),
      posRegex('PRO:PER.+'),
      posRegex('VER:.*:SIN.*'),
      posRegex('PRO:PER:NOM:SIN.*')
    ],
    [ //Kein anderer als du kann mich glücklich machen
      tokenRegex('kein|keine'),
      tokenRegex('anderer|andere'),
      token('als'),
      tokenRegex('ich|du|er|sie|es'),
      posRegex('VER:MOD.*:PRÄ')
    ],
    [ // Ich will nicht die gleiche Luft wie er einatmen
      posRegex('ART:DEF.*'),
      tokenRegex('gleich(e|en)|selb(e|en)'),
      posRegex('SUB:.+'),
      token('wie'),
      posRegex('PRO:PER:NOM:SIN.*'),
      posRegex('VER:INF.*')
    ],
    [ // Was würdest du sagen, wenn du ich wärst?
      token('wenn'),
      posRegex('PRO:PER:NOM:SIN.+'),
      posRegex('PRO:PER:NOM.+'),
      posRegex('VER:AUX:[1-3]:SIN:KJ2')
    ],
    [ // Was würdet ihr sagen, wenn ihr ich wärt?
      token('wenn'),
      posRegex('PRO:PER:NOM:PLU.+'),
      posRegex('PRO:PER:NOM.+'),
      posRegex('VER:AUX:[1-3]:PLU:KJ2')
    ],
    [ //Wenn du gehen willst, dann geh!
      token('wenn'),
      token('du'),
      token('gehen'),
      token('willst'),
      token(','),
      token('dann'),
      token('geh')
    ],
    [ //Ich habe mich noch nicht entschieden, ob ich studieren oder arbeiten gehen soll.
      token('ob'),
      token('ich'),
      posRegex('VER:1.+'),
      token('oder'),
      posRegex('VER:1.+'),
      new PatternTokenBuilder().token('gehen').matchInflectedForms().build(),
      posRegex('VER:MOD:1.*')
    ],
    [ //Mal seh’n, wie’s Wetter wird.
      token('mal'),
      token('seh'),
      tokenRegex("’|'"),
      token('n')
    ]
  ];

// Java: VerbAgreementRule#BIN_IGNORE (words that prevent a rule match when they occur directly before "bin")
const BIN_IGNORE = new Set([
  'Suleiman',
  'Mohamed',
  'Muhammad',
  'Muhammed',
  'Mohammed',
  'Mohammad',
  'Mansour',
  'Qaboos',
  'Qabus',
  'Tamim',
  'Majid',
  'Salman',
  'Ghazi',
  'Mahathir',
  'Madschid',
  'Maktum',
  'al-Aziz',
  'Asis',
  'Numan',
  'Hussein',
  'Abdul',
  'Abdulla',
  'Abdullah',
  'Isa',
  'Osama',
  'Said',
  'Zayid',
  'Zayed',
  'Hamad',
  'Chalifa',
  'Raschid',
  'Turki',
  '/',
]);

// Java: VerbAgreementRule#CONJUNCTIONS
const CONJUNCTIONS = new Set([
  'weil',
  'obwohl',
  'dass',
  'indem',
  'sodass', /*,
    "damit",
    "wenn" */
]);

const QUOTATION_MARKS = new Set([ // Java: QUOTATION_MARKS
  '"', '„',
]);
const COMMA = Pattern.compile('‚', Pattern.LITERAL); // Java: COMMA

// Java: VerbAgreementRule.BooleanAndFiniteVerb
class BooleanAndFiniteVerb {
  // Java: BooleanAndFiniteVerb(boolean,AnalyzedTokenReadings)
  constructor(verbDoesMatchPersonAndNumber, finiteVerb) {
    this.verbDoesMatchPersonAndNumber = verbDoesMatchPersonAndNumber;
    this.finiteVerb = finiteVerb;
  }
}

// Java: VerbAgreementRule
export class VerbAgreementRule extends TextLevelRule {
  static FQCN = 'org.languagetool.rules.de.VerbAgreementRule';

  // Java: VerbAgreementRule(ResourceBundle,German)
  constructor(messages, language) {
    super();
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.addExamplePair(Example.wrong('Ich <marker>bist</marker> über die Entwicklung sehr froh.'),
      Example.fixed('Ich <marker>bin</marker> über die Entwicklung sehr froh.'));
    this.antiPatterns = Rule.cacheAntiPatterns(language, ANTI_PATTERNS);
  }

  // Java: VerbAgreementRule#getId()
  getId() {
    return 'DE_VERBAGREEMENT';
  }

  // Java: VerbAgreementRule#getDescription()
  getDescription() {
    return "Kongruenz von Subjekt und Prädikat (nur 1. u. 2. Person oder m. Personalpronomen), z.B. 'Er bist (ist)'";
  }

  // Java: VerbAgreementRule#match(List)
  match(sentences) {
    const ruleMatches = [];
    let pos = 0;
    for (const sentence of sentences) {
      let idx = 0;
      const tokens = sentence.getTokens();
      let partialSentence;
      for (let i = 2; i < tokens.length; i++) {
        if (',' === tokens[i - 2].getToken() && CONJUNCTIONS.has(tokens[i].getToken())) {
          partialSentence = new AnalyzedSentence(tokens.slice(idx, i));
          ruleMatches.push(...this.matchPartial(partialSentence, pos, sentence));
          idx = i;
        }
      }
      partialSentence = new AnalyzedSentence(tokens.slice(idx, tokens.length));
      ruleMatches.push(...this.matchPartial(partialSentence, pos, sentence));
      pos += sentence.getCorrectedTextLength();
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: VerbAgreementRule#match(AnalyzedSentence,int,AnalyzedSentence) (private overload)
  matchPartial(sentence, pos, wholeSentence) {
    const finiteVerb = null;
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();

    if (tokens.length < 4) { // ignore one-word sentences (3 tokens: SENT_START, one word, SENT_END)
      return ruleMatches;
    }

    // position of the pronouns:
    let posIch = -1;
    let posDu = -1;
    let posEr = -1;
    let posWir = -1;
    // positions of verbs which do match in person and number, and do not match any other person nor number:
    let posVer1Sin = -1;
    let posVer2Sin = -1;
    let posVer1Plu = -1;
    /* int posVer2Plu = -1; */
    // positions of verbs which do match in person and number:
    let posPossibleVer1Sin = -1;
    let posPossibleVer2Sin = -1;
    let posPossibleVer3Sin = -1;
    let posPossibleVer1Plu = -1;
    /* int posPossibleVer2Plu = -1; */

    for (let i = 1; i < tokens.length; ++i) { // ignore SENT_START
      let strToken = toLowerCase(tokens[i].getToken());
      strToken = COMMA.matcher(strToken).replaceAll('');

      switch (strToken) {
        case 'ich':
          posIch = i;
          break;
        case 'du':
          posDu = i;
          break;
        case 'er':
          posEr = i;
          break;
        case 'wir':
          posWir = i;
          break;
        default:
          break;
      }

      if (tokens[i].hasPartialPosTag('VER')
          && (Character.isLowerCase(charAt(tokens[i].getToken(), 0)) || i === 1 || this.isQuotationMark(tokens[i - 1]))) {
        if (this.hasUnambiguouslyPersonAndNumber(tokens[i], '1', 'SIN')
            && !(strToken === 'bin' && (BIN_IGNORE.has(tokens[i - 1].getToken())
                  || (tokens.length !== i + 1 && tokens[i + 1].getToken().startsWith('Laden'))))) {
          posVer1Sin = i;
        } else if (this.hasUnambiguouslyPersonAndNumber(tokens[i], '2', 'SIN') && 'Probst' !== tokens[i].getToken()) {
          posVer2Sin = i;
        } else if (this.hasUnambiguouslyPersonAndNumber(tokens[i], '1', 'PLU')) {
          posVer1Plu = i;
//      } else if (hasUnambiguouslyPersonAndNumber(tokens[i], "2", "PLU")) {
//        posVer2Plu = i;
        }

        if (tokens[i].hasPartialPosTag(':1:SIN')) {
          posPossibleVer1Sin = i;
        }
        if (tokens[i].hasPartialPosTag(':2:SIN')) {
          posPossibleVer2Sin = i;
        }
        if (tokens[i].hasPartialPosTag(':3:SIN')) {
          posPossibleVer3Sin = i;
        }
        if (tokens[i].hasPartialPosTag(':1:PLU')) {
          posPossibleVer1Plu = i;
        }
//      if (tokens[i].hasPartialPosTag(":2:PLU"))
//        posPossibleVer2Plu = i;
      }
    } // for each token

    // "ich", "du", and "wir" must be subject (no other interpretation possible)
    // "ich", "du", "er", and "wir" must have a matching verb

    if (posVer1Sin !== -1 && posIch === -1 && !this.isQuotationMark(tokens[posVer1Sin - 1])) { // 1st pers sg verb but no "ich"
      if (!tokens[posVer1Sin].isImmunized()) {
        ruleMatches.push(this.ruleMatchWrongVerb(tokens[posVer1Sin], pos, wholeSentence));
      }
    } else if (posIch > 0 && !this.isNear(posPossibleVer1Sin, posIch) // check whether verb next to "ich" is 1st pers sg
               && (tokens[posIch].getToken() === 'ich' || tokens[posIch].getStartPos() <= 1
                   || (tokens[posIch].getToken() === 'Ich' && posIch >= 2 && tokens[posIch - 2].getToken() === ':')
                   || (tokens[posIch].getToken() === 'Ich' && posIch >= 1 && tokens[posIch - 1].getToken() === ':')) // ignore "lyrisches Ich" etc.
               && (!this.isQuotationMark(tokens[posIch - 1]) || posIch < 3 || (posIch > 1 && tokens[posIch - 2].getToken() === ':'))) {
      const plus1 = ((posIch + 1) === tokens.length) ? 0 : +1; // prevent posIch+1 segfault
      const check = this.verbDoesMatchPersonAndNumber(tokens[posIch - 1], tokens[posIch + plus1], '1', 'SIN', finiteVerb);
      if (!check.verbDoesMatchPersonAndNumber && !this.nextButOneIsModal(tokens, posIch) && 'äußerst' !== check.finiteVerb.getToken()) {
        if (!tokens[posIch].isImmunized()) {
          ruleMatches.push(this.ruleMatchWrongVerbSubject(tokens[posIch], check.finiteVerb, '1:SIN', pos, wholeSentence));
        }
      }
    }

    if (posVer2Sin !== -1 && posDu === -1 && !this.isQuotationMark(tokens[posVer2Sin - 1])) {
      if (!tokens[posVer2Sin].isImmunized()) {
        ruleMatches.push(this.ruleMatchWrongVerb(tokens[posVer2Sin], pos, wholeSentence));
      }
    } else if (posDu > 0 && !this.isNear(posPossibleVer2Sin, posDu)
               && (!this.isQuotationMark(tokens[posDu - 1]) || posDu < 3 || (posDu > 1 && tokens[posDu - 2].getToken() === ':'))) {
      const plus1 = ((posDu + 1) === tokens.length) ? 0 : +1;
      const check = this.verbDoesMatchPersonAndNumber(tokens[posDu - 1], tokens[posDu + plus1], '2', 'SIN', finiteVerb);
      if (!check.verbDoesMatchPersonAndNumber
          && !tokens[posDu + plus1].hasPosTagStartingWith('VER:1:SIN:KJ2') // "Wenn ich du wäre"
          && !(tokens[posDu + plus1].hasPosTagStartingWith('ADJ:') && !tokens[posDu + plus1].hasPosTag('ADJ:PRD:GRU')) // "dass du billige Klamotten..."
          && !tokens[posDu - 1].hasPosTagStartingWith('VER:1:SIN:KJ2')
          && !this.nextButOneIsModal(tokens, posDu)
          && !tokens[posDu].isImmunized()
      ) {
        ruleMatches.push(this.ruleMatchWrongVerbSubject(tokens[posDu], check.finiteVerb, '2:SIN', pos, wholeSentence));
      }
    }

    if (posEr > 0 && !this.isNear(posPossibleVer3Sin, posEr)
        && (!this.isQuotationMark(tokens[posEr - 1]) || posEr < 3 || (posEr > 1 && tokens[posEr - 2].getToken() === ':'))) {
      const plus1 = ((posEr + 1) === tokens.length) ? 0 : +1;
      const check = this.verbDoesMatchPersonAndNumber(tokens[posEr - 1], tokens[posEr + plus1], '3', 'SIN', finiteVerb);
      if (!check.verbDoesMatchPersonAndNumber
              && !this.nextButOneIsModal(tokens, posEr)
              && 'äußerst' !== check.finiteVerb.getToken()
              && 'regen' !== check.finiteVerb.getToken() // "wo er regen Anteil nahm"
              && !tokens[posEr].isImmunized()
      ) {
        ruleMatches.push(this.ruleMatchWrongVerbSubject(tokens[posEr], check.finiteVerb, '3:SIN', pos, wholeSentence));
      }
    }

    if (posVer1Plu !== -1 && posWir === -1 && !this.isQuotationMark(tokens[posVer1Plu - 1])) {
      if (!tokens[posVer1Plu].isImmunized()) {
        ruleMatches.push(this.ruleMatchWrongVerb(tokens[posVer1Plu], pos, wholeSentence));
      }
    } else if (posWir > 0 && !this.isNear(posPossibleVer1Plu, posWir) && !this.isQuotationMark(tokens[posWir - 1])) {
      const plus1 = ((posWir + 1) === tokens.length) ? 0 : +1;
      const check = this.verbDoesMatchPersonAndNumber(tokens[posWir - 1], tokens[posWir + plus1], '1', 'PLU', finiteVerb);
      if (!check.verbDoesMatchPersonAndNumber && !this.nextButOneIsModal(tokens, posWir) && !tokens[posWir].isImmunized()
          && check.finiteVerb.getToken() !== 'äußerst') {
        ruleMatches.push(this.ruleMatchWrongVerbSubject(tokens[posWir], check.finiteVerb, '1:PLU', pos, wholeSentence));
      }
    }

    return ruleMatches;
  }

  // Java: VerbAgreementRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: VerbAgreementRule#nextButOneIsModal(AnalyzedTokenReadings[],int) (avoid false alarm on 'wenn ich sterben sollte ...')
  nextButOneIsModal(tokens, pos) {
    return pos < tokens.length - 2 && tokens[pos + 2].hasPartialPosTag(':MOD:');
  }

  // Java: VerbAgreementRule#isNear(int,int) (true if |a - b| < 5, and a != -1)
  isNear(a, b) {
    return a !== -1 && (Math.abs(a - b) < 5);
  }

  // Java: VerbAgreementRule#isQuotationMark(AnalyzedTokenReadings)
  isQuotationMark(token) {
    return QUOTATION_MARKS.has(token.getToken());
  }

  // Java: VerbAgreementRule#hasUnambiguouslyPersonAndNumber(AnalyzedTokenReadings,String,String)
  // (true if the verb token (if it is a verb) matches person and number, and matches no other person/number)
  hasUnambiguouslyPersonAndNumber(tokenReadings, person, number) {
    if (tokenReadings.getToken().length === 0
        || (Character.isUpperCase(charAt(tokenReadings.getToken(), 0)) && tokenReadings.getStartPos() !== 0)
        || !tokenReadings.hasPosTagStartingWith('VER')) {
      return false;
    }
    for (const analyzedToken of tokenReadings.getReadings()) {
      const postag = analyzedToken.getPOSTag();
      if (postag === null || postag.endsWith('_END')) { // ignore SENT_END and PARA_END
        continue;
      }
      if (!postag.includes(':' + person + ':' + number)) {
        return false;
      }
    }
    return true;
  }

  // Java: VerbAgreementRule#isFiniteVerb(AnalyzedTokenReadings) (true if token is a finite verb, and it is no participle, pronoun or number)
  isFiniteVerb(token) {
    if (token.getToken().length === 0
        || (Character.isUpperCase(charAt(token.getToken(), 0)) && token.getStartPos() !== 0)
        || !token.hasPosTagStartingWith('VER')
        || token.hasAnyPartialPosTag('PA2', 'PRO:', 'ZAL')
        || 'einst' === token.getToken()) {
      return false;
    }
    return token.hasAnyPartialPosTag(':1:', ':2:', ':3:');
  }

  // Java: VerbAgreementRule#verbDoesMatchPersonAndNumber(AnalyzedTokenReadings,AnalyzedTokenReadings,String,String,AnalyzedTokenReadings)
  // (false if neither the verb token1 (if any) nor token2 match person and number, and none of them is "und" or ","; a finite verb found is saved in finiteVerb)
  verbDoesMatchPersonAndNumber(token1, token2, person, number, finiteVerb) {
    if (equalsAny(token1.getToken(), ',', 'und', 'sowie', '&')
        || equalsAny(token2.getToken(), ',', 'und', 'sowie', '&')) {
      return new BooleanAndFiniteVerb(true, finiteVerb);
    }

    let foundFiniteVerb = false;

    if (this.isFiniteVerb(token1)) {
      foundFiniteVerb = true;
      finiteVerb = token1;
      if (token1.hasPartialPosTag(':' + person + ':' + number)) {
        return new BooleanAndFiniteVerb(true, finiteVerb);
      }
    }

    if (this.isFiniteVerb(token2)) {
      foundFiniteVerb = true;
      finiteVerb = token2;
      if (token2.hasPartialPosTag(':' + person + ':' + number)) {
        return new BooleanAndFiniteVerb(true, finiteVerb);
      }
    }

    return new BooleanAndFiniteVerb(!foundFiniteVerb, finiteVerb);
  }

  // Java: VerbAgreementRule#getVerbSuggestions(AnalyzedTokenReadings,String,boolean)
  // (a list of forms of verb which match expectedVerbPOS (person:number); toUppercase true when the suggestions should be capitalized)
  getVerbSuggestions(verb, expectedVerbPOS, toUppercase) {
    // find the first verb reading
    let verbToken = new AnalyzedToken('', '', '');
    for (const token of verb.getReadings()) {
      if (token.getPOSTag().startsWith('VER:')) {
        verbToken = token;
        break;
      }
    }

    const synthesized = this.language.getSynthesizer().synthesize(verbToken, 'VER.*:' + expectedVerbPOS + '.*', true);
    const suggestionSet = new JavaHashSet(synthesized); // remove duplicates
    const suggestions = [...suggestionSet];
    if (toUppercase) {
      for (let i = 0; i < suggestions.length; ++i) {
        suggestions[i] = uppercaseFirstChar(suggestions[i]);
      }
    }
    return suggestions;
  }

  // Java: VerbAgreementRule#getPronounSuggestions(AnalyzedTokenReadings,boolean)
  // (a list of pronouns which match the person and number of verb; toUppercase true when the suggestions should be capitalized)
  getPronounSuggestions(verb, toUppercase) {
    const result = [];
    if (verb.hasPartialPosTag(':1:SIN')) {
      result.push('ich');
    }
    if (verb.hasPartialPosTag(':2:SIN')) {
      result.push('du');
    }
    if (verb.hasPartialPosTag(':3:SIN')) {
      result.push('er');
      result.push('sie');
      result.push('es');
    }
    if (verb.hasPartialPosTag(':1:PLU')) {
      result.push('wir');
    }
    if (verb.hasPartialPosTag(':2:PLU')) {
      result.push('ihr');
    }
    if (verb.hasPartialPosTag(':3:PLU') && !result.includes('sie')) { // do not add "sie" twice
      result.push('sie');
    }
    if (toUppercase) {
      for (let i = 0; i < result.length; ++i) {
        result[i] = uppercaseFirstChar(result[i]);
      }
    }
    return result;
  }

  // Java: VerbAgreementRule#ruleMatchWrongVerb(AnalyzedTokenReadings,int,AnalyzedSentence)
  ruleMatchWrongVerb(token, pos, sentence) {
    const msg = 'Möglicherweise fehlende grammatische Übereinstimmung zwischen Subjekt und Prädikat ('
      + token.getToken() + ') bezüglich Person oder Numerus (Einzahl, Mehrzahl - Beispiel: '
      + "'Max bist' statt 'Max ist').";
    return new RuleMatch(this, sentence, pos + token.getStartPos(), pos + token.getEndPos(), msg);
  }

  // Java: VerbAgreementRule#ruleMatchWrongVerbSubject(AnalyzedTokenReadings,AnalyzedTokenReadings,String,int,AnalyzedSentence)
  ruleMatchWrongVerbSubject(subject, verb, expectedVerbPOS, pos, sentence) {
    const msg = 'Möglicherweise fehlende grammatische Übereinstimmung zwischen Subjekt (' + subject.getToken()
      + ') und Prädikat (' + verb.getToken() + ') bezüglich Person oder Numerus (Einzahl, Mehrzahl - Beispiel: '
      + "'ich sind' statt 'ich bin').";

    const suggestions = [];
    const verbSuggestions = [];
    const pronounSuggestions = [];

    let ruleMatch;
    if (subject.getStartPos() < verb.getStartPos()) {
      ruleMatch = new RuleMatch(this, sentence, pos + subject.getStartPos(), pos + verb.getStartPos() + verb.getToken().length, msg);
      verbSuggestions.push(...this.getVerbSuggestions(verb, expectedVerbPOS, false));
      for (const verbSuggestion of verbSuggestions) {
        suggestions.push(subject.getToken() + ' ' + verbSuggestion);
      }
      pronounSuggestions.push(...this.getPronounSuggestions(verb, Character.isUpperCase(charAt(subject.getToken(), 0))));
      for (const pronounSuggestion of pronounSuggestions) {
        suggestions.push(pronounSuggestion + ' ' + verb.getToken());
      }
      const markedText = sentence.getText().substring(subject.getStartPos(), verb.getStartPos() + verb.getToken().length);
      this.sortBySimilarity(suggestions, markedText);
      ruleMatch.setSuggestedReplacements(suggestions);
    } else {
      ruleMatch = new RuleMatch(this, sentence, pos + verb.getStartPos(), pos + subject.getStartPos() + subject.getToken().length, msg);
      verbSuggestions.push(...this.getVerbSuggestions(verb, expectedVerbPOS, Character.isUpperCase(charAt(verb.getToken(), 0))));
      for (const verbSuggestion of verbSuggestions) {
        suggestions.push(verbSuggestion + ' ' + subject.getToken());
      }
      pronounSuggestions.push(...this.getPronounSuggestions(verb, false));
      for (const pronounSuggestion of pronounSuggestions) {
        suggestions.push(verb.getToken() + ' ' + pronounSuggestion);
      }
      const markedText = sentence.getText().substring(verb.getStartPos(), subject.getStartPos() + subject.getToken().length);
      this.sortBySimilarity(suggestions, markedText);
      ruleMatch.setSuggestedReplacements(suggestions);
    }

    return ruleMatch;
  }

  // Java: VerbAgreementRule#sortBySimilarity(List,String)
  sortBySimilarity(suggestions, markedText) {
    suggestions.sort((o1, o2) => {
      const diff1 = levenshteinDistance(markedText, o1);
      const diff2 = levenshteinDistance(markedText, o2);
      return diff1 - diff2;
    });
  }

  // Java: VerbAgreementRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
