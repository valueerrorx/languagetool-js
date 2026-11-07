// LTJS layer (D-061): subject-verb agreement rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { hasTag, tags, isLowerCase, isUpperCase, isUnknown, clauseEnd } from './DasDassTools.js';
import { isMainFinite, isNonFiniteVerb, nominativePersons, personNumbers } from './KommaTools.js';

// words of the Vorfeld noun phrase: determiners, adjectives, nouns, names
const NP_WORD = /^(ART|PRO:(POS|DEM|IND)|ADJ|PA1|PA2|SUB|EIG)/;
// quantity nouns: 'Ein Großteil der Schüler sind' is tolerated (constructio ad sensum)
const QUANTITY = new Set(['Anzahl', 'Großteil', 'Gruppe', 'Hälfte', 'Handvoll', 'Haufen', 'Masse', 'Mehrheit', 'Mehrzahl', 'Menge', 'Minderheit',
  'Paar', 'Prozent', 'Reihe', 'Rest', 'Teil', 'Vielzahl', 'Zahl', 'Dutzend', 'Drittel', 'Viertel', 'Fünftel', 'Zehntel', 'Hundert', 'Tausend',
  'Million', 'Millionen', 'Milliarde', 'Milliarden', 'Gros', 'Bruchteil', 'Großzahl', 'Unmenge', 'Unzahl']);
// determiners of count nouns in the plural (the tagger also reads 'viele' as feminine singular)
const PLURAL_QUANTIFIER = new Set(['viele', 'einige', 'mehrere', 'wenige', 'manche', 'beide', 'zahlreiche', 'etliche']);
const TENSE_ORDER = ['PRÄ', 'PRT', 'KJ2', 'KJ1'];
const TENSE =/^VER:(?:AUX:|MOD:)?3:(?:SIN|PLU):(PRÄ|PRT|KJ1|KJ2)/;

// nominative numbers (SIN, PLU) of the noun at h that agree with the determiner in [s, h) if there is one ('Viele Jugendliche' -> PLU)
function subjectNumbers(tokens, s, h) {
  const det = h > s && hasTag(tokens[s], /^(ART|PRO:(POS|DEM|IND))/) ? tokens[s] : null;
  if (det !== null && PLURAL_QUANTIFIER.has(det.getToken().toLowerCase())) return hasTag(tokens[h], /^(SUB|EIG):NOM:PLU/) ? new Set(['PLU']) : new Set();
  const out = new Set();
  for (const p of tags(tokens[h])) {
    const m = /^(SUB|EIG):NOM:(SIN|PLU):(MAS|FEM|NEU|NOG)/.exec(p);
    if (!m) continue;
    const gender = m[3] === 'NOG' ? '[A-Z]+' : `(${m[3]}|ALG|NOG)`;
    if (det === null || hasTag(det, new RegExp(`^(ART|PRO:(POS|DEM|IND)):(DEF:|IND:)?NOM:${m[2]}:${gender}`))) out.add(m[2]);
  }
  return out;
}

// Java: none (LTJS). 'Die Ergebnisse ist interessant' -> sind: the noun phrase before the finite verb is the only possible
// subject, its number is sure and the verb has only third person readings of the other number
export class LtjsSubjektVerbRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong('Die Ergebnisse <marker>ist</marker> sehr interessant.'),
      Example.fixed('Die Ergebnisse <marker>sind</marker> sehr interessant.'));
  }

  getId() {
    return 'LTJS_SUBJEKT_VERB';
  }

  getDescription() {
    return 'Subjekt und Verb stimmen im Numerus nicht überein';
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const m = this.matchAt(sentence, tokens, 1);
    return this.toRuleMatchArray(m === null ? [] : [m]);
  }

  // subject noun phrase [s, v) at the sentence start, finite verb at v
  matchAt(sentence, tokens, s) {
    let v = s;
    while (v < tokens.length && hasTag(tokens[v], NP_WORD) && !isMainFinite(tokens[v])) {
      const t = tokens[v];
      if (isUnknown(t) || hasTag(t, /^(ZAL|PRP|KON|ADV)/) || /\d/.test(t.getToken())) return null;
      if (isUpperCase(t) && QUANTITY.has(t.getToken())) return null;
      v++;
    }
    if (v === s || v >= tokens.length) return null;
    const head = tokens[v - 1];
    const verb = tokens[v];
    if (!isUpperCase(head) || !hasTag(head, /^(SUB|EIG)/) || !isMainFinite(verb) || !isLowerCase(verb)) return null;
    for (let j = s + 1; j < v - 1; j++) if (hasTag(tokens[j], /^(SUB|EIG)/) && isUpperCase(tokens[j])) return null; // one noun only, no genitive attribute
    const subject = subjectNumbers(tokens, s, v - 1);
    if (subject.size !== 1) return null; // number unsure or no nominative reading ('Den Kindern gefällt')
    const wanted = `3:${[...subject][0]}`;
    // infinitive or participle closing the clause: instruction or headline ('Die Banane schälen, …', 'Neuer Radweg beschlossen')
    if (isNonFiniteVerb(verb) && clauseEnd(tokens, v) === v + 1) return null;
    const verbPn = personNumbers(verb);
    if (verbPn.has(wanted) || ![...verbPn].some((x) => x.startsWith('3:'))) return null;
    // another subject after the verb: fronted object ('Die Kinder hat er gesehen') or predicative noun ('Das Problem sind die Kosten')
    // (a measure phrase from a numeral on is no subject: 'dauert oft nur zwanzig Minuten')
    let e = v + 1;
    while (e < clauseEnd(tokens, v + 1) && !hasTag(tokens[e], /^ZAL/) && !/^\d/.test(tokens[e].getToken())) e++;
    const after = nominativePersons(tokens, v + 1, e);
    if ([...after].some((x) => verbPn.has(x))) return null;
    const suggestions = this.suggestions(verb, wanted);
    if (!suggestions.length) return null;
    const plural = wanted === '3:PLU';
    const m = new RuleMatch(this, sentence, verb.getStartPos(), verb.getEndPos(),
      `Das Verb '${verb.getToken()}' passt nicht zum Subjekt '${head.getToken()}' (${plural ? 'Plural' : 'Singular'}).`, 'Subjekt und Verb');
    m.setSuggestedReplacements(suggestions);
    return m;
  }

  // forms of the verb with the subject's person/number, same tense (indicative readings first: 'haben' -> 'hat', not 'habe')
  suggestions(verb, wanted) {
    const readings = verb.getReadings().map((r) => [r, TENSE.exec(r.getPOSTag() ?? '')]).filter(([, tm]) => tm)
      .sort((a, b) => TENSE_ORDER.indexOf(a[1][1]) - TENSE_ORDER.indexOf(b[1][1]));
    for (const [r, tm] of readings) {
      const forms = this.language.getSynthesizer().synthesize(r, `VER.*:${wanted}:${tm[1]}.*`, true);
      const out = [...new Set(forms)].filter((f) => f !== verb.getToken());
      if (out.length) return out;
    }
    return [];
  }
}

// rule ids of the LTJS subject-verb rules for German
export const LTJS_SUBJEKT_VERB_RULE_IDS = Object.freeze(['LTJS_SUBJEKT_VERB']);

// the LTJS subject-verb rules for German
export function getLtjsGermanSubjektVerbRules(messages, language) {
  return [new LtjsSubjektVerbRule(messages, language)];
}
