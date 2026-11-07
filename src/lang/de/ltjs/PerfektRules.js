// LTJS layer (D-061): perfect tense auxiliary rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { hasTag, lemmas, isLowerCase, clauseStart, clauseEnd, isFiniteVerb } from './DasDassTools.js';

// verbs that form the perfect with 'sein' only, in every region and without transitive use (not: sitzen/liegen/stehen, regional;
// fahren/fliegen/schwimmen/passieren/umziehen, also transitive or reflexive with 'haben')
const SEIN_ONLY = new Set(['gehen', 'kommen', 'laufen', 'rennen', 'fallen', 'sterben', 'werden', 'bleiben', 'sein', 'wachsen',
  'geschehen', 'gelingen', 'misslingen', 'begegnen', 'einschlafen', 'aufwachen', 'aufstehen', 'ankommen', 'heimfahren', 'heimgehen',
  'heimkommen', 'losfahren', 'losgehen', 'weggehen', 'zurückkommen', 'aufwachsen', 'verschwinden', 'erscheinen', 'entstehen',
  'aussteigen', 'einsteigen', 'umsteigen', 'abstürzen', 'explodieren', 'gelangen', 'auftauchen', 'abfahren']);
// 'die Strecke abfahren', 'die Reifen abgefahren': only without an accusative object
const ALSO_TRANSITIVE = new Set(['abfahren']);
// finite forms of 'haben' -> 'sein'
const HABEN_SEIN = new Map([['habe', 'bin'], ['hast', 'bist'], ['hat', 'ist'], ['haben', 'sind'], ['habt', 'seid'], ['hatte', 'war'],
  ['hattest', 'warst'], ['hatten', 'waren'], ['hattet', 'wart'], ['hätte', 'wäre'], ['hättest', 'wärst'], ['hätten', 'wären'],
  ['hättet', 'wärt']]);

// Java: none (LTJS). 'Der Bus hat um acht abgefahren' -> ist: perfect of a verb of movement or change of state with 'haben'
export class LtjsPerfektSeinRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong('Wir <marker>haben</marker> mit dem Taxi heimgefahren.'),
      Example.fixed('Wir <marker>sind</marker> mit dem Taxi heimgefahren.'));
  }

  getId() {
    return 'LTJS_PERFEKT_SEIN';
  }

  getDescription() {
    return 'Perfekt mit „sein" statt „haben"';
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let p = 2; p < tokens.length; p++) {
      const m = this.matchAt(sentence, tokens, p);
      if (m !== null) matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }

  // participle at p closing the clause (or followed by the auxiliary only), finite 'haben' form in the same clause
  matchAt(sentence, tokens, p) {
    const part = tokens[p];
    if (!isLowerCase(part) || !hasTag(part, /^VER:PA2/)) return null;
    const pl = lemmas(part, /^VER:PA2/);
    if (pl.size === 0 || ![...pl].every((l) => SEIN_ONLY.has(l))) return null; // 'gefallen': also 'gefallen' (to please)
    const s = clauseStart(tokens, p);
    const e = clauseEnd(tokens, p);
    let aux = -1;
    if (p + 1 < e) { // verb-final: 'weil wir heimgefahren haben' (nothing else may follow)
      if (p + 2 !== e || !HABEN_SEIN.has(tokens[p + 1].getToken())) return null;
      aux = p + 1;
    } else {
      for (let j = s; j < p; j++) {
        if (!isFiniteVerb(tokens[j]) || !isLowerCase(tokens[j]) && j !== s) continue;
        if (aux !== -1 || !HABEN_SEIN.has(tokens[j].getToken().toLowerCase())) return null; // a second finite verb or not 'haben'
        aux = j;
      }
    }
    if (aux === -1) return null;
    for (let j = s; j < e; j++) if (j !== aux && j !== p && (hasTag(tokens[j], /^VER:PA2/) && isLowerCase(tokens[j]) || tokens[j].getToken() === 'gehabt')) return null;
    if ([...pl].some((l) => ALSO_TRANSITIVE.has(l)) && this.hasAccusativeObject(tokens, s, e, aux)) return null;
    const w = tokens[aux].getToken();
    const lower = w.toLowerCase();
    let repl = HABEN_SEIN.get(lower);
    if (lower === 'haben' && aux > p) repl = hasTag(tokens[aux], /^VER:(AUX:)?[13]:PLU/) ? 'sind' : 'sein';
    if (w[0] !== lower[0]) repl = repl[0].toUpperCase() + repl.slice(1);
    const m = new RuleMatch(this, sentence, tokens[aux].getStartPos(), tokens[aux].getEndPos(),
      `Das Perfekt von '${[...pl][0]}' wird mit 'sein' gebildet.`, 'Perfekt mit sein');
    m.setSuggestedReplacements([repl]);
    return m;
  }

  // a determiner or pronoun outside a prepositional phrase that can only be accusative ('die Strecke', 'ihn')
  hasAccusativeObject(tokens, s, e, aux) {
    let inPP = false;
    for (let j = s; j < e; j++) {
      const t = tokens[j];
      if (hasTag(t, /^PRP/) && isLowerCase(t)) { inPP = true; continue; }
      if (hasTag(t, /^(SUB|EIG)/) && !isLowerCase(t)) { inPP = false; continue; }
      if (j !== aux && !inPP && hasTag(t, /^(ART|PRO):.*AKK/) && !hasTag(t, /^PRO:REF/)) return true;
    }
    return false;
  }
}

// rule ids of the LTJS perfect rules for German
export const LTJS_PERFEKT_RULE_IDS = Object.freeze(['LTJS_PERFEKT_SEIN']);

// the LTJS perfect rules for German
export function getLtjsGermanPerfektRules(messages, language) {
  return [new LtjsPerfektSeinRule(messages, language)];
}
