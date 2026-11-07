// LTJS layer (D-061): preposition case rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { hasTag, isLowerCase, isUpperCase, isUnknown, isVerb, lemmas, clauseStart, clauseEnd, verbFinal } from './DasDassTools.js';

// prepositions that only take the dative ('außer' and 'gegenüber' are left out: conjunction/postposition readings)
const DATIVE_ONLY = new Set(['aus', 'bei', 'mit', 'nach', 'seit', 'von', 'zu', 'samt', 'nebst']);
// determiner stems of the ein/dieser declension
const STEMS = ['ein', 'kein', 'mein', 'dein', 'sein', 'ihr', 'unser', 'eur', 'dies', 'jen', 'jed', 'manch', 'welch'];
// 'mit ein paar Freunden', 'mit ein bisschen Glück': uninflected quantifiers
const QUANTIFIER_AFTER_EIN = new Set(['paar', 'bisschen', 'wenig', 'klein', 'und']);
const DATIVE_ARTICLE = { MAS: 'dem', NEU: 'dem', FEM: 'der', PLU: 'den' };
const DATIVE_ENDING = { MAS: 'em', NEU: 'em', FEM: 'er', PLU: 'en' };

// determiner forms that can never be dative: [stem or null for the definite article, gender/number classes the form agrees with,
// true if the form is also dative plural ('den', 'meinen')]
function nonDative(w) {
  if (w === 'die') return [null, ['FEM', 'PLU'], false];
  if (w === 'das') return [null, ['NEU'], false];
  if (w === 'den') return [null, ['MAS'], true];
  for (const s of STEMS) {
    if (w === s && s !== 'dies' && s !== 'jen' && s !== 'jed' && s !== 'manch' && s !== 'welch') return [s, ['MAS', 'NEU'], false];
    if (w === `${s}e`) return [s, ['FEM', 'PLU'], false];
    if (w === `${s}en`) return [s, ['MAS'], true];
  }
  return null;
}

// gender/number classes (MAS, FEM, NEU, PLU) of the noun readings
function nounClasses(t) {
  const out = new Map();
  for (const r of t.getReadings()) {
    const m = /^SUB:(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU|NOG)/.exec(r.getPOSTag() ?? '');
    if (m && (m[2] === 'PLU' || m[3] !== 'NOG')) out.set(m[2] === 'PLU' ? 'PLU' : m[3], [r, m[3]]); // plural-only nouns: NOG ('Ferien')
  }
  return out;
}

// Java: PRAEP_DAT covers 'mit die', not 'nach die', 'seit die' (LTJS). 'Nach die Matura' -> 'Nach der Matura': determiner of the
// noun phrase after a dative-only preposition has a form that cannot be dative
export class LtjsPraepDativRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong('Nach <marker>die Matura</marker> beginnt das Studium.'),
      Example.fixed('Nach <marker>der Matura</marker> beginnt das Studium.'));
  }

  getId() {
    return 'LTJS_PRAEP_DATIV';
  }

  getDescription() {
    return 'Präposition verlangt den Dativ';
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let i = 1; i < tokens.length - 2; i++) {
      const m = this.matchAt(sentence, tokens, i);
      if (m !== null) matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }

  // preposition at i, determiner at i+1, up to two adjectives, noun
  matchAt(sentence, tokens, i) {
    const prep = tokens[i];
    const p = prep.getToken().toLowerCase();
    if (!this.prepositions().has(p) || !hasTag(prep, /^PRP/)) return null;
    if (p === 'nach' && i >= 3 && tokens[i - 1].getToken() === 'und' && tokens[i - 2].getToken().toLowerCase() === 'nach') return null; // 'nach und nach'
    if (p === 'seit' && verbFinal(tokens, i + 1, clauseEnd(tokens, i + 1)) !== null) return null; // conjunction: 'Seit die Anlage lief, …'
    const det = tokens[i + 1];
    const w = det.getToken();
    const form = isLowerCase(det) ? nonDative(w) : null;
    if (form === null) return null;
    const [stem, classes, alsoDativePlural] = form;
    if (stem === 'ein' && w === 'ein' && QUANTIFIER_AFTER_EIN.has(tokens[i + 2].getToken().toLowerCase())) return null;
    let n = i + 2;
    const adjectives = [];
    while (n < tokens.length && adjectives.length <= 2 && isLowerCase(tokens[n]) && hasTag(tokens[n], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN):/)) adjectives.push(tokens[n++]);
    const noun = tokens[n];
    if (noun === undefined || adjectives.length > 2 || !isUpperCase(noun) || isUnknown(noun) || !hasTag(noun, /^SUB/)) return null;
    if (hasTag(noun, /^(EIG|VER)/)) return null;
    const after = tokens[n + 1];
    if (after !== undefined && (hasTag(after, /^SUB/) && isUpperCase(after))) return null; // noun compound or apposition: unsure
    const nc = nounClasses(noun);
    if (alsoDativePlural && nc.has('PLU')) return null; // 'mit den Kindern'
    const agreeing = classes.filter((c) => nc.has(c));
    if (agreeing.length === 0) return null; // determiner and noun do not agree: another error, leave it to DE_AGREEMENT
    const suggestions = [];
    for (const c of agreeing) {
      const s = this.dativePhrase(stem, adjectives, nc.get(c), c);
      if (s !== null && !suggestions.includes(s)) suggestions.push(s);
    }
    if (!suggestions.length || !this.licensed(tokens, i)) return null;
    const m = new RuleMatch(this, sentence, det.getStartPos(), noun.getEndPos(), this.message(prep), 'Dativ nach Präposition');
    m.setSuggestedReplacements(suggestions);
    return m;
  }

  prepositions() {
    return DATIVE_ONLY;
  }

  message(prep) {
    return `Die Präposition '${prep.getToken()}' verlangt den Dativ.`;
  }

  // further conditions of subclasses
  licensed() {
    return true;
  }

  // dative form of determiner + adjectives + noun ('die großen Kinder' -> 'den großen Kindern'); null if a form is missing
  dativePhrase(stem, adjectives, [nounReading, gender], c) {
    const synth = this.language.getSynthesizer();
    const num = c === 'PLU' ? 'PLU' : 'SIN';
    const words = [stem === null ? DATIVE_ARTICLE[c] : stem + DATIVE_ENDING[c]];
    for (const a of adjectives) {
      const r = a.getReadings().find((x) => /^(ADJ|PA1|PA2):/.test(x.getPOSTag() ?? ''));
      const deg = /:(GRU|KOM|SUP)/.exec(r.getPOSTag())?.[1] ?? 'GRU';
      const forms = synth.synthesize(r, `${r.getPOSTag().split(':')[0]}:DAT:${num}:${num === 'PLU' ? '[A-Z]+' : gender}:${deg}:DEF.*`, true);
      if (!forms.length) return null;
      words.push(forms[0]);
    }
    const nouns = synth.synthesize(nounReading, `SUB:DAT:${num}:${gender}.*`, true);
    if (!nouns.length) return null;
    words.push(nouns.includes(nounReading.getToken()) ? nounReading.getToken() : nouns[0]);
    return words.join(' ');
  }
}

// two-way prepositions without valence uses of the accusative with the static verbs below ('auf', 'an', 'über' are left out:
// 'warten auf', 'denken an', 'sprechen über')
const TWO_WAY = new Set(['in', 'vor', 'hinter', 'unter', 'neben', 'zwischen']);
// verbs of location without movement
const STATIC_VERBS = new Set(['wohnen', 'leben', 'sitzen', 'liegen', 'stehen', 'warten', 'bleiben', 'schlafen', 'übernachten',
  'frühstücken', 'treffen', 'stattfinden', 'befinden', 'aufhalten', 'arbeiten']);
const REFLEXIVE = new Set(['mich', 'dich', 'sich', 'uns', 'euch']);

// Java: none (LTJS). 'Wir warten unter einen Baum' -> 'unter einem Baum': accusative after a two-way preposition in a clause whose
// only full verb is a static verb of location
export class LtjsPraepWechselRule extends LtjsPraepDativRule {
  getId() {
    return 'LTJS_PRAEP_WECHSEL';
  }

  getDescription() {
    return 'Ortsangabe bei Verb ohne Bewegung verlangt den Dativ (wo?)';
  }

  getIncorrectExamples() {
    return [Example.wrong('Wir warten unter <marker>einen großen Baum</marker>.')];
  }

  getCorrectExamples() {
    return [Example.fixed('Wir warten unter <marker>einem großen Baum</marker>.')];
  }

  prepositions() {
    return TWO_WAY;
  }

  message(prep) {
    return `Nach '${prep.getToken()}' steht hier der Dativ (wo?), weil sich nichts bewegt.`;
  }

  // the clause has only static full verbs, no separable particle and no directional adverb; not 'bis in den Abend'
  licensed(tokens, i) {
    if (tokens[i - 1]?.getToken().toLowerCase() === 'bis') return false;
    const s = clauseStart(tokens, i);
    const e = clauseEnd(tokens, i);
    let statics = 0;
    let reflexive = false;
    for (let j = s; j < e; j++) {
      const t = tokens[j];
      const w = t.getToken().toLowerCase();
      if (REFLEXIVE.has(w)) reflexive = true;
      if (hasTag(t, /^ZUS/) && !hasTag(t, /^PRP/) || /^(hin|her)/.test(w) && hasTag(t, /^ADV/)) return false;
      if (!isVerb(t) || (j !== s && isUpperCase(t)) || hasTag(t, /^(ART|PRO|PRP|KON|ZAL|ADJ:(NOM|AKK|DAT|GEN))/)) continue; // 'um sieben' is no verb
      const full = lemmas(t, /^VER:(?!AUX|MOD)/);
      if (full.size === 0) continue; // auxiliary or modal
      if (![...full].some((l) => STATIC_VERBS.has(l))) return false;
      statics++;
      if (full.has('treffen') && !reflexive && !tokens.slice(j, e).some((x) => REFLEXIVE.has(x.getToken().toLowerCase()))) return false;
    }
    return statics > 0;
  }
}

// rule ids of the LTJS preposition case rules for German
export const LTJS_PRAEP_KASUS_RULE_IDS = Object.freeze(['LTJS_PRAEP_DATIV', 'LTJS_PRAEP_WECHSEL']);

// the LTJS preposition case rules for German
export function getLtjsGermanPraepKasusRules(messages, language) {
  return [new LtjsPraepDativRule(messages, language), new LtjsPraepWechselRule(messages, language)];
}
