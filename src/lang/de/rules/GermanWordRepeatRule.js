// org.languagetool.rules.de.GermanWordRepeatRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, csToken, tokenRegex, posRegex } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';

const SINGLE_CHAR = Pattern.compile('(?i)^[a-z]$');

// Java: GermanWordRepeatRule#ANTI_PATTERNS (static field, built here on first use)
function antiPatternList() {
  return [
    [
      csToken('please'),
      csToken('please'),
      csToken('please')
    ],
    [
      csToken('Late'),
      csToken('Late'),
      csToken('Show')
    ],
    [
      csToken('Wenn'),
      csToken('hinter'),
      csToken('Robben'),
      csToken('Robben'),
      csToken('robben'),
      csToken(','),
      csToken('robben'),
      csToken('Robben'),
      csToken('Robben'),
      csToken('hinterher')
    ],
    [
      tokenRegex('tägliche(n|m|s)?'),
      csToken('klein'),
      csToken('klein')
    ],
    [
      csToken('Bora'),
      csToken('Bora')
    ],
    [
      csToken('Tuk'),
      csToken('Tuk')
    ],
    [
      csToken('Miu'),
      csToken('Miu')
    ],
    [
      token('Moin'),
      token('Moin')
    ],
    [
      token('Na'),
      token('na')
    ],
    [ // La La Land / la la la ...
      token('la'),
      token('la')
    ],
    [ // "Bei Fragen fragen"
      csToken('Fragen'),
      csToken('fragen')
    ],
    [
      token('ha'),
      token('ha')
    ],
    [
      token('teils'),
      token('teils')
    ],
    [
      token('Marsch'),
      token('Marsch')
    ],
    [
      token('hip'),
      token('hip'),
      token('hurra')
    ],
    [
      token('möp'),
      token('möp')
    ],
    [
      token('gout'),
      token('gout')
    ],
    [
      token('piep'),
      token('piep')
    ],
    [
      token('bla'),
      token('bla')
    ],
    [
      token('blah'),
      token('blah')
    ],
    [
      token('oh'),
      token('oh')
    ],
    [
      token('klopf'),
      token('klopf')
    ],
    [
      token('ne'),
      token('ne')
    ],
    [
      token('Fakten'),
      token('Fakten'),
      token('Fakten')
    ],
    [
      token('Top'),
      token('Top'),
      token('Top')
    ],
    [
      token('Toi'),
      token('Toi'),
      token('Toi')
    ],
    [
      token('und'),
      token('und'),
      token('und')
    ],
    [
      token('man'),
      token('man'),
      token('man')
    ],
    [
      tokenRegex('wenn|falls'),
      token('das'),
      token('das'),
      token('nächste'),
      token('mal')
    ],
    [
      token('Arbeit'),
      token('Arbeit'),
      token('Arbeit')
    ],
    [ // Art Direktor*in in der ...
      tokenRegex('\\*|:|\\/'),
      token('in'),
      token('in')
    ],
    [
      token('Üben'),
      token('Üben'),
      token('Üben')
    ],
    [
      token('cha'),
      token('cha')
    ],
    [
      token('zack'),
      token('zack')
    ],
    [
      token('sapiens'),
      token('sapiens')
    ],
    [
      token('peng'),
      token('peng')
    ],
    [
      token('bye'),
      token('bye')
    ],
    [ // Man kann nicht nicht kommunizieren
      token('nicht'),
      token('nicht'),
      token('kommunizieren')
    ],
    [ // Dee Dee Ramone
      token('Dee'),
      tokenRegex('Dees?')
    ],
    [ // Phi Phi Islands
      token('Phi'),
      token('Phi')
    ],
    [ // Ich weiß, wer wer ist!
      tokenRegex(',|wei(ß|ss)|nicht'),
      token('wer'),
      token('wer'),
      tokenRegex('war|ist|sein')
    ],
    [ // Wahrscheinlich ist das das Problem.
      tokenRegex('ist|war|wäre?|für|dass'),
      token('das'),
      token('das'),
      posRegex('.*SUB:.*NEU.*')
    ],
    [ // Wahrscheinlich ist das das Problem.
      tokenRegex('ist|war|wäre?|für|dass'),
      token('das'),
      token('das'),
      posRegex('ADJ:.*'),
      posRegex('.*SUB:.*NEU.*')
    ],
    [ // Wahrscheinlich ist das das Problem.
      tokenRegex('ist|war|wäre?|für|dass'),
      token('das'),
      token('das'),
      posRegex('ADJ:.*NEU.*'),
      posRegex('UNKNOWN')
    ],
    [ // Als wir das das erste Mal
      tokenRegex('als|wenn'),
      posRegex('(PRO|EIG):.*'),
      token('das'),
      token('das'),
      posRegex('ADJ:.*NEU.*'),
      posRegex('.*SUB:.*NEU.*')
    ],
    [ // Werden sie sie töten?
      tokenRegex('werden|würden|sollt?en|müsst?en|könnt?en'),
      token('sie'),
      token('sie'),
      posRegex('VER:1:PLU:.*')
    ],
    [ // Falls das das Problem ist, …
      tokenRegex('wenn|falls|ob'),
      token('das'),
      token('das'),
      posRegex('SUB:NOM:SIN:NEU.*'),
      new PatternTokenBuilder().tokenRegex('sein|haben').matchInflectedForms().build()
    ],
    [ // Falls das das neue Problem ist, …
      tokenRegex('wenn|falls|ob'),
      token('das'),
      token('das'),
      posRegex('(ADJ|PA[12]).*NEU.*'),
      posRegex('SUB:NOM:SIN:NEU.*'),
      new PatternTokenBuilder().tokenRegex('sein|haben').matchInflectedForms().build()
    ],
    [// "wie Honda und Samsung, die die Bezahlung ihrer Firmenchefs..."
      csToken(','),
      new PatternTokenBuilder().csToken('der').matchInflectedForms().build(),
      new PatternTokenBuilder().csToken('der').matchInflectedForms().build()
    ],
    [// "Alle die die"
      tokenRegex('alle|nur|obwohl|lediglich|für|zwar|aber'),
      new PatternTokenBuilder().csToken('die').build(),
      new PatternTokenBuilder().csToken('die').build()
    ],
    [// "Haben die die Elemente ..."
      posRegex('PKT|SENT_START|KON:NEB'),
      tokenRegex('haben|hatten'),
      new PatternTokenBuilder().csToken('die').build(),
      new PatternTokenBuilder().csToken('die').build(),
      posRegex('.*SUB.*PLU.*|UNKNOWN')
    ],
    [// "und ob die die Währungen ..."
      posRegex('PKT|SENT_START|KON:NEB'),
      tokenRegex('ob|falls'),
      new PatternTokenBuilder().csToken('die').build(),
      new PatternTokenBuilder().csToken('die').build(),
      posRegex('.*SUB.*PLU.*|UNKNOWN')
    ],
    [// "Das Haus, in das das Kind läuft."
      csToken(','),
      posRegex('PRP:.+'),
      new PatternTokenBuilder().csToken('der').matchInflectedForms().build(),
      new PatternTokenBuilder().csToken('der').matchInflectedForms().build()
    ],
    [// "Er will sein Leben leben"
      csToken('Leben'),
      csToken('leben')
    ],
    [// "Die markierten Stellen stellen die Aufnahmepunkte dar."
      csToken('Stellen'),
      csToken('stellen')
    ],
    [// "Wir reisen in die ferne Ferne."
      token('die'),
      csToken('ferne'),
      csToken('Ferne')
    ],
    [// "Er muss sein Essen essen"
      csToken('Essen'),
      csToken('essen')
    ],
    [
      tokenRegex('^[_]+$'),
      tokenRegex('^[_]+$')
    ],
    [// "Er gab ihr ihr Buch zurück."
      posRegex('VER:.*[123]:.+|PKT|ADV:INR'),
      csToken('ihr'),
      csToken('ihr'),
      posRegex('SUB.+')
    ]
  ];
}

// Java: GermanWordRepeatRule
export class GermanWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.de.GermanWordRepeatRule';

  // Java: GermanWordRepeatRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.setCategory(Categories.REDUNDANCY.getCategory(messages));
    this.addExamplePair(Example.wrong('In diesem Satz <marker>ist ist</marker> ein Wort doppelt.'),
      Example.fixed('In diesem Satz <marker>ist</marker> ein Wort doppelt.'));
    this.antiPatterns = Rule.cacheAntiPatterns(language, antiPatternList());
  }

  // Java: GermanWordRepeatRule#getId()
  getId() {
    return 'GERMAN_WORD_REPEAT_RULE';
  }

  // Java: GermanWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    // "Warum fragen Sie sie nicht selbst?"
    if ((position !== 2 && tokens[position - 1].getToken() === 'Sie' && tokens[position].getToken() === 'sie')
        || (tokens[position - 1].getToken() === 'sie' && tokens[position].getToken() === 'Sie')) {
      return true;
    }
    // "Ihre verbotenen Waren waren bisher nicht aufgeflogen"
    if ((position !== 2 && tokens[position - 1].getToken() === 'Waren' && tokens[position].getToken() === 'waren')
        || (tokens[position - 1].getToken() === 'waren' && tokens[position].getToken() === 'Waren')) {
      return true;
    }
    if (position > 2 && tokens[position - 1].getToken() === 'sie' && tokens[position].getToken() === 'sie') {
      if (tokens[position - 2].hasPosTag('KON:UNT')) {
        // "Sie tut das, damit sie sie nicht fortschickt"
        return true;
      }
      if (tokens.length - 1 > position
        && ((tokens[position - 2].hasPosTagStartingWith('VER:3:') && tokens[position + 1].hasPosTag('ZUS')) // "Dann warfen sie sie weg."
            || (tokens[position - 2].hasPosTagStartingWith('VER:MOD:3') && tokens[position + 1].hasPosTag('VER:INF:NON')))) { // "Dann konnte sie sie sehen."
        return true;
      }
    }
    if (SINGLE_CHAR.matcher(tokens[position].getToken()).matches()
          && position > 1
          && SINGLE_CHAR.matcher(tokens[position - 2].getToken()).matches()
          && (position + 1 < tokens.length)
          && SINGLE_CHAR.matcher(tokens[position + 1].getToken()).matches()) {
      // spelling with spaces in between: "A B B A"
      return true;
    }
    return super.ignore(tokens, position);
  }

  // Java: GermanWordRepeatRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }
}
