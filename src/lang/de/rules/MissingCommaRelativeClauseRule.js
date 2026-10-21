// org.languagetool.rules.de.MissingCommaRelativeClauseRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Category, CategoryId, Location } from '../../../core/rules/model/Category.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { equalsAny, equalsAnyIgnoreCase } from '../../../lib/java/StringUtils.js';
import { GermanyGerman } from '../language/GermanyGerman.js';

const MARKS_REGEX = Pattern.compile('[,;.:?•!-–—’\'"„“”…»«‚‘›‹()\\/\\[\\]]'); // Java: MARKS_REGEX
const PRONOUN = Pattern.compile('(d(e[mnr]|ie|as|e([nr]|ss)en)|welche[mrs]?|wessen|was)'); // Java: PRONOUN
const verbPattern = Pattern.compile('(VER:[1-3]:|VER:.*:[1-3]:).*'); // Java: verbPattern
const zalEtcPattern = Pattern.compile('(ZAL|AD[JV]|ART|SUB|PRO:POS|PRP).*'); // Java: zalEtcPattern

let antiPatterns = null; // Java: static ANTI_PATTERNS (built at class load, here on first use)

// Java: MissingCommaRelativeClauseRule#ANTI_PATTERNS
function antiPatternsOf() {
  if (antiPatterns === null) {
    antiPatterns = Rule.makeAntiPatterns(
[
      [
        regex('gerade|wenn'),
        token('das')
      ],
      [
        token('anstelle'),
        regex('diese[rsm]|de[rsm]|dessen|jene[rsm]|[dms]?eine[rsm]|ihre[rs]|eure[sr]|unse?re[sr]')
      ],
      [
        token('im'),
        token('Zuge'),
        token('dessen')
      ],
      [
        csToken('mit'),
        regex('de[mr]'),
        regex('de[mrs]'),
        posRegex('SUB:.+'),
        csToken('verbindet')
      ],
      [
        regex('eine'),
        csToken('menge'),
        posRegex('SUB:.+')
      ],
      [ // dass sich wie folgt formulieren lässt
        regex('wie'),
        csToken('folgt'),
        posRegex('VER:.+')
      ],
      [ // das sollte gut überlegt sein
        regex('gut'),
        csToken('überlegt'),
        csToken('sein')
      ],
      [ // samt Auftraggeber
        csToken('samt'),
        posRegex('SUB:DAT.*')
      ],
      [ // ... denen sie ausgesetzt sind.
        posRegex('PA2:PRD:GRU:VER|VER:PA2.*'),
        csToken('sind'),
        posRegex('PKT')
      ],
      [
        csToken('am'),
        pos('ADJ:PRD:SUP'),
        posRegex('PRP:.+'),
        regex('d(e[mnr]|ie|as|e([nr]|ss)en)')
      ],
      [ // Aber denen etwas beibringen zu müssen, die sich sträuben, das ist die wahre Hölle.
        pos('SENT_START'),
        token('Aber'),
        regex('der|die|denen|das|jenen|einigen|anderen|vielen|manchen|allen')
      ],
      [ // Aus diesem Grund sind die Wörter nicht direkt übersetzt, stattdessen wird der Zustand oder die Situation beschrieben in der die Wörter benutzt werden. 
        posRegex('PA2.*|VER:PA2.*'),
        token('werden'),
        regex('[\\.\\!\\?…\\:;]+')
      ],
      [ // Plan von Maßnahmen, mit denen das Ansteckungsrisiko während des Aufenthalts an einem Ort verringert werden soll
        token('werden'),
        new PatternTokenBuilder().posRegex('SENT_END').matchInflectedForms().tokenRegex('sollen|können|müssen').build()
      ],
      [ // Aus diesem Grund sind die Wörter nicht direkt übersetzt, stattdessen wird der Zustand oder die Situation beschrieben in der die Wörter benutzt werden.
        posRegex('PA2.*|VER:PA2.*'),
        new PatternTokenBuilder().posRegex('SENT_END').matchInflectedForms().tokenRegex('haben|werden').build()
      ],
      [ // Es würde noch sehr helfen eine Kopie der Google Slide dort zu verlinken damit wir das direkt nachstellen können
        posRegex('VER:INF.*'),
        new PatternTokenBuilder().posRegex('SENT_END').matchInflectedForms().tokenRegex('können|werden|sollen|dürfen|müssen|wollen|mögen').build()
      ],
      [
        // Komma an der falschen Stelle
        regex('ja|mal'),
        csToken('was')
      ],
      [
        // Komma an der falschen Stelle
        posRegex('SENT_START|PKT'),
        csToken('aber'),
        regex('solange|wenn|wo|wie|was'),
        regex('du|er|sie|sich|man|euch|uns|die|der|das')
      ],
      [
        // Komma an der falschen Stelle
        csToken('selbst'),
        csToken('wenn'),
        regex('du|er|sie|sich|man|euch|uns|die|der|das'),
        regex('die|der|das')
      ],
      [
        // Komma an der falschen Stelle
        csToken('wie'),
        regex('die|der|das')
      ],
      [ 
        // Kein Komma in "weder ... noch ..."
        new PatternTokenBuilder().setSkip(12).matchInflectedForms().token('weder').build(),
        token('noch')
      ],
      [
        posRegex('VER:.*1:SIN:KJ1:.+'),
        posRegex('VER:MOD:[12]:.+'),
        posRegex('PKT|KON:NEB')
      ],
      [
        // Er warnt auch vor Autos, die soeben überholt haben bzw. überholt wurden.
        posRegex('VER:.+'),
        csToken('bzw'),
        csToken('.'),
        posRegex('VER:.+')
      ],
      // … Planungen, die sich noch auf die ganze Stadt bezogen wurden aufgegeben.
      [
        regex('w[eu]rden'),
        posRegex('PA2:PRD:GRU:VER|VER:PA2.*'),
        pos('PKT')
      ],
      // Der Beitrag, den Sie versucht haben aufzurufen, existiert nicht mehr oder wurde verschoben.
      [
        posRegex('PA2:PRD:GRU:VER|VER:PA2.*'),
        regex('haben?|hatten?'),
        posRegex('VER:EIZ.*'),
        pos('PKT')
      ],
      [
        posRegex('VER.*'),
        regex('\\u2063')
      ]
  ], GermanyGerman.getInstance());
  }
  return antiPatterns;
}

// Java: MissingCommaRelativeClauseRule
export class MissingCommaRelativeClauseRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.MissingCommaRelativeClauseRule';

  // Java: MissingCommaRelativeClauseRule(ResourceBundle[,boolean])
  constructor(messages, behind = false) {
    super(messages);
    super.setCategory(new Category(new CategoryId('HILFESTELLUNG_KOMMASETZUNG'),
      'Kommasetzung', Location.INTERNAL, true));
    this.behind = behind;
  }

  // Java: MissingCommaRelativeClauseRule#getId()
  getId() {
    return (this.behind ? 'COMMA_BEHIND_RELATIVE_CLAUSE' : 'COMMA_IN_FRONT_RELATIVE_CLAUSE');
  }

  // Java: MissingCommaRelativeClauseRule#getDescription()
  getDescription() {
    return (this.behind ? 'Fehlendes Komma nach Relativsatz' : 'Fehlendes Komma vor Relativsatz');
  }

  // Java: MissingCommaRelativeClauseRule#isSeparator(String) (is a separator)
  static isSeparator(token) {
    return (MARKS_REGEX.matcher(token).matches() || token === 'und' || token === 'oder');
  }

  // Java: MissingCommaRelativeClauseRule#nextSeparator(AnalyzedTokenReadings[],int) (get the position of the next separator)
  static nextSeparator(tokens, start) {
    for (let i = start; i < tokens.length; i++) {
      if (MissingCommaRelativeClauseRule.isSeparator(tokens[i].getToken())) {
        return i;
      }
    }
    return tokens.length - 1;
  }

  // Java: MissingCommaRelativeClauseRule#isPrp(AnalyzedTokenReadings) (is preposition)
  static isPrp(token) {
    return token.hasPosTagStartingWith('PRP:') && !token.isImmunized();
  }

  // Java: MissingCommaRelativeClauseRule#isVerb(AnalyzedTokenReadings[],int) (is a potential verb used in sentence or subclause)
  static isVerb(tokens, n) {
    return (tokens[n].matchesPosTagRegex(verbPattern)
      && !tokens[n].matchesPosTagRegex(zalEtcPattern)
      && (!tokens[n].hasPosTagStartingWith('VER:INF:') || tokens[n - 1].getToken() !== 'zu')
      && !tokens[n].isImmunized()
    );
  }

  // Java: MissingCommaRelativeClauseRule#isAnyVerb(AnalyzedTokenReadings[],int) (is any verb but not an "Infinitiv mit zu")
  static isAnyVerb(tokens, n) {
    return tokens[n].hasPosTagStartingWith('VER:')
      || (n < tokens.length - 1
        && ((tokens[n].getToken() === 'zu' && tokens[n + 1].hasPosTagStartingWith('VER:INF:'))
          || (tokens[n].hasPosTag('NEG') && tokens[n + 1].hasPosTagStartingWith('VER:'))));
  }

  // Java: MissingCommaRelativeClauseRule#isVerbBehind(AnalyzedTokenReadings[],int) (is a verb after sub clause)
  static isVerbBehind(tokens, end) {
    return (end < tokens.length - 1 && tokens[end].getToken() === ',' && tokens[end + 1].hasPosTagStartingWith('VER:'));
  }

  // Java: MissingCommaRelativeClauseRule#verbPos(AnalyzedTokenReadings[],int,int) (gives the positions of verbs in a subclause)
  static verbPos(tokens, start, end) {
    const verbs = [];
    for (let i = start; i < end; i++) {
      if (MissingCommaRelativeClauseRule.isVerb(tokens, i)) {
        if (tokens[i].hasPosTagStartingWith('PA')) {
          const gender = MissingCommaRelativeClauseRule.getGender(tokens[i]);
          const sStr = '(ADJ|PA[12]):.*' + gender + '.*';
          let j;
          for (j = i + 1; j < end && tokens[j].matchesPosTagRegex(sStr); j++);
          if (!tokens[j].matchesPosTagRegex('(SUB|EIG):.*' + gender + '.*') && !tokens[j].isPosTagUnknown()) {
            verbs.push(i);
          }
        } else {
          verbs.push(i);
        }
      }
    }
    return verbs;
  }

  // Java: MissingCommaRelativeClauseRule#isKonUnt(AnalyzedTokenReadings) (first token initiate a subclause)
  static isKonUnt(token) {
    return (token.hasPosTag('KON:UNT')
      || equalsAnyIgnoreCase(token.getToken(), 'wer', 'wo', 'wohin'));
  }

  // Java: MissingCommaRelativeClauseRule#hasPotentialSubclause(AnalyzedTokenReadings[],int,int)
  // (checks to what position a test of relative clause should done; return -1 if no potential relative clause is assumed)
  static hasPotentialSubclause(tokens, start, end) {
    const verbs = MissingCommaRelativeClauseRule.verbPos(tokens, start, end);
    if (verbs.length === 1 && end < tokens.length - 2 && verbs[0] === end - 1) {
      const nextEnd = MissingCommaRelativeClauseRule.nextSeparator(tokens, end + 1);
      const nextVerbs = MissingCommaRelativeClauseRule.verbPos(tokens, end + 1, nextEnd);
      if (MissingCommaRelativeClauseRule.isKonUnt(tokens[start])) {
        if (nextVerbs.length > 1 || (nextVerbs.length === 1 && nextVerbs[0] === end - 1)) {
          return verbs[0];
        }
      } else if (nextVerbs.length > 0) {
        return verbs[0];
      }
      return -1;
    }
    if (verbs.length === 2) {
      if (tokens[verbs[0]].matchesPosTagRegex('VER:(MOD|AUX):.*') && tokens[verbs[1]].hasPosTagStartingWith('VER:INF:')) {
        return verbs[0];
      }
      if (tokens[verbs[0]].hasPosTagStartingWith('VER:AUX:') && tokens[verbs[1]].hasPosTagStartingWith('VER:PA2:')) {
        return -1;
      }
      if (end === tokens.length - 1 && verbs[0] === end - 2
          && tokens[verbs[0]].hasPosTagStartingWith('VER:INF:') && tokens[verbs[1]].hasPosTagStartingWith('VER:MOD:')) {
        return -1;
      }
    }
    if (verbs.length === 3) {
      if (tokens[verbs[0]].hasPosTagStartingWith('VER:MOD:')
          && ((tokens[verbs[2] - 1].matchesPosTagRegex('VER:(INF|PA2):.*') && tokens[verbs[2]].hasPosTagStartingWith('VER:INF:'))
              || (tokens[verbs[1] - 1].getToken() === 'weder' && tokens[verbs[1]].hasPosTagStartingWith('VER:INF:')
                  && tokens[verbs[2] - 1].getToken() === 'noch' && tokens[verbs[1]].hasPosTagStartingWith('VER:INF:')))
      ) {
        return -1;
      }
    }
    if (verbs.length > 1) {
      return verbs[verbs.length - 1];
    }
    return -1;
  }

  // Java: MissingCommaRelativeClauseRule#isPronoun(AnalyzedTokenReadings[],int) (is potential relative pronoun)
  static isPronoun(tokens, n) {
    return (PRONOUN.matcher(tokens[n].getToken()).matches()
      && tokens[n - 1].getToken() !== 'sowie');
  }

  // Java: MissingCommaRelativeClauseRule#getGender(AnalyzedTokenReadings) (get the gender of of a token)
  static getGender(token) {
    let nMatches = 0;
    let ret = '';
    if (token.matchesPosTagRegex('.*:SIN:FEM.*')) {
      ret += 'SIN:FEM';
      nMatches++;
    }
    if (token.matchesPosTagRegex('.*:SIN:MAS.*')) {
      if (nMatches > 0) {
        ret += '|';
      }
      ret += 'SIN:MAS';
      nMatches++;
    }
    if (token.matchesPosTagRegex('.*:SIN:NEU.*')) {
      if (nMatches > 0) {
        ret += '|';
      }
      ret += 'SIN:NEU';
      nMatches++;
    }
    if (token.matchesPosTagRegex('.*:PLU.*')) {
      if (nMatches > 0) {
        ret += '|';
      }
      ret += 'PLU';
      nMatches++;
    }
    if (nMatches > 1) {
      ret = '(' + ret + ')';
    }
    return ret;
  }

  // Java: MissingCommaRelativeClauseRule#matchesGender(String,AnalyzedTokenReadings[],int,int) (does the gender match with a subject or name?)
  static matchesGender(gender, tokens, from, to) {
    let mStr;
    if (gender.length === 0) {
      mStr = 'PRO:DEM:.*SIN:NEU.*';
    } else {
      mStr = '(SUB|EIG):.*' + gender + '.*';
    }
    for (let i = to - 1; i >= from; i--) {
      if (tokens[i].matchesPosTagRegex(mStr) && (i !== 1 || !tokens[i].hasPosTagStartingWith('VER:'))) {
        return true;
      }
    }
    return false;
  }

  // Java: MissingCommaRelativeClauseRule#isArticleWithoutSub(String,AnalyzedTokenReadings[],int) (is the token a potential article without a noun)
  static isArticleWithoutSub(gender, tokens, n) {
    if (gender.length === 0) {
      return false;
    }
    return tokens[n].hasPosTagStartingWith('VER:') && tokens[n - 1].matchesPosTagRegex('(ADJ|PA[12]|PRO:POS):.*' + gender + '.*');
  }

  // Java: MissingCommaRelativeClauseRule#skipSub(AnalyzedTokenReadings[],int,int)
  // (skip tokens till the next noun; check for e.g. "das in die dunkle Garage fahrende Auto" -> "das" is article)
  static skipSub(tokens, n, to) {
    const gender = MissingCommaRelativeClauseRule.getGender(tokens[n]);
    for (let i = n + 1; i < to; i++) {
      if (tokens[i].matchesPosTagRegex('(SUB|EIG):.*' + gender + '.*')) {
        return i;
      }
    }
    return -1;
  }

  // Java: MissingCommaRelativeClauseRule#skipToSub(String,AnalyzedTokenReadings[],int,int)
  // (skip tokens till the next noun; check for e.g. "das in die dunkle Garage fahrende Auto" -> "das" is article)
  static skipToSub(gender, tokens, n, to) {
    if (tokens[n + 1].matchesPosTagRegex('PA[12]:.*' + gender + '.*')) {
      return n + 1;
    }
    for (let i = n + 1; i < to; i++) {
      if (tokens[i].matchesPosTagRegex('(ADJ|PA[12]):.*' + gender + '.*') || tokens[i].isPosTagUnknown()) {
        return i;
      }
      if (tokens[i].hasPosTagStartingWith('ART')) {
        i = MissingCommaRelativeClauseRule.skipSub(tokens, i, to);
        if (i < 0) {
          return i;
        }
      }
    }
    return -1;
  }

  // Java: MissingCommaRelativeClauseRule#isArticle(String,AnalyzedTokenReadings[],int,int) (check if token is potentially an article)
  static isArticle(gender, tokens, from, to) {
    if (gender.length === 0) {
      return false;
    }
    const sSub = '(SUB|EIG):.*' + gender + '.*';
    const sAdj = '(ZAL|PRP:|KON:|ADV:|ADJ:PRD:|(ADJ|PA[12]|PRO:(POS|DEM|IND)):.*' + gender + ').*';
    for (let i = from + 1; i < to; i++) {
      if (tokens[i].matchesPosTagRegex(sSub) || tokens[i].isPosTagUnknown()) {
        return true;
      }
      if ((tokens[i].hasPosTagStartingWith('ART')) || !tokens[i].matchesPosTagRegex(sAdj)) {
        if (MissingCommaRelativeClauseRule.isArticleWithoutSub(gender, tokens, i)) {
          return true;
        }
        const skipTo = MissingCommaRelativeClauseRule.skipToSub(gender, tokens, i, to);
        if (skipTo > 0) {
          i = skipTo;
        } else {
          return false;
        }
      }
    }
    return to < tokens.length && MissingCommaRelativeClauseRule.isArticleWithoutSub(gender, tokens, to);
  }

  // Java: MissingCommaRelativeClauseRule#missedCommaInFront(AnalyzedTokenReadings[],int,int,int)
  // (gives back position where a comma is missed; PRP has to be treated separately)
  static missedCommaInFront(tokens, start, end, lastVerb) {
    for (let i = start; i < lastVerb - 1; i++) {
      if (tokens[i].isImmunized()) {
        continue;
      }
      if (MissingCommaRelativeClauseRule.isPronoun(tokens, i)) {
        const gender = MissingCommaRelativeClauseRule.getGender(tokens[i]);
        if (gender !== null && !MissingCommaRelativeClauseRule.isAnyVerb(tokens, i + 1)
            && MissingCommaRelativeClauseRule.matchesGender(gender, tokens, start, i) && !MissingCommaRelativeClauseRule.isArticle(gender, tokens, i, lastVerb)) {
          return i;
        }
      }
    }
    return -1;
  }

  // Java: MissingCommaRelativeClauseRule#isTwoCombinedVerbs(AnalyzedTokenReadings,AnalyzedTokenReadings) (is a special combination of two verbs combination)
  static isTwoCombinedVerbs(first, second) {
    return first.matchesPosTagRegex('(VER:.*INF|.*PA[12]:).*') && second.hasPosTagStartingWith('VER:');
  }

  // Java: MissingCommaRelativeClauseRule#isThreeCombinedVerbs(AnalyzedTokenReadings[],int,int) (is a special combination of three verbs combination)
  static isThreeCombinedVerbs(tokens, first, last) {
    return tokens[first].matchesPosTagRegex('VER:(AUX|INF|PA[12]).*') && tokens[first + 1].matchesPosTagRegex('VER:(.*INF|PA[12]).*')
      && tokens[last].matchesPosTagRegex('VER:(MOD|AUX).*');
  }

  // Java: MissingCommaRelativeClauseRule#isFourCombinedVerbs(AnalyzedTokenReadings[],int,int) (is a special combination of four verbs combination)
  static isFourCombinedVerbs(tokens, first, last) {
    return tokens[first].hasPartialPosTag('KJ2') && tokens[first + 1].hasPartialPosTag('PA2')
      && tokens[first + 2].matchesPosTagRegex('VER:(.*INF|PA[12]).*')
      && tokens[last].matchesPosTagRegex('VER:(MOD|AUX).*');
  }

  // Java: MissingCommaRelativeClauseRule#isPar(AnalyzedTokenReadings) (is participle)
  static isPar(token) {
    return token.hasPosTagStartingWith('PA2:') || token.hasPosTagStartingWith('VER:PA2');
  }

  // Java: MissingCommaRelativeClauseRule#isInfinitivZu(AnalyzedTokenReadings[],int) (is participle plus special combination of two verbs combination)
  static isInfinitivZu(tokens, last) {
    return tokens[last - 1].getToken() === 'zu' && tokens[last].matchesPosTagRegex('VER:.*INF.*');
  }

  // Java: MissingCommaRelativeClauseRule#isTwoPlusCombinedVerbs(AnalyzedTokenReadings[],int,int) (is verb plus special combination of two verbs combination)
  static isTwoPlusCombinedVerbs(tokens, first, last) {
    return tokens[first].matchesPosTagRegex('.*PA[12]:.*') && tokens[last - 1].matchesPosTagRegex('VER:.*INF.*');
  }

  // Java: MissingCommaRelativeClauseRule#isKonAfterVerb(AnalyzedTokenReadings[],int,int) (conjunction follows last verb)
  static isKonAfterVerb(tokens, start, end) {
    if (tokens[start].matchesPosTagRegex('VER:(MOD|AUX).*') && tokens[start + 1].matchesPosTagRegex('(KON|PRP).*')) {
      if (start + 3 === end) {
        return true;
      }
      for (let i = start + 2; i < end; i++) {
        if (tokens[i].matchesPosTagRegex('(SUB|PRO:PER).*')) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: MissingCommaRelativeClauseRule#isSpecialPair(AnalyzedTokenReadings[],int,int) (two infinitive verbs as pair)
  static isSpecialPair(tokens, first, second) {
    if (first + 3 >= second && tokens[first].matchesPosTagRegex('VER:.*INF.*')
        && equalsAny(tokens[first + 1].getToken(), 'als', 'noch')
        && tokens[first + 2].matchesPosTagRegex('VER:.*INF.*')) {
      if (first + 2 === second) {
        return true;
      }
      return MissingCommaRelativeClauseRule.isTwoCombinedVerbs(tokens[second - 1], tokens[second]);
    }
    return false;
  }

  // Java: MissingCommaRelativeClauseRule#isPerfect(AnalyzedTokenReadings[],int,int) (is a pair of verbs to build the perfect)
  static isPerfect2(tokens, first, second) {
    return tokens[first].hasPosTagStartingWith('VER:AUX:') && tokens[second].matchesPosTagRegex('VER:.*(INF|PA2).*');
  }

  // Java: MissingCommaRelativeClauseRule#isSpecialInf(AnalyzedTokenReadings[],int,int,int) (is Infinitive in combination with substantiv)
  static isSpecialInf(tokens, first, second, start) {
    if (!tokens[first].hasPosTagStartingWith('VER:INF')) {
      return false;
    }
    for (let i = first - 1; i > start; i--) {
      if (tokens[i].hasPosTagStartingWith('ART')) {
        i = MissingCommaRelativeClauseRule.skipSub(tokens, i, second);
        return i > 0;
      }
    }
    return false;
  }

  // Java: MissingCommaRelativeClauseRule#isPerfect(AnalyzedTokenReadings[],int,int,int) (is a pair of verbs to build the perfect)
  static isPerfect3(tokens, first, second, third) {
    return tokens[second].matchesPosTagRegex('VER:.*INF.*') && MissingCommaRelativeClauseRule.isPerfect2(tokens, first, third);
  }

  // Java: MissingCommaRelativeClauseRule#isSeparatorOrInf(AnalyzedTokenReadings[],int) (is separator or VER:INF)
  static isSeparatorOrInf(tokens, n) {
    return MissingCommaRelativeClauseRule.isSeparator(tokens[n].getToken()) || tokens[n].hasPosTagStartingWith('VER:INF')
      || (tokens.length > n + 1 && tokens[n].getToken() === 'zu' && tokens[n + 1].matchesPosTagRegex('VER:.*INF.*'));
  }

  // Java: MissingCommaRelativeClauseRule#getCommaBehind(AnalyzedTokenReadings[],List,int,int) (gives back position where a comma is missed)
  static getCommaBehind(tokens, verbs, start, end) {
    const M = MissingCommaRelativeClauseRule;
    if (verbs.length === 1) {
      if (M.isSeparator(tokens[verbs[0] + 1].getToken())) {
        return -1;
      }
      return verbs[0];
    } else if (verbs.length === 2) {
      if (M.isSpecialPair(tokens, verbs[0], verbs[1])) {
        if (M.isSeparatorOrInf(tokens, verbs[1] + 1)) {
          return -1;
        }
        return verbs[1];
      } else if (verbs[0] + 1 === verbs[1]) {
        if (M.isTwoCombinedVerbs(tokens[verbs[0]], tokens[verbs[1]])) {
          if (M.isSeparatorOrInf(tokens, verbs[1] + 1) || M.isKonAfterVerb(tokens, verbs[1], end)) {
            return -1;
          }
          return verbs[1];
        }
      } else if (verbs[0] + 2 === verbs[1]) {
        if (M.isThreeCombinedVerbs(tokens, verbs[0], verbs[1])) {
          if (M.isSeparatorOrInf(tokens, verbs[1] + 1)) {
            return -1;
          }
          return verbs[1];
        }
      }
      if (M.isPar(tokens[verbs[0]]) || M.isPerfect2(tokens, verbs[0], verbs[1])
          || M.isInfinitivZu(tokens, verbs[1]) || M.isSpecialInf(tokens, verbs[0], verbs[1], start)) {
        if (M.isSeparatorOrInf(tokens, verbs[1] + 1)) {
          return -1;
        }
        return verbs[1];
      }
    } else if (verbs.length === 3) {
      if (M.isTwoPlusCombinedVerbs(tokens, verbs[0], verbs[2])) {
        if (M.isSeparatorOrInf(tokens, verbs[2] + 1)) {
          return -1;
        }
        return verbs[2];
      } else if (verbs[0] + 2 === verbs[2]) {
        if (verbs[0] + 1 === verbs[1] && M.isThreeCombinedVerbs(tokens, verbs[0], verbs[2])) {
          if (M.isSeparatorOrInf(tokens, verbs[2] + 1)) {
            return -1;
          }
          return verbs[2];
        }
      } else if (verbs[0] + 3 === verbs[2] && M.isFourCombinedVerbs(tokens, verbs[0], verbs[2])) {
        if (M.isSeparatorOrInf(tokens, verbs[2] + 1)) {
          return -1;
        }
        return verbs[2];
      } else if (tokens[verbs[2]].hasPosTagStartingWith('VER:MOD:')
          && M.isSpecialPair(tokens, verbs[0], verbs[1])) {
        if (M.isSeparatorOrInf(tokens, verbs[2] + 1)) {
          return -1;
        }
        return verbs[2];
      }
      if (M.isPerfect3(tokens, verbs[0], verbs[1], verbs[2])) {
        if (M.isSeparatorOrInf(tokens, verbs[2] + 1)) {
          return -1;
        }
        return verbs[1];
      }
    }
    return verbs[0];
  }

  // Java: MissingCommaRelativeClauseRule#missedCommaBehind(AnalyzedTokenReadings[],int,int,int)
  // (gives back position where a comma is missed; PRP has to be treated separately)
  static missedCommaBehind(tokens, inFront, start, end) {
    const M = MissingCommaRelativeClauseRule;
    for (let i = start; i < end; i++) {
      if (M.isPronoun(tokens, i)) {
        const verbs = M.verbPos(tokens, i, end);
        if (verbs.length > 0) {
          const gender = M.getGender(tokens[i]);
          if (gender !== null && !M.isAnyVerb(tokens, i + 1)
              && M.matchesGender(gender, tokens, inFront, i - 1) && !M.isArticle(gender, tokens, i, verbs[verbs.length - 1])) {
            return M.getCommaBehind(tokens, verbs, i, end);
          }
        }
      }
    }
    return -1;
  }

  // Java: MissingCommaRelativeClauseRule#getSinOrPluOfPro(AnalyzedTokenReadings)
  // (checks if personal pronoun is singular or plural; gives back null if token is not a personal pronoun)
  static getSinOrPluOfPro(token) {
    if (!token.hasPartialPosTag('PRO:PER:') && !token.hasPosTagStartingWith('IND:')) {
      return null;
    }
    let ret = '';
    let nMatches = 0;
    if (token.matchesPosTagRegex('.*:SIN.*')) {
      ret += 'SIN';
      nMatches++;
    }
    if (token.matchesPosTagRegex('.*:PLU.*')) {
      if (ret.length > 0) {
        ret += '|';
      }
      ret += 'PLU';
      nMatches++;
    }
    if (nMatches > 1) {
      ret = '(' + ret + ')';
    }
    return ret;
  }

  // Java: MissingCommaRelativeClauseRule#isVerbProPair(AnalyzedTokenReadings[],int)
  static isVerbProPair(tokens, n) {
    const sinOrPlu = MissingCommaRelativeClauseRule.getSinOrPluOfPro(tokens[n + 1]);
    if (sinOrPlu === null) {
      return false;
    }
    return tokens[n].matchesPosTagRegex('VER:.*' + sinOrPlu + '.*');
  }

  // Java: MissingCommaRelativeClauseRule#match(AnalyzedSentence)
  match(sentence) {
    const M = MissingCommaRelativeClauseRule;
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();
    if (tokens.length <= 1) {
      return this.toRuleMatchArray(ruleMatches);
    }
    let subStart = 1;
    if (M.isSeparator(tokens[subStart].getToken())) {
      subStart++;
    }
    if (this.behind) {
      let subInFront = subStart;
      subStart = M.nextSeparator(tokens, subInFront) + 1;
      while (subStart < tokens.length) {
        const subEnd = M.nextSeparator(tokens, subStart);
        const lastVerb = M.hasPotentialSubclause(tokens, subStart, subEnd);
        if (lastVerb > 0) {
          const nToken = M.missedCommaBehind(tokens, subInFront, subStart, subEnd);
          if (nToken > 0) {
            if (M.isVerbProPair(tokens, nToken)) {
              const match = new RuleMatch(this, sentence, tokens[nToken - 1].getStartPos(), tokens[nToken + 1].getEndPos(),
                'Sollten Sie hier ein Komma einfügen oder zwei?');
              const suggestedReplacements = [];
              suggestedReplacements.push(tokens[nToken - 1].getToken() + ', '
                + tokens[nToken].getToken() + ' ' + tokens[nToken + 1].getToken() + ',');
              suggestedReplacements.push(tokens[nToken - 1].getToken() + ' '
                + tokens[nToken].getToken() + ' ' + tokens[nToken + 1].getToken() + ',');
              suggestedReplacements.push(tokens[nToken - 1].getToken() + ' '
                + tokens[nToken].getToken() + ', ' + tokens[nToken + 1].getToken());
              match.setSuggestedReplacements(suggestedReplacements);
              ruleMatches.push(match);
            } else {
              const match = new RuleMatch(this, sentence, tokens[nToken].getStartPos(), tokens[nToken + 1].getEndPos(),
                'Sollten Sie hier ein Komma einfügen?');
              match.setSuggestedReplacement(tokens[nToken].getToken() + ', ' + tokens[nToken + 1].getToken());
              ruleMatches.push(match);
            }
          }
        }
        subInFront = subStart;
        subStart = subEnd + 1;
      }
    } else {
      while (subStart < tokens.length) {
        const subEnd = M.nextSeparator(tokens, subStart);
        const lastVerb = M.hasPotentialSubclause(tokens, subStart, subEnd);
        if (lastVerb > 0) {
          const nToken = M.missedCommaInFront(tokens, subStart, subEnd, lastVerb);
          if (nToken > 0) {
            const startToken = nToken - (M.isPrp(tokens[nToken - 1]) ? 2 : 1);
            const match = new RuleMatch(this, sentence, tokens[startToken].getStartPos(), tokens[nToken].getEndPos(),
              'Sowohl angehängte als auch eingeschobene Relativsätze werden durch Kommas vom Hauptsatz getrennt.');
            if (nToken - startToken > 1) {
              match.setSuggestedReplacement(tokens[startToken].getToken() + ', ' + tokens[nToken - 1].getToken() + ' ' + tokens[nToken].getToken());
            } else {
              match.setSuggestedReplacement(tokens[startToken].getToken() + ', ' + tokens[nToken].getToken());
            }
            ruleMatches.push(match);
          }
        }
        subStart = subEnd + 1;
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: MissingCommaRelativeClauseRule#getAntiPatterns()
  getAntiPatterns() {
    return antiPatternsOf();
  }
}
