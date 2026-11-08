// LTJS layer (D-061): comparison and expression rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { hasTag, lower, isUpperCase, isUnknown, isBoundary } from './DasDassTools.js';

// base of the small token pattern rules: matchAt(tokens, i) returns [fromIndex, toIndex, suggestion, message] or null
class LtjsPatternRule extends Rule {
  constructor(messages, language, id, description, wrong, fixed) {
    super(messages);
    this.language = language;
    this.id = id;
    this.description = description;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.addExamplePair(Example.wrong(wrong), Example.fixed(fixed));
  }

  getId() {
    return this.id;
  }

  getDescription() {
    return this.description;
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let i = 1; i < tokens.length; i++) {
      const r = this.matchAt(tokens, i);
      if (r === null) continue;
      const [from, to, suggestion, message] = r;
      const m = new RuleMatch(this, sentence, tokens[from].getStartPos(), tokens[to].getEndPos(), message, this.description);
      m.setSuggestedReplacements([suggestion]);
      matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }
}

const cap = (w, like) => (isUpperCase(like) ? w[0].toUpperCase() + w.slice(1) : w);
const isNumber = (t) => t !== undefined && (hasTag(t, /^ZAL/) || /^\d/.test(t.getToken()));

// Java: none (LTJS). 'mehr wie zwei Millionen' -> 'mehr als': comparison with a number ('nicht mehr wie früher' stays)
export class LtjsMehrWieRule extends LtjsPatternRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_MEHR_WIE', 'Vergleich: „mehr als" statt „mehr wie"',
      'Es kostet <marker>mehr wie</marker> zwei Millionen Euro.', 'Es kostet <marker>mehr als</marker> zwei Millionen Euro.');
  }

  matchAt(tokens, i) {
    const w = lower(tokens[i]);
    if ((w !== 'mehr' && w !== 'weniger') || lower(tokens[i + 1] ?? tokens[i]) !== 'wie' || !isNumber(tokens[i + 2])) return null;
    return [i, i + 1, `${tokens[i].getToken()} als`, `Nach einem Komparativ steht 'als': '${tokens[i].getToken()} als'.`];
  }
}

// Java: none (LTJS). 'so hoch als' -> 'so hoch wie': equality comparison ('so bald als möglich', 'sowohl als auch' stay)
export class LtjsSoAlsRule extends LtjsPatternRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_SO_ALS', 'Vergleich: „so … wie" statt „so … als"',
      'Er ist <marker>so groß als</marker> sein Vater.', 'Er ist <marker>so groß wie</marker> sein Vater.');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'so') return null;
    const adj = tokens[i + 1];
    const als = tokens[i + 2];
    if (adj === undefined || als === undefined || lower(als) !== 'als' || isUpperCase(adj)) return null;
    if (!hasTag(adj, /^(ADJ|ADV)/) || hasTag(adj, /:(KOM|SUP)/)) return null;
    const next = tokens[i + 3];
    if (next !== undefined && ['möglich', 'nötig', 'auch', 'ob'].includes(lower(next))) return null;
    return [i, i + 2, `${tokens[i].getToken()} ${adj.getToken()} wie`, "Bei Gleichheit heißt es 'so … wie', bei Ungleichheit 'als'."];
  }
}

// Java: none (LTJS). 'Desto wärmer es ist, desto schneller …' -> 'Je wärmer': 'je … desto'
export class LtjsDestoJeRule extends LtjsPatternRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_DESTO_JE', 'Vergleich: „je … desto"',
      '<marker>Desto</marker> wärmer es ist, desto schneller altert der Akku.', '<marker>Je</marker> wärmer es ist, desto schneller altert der Akku.');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'desto' || !(i === 1 || isBoundary(tokens[i - 1]))) return null;
    if (!tokens.slice(i + 1).some((t, k, a) => ['desto', 'umso'].includes(lower(t)) && k > 0 && a[k - 1].getToken() === ',')) return null;
    return [i, i, cap('je', tokens[i]), "Der erste Teil des Vergleichs beginnt mit 'je': 'je … desto'."];
  }
}

const W_WORDS = new Set(['warum', 'wieso', 'weshalb', 'weswegen', 'wann', 'wo', 'wohin', 'woher', 'wer', 'wen', 'wem', 'wie', 'ob']);

// Java: none (LTJS). 'Ich frage mich, warum dass niemand fragt' -> 'warum': doubled conjunction (dialect)
export class LtjsWDassRule extends LtjsPatternRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_W_DASS', 'Doppelte Konjunktion („warum dass")',
      'Ich frage mich, <marker>warum dass</marker> niemand kommt.', 'Ich frage mich, <marker>warum</marker> niemand kommt.');
  }

  matchAt(tokens, i) {
    const w = lower(tokens[i]);
    if (!W_WORDS.has(w) || lower(tokens[i + 1] ?? tokens[i]) !== 'dass') return null;
    if (i > 1 && ['so', 'als', 'ohne', 'statt', 'anstatt', 'außer', 'nur', 'ja'].includes(lower(tokens[i - 1]))) return null; // 'so wie dass'
    return [i, i + 1, tokens[i].getToken(), `Nach '${tokens[i].getToken()}' steht kein 'dass'.`];
  }
}

// Java: none (LTJS). 'Seit ihr heute auch beim Konzert?' -> 'Seid': 'seit ihr' opening a question without a noun after 'ihr'
export class LtjsSeitSeidRule extends LtjsPatternRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_SEIT_SEID', 'Verwechslung „seit" (Zeit) und „seid" (Verb sein)',
      '<marker>Seit</marker> ihr morgen auch dabei?', '<marker>Seid</marker> ihr morgen auch dabei?');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'seit' || lower(tokens[i + 1] ?? tokens[i]) !== 'ihr') return null;
    if (!(i === 1 || isBoundary(tokens[i - 1]))) return null;
    const next = tokens[i + 2];
    if (next === undefined || isUpperCase(next) || isUnknown(next) || hasTag(next, /^(SUB|ADJ:(NOM|AKK|DAT|GEN)|PA[12]:(NOM|AKK|DAT|GEN))/)) return null; // 'seit ihr Vater …'
    let end = i + 2;
    while (end < tokens.length && !['.', '!', '?', ','].includes(tokens[end].getToken())) end++;
    if (tokens[end]?.getToken() !== '?') return null; // only questions: 'Seit ihr da seid, …' is a conjunction
    for (let j = i + 2; j < end; j++) if (hasTag(tokens[j], /^VER:(AUX:|MOD:)?[123]:/) && !hasTag(tokens[j], /^(PRP|ADV|PA2|SUB)/)) return null;
    return [i, i, cap('seid', tokens[i]), "Meinten Sie die Verbform 'seid' (von 'sein')? 'seit' ist eine Zeitangabe."];
  }
}

// rule ids of the LTJS comparison and expression rules for German
export const LTJS_AUSDRUCK_RULE_IDS = Object.freeze(['LTJS_MEHR_WIE', 'LTJS_SO_ALS', 'LTJS_DESTO_JE', 'LTJS_W_DASS', 'LTJS_SEIT_SEID']);

// the LTJS comparison and expression rules for German
export function getLtjsGermanAusdruckRules(messages, language) {
  return [LtjsMehrWieRule, LtjsSoAlsRule, LtjsDestoJeRule, LtjsWDassRule, LtjsSeitSeidRule].map((C) => new C(messages, language));
}
