// org.languagetool.rules.de.SubjectVerbAgreementRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { SENTENCE_START_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { getUrl } from '../../../core/Tools.js';
import { equalsAny } from '../../../lib/java/StringUtils.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const NPS = new ChunkTag('NPS'); // noun phrase singular
const NPP = new ChunkTag('NPP'); // noun phrase plural
const PP = new ChunkTag('PP'); // prepositional phrase etc.
const QUESTION_PRONOUNS = ['wie']; // Java: QUESTION_PRONOUNS
const CURRENCIES = ['Dollar', 'Euro', 'Yen']; // Java: CURRENCIES

// Java: SubjectVerbAgreementRule.SingularPluralPair
class SingularPluralPair {
  // Java: SingularPluralPair(String,String)
  constructor(singular, plural) {
    this.singular = singular;
    this.plural = plural;
  }
}

const PAIRS = [ // Java: PAIRS
  new SingularPluralPair('ist', 'sind'),
  new SingularPluralPair('war', 'waren'),
  // new SingularPluralPair("geht", "gehen")  // false alarm: "Wohin möchtest du nächsten Sonntag gehen?"
  // add more pairs here to activate more cases step by step
];

// Java: List#contains(Object) on a List<ChunkTag> (ChunkTag#equals)
function hasTag(chunkTags, tag) {
  return chunkTags.some((t) => t.equals(tag));
}

// Java: SubjectVerbAgreementRule#ANTI_PATTERNS
const ANTI_PATTERNS =
[
    [
      // "Zwei Schülern war aufgefallen, dass man im Fernsehen..."
      pos('ZAL'),
      posRegex('SUB:DAT:PLU:.*'),
      csRegex('war|ist'),
      new PatternTokenBuilder().posRegex('NEG|PA2:.+').build()
    ],
    [  // "Wie viel Prozent der Menschen sind total bescheuert?"
      token('Prozent'),
      token('der'),
      posRegex('SUB:.*:PLU:.*'),
      csRegex('sind|waren')
    ],
    [  // "Die meisten der Spieler sind nicht vermögend"
      token('meisten'),
      token('der'),
      posRegex('SUB:.*:PLU:.*'),
      csRegex('sind|waren')
    ],
    [  // "er bemerkte, dass Experimente nicht gerade sein Ding sind"
      posRegex('SUB:.*:PLU:.*'),
      new PatternTokenBuilder().token('nicht').setSkip(1).build(),
      posRegex('PRO:.*'),
      csRegex('Ding'),
      csRegex('sind|waren')
    ],
    [  // "Wenn Sie kein Teil der Lösung sind, ..."
      token('Teil'),
      token('der'),
      token('Lösung'),
      csRegex('sind|waren')
    ],
    [
      // "Auch Studien zu Zink sind vielversprechend."
      posRegex('SUB:NOM:PLU:.*'),
      token('zu'),
      posRegex('SUB:.*'),
      tokenRegex('sind|waren')
    ],
    [
      // "Glaubt wirklich jemand, dass gute Fotos keine Arbeit sind?"
      posRegex('SUB:.*:PLU:.*'),
      regex('keine|wenig|kaum|viel'),
      posRegex('SUB:.*:SIN:.*'),
      token('sind')
    ],
    [
      // "Auch die Zehn Gebote sind Ausdruck davon."
      token('Zehn'),
      token('Gebote'),
      token('sind')
    ],
    [
      // "All diesen Stadtteilen ist die Nähe zum Hamburger Hafen..."
      token('all'),
      tokenRegex('d(ies)?en'),
      posRegex('SUB:.*PLU.*'),
      token('ist'),
      posRegex('ART:.*'),
      posRegex('SUB:.*SIN.*')
    ],
    [
      // "Personen ist der Zugriff auf diese Daten verboten."
      pos(SENTENCE_START_TAGNAME),
      new PatternTokenBuilder().token('Solchen').min(0).build(),
      posRegex('SUB:.*PLU.*'),
      token('ist'),
      posRegex('ART:.*'),
      posRegex('SUB:.*SIN.*')
    ],
    [
      // "Auch die Reste eines sehr großen Insektenfressers sind unter den Fossilien." - Chunker zu fixen wäre die bessere Lösung...
      tokenRegex('Reste|Überreste'),
      tokenRegex('eines|des'),
      posRegex('ADV:.*'),
      posRegex('ADJ:.*'),
      posRegex('SUB:.*SIN.*'),
      tokenRegex('sind')
    ],
    [
      // "Die eiförmigen und oben abgerundeten Blätter sind grün." - Chunker zu fixen wäre die bessere Lösung...
      posRegex('ADJ:.*'),
      tokenRegex('und|sowie'),
      posRegex('ADV:.*'),
      posRegex('PA2:.*'),
      posRegex('SUB:.*PLU.*'),
      tokenRegex('sind')
    ],
    [
      // Gründer und Leiter des Zentrums ist der Rabbiner Marvin Hier, sein Stellvertreter ist Rabbi Abraham Cooper.
      tokenRegex('Gründer(in)?|Gesellschafter(in)?|Leiter(in)?|Geschäftsführer(in)?|Chef(in)?'),
      tokenRegex('und|sowie|&'),
      new PatternTokenBuilder().tokenRegex('Gründer(in)?|Gesellschafter(in)?|Leiter(in)?|Geschäftsführer(in)?|Chef(in)?').setSkip(4).build(),
      tokenRegex('ist')
    ],
    [
      tokenRegex('ist|war'),
      token('gemeinsam')
    ],
    [
      pos(SENTENCE_START_TAGNAME),
      pos('ZAL'),
      tokenRegex('Minuten|Stunden|Tage|Monate|Jahre|Jahrzehnte'),
      posRegex('VER:3:SIN:.*')
    ],
    [
      pos(SENTENCE_START_TAGNAME),
      tokenRegex('einige|viele|wenige|mehrere'),
      tokenRegex('Minuten|Stunden|Tage|Monate|Jahre|Jahrzehnte'),
      posRegex('VER:3:SIN:.*')
    ],
    [
      pos(SENTENCE_START_TAGNAME),
      posRegex('ADV:MOD|ADJ:PRD:GRU'),
      pos('ZAL'),
      tokenRegex('Minuten|Stunden|Tage|Monate|Jahre|Jahrzehnte'),
      posRegex('VER:3:SIN:.*')
    ],
    [
      pos(SENTENCE_START_TAGNAME),
      new PatternTokenBuilder().pos('PRP:CAU:GEN').setSkip(4).build(),
      new PatternTokenBuilder().csToken('und').setSkip(4).build(),
      tokenRegex('ist|war')
    ],
    [
      posRegex(SENTENCE_START_TAGNAME+'|KON:UNT'),
      posRegex('(EIG|SUB):.*'),
      new PatternTokenBuilder().csToken('und').setSkip(3).build(),
      tokenRegex('sind|waren')
    ],
    [
      pos('KON:UNT'),
      new PatternTokenBuilder().token('sie').setSkip(3).build(),
      tokenRegex('sind|waren')
    ],
    [ //Bei komplexen und andauernden Störungen ist der Stress-Stoffwechsel des Hundes entgleist.
      pos(SENTENCE_START_TAGNAME),
      new PatternTokenBuilder().posRegex('PRP:.+').setSkip(4).build(),
      tokenRegex('ist|war'),
      tokenRegex('d(as|er)|eine?')
    ],
    [
      posRegex('SUB:NOM:PLU:.+'),
      csToken('vor'),
      csToken('Ort'),
      tokenRegex('sind|waren')
    ],
    [
      token('zu'),
      csRegex('Fuß|Hause|Bein|Besuch'),
      tokenRegex('sind|waren')
    ],
    [ //Eltern ist der bisherige Kita-Öffnungsplan zu unkonkret
      pos(SENTENCE_START_TAGNAME),
      pos('SUB:DAT:PLU:NOG'),
      tokenRegex('ist|war'),
      posRegex('.+:NOM:.+')
    ],
    [ // Das Gestell, sowie der komplette Tisch sind leicht zu montieren.
      posRegex('SUB:.+'),
      new PatternTokenBuilder().pos('PKT').min(0).build(),
      token('sowie'),
      posRegex('ART.*'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB:.+'),
      tokenRegex('sind|waren')
    ],
    [ // Das saisonale Obst und Gemüse ist köstlich und oft deutlich günstiger als in der Stadt.
      tokenRegex('das'),
      posRegex('(ADJ|PA[12]).*NEU.*'),
      posRegex('SUB:.*NEU.*'),
      tokenRegex('und'),
      posRegex('SUB:.*NEU.*'),
      tokenRegex('ist|war')
    ],
    [ // Das saisonale Obst und Gemüse ist köstlich und oft deutlich günstiger als in der Stadt.
      tokenRegex('der'),
      posRegex('(ADJ|PA[12]).*MAS.*'),
      posRegex('SUB:.*MAS.*'),
      tokenRegex('und'),
      posRegex('SUB:.*MAS.*'),
      tokenRegex('ist|war')
    ],
    [ // Das saisonale Obst und Gemüse ist köstlich und oft deutlich günstiger als in der Stadt.
      tokenRegex('die'),
      posRegex('(ADJ|PA[12]).*FEM.*'),
      posRegex('SUB:.*FEM.*'),
      tokenRegex('und'),
      posRegex('SUB:.*FEM.*'),
      tokenRegex('ist|war')
    ],
    [ // Einer der bedeutendsten Māori-Autoren der Gegenwart ist Witi Ihimaera.
      tokenRegex('(irgend)?einer?|meisten|viele|einige|Betreiber|(Mit)?Gründer|Inhaber'),
      new PatternTokenBuilder().tokenRegex('der|dieser').setSkip(4).build(),
      tokenRegex('ist|war')
    ],
    [ // Dank unserer Kunden, Freunde, Partner und unserer Mitarbeiter ist Alpenwahnsinn zur Heimatadresse für schöne Trachtenmode geworden.
      new PatternTokenBuilder().token('dank').setSkip(-1).build(),
      tokenRegex('ist|war'),
      posRegex('EIG.*|SUB.*SIN.*')
    ],
    [ // Start und Ziel ist Innsbruck
      token('Start'),
      token('und'),
      token('Ziel'),
      tokenRegex('ist|war')
    ],
    [ // Abschluss und Höhepunkt ist der Festumzug
      posRegex('SUB.*SIN.*'),
      token('und'),
      posRegex('SUB.*SIN.*'),
      tokenRegex('ist|war')
    ],
    [ // Frisches Obst und Gemüse ist gut für die Gesundheit.
      token('Obst'),
      token('und'),
      token('Gemüse')
    ],
    [
      token('Sport'),
      token('und'),
      token('Spiel')
    ],
    [ // Das bedeutendste Bauwerk und Wahrzeichen der Stadt ist die …
      token('das'),
      posRegex('(ADJ|PA[12]).*NEU.*'),
      posRegex('SUB.*NEU.*'),
      token('und'),
      posRegex('SUB.*NEU.*'),
      tokenRegex('der|dieser'),
      posRegex('SUB.*'),
      tokenRegex('ist|war')
    ],
    [ // Die bedeutendsten Bauwerke und Wahrzeichen der Stadt ist die …
      token('die'),
      posRegex('(ADJ|PA[12]).*PLU.*'),
      posRegex('SUB.*PLU.*'),
      token('und'),
      posRegex('SUB.*PLU.*'),
      tokenRegex('der|dieser'),
      posRegex('SUB.*'),
      tokenRegex('sind|waren')
    ],
    [ // Die neueste Auflage von Toms Kindheitserinnerungen ist schon wieder vergriffen.
      posRegex('(ADJ|PA[12]|ART).*SIN.*'),
      posRegex('SUB.*SIN.*'),
      posRegex('PRP.*'),
      posRegex('EIG.*GEN.*'),
      posRegex('SUB.*'),
      tokenRegex('ist|war')
    ],
    [ // Die Aussichten für Japans Zukunft sind düster.
      posRegex('(ADJ|PA[12]|ART).*PLU.*'),
      posRegex('SUB.*PLU.*'),
      posRegex('PRP.*'),
      posRegex('EIG.*GEN.*'),
      posRegex('SUB.*'),
      tokenRegex('sind|waren')
    ],
    [ // Anfänger wie auch Fortgeschrittene sind herzlich willkommen!
      posRegex('SUB.*PLU.*'),
      token('wie'),
      token('auch'),
      tokenRegex('.+'),
      tokenRegex('sind|waren')
    ],
    [
      // "Heute ist sie lieb."
      tokenRegex('ist|war|wäre?'),
      posRegex('EIG:NOM:SIN.*|PRO:PER:NOM:SIN.*'),
      posRegex('ADJ:PRD:GRU')
    ],
    [
      // "Heute bist du lieb."
      tokenRegex('bist|w[äa]rst'),
      tokenRegex('du'),
      posRegex('ADJ:PRD:GRU')
    ],
    [
      // "Heute waren sie lieb."
      tokenRegex('sind|w[äa]ren|seid'),
      posRegex('PRO:PER:NOM:PLU.*'),
      posRegex('ADJ:PRD:GRU')
    ],
    [ // Der Eifer der Männer und Frauen ist enorm.
      pos('SUB:NOM:SIN:MAS'),
      posRegex('ART:...:GEN:PLU:MAS'),
      posRegex('SUB:GEN:PLU:.+'),
      pos('KON:NEB'),
      posRegex('SUB:GEN:PLU:.+'),
      tokenRegex('ist|w[äa]r')
    ],
    [ // Einer der bedeutendsten Māori-Autoren der Gegenwart ist Witi Ihimaera.
      new PatternTokenBuilder().csToken('Laut').setSkip(4).build(),
      new PatternTokenBuilder().csToken('und').setSkip(5).build(),
      tokenRegex('ist|war'),
      tokenRegex('d(er|ie|as)'),
      posRegex('SUB:NOM:SIN:.+')
    ],
    [ // Für Tunesiens Tourismusindustrie mit seinen Stränden, Oasen und antiken Kulturschätzen ist das Attentat ein verheerender Rückschlag.
      tokenRegex('ist|war'),
      tokenRegex('d(er|ie|as)'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB:NOM:SIN:.+'),
      posRegex('(ART|PRO:POS).*SIN.*'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB:NOM:SIN:.+')
    ],
    [ // Die gute Nachricht vorweg: Die Mehrheit der Ehen sind tatsächlich ein Bund fürs Leben.
      tokenRegex('die'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      tokenRegex('Mehrheit'),
      tokenRegex('der|dieser|aller|unse?rer|[dsm]einer|euer|eurer|ihrer'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*NOM.*PLU.*'),
      tokenRegex('sind|w[äa]ren')
    ],
    [ // Man darf jedoch auch nicht glauben, weil die Brustvergrößerungscremes ein Allheilmittel sind, jedoch sind Sie optimal um Ihr Selbstvertrauen zu erhöhen
      tokenRegex('weil|da|denn|dass'),
      tokenRegex('die|diese|solche|alle|viele|beide|einige|[mkds]eine|eure|unse?re|ihre'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*NOM.*PLU.*'),
      tokenRegex('ein'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*NOM.*SIN.*'),
      tokenRegex('sind|w[äa]ren')
    ],
    [ // Die Rechte der Kinder sind universell.
      tokenRegex('alle|die(se)?|einige|keine|viele|solche'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*NOM.*PLU.*'),
      tokenRegex('der|unse?rer|euer|eurer|[dsm]einer|dieser|solcher|aller|einiger|vieler|ihrer|beider'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*GEN.*PLU.*'),
      posRegex('VER.*PLU.*')
    ],
    [
      // Ich verspreche dir, dass wir ein tolles Team sind.
      tokenRegex('wir|sie|die|alle|diese|einige|manche|viele|sonstige'),
      posRegex('ART.*|PRO:(POS|DEM|IND).*'),
      new PatternTokenBuilder().posRegex('(ADJ|PA[12]).*').min(0).build(),
      posRegex('SUB.*SIN.*'),
      posRegex('VER.*PLU.*')
    ],
    [
      // Ich verspreche dir, dass wir ein wirklich tolles Team sind.
      tokenRegex('wir|sie|die|alle|diese|einige|manche|viele|sonstige'),
      posRegex('ART.*|PRO:(POS|DEM|IND).*'),
      posRegex('(ADJ|PA[12]).*|ADV.*'),
      posRegex('(ADJ|PA[12]).*'),
      posRegex('SUB.*SIN.*'),
      posRegex('VER.*PLU.*')
    ],
    [
      new PatternTokenBuilder().token('sie').setSkip(-1).build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      tokenRegex('weder'),
      tokenRegex('er|es|sie'),
      new PatternTokenBuilder().token('noch').setSkip(-1).build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      new PatternTokenBuilder().posRegex('SUB.*PLU.*').setSkip(5).build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      // Halte ich für unwahrscheinlich, dass es Spannungsspitzen sind.
      new PatternTokenBuilder().posRegex('SUB.*INF|SUB.*PLU.*').build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      tokenRegex('Teile'),
      tokenRegex('de[rs]|diese[sr]|[msd]?eine[rs]'),
      new PatternTokenBuilder().posRegex('SUB.*|EIG.*|UNKNOWN').setSkip(-1).build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      tokenRegex('viele|alle'),
      new PatternTokenBuilder().posRegex('SUB.*ADJ').tokenRegex('.+e').build(),
      tokenRegex('sind|w[äa]ren')
    ],
    [
      // Sinn und Zweck dieser Prüfung ist, herauszufinden, ob der Druck
      tokenRegex('Sinn'),
      tokenRegex('und'),
      new PatternTokenBuilder().tokenRegex('Zweck').setSkip(-1).build(),
      tokenRegex('ist|war')

    ]
  ];

// Java: SubjectVerbAgreementRule
export class SubjectVerbAgreementRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.SubjectVerbAgreementRule';

  // Java: SubjectVerbAgreementRule(ResourceBundle,German)
  constructor(messages, language) {
    super();
    this.singular = new Set();
    this.plural = new Set();
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    for (const pair of PAIRS) {
      this.singular.add(pair.singular);
      this.plural.add(pair.plural);
    }
    this.addExamplePair(Example.wrong('Die Autos <marker>ist</marker> schnell.'),
      Example.fixed('Die Autos <marker>sind</marker> schnell.'));
    this.antiPatterns = Rule.cacheAntiPatterns(language, ANTI_PATTERNS);
  }

  // Java: SubjectVerbAgreementRule#getId()
  getId() {
    return 'DE_SUBJECT_VERB_AGREEMENT';
  }

  // Java: SubjectVerbAgreementRule#getDescription()
  getDescription() {
    return 'Kongruenz von Subjekt und Prädikat (unvollständig)';
  }

  // Java: SubjectVerbAgreementRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return ANTI_PATTERNS.reduce((max, l) => Math.max(max, l.length), 0);
  }

  // Java: SubjectVerbAgreementRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // Java: SubjectVerbAgreementRule#getUrl()
  getUrl() {
    return getUrl('https://dict.leo.org/grammatik/deutsch/Wort/Verb/Kategorien/Numerus-Person/ProblemNum.html');
  }

  // Java: SubjectVerbAgreementRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    for (let i = 1; i < tokens.length; i++) { // start at 1 to skip SENT_START
      if (tokens[i].isImmunized()) {
        continue;
      }
      const tokenStr = tokens[i].getToken();
      // Detect e.g. "Der Hund und die Katze ist":
      const singularMatch = this.getSingularMatchOrNull(tokens, i, tokens[i], tokenStr, sentence);
      if (singularMatch !== null) {
        ruleMatches.push(singularMatch);
      }
      // Detect e.g. "Der Hund sind":
      const pluralMatch = this.getPluralMatchOrNull(tokens, i, tokens[i], tokenStr, sentence);
      if (pluralMatch !== null) {
        ruleMatches.push(pluralMatch);
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: SubjectVerbAgreementRule#getSingularMatchOrNull(AnalyzedTokenReadings[],int,AnalyzedTokenReadings,String,AnalyzedSentence)
  getSingularMatchOrNull(tokens, i, token, tokenStr, sentence) {
    if (this.singular.has(tokenStr)) {
      const prevToken = tokens[i - 1];
      const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
      const prevChunkTags = prevToken.getChunkTags();
      const match = hasTag(prevChunkTags, NPP)
                    && !hasTag(prevChunkTags, PP)
                    && prevToken.getToken() !== 'Uhr' // 'um 18 Uhr ist Feierabend'
                    && !this.isCurrency(prevToken)
                    && !(nextToken !== null && nextToken.getToken() === 'es') // 'zehn Jahre ist es her'
                    && this.prevChunkIsNominative(tokens, i - 1)
                    && !this.hasUnknownTokenToTheLeft(tokens, i)
                    && !this.hasQuestionPronounToTheLeft(tokens, i - 1)
                    && !this.hasVerbToTheLeft(tokens, i - 1)
                    && !this.containsRegexToTheLeft('wer|(?i)alle[nr]?|(?i)jede[rs]?|(?i)manche[nrs]?', tokens, i - 1)
                    && !this.containsOnlyInfinitivesToTheLeft(tokens, i - 1);
      if (match) {
        const message = 'Bitte prüfen, ob hier <suggestion>' + this.getPluralFor(tokenStr) + '</suggestion> stehen sollte.';
        return new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), message);
      }
    }
    return null;
  }

  // Java: SubjectVerbAgreementRule#getPluralMatchOrNull(AnalyzedTokenReadings[],int,AnalyzedTokenReadings,String,AnalyzedSentence)
  getPluralMatchOrNull(tokens, i, token, tokenStr, sentence) {
    if (this.plural.has(tokenStr)) {
      const prevToken = tokens[i - 1];
      const prevChunkTags = prevToken.getChunkTags();
      const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
      const match = hasTag(prevChunkTags, NPS)
                    && !(nextToken !== null && nextToken.getToken() === 'Sie') // 'Eine Persönlichkeit sind Sie selbst.'
                    && !hasTag(prevChunkTags, NPP)
                    && !hasTag(prevChunkTags, PP)
                    && !this.isCurrency(prevToken)
                    && this.prevChunkIsNominative(tokens, i - 1)
                    && !this.hasUnknownTokenToTheLeft(tokens, i)
                    && !this.hasUnknownTokenToTheRight(tokens, i + 1)
                    && !equalsAny(tokens[1].getToken(), 'Alle', 'Viele') // "Viele Brunnen in Italiens Hauptstadt sind bereits abgeschaltet."
                    && !this.isFollowedByNominativePlural(tokens, i + 1); // z.B. "Die Zielgruppe sind Männer." - beides Nominativ, aber 'Männer' ist das Subjekt
      if (match) {
        const message = 'Bitte prüfen, ob hier <suggestion>' + this.getSingularFor(tokenStr) + '</suggestion> stehen sollte.';
        return new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), message);
      }
    }
    return null;
  }

  // Java: SubjectVerbAgreementRule#isCurrency(AnalyzedTokenReadings)
  isCurrency(token) {
    return CURRENCIES.includes(token.getToken());
  }

  // Java: SubjectVerbAgreementRule#prevChunkIsNominative(AnalyzedTokenReadings[],int)
  prevChunkIsNominative(tokens, startPos) {
    for (let i = startPos; i > 0; i--) {
      const chunkTags = tokens[i].getChunkTags();
      if (hasTag(chunkTags, NPS) || hasTag(chunkTags, NPP)) {
        if (tokens[i].hasPartialPosTag('NOM')) {
          return true;
        }
      } else {
        return false;
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#hasUnknownTokenToTheLeft(AnalyzedTokenReadings[],int)
  // (needed to avoid false alarms, because we cannot unify noun phrases if we cannot analyse a noun)
  hasUnknownTokenToTheLeft(tokens, startPos) {
    return this.hasUnknownTokenAt(tokens, 0, startPos);
  }

  // Java: SubjectVerbAgreementRule#hasUnknownTokenToTheRight(AnalyzedTokenReadings[],int)
  hasUnknownTokenToTheRight(tokens, startPos) {
    return this.hasUnknownTokenAt(tokens, startPos, tokens.length - 1);
  }

  // Java: SubjectVerbAgreementRule#hasUnknownTokenAt(AnalyzedTokenReadings[],int,int)
  hasUnknownTokenAt(tokens, startPos, endPos) {
    for (let i = startPos; i < endPos; i++) {
      const token = tokens[i];
      for (const analyzedToken of token.getReadings()) {
        if (analyzedToken.hasNoTag()) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#hasQuestionPronounToTheLeft(AnalyzedTokenReadings[],int)
  hasQuestionPronounToTheLeft(tokens, startPos) {
    for (let i = startPos; i > 0; i--) {
      if (QUESTION_PRONOUNS.includes(toLowerCase(tokens[i].getToken()))) {
        return true;
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#hasVerbToTheLeft(AnalyzedTokenReadings[],int)
  hasVerbToTheLeft(tokens, startPos) {
    for (let i = startPos; i > 0; i--) {
      if (tokens[i].matchesPosTagRegex('VER:[1-3]:.+')) {
        return true;
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#containsRegexToTheLeft(String,AnalyzedTokenReadings[],int)
  containsRegexToTheLeft(regex, tokens, startPos) {
    const p = Pattern.compile(regex);
    for (let i = startPos; i > 0; i--) {
      if (p.matcher(tokens[i].getToken()).matches()) {
        return true;
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#containsOnlyInfinitivesToTheLeft(AnalyzedTokenReadings[],int)
  // (No false alarm on ""Das Kopieren und Einfügen ist sehr nützlich." etc.)
  containsOnlyInfinitivesToTheLeft(tokens, startPos) {
    let infinitives = 0;
    for (let i = startPos; i > 0; i--) {
      const token = tokens[i].getToken();
      if (tokens[i].hasPartialPosTag('SUB:')) {
        const lookup = this.language.getTagger().lookup(toLowerCase(token));
        if (lookup !== null && lookup.hasPosTagStartingWith('VER:INF')) {
          infinitives++;
        } else {
          return false;
        }
      }
    }
    return infinitives >= 2;
  }

  // Java: SubjectVerbAgreementRule#isFollowedByNominativePlural(AnalyzedTokenReadings[],int)
  isFollowedByNominativePlural(tokens, startPos) {
    for (let i = startPos; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.hasAnyPartialPosTag('SUB', 'PRO')
          && (token.hasPartialPosTag('NOM:PLU') || hasTag(token.getChunkTags(), NPP))) { // NPP catches 'und' phrases
        return true;
      }
    }
    return false;
  }

  // Java: SubjectVerbAgreementRule#getSingularFor(String)
  getSingularFor(token) {
    for (const pair of PAIRS) {
      if (pair.plural === token) {
        return pair.singular;
      }
    }
    throw new RuntimeException("No singular found for '" + token + "'");
  }

  // Java: SubjectVerbAgreementRule#getPluralFor(String)
  getPluralFor(token) {
    for (const pair of PAIRS) {
      if (pair.singular === token) {
        return pair.plural;
      }
    }
    throw new RuntimeException("No plural found for '" + token + "'");
  }
}
