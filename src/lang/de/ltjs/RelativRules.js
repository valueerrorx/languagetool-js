// LTJS layer (D-061): relative pronoun rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { tags, hasTag, isLowerCase, isUpperCase, isUnknown, clauseEnd, verbFinal, NP_CHAIN } from './DasDassTools.js';

// cases a relative pronoun form can have (genitive forms are handled apart)
const PRONOUN_CASES = new Map([['der', ['NOM', 'DAT']], ['die', ['NOM', 'AKK']], ['das', ['NOM', 'AKK']], ['den', ['AKK']], ['dem', ['DAT']], ['denen', ['DAT']]]);
const GENITIVES = new Set(['dessen', 'deren']);
// relative pronoun by case and gender/number of the antecedent
const FORMS = {
  NOM: { MAS: 'der', FEM: 'die', NEU: 'das', PLU: 'die' },
  AKK: { MAS: 'den', FEM: 'die', NEU: 'das', PLU: 'die' },
  DAT: { MAS: 'dem', FEM: 'der', NEU: 'dem', PLU: 'denen' },
  GEN: { MAS: 'dessen', FEM: 'deren', NEU: 'dessen', PLU: 'deren' },
};
const GN_NAMES = { MAS: 'maskulin', FEM: 'feminin', NEU: 'neutral', PLU: 'Plural' };
// readings that only work as article/determiner of a following noun phrase
const NOUN_PHRASE_NEXT = /^(SUB|EIG|ADJ|PA1|PA2|ZAL|PRO:(POS|IND|DEM))/;

// gender/number classes (MAS, FEM, NEU, PLU) of a noun or name; empty if unknown or NOG only
function genderNumber(t) {
  const out = new Set();
  for (const p of tags(t)) {
    const m = /^(SUB|EIG):(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU)/.exec(p);
    if (m) out.add(m[3] === 'PLU' ? 'PLU' : m[4]);
  }
  return out;
}

// gender/number classes a relative pronoun form agrees with
function pronounClasses(w) {
  const out = new Set();
  for (const c of GENITIVES.has(w) ? ['GEN'] : PRONOUN_CASES.get(w)) for (const [gn, f] of Object.entries(FORMS[c])) if (f === w) out.add(gn);
  return out;
}

// Java: none (LTJS). 'Das Protokoll, den du geschickt hast' -> das: relative pronoun disagrees in gender/number with every noun before the comma
export class LtjsRelativpronomenRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong('Das Protokoll, <marker>den</marker> du geschickt hast, ist gut.'),
      Example.fixed('Das Protokoll, <marker>das</marker> du geschickt hast, ist gut.'));
  }

  getId() {
    return 'LTJS_RELATIVPRONOMEN';
  }

  getDescription() {
    return 'Relativpronomen passt nicht zum Bezugswort (Genus/Numerus)';
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let k = 2; k < tokens.length - 2; k++) {
      const m = this.matchAt(sentence, tokens, k);
      if (m !== null) matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }

  // comma at k, antecedent noun before it, relative pronoun at k+1 (or k+2 after a preposition)
  matchAt(sentence, tokens, k) {
    if (tokens[k].getToken() !== ',') return null;
    const head = tokens[k - 1];
    if (!isUpperCase(head) || !hasTag(head, /^(SUB|EIG)/)) return null;
    let r = k + 1;
    if (hasTag(tokens[r], /^PRP/) && isLowerCase(tokens[r]) && !hasTag(tokens[r], /^(ART|PRO)/)) r++;
    const pron = tokens[r];
    const w = pron?.getToken();
    if (w === undefined || !(PRONOUN_CASES.has(w) || GENITIVES.has(w))) return null;
    const next = tokens[r + 1];
    if (next === undefined || (!GENITIVES.has(w) && (hasTag(next, NOUN_PHRASE_NEXT) || (isUnknown(next) && isUpperCase(next))))) return null; // article reading
    // a verb-final relative clause follows
    const e = clauseEnd(tokens, r + 1);
    if (verbFinal(tokens, r + 1, e) === null) return null;
    // candidate antecedents: every noun of the noun phrase chain before the comma; unknown capitalised words make it unsure
    const allowed = pronounClasses(w);
    let anyNoun = false;
    for (let j = k - 1; j > 0 && NP_CHAIN(tokens[j]); j--) {
      const t = tokens[j];
      if (isUnknown(t) && isUpperCase(t)) return null;
      if (!isUpperCase(t) || !hasTag(t, /^(SUB|EIG)/)) continue;
      if (hasTag(t, /^SUB:.*:ADJ$/)) return null; // nominalised adjective ('einem Heurigen, den'): gender follows the referent
      const gn = genderNumber(t);
      if (gn.size === 0) return null; // gender unknown
      anyNoun = true;
      if ([...gn].some((x) => allowed.has(x))) return null;
    }
    if (!anyNoun) return null;
    const headGn = [...genderNumber(head)];
    const cases = GENITIVES.has(w) ? ['GEN'] : PRONOUN_CASES.get(w);
    const suggestions = [...new Set(cases.flatMap((c) => headGn.map((gn) => FORMS[c][gn])))].filter((s) => s !== w);
    if (!suggestions.length) return null;
    const m = new RuleMatch(this, sentence, pron.getStartPos(), pron.getEndPos(),
      `Das Relativpronomen '${w}' passt nicht zum Bezugswort '${head.getToken()}' (${headGn.map((g) => GN_NAMES[g]).join('/')}).`, 'Relativpronomen');
    m.setSuggestedReplacements(suggestions);
    return m;
  }
}

// rule ids of the LTJS relative pronoun rules for German
export const LTJS_RELATIV_RULE_IDS = Object.freeze(['LTJS_RELATIVPRONOMEN']);

// the LTJS relative pronoun rules for German
export function getLtjsGermanRelativRules(messages, language) {
  return [new LtjsRelativpronomenRule(messages, language)];
}
