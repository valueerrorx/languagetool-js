// LTJS layer (D-061): word confusion rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { hasTag, lower, isUpperCase, isLowerCase, isBoundary, clauseStart, clauseEnd, verbFinal, lemmas, isFiniteVerb } from './DasDassTools.js';

// base of the confusion rules: matchAt(tokens, i) returns [index, suggestion, message] or null
class LtjsConfusionRule extends Rule {
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
      const m = new RuleMatch(this, sentence, tokens[i].getStartPos(), tokens[i].getEndPos(), r[1], this.description);
      m.setSuggestedReplacements([r[0]]);
      matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }
}

const cap = (w, like) => (isUpperCase(like) ? w[0].toUpperCase() + w.slice(1) : w);
const VIEL_NOUNS = new Set(['Spaß', 'Glück', 'Erfolg', 'Vergnügen', 'Freude', 'Zeit', 'Geld', 'Arbeit']);

// another finite verb than the token at i in its clause
function otherFinite(tokens, i) {
  const s = clauseStart(tokens, i);
  const e = clauseEnd(tokens, i);
  for (let j = s; j < e; j++) if (j !== i && isFiniteVerb(tokens[j]) && (isLowerCase(tokens[j]) || j === s) && !hasTag(tokens[j], /^(ART|PRO|PRP|SUB|ZAL)/)) return true;
  return false;
}

// Java: none (LTJS). 'Gib nicht zu fiel Salz hinein' -> 'zu viel': past tense of 'fallen' as quantifier
export class LtjsFielVielRule extends LtjsConfusionRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_FIEL_VIEL', 'Verwechslung „fiel" (fallen) und „viel"',
      'Gib nicht zu <marker>fiel</marker> Salz hinein.', 'Gib nicht zu <marker>viel</marker> Salz hinein.');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'fiel') return null;
    const prev = lower(tokens[i - 1]);
    const next = tokens[i + 1];
    const quantifier = (prev === 'zu' || prev === 'so' || prev === 'sehr' || prev === 'wie') && otherFinite(tokens, i); // 'als ihm das Erbe zu fiel': zufiel
    const wish = next !== undefined && VIEL_NOUNS.has(next.getToken()) && (i === 1 || isBoundary(tokens[i - 1])) && !otherFinite(tokens, i); // 'Fiel Spaß!'
    if (!quantifier && !wish) return null;
    return [cap('viel', tokens[i]), "Meinten Sie 'viel' (Menge)? 'fiel' ist eine Form von 'fallen'."];
  }
}

// a noun at i, or attributive adjectives/participles followed by a noun
function nounPhraseAt(tokens, i) {
  for (let j = i; j < Math.min(tokens.length, i + 3); j++) {
    const t = tokens[j];
    if (hasTag(t, /^SUB/) && isUpperCase(t)) return true;
    if (!(hasTag(t, /^(ADJ|PA[12])/) && isLowerCase(t))) return false;
  }
  return false;
}

// before 'fielen' these may end a phrase ('so', 'zu') or be postpositions ('Angaben zufolge fielen Schüsse', 'meiner Meinung nach fielen'),
// so 'fielen' only counts as a quantifier when the clause has another finite verb
const FIELEN_AMBIGUOUS = new Set(['zu', 'so', 'sehr', 'wie', 'zufolge', 'gegenüber', 'entlang', 'halber', 'wegen', 'nach', 'zuliebe',
  'willen', 'hindurch', 'über', 'an', 'aus', 'lang', 'entgegen', 'gemäß', 'nahe', 'vorbei', 'herum', 'ab', 'um', 'durch', 'auf', 'vor']);

// Java: only the ngram confusion set 'fielen -> vielen' (needs ngram data). 'Ein Satz mit fielen Fehlern' -> 'vielen':
// 'fielen' (fallen) after a preposition or 'den' and before a noun phrase, or 'Fielen Dank'
export class LtjsFielenVielenRule extends LtjsConfusionRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_FIELEN_VIELEN', 'Verwechslung „fielen" (fallen) und „vielen"',
      'Ein Satz mit <marker>fielen</marker> Fehlern.', 'Ein Satz mit <marker>vielen</marker> Fehlern.');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'fielen') return null;
    const prev = tokens[i - 1];
    const p = lower(prev);
    const thanks = tokens[i + 1]?.getToken() === 'Dank' && (i === 1 || isBoundary(prev)); // 'Fielen Dank!'
    const quant = FIELEN_AMBIGUOUS.has(p) ? otherFinite(tokens, i) : hasTag(prev, /^PRP/) || p === 'den'; // 'die ihm zu fielen': zufielen
    if (!thanks && !(quant && nounPhraseAt(tokens, i + 1))) return null;
    return [cap('vielen', tokens[i]), "Meinten Sie 'vielen' (Menge)? 'fielen' ist eine Form von 'fallen'."];
  }
}

const NOMINATIVE = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man']);

// Java: none (LTJS). 'Wen ihr Tipps habt, schreibt' -> 'Wenn': 'wen' (accusative) opening a clause in which it has no role:
// the only verb is 'haben' with its own object, 'sein', 'kommen' or 'gehen'
export class LtjsWenWennRule extends LtjsConfusionRule {
  constructor(messages, language) {
    super(messages, language, 'LTJS_WEN_WENN', 'Verwechslung „wen" (Fragewort) und „wenn" (Konjunktion)',
      '<marker>Wen</marker> ihr Fragen habt, meldet euch.', '<marker>Wenn</marker> ihr Fragen habt, meldet euch.');
  }

  matchAt(tokens, i) {
    if (lower(tokens[i]) !== 'wen' || !(i === 1 || isBoundary(tokens[i - 1]))) return null;
    if (!NOMINATIVE.has(lower(tokens[i + 1] ?? tokens[i]))) return null;
    const e = clauseEnd(tokens, i + 1);
    const vf = verbFinal(tokens, i + 1, e);
    if (vf === null || vf.clusterStart !== vf.last) return null; // one verb only ('wen ihr gesehen habt' is fine)
    const verb = lemmas(tokens[vf.last], /^VER/);
    let nouns = 0;
    let inPP = false;
    for (let j = i + 2; j < vf.last; j++) {
      const t = tokens[j];
      if (hasTag(t, /^PRP/) && isLowerCase(t)) inPP = true;
      else if (hasTag(t, /^SUB/) && isUpperCase(t)) { if (!inPP) nouns++; inPP = false; }
    }
    const noRole = (verb.has('haben') && nouns > 0) || verb.has('sein') || verb.has('kommen') || verb.has('gehen');
    if (!noRole) return null;
    return [cap('wenn', tokens[i]), "Meinten Sie die Konjunktion 'wenn'? 'wen' ist ein Fragewort (Akkusativ von 'wer')."];
  }
}

// rule ids of the LTJS confusion rules for German
export const LTJS_VERWECHSLUNG_RULE_IDS = Object.freeze(['LTJS_FIEL_VIEL', 'LTJS_FIELEN_VIELEN', 'LTJS_WEN_WENN']);

// the LTJS confusion rules for German
export function getLtjsGermanVerwechslungRules(messages, language) {
  return [new LtjsFielVielRule(messages, language), new LtjsFielenVielenRule(messages, language), new LtjsWenWennRule(messages, language)];
}
