// LTJS layer (D-061): German comma rules beyond Java. Each rule has its own LTJS_KOMMA_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { clauseEnd, hasSubjectCandidate, coreArguments } from './DasDassTools.js';
import {
  hasTag, tags, lower, isLowerCase, isUpperCase, isUnknown, isFiniteVerb, isStrictFiniteVerb, isVerb, verbLemmas, lemmas,
  isWord, isComma, isSentenceEnd, isSegmentPunct, segmentStartAt, isClauseVerb, personNumbers, numbersOf, intersects,
  isNonFiniteVerb, hasInfinitive, hasParticiple, zuInfinitiveStart, isOnlyFinite, isNominativePronoun, isNoun, verbFinalLoose,
  isInitialFiniteVerb, isMainFinite, subjectAgrees,
} from './KommaTools.js';

// subordinating conjunctions that start a verb-final clause
const SUBORDINATORS = new Set(['wenn', 'falls', 'sobald', 'solange', 'sofern', 'soweit', 'sooft', 'da', 'weil', 'obwohl', 'obgleich',
  'obschon', 'nachdem', 'bevor', 'ehe', 'seit', 'seitdem', 'während', 'als', 'ob', 'dass', 'daß', 'bis', 'indem', 'damit', 'sodass', 'wie']);
// conjunctions that are also adverbs, prepositions or comparison particles
const AMBIGUOUS_SUBORDINATORS = new Set(['als', 'wie', 'da', 'bis', 'seit', 'während', 'damit', 'indem']);
// interrogative words that start an indirect question or free relative clause
const W_WORDS = new Set(['wer', 'wen', 'wem', 'wessen', 'was', 'wo', 'wann', 'warum', 'wieso', 'weshalb', 'weswegen', 'wohin', 'woher',
  'woran', 'worauf', 'woraus', 'wobei', 'wodurch', 'wofür', 'wogegen', 'womit', 'wonach', 'worüber', 'worum', 'worunter', 'wovon', 'wovor', 'wozu', 'worin']);
const W_SUBJECT = new Set(['wer', 'was']); // the w-word itself can be the subject
const RELATIVE = new Set(['der', 'die', 'das', 'dem', 'den', 'deren', 'dessen', 'denen', 'welcher', 'welche', 'welches', 'welchem', 'welchen']);
const COORDINATORS = new Set(['und', 'oder', 'sowie', 'bzw', 'aber', 'sondern', 'denn', 'doch', 'beziehungsweise', 'respektive']);
const INITIAL_PARTICLES = new Set(['und', 'aber', 'doch', 'also', 'nur', 'denn', 'oder']);
// sentence-initial conditional verbs ('Sollten Sie Fragen haben, ...')
const CONDITIONAL_V1 = new Set(['Sollte', 'Sollten', 'Solltest']);
// verbs that govern a bare infinitive ('kommen können'): after an infinitive they may still belong to the fronted clause
const INF_GOVERNORS = new Set(['können', 'müssen', 'sollen', 'wollen', 'dürfen', 'mögen', 'möchten', 'werden', 'lassen', 'sehen', 'hören',
  'helfen', 'bleiben', 'gehen', 'brauchen', 'fühlen', 'lernen', 'lehren']);
const MODALS_WERDEN = new Set(['können', 'müssen', 'sollen', 'wollen', 'dürfen', 'werden']);
const AUXILIARIES = new Set(['haben', 'sein', 'werden', 'können', 'müssen', 'sollen', 'wollen', 'dürfen', 'mögen', 'möchten', 'lassen']);
// adverbs that resume a fronted clause ('Wenn er kommen will dann soll er')
const RESUMPTIVE = new Set(['dann', 'so', 'also', 'da', 'darum', 'deshalb']);
// words before a subordinate clause that belong to it ('kurz bevor', 'nur wenn', 'so wie'): the comma goes before them
const CLAUSE_MODIFIERS = new Set(['kurz', 'lange', 'lang', 'gleich', 'bald', 'unmittelbar', 'direkt', 'sofort', 'genau', 'gerade', 'eben',
  'knapp', 'kaum', 'noch', 'schon', 'erst', 'nur', 'auch', 'selbst', 'sogar', 'besonders', 'insbesondere', 'zumal', 'so', 'ebenso',
  'genauso', 'je', 'umso', 'desto', 'vor', 'allem', 'außer', 'ohne', 'statt', 'anstatt', 'nicht', 'zwar', 'aber', 'und', 'oder', 'sowie',
  'bzw', 'sondern', 'denn', 'doch', 'sowohl', 'weder', 'als', 'wie', 'dass', 'ob', 'mehr', 'weniger', 'früher', 'später', 'eher', 'bis',
  'jetzt', 'nun', 'dann', 'damals', 'immer', 'vielleicht', 'wohl', 'etwa', 'meist', 'oft', 'manchmal', 'teilweise', 'zum', 'zur', 'überall',
  'irgendwann', 'sonst', 'einfach', 'besser', 'lieber', 'gern', 'gerne', 'auf', 'zu', 'im', 'am', 'dort', 'hier', 'da', 'darum', 'deshalb',
  'deswegen', 'daher', 'also', 'egal', 'gleichgültig', 'völlig', 'ganz', 'weit', 'mal', 'einmal', 'heute', 'morgen', 'gestern']);
const COMPARATIVES = new Set(['mehr', 'weniger', 'eher', 'lieber', 'besser', 'früher', 'später', 'anders', 'länger', 'öfter', 'schneller']);
const MSG_SUBORDINATE = 'Hier scheint ein Komma zu fehlen: Nebensätze werden mit Komma abgetrennt.';

// Base: shared setup of the LTJS comma rules.
class LtjsKommaRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.PUNCTUATION.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Typographical);
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let i = 1; i < tokens.length; i++) {
      const m = this.matchAt(sentence, tokens, i);
      if (m !== null) matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }

  // missing comma between tokens[k-1] and tokens[k]
  missingComma(sentence, tokens, k, msg) {
    const a = tokens[k - 1];
    const b = tokens[k];
    const m = new RuleMatch(this, sentence, a.getStartPos(), b.getEndPos(), msg, 'Komma fehlt');
    m.setSuggestedReplacement(`${a.getToken()}, ${b.getToken()}`);
    return m;
  }

  // superfluous comma at tokens[k]
  superfluousComma(sentence, tokens, k, msg) {
    const a = tokens[k - 1];
    const b = tokens[k + 1];
    const m = new RuleMatch(this, sentence, a.getStartPos(), b.getEndPos(), msg, 'Komma überflüssig');
    m.setSuggestedReplacement(`${a.getToken()} ${b.getToken()}`);
    return m;
  }
}

// subordinating conjunction reading (old spelling 'daß' has no tag)
const isKonUnt = (t) => hasTag(t, /^KON:UNT/) || lower(t) === 'daß';

// no strict finite verb in [from, to) ('bitte' is read as a particle)
function noFiniteVerb(tokens, from, to) {
  for (let j = from; j < to; j++) if (isStrictFiniteVerb(tokens[j]) && lower(tokens[j]) !== 'bitte') return false;
  return true;
}

// a participle that is also tagged as an adjective ('geschickt'), not an attributive form
const isVerbParticiple = (t) => hasTag(t, /^VER:PA2/) && isLowerCase(t) && !hasTag(t, /^(ADJ|PA2):(NOM|AKK|DAT|GEN)/);

// a word that may end the clause before a subordinate clause: noun, name, verb, separable particle, predicative adjective, personal pronoun
function endsClause(t) {
  if (!isWord(t) || CLAUSE_MODIFIERS.has(lower(t))) return false;
  if (isNoun(t)) return !hasTag(t, /^(KON|PRP|ART)/) || hasTag(t, /^(SUB|EIG)/);
  if (!isLowerCase(t)) return false;
  if (hasTag(t, /^(KON|PRP:|ART)/) && !hasTag(t, /^ZUS/)) return false;
  if (isVerb(t) || hasTag(t, /^ZUS/)) return true;
  if (hasTag(t, /^(ADJ|PA2):PRD/) && !hasTag(t, /^ADV/)) return true;
  return hasTag(t, /^PRO:PER/) && !hasTag(t, /^PRO:(POS|DEM|IND|REL)/);
}

// first token after the punctuation before index i, past sentence-initial coordinating particles
function clauseStartBefore(tokens, i) {
  let cs = segmentStartAt(tokens, i);
  if (cs < i - 1 && INITIAL_PARTICLES.has(lower(tokens[cs]))) cs++;
  return cs;
}

// a relative pronoun at j after a comma (not the article of a noun phrase: ', die Klassen 7 und 8 einzubinden')
function relativeAfterComma(tokens, j) {
  return RELATIVE.has(tokens[j].getToken()) && j > 1 && isComma(tokens[j - 1]) && j + 1 < tokens.length
    && !hasTag(tokens[j + 1], /^(SUB|EIG|ADJ|PA1|PA2|ZAL)/) && !(isUnknown(tokens[j + 1]) && isUpperCase(tokens[j + 1]))
    && !isClauseVerb(tokens[j + 1]); // ', das heißt ...' is a main clause
}

// the clause that ends before index i is complete: a verb-final clause ends with its finite verb, a main clause has its finite verb
// (or ends with an infinitive/participle); returns {complete, open} (open: auxiliary or modal without its infinitive/participle yet)
function clauseBefore(tokens, i) {
  const cs = clauseStartBefore(tokens, i);
  const prev = tokens[i - 1];
  const seg = segmentStartAt(tokens, i);
  if (zuInfinitiveStart(tokens, i - 1) >= 0 && seg > 1 && isComma(tokens[seg - 1]) && !INITIAL_PARTICLES.has(lower(tokens[seg]))
    && noFiniteVerb(tokens, seg, i)) return { complete: true, open: false, f: -1 }; // ', die Klassen einzubinden da ...': an infinitive group ends here
  let sub = -1;
  for (let j = cs; j < i; j++) {
    const w = lower(tokens[j]);
    if ((SUBORDINATORS.has(w) && !AMBIGUOUS_SUBORDINATORS.has(w) && isKonUnt(tokens[j]))
      || (j === cs && (W_WORDS.has(w) || relativeAfterComma(tokens, j) || (SUBORDINATORS.has(w) && cs > 1 && isKonUnt(tokens[j]))))) sub = j;
  }
  // a verb-final clause ends with its finite verb ('weil er kam'); a participle reading could still be inside it ('der sich isoliert als ...')
  if (sub >= 0) return { complete: sub < i - 2 && isFiniteVerb(prev) && isLowerCase(prev) && (!hasParticiple(prev) || isVerb(tokens[i - 2])), open: false };
  let f = -1;
  for (let j = cs; j < i; j++) {
    if (isMainFinite(tokens[j]) || (j === cs && isInitialFiniteVerb(tokens, j))) { f = j; break; }
  }
  if (f === cs && f === i - 1 && hasParticiple(prev)) return { complete: false, open: false, f }; // ', ermüdet wie sie war,'
  // without finite verb: an infinitive clause ('alles köcheln lassen'), not the continuation of a coordinated clause (', und doch ... zu finden')
  if (f < 0) return { complete: i - cs >= 3 && isNonFiniteVerb(prev) && isLowerCase(prev) && !hasTag(prev, /^(ADJ|SUB|ADV|PRP|KON)/) && !COORDINATORS.has(lower(tokens[seg])), open: false, f };
  let fl = f; // the open bracket belongs to the last finite verb before the final verbs ('das heißt man kann damit ...')
  let end = i;
  while (end - 1 > f && isVerb(tokens[end - 1]) && isNonFiniteVerb(tokens[end - 1])) end--;
  for (let j = f + 1; j < end; j++) if (isMainFinite(tokens[j])) fl = j;
  const fLemmas = verbLemmas(tokens[fl]);
  let open = [...fLemmas].some((l) => AUXILIARIES.has(l));
  for (let j = fl + 1; j < i && open; j++) if (isNonFiniteVerb(tokens[j]) && isLowerCase(tokens[j]) && !hasTag(tokens[j], /^(ADJ|SUB)/)) open = false;
  // a copula with its predicative adjective ('Umso überraschter war ich', 'ist gewöhnungsbedürftiger')
  if (open && [...fLemmas].every((l) => l === 'sein' || l === 'bleiben')) {
    for (let j = cs; j < i && open; j++) {
      const next = tokens[j + 1];
      const attributive = hasTag(next, /^(SUB|ADJ|PA1|PA2|EIG)/) || (isUnknown(next) && isUpperCase(next));
      if (j !== fl && hasTag(tokens[j], /^(ADJ|PA2)/) && !hasTag(tokens[j], /^(SUB|ART|PRO|ADV|VER)/) && !attributive) open = false;
    }
  }
  return { complete: true, open, f, fLemmas };
}

// the verb-final clause could also be the rest of an open main clause: its last verb is the infinitive or participle that the
// auxiliary or modal of the main clause still needs ('hat damit Geld verdient', 'konnten Frauen wie Sachen gekauft werden')
function ambiguousWithOpenClause(tokens, vf, before) {
  if (!before.open) return false;
  const last = tokens[vf.last];
  const ls = before.fLemmas;
  const perfect = ls.has('haben') || ls.has('sein');
  if (perfect && hasParticiple(last)) return true;
  if ([...ls].some((l) => l !== 'haben' && l !== 'sein' && AUXILIARIES.has(l)) && (hasInfinitive(last) || (ls.has('werden') && hasParticiple(last)))) return true;
  return false;
}

// a non-finite verb after index e in the same segment may still close an open main clause ('sind Wettbewerbe wie X und Y entstanden')
function laterNonFinite(tokens, e) {
  for (let j = e; j < tokens.length && !isComma(tokens[j]) && !isSentenceEnd(tokens[j]); j++) {
    const t = tokens[j];
    if (isLowerCase(t) && hasTag(t, /^(VER:(INF|PA2|EIZ)|PA2:PRD)/) && !hasTag(t, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/)) return true;
  }
  return false;
}

// a relative clause or subordinate clause starts inside [from, to) without comma: the verb at the end may belong to it
function embeddedClauseStart(tokens, from, to) {
  for (let j = from + 1; j < to; j++) {
    const t = tokens[j];
    if (RELATIVE.has(t.getToken()) && !articleNext(tokens, j) && (isNoun(tokens[j - 1]) || (hasTag(tokens[j - 1], /^PRP/) && isLowerCase(tokens[j - 1]) && isNoun(tokens[j - 2])))) return true;
    if (isKonUnt(t) && !AMBIGUOUS_SUBORDINATORS.has(lower(t)) && SUBORDINATORS.has(lower(t))) return true;
    if (W_WORDS.has(t.getToken())) return true; // '... das Leben zu Hause wo ich ...'
  }
  return false;
}

// Java: none (LTJS). 'Falls Sie Fragen haben können wir helfen.' -> 'haben, können': comma after a fronted subordinate or relative clause
export class LtjsKommaVorfeldRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Falls Sie Fragen <marker>haben können</marker> Sie uns anrufen.'),
      Example.fixed('Falls Sie Fragen <marker>haben, können</marker> Sie uns anrufen.'));
  }

  getId() {
    return 'LTJS_KOMMA_VORFELD';
  }

  getDescription() {
    return 'Komma nach vorangestelltem Nebensatz';
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    if (tokens.length < 6) return this.toRuleMatchArray(matches);
    for (const [s, kind] of this.clauseStarts(tokens)) {
      const v = frontedClauseEnd(tokens, s, kind);
      if (v > 0) matches.push(this.missingComma(sentence, tokens, v,
        'Hier scheint ein Komma zu fehlen: Der vorangestellte Nebensatz endet mit dem Verb, danach beginnt der Hauptsatz.'));
    }
    return this.toRuleMatchArray(matches);
  }

  // [index of the clause introducer, kind] of clauses that may be fronted before a main clause
  clauseStarts(tokens) {
    const out = [];
    const s = INITIAL_PARTICLES.has(lower(tokens[1])) ? 2 : 1;
    const w = lower(tokens[s]);
    if (SUBORDINATORS.has(w) || W_WORDS.has(w)) out.push([s, W_SUBJECT.has(w) ? 'subject' : 'conj']);
    else if (CONDITIONAL_V1.has(tokens[s].getToken())) out.push([s, 'conj']);
    else {
      // noun phrase + (', ') relative clause or 'wie' clause at the sentence start ('Fotos, die den Schaden zeigen habe ich beigefügt')
      const k = frontedNounPhraseEnd(tokens);
      if (k > 1 && k + 3 < tokens.length) {
        let r = isComma(tokens[k]) ? k + 1 : k;
        if (hasTag(tokens[r], /^PRP/) && isLowerCase(tokens[r]) && RELATIVE.has(tokens[r + 1].getToken())) r++;
        const rel = tokens[r].getToken();
        if (RELATIVE.has(rel) && (isComma(tokens[k]) || !articleNext(tokens, r))) out.push([r, 'relative']);
        else if (isComma(tokens[k]) && rel === 'wie') out.push([r, 'conj']);
      }
    }
    // after a comma: ', und wer das bedauert übersieht', ', wenn er kommt wird es'
    for (let k = 2; k + 4 < tokens.length; k++) {
      if (!isComma(tokens[k])) continue;
      const j = INITIAL_PARTICLES.has(tokens[k + 1].getToken()) ? k + 2 : k + 1;
      const wj = tokens[j].getToken();
      if ((SUBORDINATORS.has(wj) && !AMBIGUOUS_SUBORDINATORS.has(wj) && isKonUnt(tokens[j])) || (W_SUBJECT.has(wj) && j === k + 2)) {
        out.push([j, W_SUBJECT.has(wj) ? 'subject' : 'conj']);
      }
    }
    return out;
  }

  matchAt() {
    return null;
  }
}

// a noun phrase follows the pronoun at r ('die Schule'): then it is an article
function articleNext(tokens, r) {
  const n = tokens[r + 1];
  return hasTag(n, /^(SUB|EIG|ADJ|PA1|PA2|ZAL|PRO:(IND|POS))/) || (isUnknown(n) && isUpperCase(n));
}

// index v of the main clause verb after the fronted clause introduced at s (missing comma before it), else -1
function frontedClauseEnd(tokens, s, kind) {
  const body = s + 1;
  let e = clauseEnd(tokens, body);
  if (e < tokens.length && ['und', 'oder'].includes(tokens[e].getToken())) e = clauseEnd(tokens, e + 1); // 'Läuse oder Nissen finden'
  const w = lower(tokens[s]);
  if (w === 'als' && isNoun(tokens[body]) && !hasTag(tokens[body], /^PRO/)) return -1; // 'Als Indiz dienen ...'
  for (let v = body + 1; v < e; v++) {
    const a = tokens[v - 1];
    const b = tokens[v];
    if (isStrictFiniteVerb(a) && !isClauseVerb(a)) return -1;
    if (!isMainFinite(b) || hasTag(b, /^(ADJ|ADV)/) || !(isFiniteVerb(a) || hasInfinitive(a)) || !isLowerCase(a) || hasTag(a, /^(ART|PRO|PRP|KON|SUB)/)) continue;
    const vf = verbFinalLoose(tokens, body, v);
    if (vf === null) continue;
    const p = tokens[v + 1];
    if (!isWord(p) || (isVerb(p) && isLowerCase(p)) || COORDINATORS.has(p.getToken())) continue;
    if (W_WORDS.has(p.getToken()) || (SUBORDINATORS.has(p.getToken()) && isKonUnt(p))) continue; // '... werden müssen was ...'
    if (hasTag(p, /^PRP/) && isLowerCase(p)) return -1; // a phrase after the verb cluster ('erklärt wird durch den Egoismus')
    if (isUnknown(p) && tokens[v + 2]?.getToken() === '.') return -1; // a title before the publisher ('... verändert hat C.H. Beck')
    const pronoun = isNominativePronoun(p) || p.getToken() === 'Sie';
    const e2 = clauseEnd(tokens, v + 1);
    if ([...verbLemmas(b)].some((l) => INF_GOVERNORS.has(l)) && hasInfinitive(a) && !pronoun) {
      // 'kommen will dann soll er': the cluster may end after b; only if no other finite verb can follow
      if (RESUMPTIVE.has(lower(p))) continue;
      let other = false;
      for (let j = v + 1; j < e; j++) if (isOnlyFinite(tokens[j]) && isLowerCase(tokens[j])) other = true;
      if (other) continue;
    }
    if (!noFiniteVerb(tokens, v + 1, e2)) return -1;
    let laterVerb = false; // a non-finite verb later in the main clause
    for (let j = v + 1; j < e2; j++) if (isVerb(tokens[j]) && isLowerCase(tokens[j]) && !hasTag(tokens[j], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/) && lower(tokens[j]) !== 'bitte') laterVerb = true;
    if (isNonFiniteVerb(b) && laterVerb && !pronoun) return -1; // 'heiter gestaltet sein können'
    if ([...verbLemmas(b)].some((l) => MODALS_WERDEN.has(l)) && !laterVerb) return -1; // 'muss Hilfsmattaufgaben'
    if (kind === 'conj' && !(AMBIGUOUS_SUBORDINATORS.has(w) ? subjectAgrees(tokens, body, vf) : hasSubjectCandidate(tokens, body, vf.clusterStart))) return -1;
    return v;
  }
  return -1;
}

// end of a sentence-initial noun phrase without verb: index of the comma after it, or of a relative pronoun that follows directly
function frontedNounPhraseEnd(tokens) {
  let hasNoun = false;
  for (let j = 1; j < tokens.length && j < 12; j++) {
    const t = tokens[j];
    if (isComma(t)) return hasNoun && j > 1 ? j : -1;
    if (hasNoun && j > 1 && RELATIVE.has(t.getToken()) && isNoun(tokens[j - 1]) && agreesWithRelative(tokens[j - 1], t.getToken())) return j;
    if (isVerb(t) && !hasTag(t, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/) && !hasTag(t, /^(SUB|EIG)/)) return -1;
    if (!(hasTag(t, /^(ART|ADJ|PA1|PA2|SUB|EIG|ZAL|PRO:(POS|DEM|IND)|PRP)/) || (isUnknown(t) && isWord(t)))) return -1;
    if (hasTag(t, /^(SUB|EIG)/) || (isUnknown(t) && isUpperCase(t))) hasNoun = true;
  }
  return -1;
}

// Java: none (LTJS). 'Ich lasse es köcheln bis die Kartoffeln weich sind.' -> 'köcheln, bis': comma before a subordinate clause
export class LtjsKommaNebensatzRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Alles 20 Minuten köcheln <marker>lassen bis</marker> die Kartoffeln weich sind.'),
      Example.fixed('Alles 20 Minuten köcheln <marker>lassen, bis</marker> die Kartoffeln weich sind.'));
  }

  getId() {
    return 'LTJS_KOMMA_NEBENSATZ';
  }

  getDescription() {
    return 'Komma vor Nebensatz mit Konjunktion oder Fragewort';
  }

  matchAt(sentence, tokens, i) {
    const t = tokens[i];
    const w = t.getToken();
    if (i < 2 || !isLowerCase(t)) return null;
    const conj = SUBORDINATORS.has(w) && w !== 'daß' && hasTag(t, /^(KON:UNT|KON:VGL|ADV:MOD\+INR)/); // not old 'daß' (old orthography)
    const wword = W_WORDS.has(w);
    if (!conj && !wword) return null;
    const prev = tokens[i - 1];
    // comparatives before 'als' ('gewöhnungsbedürftiger als', 'mehr als ich dachte')
    const comparative = w === 'als' && isLowerCase(prev) && (COMPARATIVES.has(lower(prev)) || (hasTag(prev, /^ADJ/) && !CLAUSE_MODIFIERS.has(lower(prev))));
    if (!endsClause(prev) && !comparative) return null;
    let s = i + 1;
    if ((w === 'als' || w === 'wie') && ['ob', 'wenn', 'dass'].includes(tokens[s]?.getToken())) s++;
    if (s >= tokens.length || !isWord(tokens[s])) return null;
    if (w === 'als' && ['auch', 'zu'].includes(tokens[s].getToken())) return null;
    if (w === 'als' && s === i + 1 && isNoun(tokens[s]) && !hasTag(tokens[s], /^PRO/)) return null; // 'als Mediengestalter', 'als Teil der Kultur'
    if ((w === 'als' || w === 'wie') && ['zum', 'z', 'etwa', 'beispielsweise', 'insbesondere', 'vor', 'unter'].includes(lower(tokens[s]))) return null; // 'wie zum Beispiel Leder'
    if (w === 'bis' && hasTag(tokens[s], /^(PRP|ZAL)/)) return null;
    if (AMBIGUOUS_SUBORDINATORS.has(w) && (/^\d/.test(tokens[s].getToken()) || hasTag(tokens[s], /^ZAL/))) return null; // 'seit 1. April', 'mehr als zwanzig'
    const e = clauseEnd(tokens, s);
    let vf = verbFinalLoose(tokens, s, e, false);
    if (vf === null && W_SUBJECT.has(w) && e === s + 1 && isClauseVerb(tokens[s]) && isOnlyFinite(tokens[s])) vf = { clusterStart: s, last: s }; // 'was fehlt'
    if (vf === null || embeddedClauseStart(tokens, s, vf.clusterStart)) return null;
    const lastVerb = tokens[vf.last];
    // 'als ... bezeichnet', 'wie die meinen', 'als die kritisierte': the verb may belong to the outer clause or be no verb at all
    if ((w === 'als' || w === 'wie') && ((vf.clusterStart === vf.last && hasParticiple(lastVerb)) || hasTag(lastVerb, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)|^(PRO|SUB)/))) return null;
    const ambiguous = AMBIGUOUS_SUBORDINATORS.has(w);
    // after a conjunction that is also a preposition/adverb the subject must be a sure nominative ('während der Tage' is no subject)
    const ownSubject = vf.clusterStart > s && (ambiguous ? subjectAgrees(tokens, s, vf) : hasSubjectCandidate(tokens, s, vf.clusterStart));
    if (!(wword && W_SUBJECT.has(w)) && !ownSubject) return null;
    if (w === 'was' && !ownSubject && !(vf.clusterStart < vf.last || isOnlyFinite(tokens[vf.last]))) return null;
    if (w === 'was' && isUpperCase(tokens[s]) && hasTag(tokens[s], /^(SUB|ADJ)/) && !hasTag(tokens[s], /^SUB:NOM/)) return null; // 'was Neues'
    const before = clauseBefore(tokens, i);
    if (!before.complete) return null;
    if (ambiguousWithOpenClause(tokens, vf, before) || (before.open && ambiguous && (!isNoun(prev) || laterNonFinite(tokens, e)))) return null;
    if (segmentStartAt(tokens, i) === i - 1 && !isVerb(prev) && !isNoun(prev)) return null; // '-- ähnlich wie wir ...'
    return this.missingComma(sentence, tokens, i, `Hier scheint ein Komma zu fehlen: '${w}' leitet einen Nebensatz ein, der mit Komma abgetrennt wird.`);
  }
}

// gender/number of an antecedent that a relative pronoun accepts
const RELATIVE_AGREEMENT = new Map([
  ['der', ['SIN:MAS', 'SIN:FEM']], ['die', ['SIN:FEM', 'PLU:']], ['das', ['SIN:NEU']], ['dem', ['SIN:MAS', 'SIN:NEU']], ['den', ['SIN:MAS']],
  ['denen', ['PLU:']], ['deren', ['SIN:FEM', 'PLU:']], ['dessen', ['SIN:MAS', 'SIN:NEU']], ['welcher', ['SIN:MAS', 'SIN:FEM']],
  ['welche', ['SIN:FEM', 'PLU:']], ['welches', ['SIN:NEU']], ['welchem', ['SIN:MAS', 'SIN:NEU']], ['welchen', ['SIN:MAS', 'PLU:']],
]);

// a noun or indefinite pronoun with a reading the relative pronoun agrees with
function agreesWithRelative(t, rel) {
  const allowed = RELATIVE_AGREEMENT.get(rel);
  for (const p of tags(t)) {
    const m = /^(SUB|EIG|PRO:IND):(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU|NOG)/.exec(p);
    if (!m) continue;
    if (allowed.some((a) => (a === 'PLU:' ? m[3] === 'PLU' : a === `${m[3]}:${m[4]}` || (m[4] === 'NOG' && a.startsWith(m[3]))))) return true;
  }
  return false;
}

// pronouns that stand alone as subject or object ('den keiner kannte'), not as determiner of a noun
const STANDALONE_PRONOUNS = new Set(['keiner', 'niemand', 'jemand', 'man', 'jeder', 'einer', 'nichts', 'etwas', 'alle', 'alles']);

// 'die' at r is the article of a following noun phrase ('die meisten Kinder', 'die in der Nacht gemachten Fotos')
function articleOfNounPhrase(tokens, r, vf) {
  const next = tokens[r + 1];
  if (STANDALONE_PRONOUNS.has(lower(next)) && !hasTag(tokens[r + 2], /^(SUB|ADJ)/)) return false;
  if (hasTag(next, /^(SUB|EIG|ZAL|PRO:IND|PA1)/) || isUnknown(next)) return true; // unknown words may be adjectives ('der oberostalpinen Decken')
  if (hasTag(next, /^PRO:DEM/) && !hasTag(next, /^ART/)) return true; // 'der beiden'
  if (genitiveNext(tokens, r)) return true; // demonstrative with a genitive: 'das des Kindes', 'die der Gestorbenen'
  if (hasTag(next, /^PRO:POS/) && !hasTag(tokens[r + 2], /^(SUB|EIG|ADJ|PA1|PA2)/) && !(isUnknown(tokens[r + 2]) && isUpperCase(tokens[r + 2]))) return true; // 'von den ihren'
  if (hasTag(next, /^(ADJ|PA2):(NOM|AKK|DAT|GEN)/)) return true;
  if (!['der', 'die', 'das', 'dem', 'den'].includes(tokens[r].getToken())) return false;
  const art = new Set();
  for (const p of tags(tokens[r])) {
    const m = /^ART:DEF:(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU)/.exec(p);
    if (m) art.add(`${m[1]}:${m[2]}:${m[3]}`);
  }
  for (let j = r + 2; j < vf.clusterStart; j++) {
    // an attribute of the article reading: weakly inflected adjective or participle ('die in der Nacht gemachten Fotos')
    for (const p of tags(tokens[j])) {
      const m = /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU).*:DEF/.exec(p);
      if (m && art.has(`${m[2]}:${m[3]}:${m[4]}`)) return true;
    }
    // an unknown lowercase word before a noun is probably an adjective ('der gegenwärtig drittgrößten Automobilindustrie')
    if (isUnknown(tokens[j]) && isLowerCase(tokens[j]) && /(e|en|er|es|em)$/.test(tokens[j].getToken()) && lower(tokens[j]) !== 'paar' && isNoun(tokens[j + 1])) return true;
    // a noun after a prepositional phrase ('der an diesen Krankheiten Verstorbenen')
    if (j > r + 2 && isNoun(tokens[j]) && isNoun(tokens[j - 1]) && hasTag(tokens[r + 1], /^PRP/)) {
      for (const p of tags(tokens[j])) {
        const m = /^SUB:(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU)/.exec(p);
        if (m && art.has(`${m[1]}:${m[2]}:${m[3]}`)) return true;
      }
    }
  }
  return false;
}

// a genitive noun phrase follows the pronoun at r ('des Kindes', 'der Bevorzugten'): not a nominative 'der Lehrer'
function genitiveNext(tokens, r) {
  const next = tokens[r + 1];
  const w = lower(next);
  if (w === 'des' || w === 'eines') return true;
  if (w !== 'der' && w !== 'einer') return false;
  let j = r + 2;
  while (j < tokens.length && hasTag(tokens[j], /^(ADJ|PA1|PA2|ZAL|ADV)/) && isLowerCase(tokens[j])) j++;
  const n = tokens[j];
  if (n === undefined || !hasTag(n, /^SUB/)) return false;
  return !hasTag(n, w === 'der' ? /^SUB:NOM:SIN:(MAS|NOG)/ : /^SUB:NOM:SIN:(FEM|NOG)/) && hasTag(n, /^SUB:GEN/);
}

// Java: none (LTJS). 'Viele brauchen Hilfe die sie zu Hause nicht bekommen.' -> 'Hilfe, die': comma before a relative clause
export class LtjsKommaRelativsatzRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Viele Kinder brauchen <marker>Hilfe die</marker> sie zu Hause nicht bekommen.'),
      Example.fixed('Viele Kinder brauchen <marker>Hilfe, die</marker> sie zu Hause nicht bekommen.'));
  }

  getId() {
    return 'LTJS_KOMMA_RELATIVSATZ';
  }

  getDescription() {
    return 'Komma vor Relativsatz';
  }

  matchAt(sentence, tokens, i) {
    const t = tokens[i];
    if (i < 2 || !isLowerCase(t)) return null;
    let r = i;
    if (hasTag(t, /^PRP/) && !hasTag(t, /^(ADV|KON|ZUS)/) && i + 1 < tokens.length && RELATIVE.has(tokens[i + 1].getToken())) r = i + 1;
    const rel = tokens[r].getToken();
    if (!RELATIVE.has(rel) || r + 2 >= tokens.length) return null;
    const prev = tokens[i - 1];
    const s = r + 1;
    if (!isWord(tokens[s])) return null;
    const e = clauseEnd(tokens, s);
    const vf = verbFinalLoose(tokens, s, e, false);
    if (vf === null || articleOfNounPhrase(tokens, r, vf)) return null;
    if ((rel === 'deren' || rel === 'dessen') && !(isNoun(tokens[s]) || hasTag(tokens[s], /^(ADJ|PA1|PA2|ZAL)/))) return null; // 'wenn der Mensch dessen gewahr werde'
    // a pronoun that cannot be the subject needs a subject in the clause ('den keiner kannte'; not 'dem der natürlichen Beute entsprechen')
    if (['dem', 'den', 'denen', 'welchem'].includes(rel) && !subjectAgrees(tokens, s, vf)) return null;
    if (hasTag(tokens[vf.last], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/)) return null; // 'der von Hegel weder verfassten, noch publizierten Texte'
    if (isNoun(prev) && hasTag(prev, /^(SUB|EIG)/) && !hasTag(prev, /^(KON|ADV|PRP|VER)/)) {
      if (!agreesWithRelative(prev, rel)) return null;
    } else if (isNonFiniteVerb(prev) && isLowerCase(prev) && (!hasTag(prev, /^(ADJ|ADV|SUB|PRP|KON)/) || isVerbParticiple(prev))) {
      // after the right verb bracket of the main clause ('jedem empfehlen, der ...'), not after its finite verb ('werden die ...')
      let found = false;
      for (let j = segmentStartAt(tokens, i); j < i - 1 && !found; j++) found = agreesWithRelative(tokens[j], rel);
      const before = clauseBefore(tokens, i);
      if (!found || !before.complete || (isFiniteVerb(prev) && !(before.f >= 0 && before.f < i - 1))) return null;
    } else {
      return null;
    }
    return this.missingComma(sentence, tokens, i, 'Hier scheint ein Komma zu fehlen: Ein Relativsatz wird mit Komma abgetrennt.');
  }
}

const INF_INTRO = new Set(['ohne', 'statt', 'anstatt']);
const ES_ADJ_VERBS = new Set(['sein', 'werden', 'bleiben', 'finden', 'halten', 'erscheinen', 'fallen']);
// predicative adjectives and participles with 'es' as correlate of an infinitive group ('Es ist wichtig, ...'), by lemma
const ES_ADJECTIVES = new Set(['wichtig', 'möglich', 'unmöglich', 'schwer', 'schwierig', 'leicht', 'einfach', 'nötig', 'notwendig', 'sinnvoll',
  'gut', 'schön', 'schade', 'gestattet', 'erlaubt', 'verboten', 'untersagt', 'realistisch', 'gewohnt', 'angenehm', 'unangenehm', 'hilfreich',
  'ratsam', 'nützlich', 'verständlich', 'interessant', 'erforderlich', 'üblich', 'normal', 'toll', 'spannend', 'lehrreich', 'wertvoll',
  'bequem', 'gefährlich', 'teuer', 'sinnlos', 'zwecklos', 'unzulässig', 'zulässig', 'vorgesehen', 'geplant', 'peinlich', 'wünschenswert',
  'empfehlenswert', 'angebracht', 'sinnvoller', 'praktisch', 'denkbar', 'undenkbar', 'erstrebenswert', 'unerlässlich', 'zumutbar',
  'unzumutbar', 'verlockend', 'riskant', 'aufwendig', 'aufwändig', 'mühsam', 'anstrengend', 'lustig', 'traurig', 'sicher', 'unsicher']);
const ES_PARTICLE_VERBS = new Set(['ausreichen', 'ausmachen', 'ankommen', 'auffallen', 'einfallen', 'zukommen', 'zustehen', 'anstehen']);
// verbs with a correlate da-word for an infinitive group ('erinnern daran, ... zu')
const DA_CORRELATES = new Map([
  ['erinnern', ['daran']], ['denken', ['daran']], ['gewöhnen', ['daran']], ['hindern', ['daran']], ['glauben', ['daran']],
  ['achten', ['darauf']], ['hinweisen', ['darauf']], ['verzichten', ['darauf']], ['bestehen', ['darauf', 'darin']], ['freuen', ['darauf', 'darüber']],
  ['bitten', ['darum']], ['kümmern', ['darum']], ['gehen', ['darum']], ['abhalten', ['davon']], ['träumen', ['davon']], ['abraten', ['davon']],
  ['überzeugen', ['davon']], ['warnen', ['davor']], ['fürchten', ['davor']], ['sorgen', ['dafür']], ['entscheiden', ['dafür', 'dagegen']],
  ['aufhören', ['damit']], ['anfangen', ['damit']], ['beginnen', ['damit']], ['rechnen', ['damit']], ['beitragen', ['dazu']],
  ['auffordern', ['dazu']], ['zwingen', ['dazu']], ['neigen', ['dazu']], ['bringen', ['dazu']], ['ermutigen', ['dazu']],
]);
// nouns with a dependent infinitive group ('die Möglichkeit, ... zu')
const INF_NOUNS = new Set(['Lust', 'Recht', 'Zeit', 'Möglichkeit', 'Gelegenheit', 'Chance', 'Absicht', 'Plan', 'Idee', 'Entschluss',
  'Entscheidung', 'Mut', 'Kraft', 'Geduld', 'Pflicht', 'Aufgabe', 'Ziel', 'Versuch', 'Angst', 'Freude', 'Spaß', 'Wunsch', 'Bereitschaft',
  'Fähigkeit', 'Erlaubnis', 'Genehmigung', 'Auftrag', 'Aufforderung', 'Bitte', 'Empfehlung', 'Hoffnung', 'Mühe', 'Gefahr', 'Risiko',
  'Ehre', 'Vergnügen', 'Anspruch', 'Befugnis', 'Neigung', 'Tendenz', 'Gewohnheit', 'Vorschlag', 'Wille', 'Willen', 'Bedürfnis',
  'Verpflichtung', 'Berechtigung', 'Anlass', 'Grund', 'Vorhaben', 'Ansinnen', 'Bestreben']);
// verbs that govern a zu-infinitive themselves: a noun before the group may be its object
const ZU_VERBS = new Set(['versuchen', 'beginnen', 'anfangen', 'aufhören', 'vergessen', 'beschließen', 'planen', 'vorhaben', 'hoffen',
  'wagen', 'wünschen', 'bitten', 'empfehlen', 'vorschlagen', 'schaffen', 'lernen', 'helfen', 'erlauben', 'verbieten', 'scheinen',
  'brauchen', 'pflegen', 'drohen', 'versprechen', 'gedenken', 'wissen', 'verstehen', 'bemühen', 'weigern', 'trauen', 'lieben', 'hassen',
  'genießen', 'fürchten', 'ablehnen', 'verweigern', 'erwarten', 'behaupten', 'glauben', 'meinen', 'vermeiden', 'verpassen', 'riskieren',
  'anbieten', 'aufgeben', 'auffordern', 'zwingen', 'ermutigen', 'überreden', 'raten', 'gestatten', 'ermöglichen', 'verlangen', 'fordern',
  'entscheiden', 'entschließen', 'beabsichtigen', 'bedauern', 'verdienen', 'erleichtern', 'erschweren', 'suchen']);
// prepositions of phrases with a noun that governs an infinitive group ('in der Hoffnung, ...', 'mit dem Ziel, ...')
const INF_NOUN_PREPOSITIONS = new Set(['in', 'im', 'mit', 'aus', 'über', 'vor', 'ohne', 'um', 'zum', 'zur']);

// the preposition (lowercase) if the noun at t is inside a prepositional phrase ('auf unbestimmte Zeit'), else null
function inPrepositionalPhrase(tokens, cs, t) {
  let j = t - 1;
  while (j >= cs && hasTag(tokens[j], /^(ART|ADJ|PA1|PA2|PRO:(POS|DEM|IND)|ZAL|ADV)/) && !hasTag(tokens[j], /^PRP/)) j--;
  return j >= cs && hasTag(tokens[j], /^PRP/) && (isLowerCase(tokens[j]) || j === cs) ? lower(tokens[j]) : null;
}
const NP_START = /^(ART|PRO:(POS|DEM|IND)|ADJ|PA1|SUB|EIG|ZAL)/;
const zuVerbIn = (t) => [...verbLemmas(t)].some((l) => ZU_VERBS.has(l));

// Java: none (LTJS). 'Hast du Lust nächste Woche ins Kino zu gehen?' -> 'Lust, nächste': comma before an obligatory infinitive group
export class LtjsKommaInfinitivRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Hast du <marker>Lust nächste</marker> Woche mit ins Kino zu kommen?'),
      Example.fixed('Hast du <marker>Lust, nächste</marker> Woche mit ins Kino zu kommen?'));
  }

  getId() {
    return 'LTJS_KOMMA_INFINITIV';
  }

  getDescription() {
    return 'Komma vor Infinitivgruppe (ohne/statt, Verweiswort, Substantiv)';
  }

  matchAt(sentence, tokens, j) {
    const zs = zuInfinitiveStart(tokens, j);
    if (zs < 0 || !(j + 1 >= tokens.length || isSegmentPunct(tokens[j + 1]))) return null;
    // stretch before the group: back to the punctuation or the finite verb of the clause
    const cs = segmentStartAt(tokens, zs);
    let k = zs - 1;
    while (k >= cs && !isClauseVerb(tokens[k]) && !isKonUnt(tokens[k]) && zuInfinitiveStart(tokens, k) < 0) k--;
    if (k >= cs && isKonUnt(tokens[k]) && !INF_INTRO.has(lower(tokens[k]))) return null;
    const stretchStart = k >= cs && INF_INTRO.has(lower(tokens[k])) ? k : k + 1;
    // ohne/statt/anstatt (not as a preposition before a noun phrase)
    for (let g = zs - 1; g >= Math.max(stretchStart, zs - 10); g--) {
      if (!INF_INTRO.has(tokens[g].getToken())) continue;
      let n = g + 1;
      while (n < zs && hasTag(tokens[n], /^ADV/) && !hasTag(tokens[n], /^(ADV:PRO|ART)/)) n++; // 'ohne direkt messbare Gegenleistung'
      if (n < zs && hasTag(tokens[n], NP_START) && (hasTag(tokens[n], /^ART/) || !hasTag(tokens[n], /^(PRO:(PER|REF)|ADV)/))) return null;
      if (g < 2 || !endsClause(tokens[g - 1])) return null;
      // the clause before has its verb ('„Geben ohne zu erwarten“' has none); unknown lowercase words may be verbs ('scrollen')
      const before = clauseBefore(tokens, g);
      const cs0 = segmentStartAt(tokens, g);
      let unknownVerb = false;
      for (let x = cs0 + 1; x < g; x++) if (isUnknown(tokens[x]) && isLowerCase(tokens[x]) && /^\p{L}+$/u.test(tokens[x].getToken())) unknownVerb = true;
      if (!(before.complete && (before.f >= 0 || isNonFiniteVerb(tokens[g - 1]))) && !(unknownVerb && g - cs0 >= 3)) return null;
      return this.missingComma(sentence, tokens, g, `Mit '${tokens[g].getToken()}' eingeleitete Infinitivgruppen sind mit Komma abzutrennen.`);
    }
    const g = correlateGroupStart(tokens, cs, zs);
    if (g < 0 || g >= zs || !noFiniteVerb(tokens, g, zs) || hasTag(tokens[g], /^KON/)) return null; // not '... entstellt und dann zu beurteilen'
    // a prepositional phrase alone before 'zu' may belong to the main clause ('wertvoll für die Theorie zu erfahren')
    if (hasTag(tokens[g], /^PRP/)) {
      let x = g + 1;
      while (x < zs && hasTag(tokens[x], /^(ART|ADJ|PA1|PA2|SUB|EIG|ZAL|PRO:(POS|DEM|IND))/) && !hasTag(tokens[x], /^(PRP|ADV)/)) x++;
      if (x === zs) return null;
    }
    let words = false; // a group, not a bare infinitive with its particle ('los zu sein')
    for (let x = g; x < zs; x++) if (isWord(tokens[x]) && !hasTag(tokens[x], /^ZUS/)) words = true;
    if (!words) return null;
    return this.missingComma(sentence, tokens, g,
      'Hier scheint ein Komma zu fehlen: Die Infinitivgruppe hängt von einem Verweiswort oder Substantiv ab und wird mit Komma abgetrennt.');
  }
}

// first index of the infinitive group [g, zs) that depends on a correlate (es + adjective, da-word) or a noun before it, else -1
function correlateGroupStart(tokens, cs, zs) {
  let f = -1;
  for (let j = cs; j < zs; j++) {
    if (isMainFinite(tokens[j]) || (j === cs && isInitialFiniteVerb(tokens, j))) { f = j; break; }
  }
  if (f < 0 || zuVerbIn(tokens[f])) return -1;
  const fLemmas = verbLemmas(tokens[f]);
  let es = -1;
  for (let j = cs; j < zs && j <= f + 2; j++) if (lower(tokens[j]) === 'es' && hasTag(tokens[j], /^PRO:PER/)) es = j;
  if (es >= 0) { // 'Es ist nicht gestattet, ...', 'Ich bin es gewohnt, ...', 'Es reicht nicht aus, ...'
    for (let t = Math.max(f, es) + 1; t < zs - 1; t++) {
      const tok = tokens[t];
      if (hasTag(tok, /^(ADJ|PA2):PRD/) && isLowerCase(tok) && [...fLemmas].some((l) => ES_ADJ_VERBS.has(l))
        && [lower(tok), ...lemmas(tok, /^(ADJ|PA2)/)].some((l) => ES_ADJECTIVES.has(l))) return t + 1;
      if (hasTag(tok, /^ZUS/) && isLowerCase(tok) && [...fLemmas].some((l) => ES_PARTICLE_VERBS.has(lower(tok) + l))) return t + 1;
      if (!(hasTag(tok, /^(ADV|NEG|PRO:PER|PRO:REF)/) && isLowerCase(tok))) break;
    }
  }
  const da = [...fLemmas].flatMap((l) => DA_CORRELATES.get(l) ?? []);
  for (let t = f + 1; t < zs - 1 && da.length > 0; t++) { // 'erinnern Sie Ihr Kind daran, ...'
    const tok = tokens[t];
    if (isVerb(tok) && isLowerCase(tok) && !hasTag(tok, /^(ADJ|ADV|PRP|ZUS)/)) break;
    if (da.includes(lower(tok))) return t + 1;
  }
  for (let t = cs; t < zs - 1; t++) { // 'Lust, ...', 'das Recht, ...'
    const tok = tokens[t];
    const subordinate = SUBORDINATORS.has(lower(tokens[cs])) && !AMBIGUOUS_SUBORDINATORS.has(lower(tokens[cs])) && isKonUnt(tokens[cs]);
    if (!INF_NOUNS.has(tok.getToken()) || !hasTag(tok, /^SUB/) || (t < f && (t + 1 !== f || !subordinate))) continue;
    let g = t + 1;
    if (isVerb(tokens[g]) && isLowerCase(tokens[g]) && g + 1 < zs) g++; // 'weil die Aromen Zeit hatten, sich zu verbinden'
    const first = tokens[g];
    if (hasTag(first, /^PRP/) && isLowerCase(first)) return -1;
    // 'haben/sein ... nichts zu tun': the infinitive belongs to haben/sein
    if ([...fLemmas].some((l) => l === 'haben' || l === 'sein')) for (let x = g; x < zs; x++) if (['nichts', 'etwas', 'viel', 'wenig', 'alles', 'einiges', 'genug', 'noch'].includes(lower(tokens[x]))) return -1;
    if (hasTag(first, /^(ART:(DEF|IND)|PRO:(POS|DEM|IND)):GEN/) && g + 1 < zs && hasTag(tokens[g + 1], /^(SUB|ADJ|PA1|PA2):GEN/)) return -1;
    if (inPrepositionalPhrase(tokens, cs, t) && !INF_NOUN_PREPOSITIONS.has(inPrepositionalPhrase(tokens, cs, t))) return -1; // 'auf unbestimmte Zeit'
    if (hasTag(first, /^SUB:GEN/) && !hasTag(first, /^SUB:(NOM|AKK|DAT)/)) return -1;
    for (let x = cs; x < zs; x++) if (zuVerbIn(tokens[x])) return -1;
    return g;
  }
  return -1;
}

// Java: none (LTJS). 'Er schüttelte den Kopf, und ging weiter.' -> 'Kopf und': no comma between predicates with the same subject
export class LtjsKommaUndPraedikatRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Er schüttelte den <marker>Kopf, und</marker> ging weiter.'),
      Example.fixed('Er schüttelte den <marker>Kopf und</marker> ging weiter.'));
  }

  getId() {
    return 'LTJS_KOMMA_UND_PRAEDIKAT';
  }

  getDescription() {
    return "Kein Komma vor 'und'/'oder' zwischen Satzteilen mit demselben Subjekt";
  }

  matchAt(sentence, tokens, k) {
    if (!isComma(tokens[k]) || k < 3 || k + 3 >= tokens.length || !['und', 'oder'].includes(tokens[k + 1].getToken())) return null;
    const left = mainClauseBefore(tokens, k);
    if (left === null || tokens[tokens.length - 1].getToken() === '?' || tokens.some((t) => t.getToken() === '?')) return null; // questions: 'und ist denn die Übermacht ...?'
    const v = k + 2;
    const r = tokens[v];
    const e = clauseEnd(tokens, v + 1);
    const leftAux = left.f >= 0 && [...verbLemmas(tokens[left.f])].some((l) => l === 'haben' || l === 'sein');
    if (left.f >= 0 && isClauseVerb(r) && !hasTag(r, /^(ADJ|ADV)/) && !(hasParticiple(r) && leftAux) && !(hasTag(r, /^VER:IMP/) && !hasTag(r, /^VER:[123]:/))) {
      // 'und ging weiter': the second predicate takes the subject of the first
      const next = tokens[v + 1];
      if (isWord(next)) {
        if ((isNominativePronoun(next) && next.getToken() !== 'Sie') || (next.getToken() === 'Sie' && !intersects(numbersOf(r), new Set(['SIN'])))) return null;
        if (hasTag(next, /^(ART|PRO:(DEM|IND|POS)):NOM/) || hasTag(next, /^EIG/)) return null;
      } else if (!isComma(next) && !isSentenceEnd(next)) {
        return null;
      }
      if (!intersects(numbersOf(r), numbersOf(tokens[left.f]))) return null;
      const tl = tensesOf(tokens[left.f]);
      const tr = tensesOf(r);
      if (tl.size > 0 && tr.size > 0 && !intersects(tl, tr)) return null; // 'rief ich, und bekenne': no shared predicate
      if (!noFiniteVerb(tokens, v + 1, e)) return null;
      // only simple predicates: no infinitive or participle after the verb, no elliptic adjective before the comma ('über harmlose, und')
      for (let j = v + 1; j < e; j++) if (isLowerCase(tokens[j]) && hasTag(tokens[j], /^(VER:(AUX:|MOD:)?(INF|PA2|EIZ)|PA2:PRD)/) && !hasTag(tokens[j], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/)) return null;
      if (hasTag(tokens[k - 1], /^ADJ:(NOM|AKK|DAT|GEN)/) && !hasTag(tokens[k - 1], /^SUB/)) return null;
      return this.superfluousComma(sentence, tokens, k, "Vor 'und'/'oder' steht kein Komma, wenn der zweite Teil kein eigenes Subjekt hat.");
    }
    // 'habe es weitergeleitet, und sofort Rückfragen bekommen': both parts end with a participle/infinitive of the same auxiliary
    const n1 = tokens[k - 1];
    if (!isLowerCase(n1) || !isNonFiniteVerb(n1) || hasTag(n1, /^(ADJ|SUB):(NOM|AKK|DAT|GEN)/) || zuInfinitiveStart(tokens, k - 1) >= 0) return null;
    if (!['.', '!', '?'].includes(tokens[e]?.getToken())) return null;
    const n2 = tokens[e - 1];
    if (e - 1 <= v || !isLowerCase(n2) || zuInfinitiveStart(tokens, e - 1) >= 0) return null;
    // a substitute infinitive after haben counts as participle ('habe ... gehen lassen')
    const ersatz = (j) => hasInfinitive(tokens[j]) && hasInfinitive(tokens[j - 1]) && isLowerCase(tokens[j - 1]) && leftAux;
    const participle = (hasParticiple(n1) || ersatz(k - 1)) && (hasParticiple(n2) || ersatz(e - 1));
    const infinitive = hasInfinitive(n1) && hasInfinitive(n2);
    if (!participle && !infinitive) return null;
    for (let j = v; j < e - 1; j++) {
      const t = tokens[j];
      if ((isFiniteVerb(t) && isLowerCase(t) && !isNonFiniteVerb(t) && !hasTag(t, /^(ADJ|ADV|PRP|SUB|ART|PRO|KON|ZAL)/)) || (isNominativePronoun(t) && lower(t) !== 'es')) return null;
      if (lower(t) === 'sie' || (j === v && isKonUnt(t))) return null;
    }
    // two noun phrases or a sure nominative after 'und': the second part may have a subject of its own ('oder Unternehmen ihre Produktion verlagern')
    const args = coreArguments(tokens, v, e - 1).filter((a) => a.cases.has('NOM') || a.cases.has('AKK'));
    if (args.length >= 2 || args.some((a) => a.cases.size === 1 && a.cases.has('NOM'))) return null;
    if (left.f >= 0) {
      const auxLemmas = verbLemmas(tokens[left.f]);
      const ok = participle ? leftAux : [...auxLemmas].some((l) => AUXILIARIES.has(l) && l !== 'haben' && l !== 'sein');
      if (!ok) return null;
    } else if (!(infinitive && left.infinitiveOnly)) {
      return null;
    }
    // a second part 'die Bank finanziert' could be a main clause of its own
    if (isFiniteVerb(n2) && hasSubjectCandidate(tokens, v, e - 1) && !hasTag(n2, /^VER:.*:NEB/)) {
      let plainNounPhrase = true;
      for (let j = v; j < e - 1; j++) if (!hasTag(tokens[j], /^(ART|SUB|EIG|ADJ|PA1|PA2|ZAL|PRO:(POS|DEM|IND))/) && !isUnknown(tokens[j])) plainNounPhrase = false;
      if (plainNounPhrase) return null;
    }
    return this.superfluousComma(sentence, tokens, k, "Vor 'und'/'oder' steht kein Komma, wenn der zweite Teil kein eigenes Subjekt hat.");
  }
}

// tenses of the finite readings (PRÄ, PRT, KJ1, KJ2)
function tensesOf(t) {
  const out = new Set();
  for (const p of tags(t)) {
    const m = /^VER:(?:AUX:|MOD:)?[123]:(?:SIN|PLU):(PRÄ|PRT|KJ1|KJ2)/.exec(p);
    if (m) out.add(m[1]);
  }
  return out;
}

// an infinitive that cannot be the finite verb of a main clause here: unsplit separable verb or no possible subject before it
function sureInfinitive(tokens, from, j) {
  const t = tokens[j];
  if (!hasInfinitive(t) || !isLowerCase(t) || isOnlyFinite(t)) return false;
  return hasTag(t, /^VER:.*:NEB/) || !isFiniteVerb(t) || !hasSubjectCandidate(tokens, from, j);
}

// the sentence up to the comma at k is one main clause (no subordinate clause, no other punctuation; a fronted subordinate clause
// before it is skipped): {f: index of its finite verb or -1, infinitiveOnly: no finite verb and every comma-separated part ends with
// an infinitive (recipe style)}, else null
function mainClauseBefore(tokens, k) {
  let start = 1;
  for (let j = k - 1; j > 1; j--) if ([':', ';'].includes(tokens[j].getToken())) { start = j + 1; break; } // 'als gedacht: Die Brühgruppe ...'
  if (start >= k - 1) return null;
  if (INITIAL_PARTICLES.has(lower(tokens[start]))) start++;
  const first = lower(tokens[start]);
  if (SUBORDINATORS.has(first) || W_WORDS.has(first)) {
    let c = start + 1;
    while (c < k && !isComma(tokens[c])) c++;
    if (c >= k - 1 || !isClauseVerb(tokens[c + 1])) return null;
    start = c + 1; // 'Als er sie sah, schüttelte er den Kopf'
  } else if (RELATIVE.has(first) && isLowerCase(tokens[start])) {
    return null;
  }
  // recipe style: 'Den Lauch putzen, waschen, und ...'
  let partStart = start;
  let recipe = true;
  for (let j = start; j <= k && recipe; j++) {
    if (j < k && !isComma(tokens[j])) {
      if (isOnlyFinite(tokens[j]) && isLowerCase(tokens[j])) recipe = false;
      continue;
    }
    if (j === partStart || !sureInfinitive(tokens, partStart, j - 1)) recipe = false;
    for (let x = partStart; x < j - 1 && recipe; x++) if (isClauseVerb(tokens[x]) && !hasTag(tokens[x], /^(ADJ|SUB)/)) recipe = false;
    partStart = j + 1;
  }
  if (recipe) return { f: -1, infinitiveOnly: true };
  let f = -1;
  for (let j = start; j < k; j++) {
    const t = tokens[j];
    if (isComma(t) && j > start) { // an embedded relative or subordinate clause ('Der Wächter, der sie sah, schüttelte ...')
      let c2 = j + 1;
      while (c2 < k && !isComma(tokens[c2]) && !isSegmentPunct(tokens[c2])) c2++;
      const intro = tokens[j + 1];
      const embedded = relativeAfterComma(tokens, j + 1) || (hasTag(intro, /^PRP/) && isLowerCase(intro) && RELATIVE.has(tokens[j + 2]?.getToken()))
        || (SUBORDINATORS.has(intro.getToken()) && isKonUnt(intro));
      if (f >= 0 || !embedded || c2 >= k || !isComma(tokens[c2]) || !isFiniteVerb(tokens[c2 - 1]) || !isLowerCase(tokens[c2 - 1])) return null;
      j = c2;
      continue;
    }
    if (isSegmentPunct(t) || ['-', '.', "'", '‹', '›'].includes(t.getToken())) return null;
    if (isKonUnt(t) && !hasTag(t, /^(ADV|PRP|KON:(NEB|VGL))/)) return null;
    if (isClauseVerb(t) || (j === start && isInitialFiniteVerb(tokens, j))) {
      if (f < 0) f = j;
      else if (isOnlyFinite(t)) return null;
    }
  }
  if (f < 0 || (f === start && isUpperCase(tokens[f]) && hasTag(tokens[f], /^VER:IMP/))) return null;
  return { f, infinitiveOnly: false };
}

// words that start a vocative ('Liebe Kollegen, ...', 'Herr Meier, ...')
const VOCATIVE = new Set(['lieber', 'liebe', 'liebes', 'sehr', 'hallo', 'hi', 'hey', 'meine', 'mein', 'werte', 'werter', 'verehrte', 'verehrter',
  'geschätzte', 'herr', 'frau', 'guten', 'grüß', 'servus', 'moin', 'ja', 'nein', 'ach', 'oh', 'na', 'also', 'gut', 'okay', 'ok']);

// Java: none (LTJS). 'Viele Nutzer, teilen Beiträge.' -> 'Nutzer teilen': no comma between subject (or other sentence part) and finite verb
export class LtjsKommaSubjektVerbRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Der Betrag von 245 <marker>Euro, muss</marker> bis zum 30. April überwiesen werden.'),
      Example.fixed('Der Betrag von 245 <marker>Euro muss</marker> bis zum 30. April überwiesen werden.'));
  }

  getId() {
    return 'LTJS_KOMMA_SUBJEKT_VERB';
  }

  getDescription() {
    return 'Kein Komma zwischen Satzglied im Vorfeld und Verb';
  }

  matchAt(sentence, tokens, k) {
    if (!isComma(tokens[k]) || k < 3 || k + 2 >= tokens.length) return null; // k >= 3: not a single word ('Kinder, kommt her!')
    if (VOCATIVE.has(lower(tokens[1])) || !isUpperCase(tokens[1]) || hasTag(tokens[1], /^VER/) || (hasTag(tokens[1], /^(ADV|ZUS)/) && !hasTag(tokens[1], /^PRP/)) || !nounPhraseChain(tokens, 1, k)) return null; // not 'Zurück in Schottland, ...'
    // a bare singular noun after a preposition ends a loose apposition ('Seiner Ausbildung nach Jurist, hielt er ...')
    if (hasTag(tokens[k - 2], /^PRP/) && isLowerCase(tokens[k - 2]) && hasTag(tokens[k - 1], /^SUB:.*:SIN/) && !hasTag(tokens[k - 1], /^SUB:.*:PLU/)) return null;
    let hasCommonNoun = false;
    for (let j = 1; j < k; j++) {
      const t = tokens[j];
      if (isVerb(t) && !hasTag(t, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/) && !hasTag(t, /^SUB/)) return null;
      const afterPrep = j > 1 && hasTag(tokens[j - 1], /^PRP/) && isLowerCase(tokens[j - 1]);
      if (((hasTag(t, /^EIG/) || (isUnknown(t) && isUpperCase(t))) && !afterPrep) || ['Herr', 'Frau', 'Herrn'].includes(t.getToken())) return null;
      if (!(hasTag(t, /^(ART|ADJ|PA1|PA2|SUB|ZAL|PRO:(POS|DEM|IND)|PRP)/) || /^\d/.test(t.getToken()) || (afterPrep && hasTag(t, /^EIG/)))) return null;
      if (hasTag(t, /^(ADV|KON|PRO:PER)/) && !hasTag(t, /^(SUB|ART|ADJ|ZAL|PA2)/)) return null;
      if (hasTag(t, /^SUB/) && isUpperCase(t)) hasCommonNoun = true;
    }
    if (!hasCommonNoun || (!hasTag(tokens[k - 1], /^(SUB|ZAL)/) && !/^\d/.test(tokens[k - 1].getToken())
      && !(hasTag(tokens[k - 1], /^EIG/) && hasTag(tokens[k - 2], /^PRP/)))) return null;
    const v = tokens[k + 1];
    if (!isClauseVerb(v) || hasTag(v, /^(ADJ|ADV)/) || !hasTag(v, /^VER:(AUX:|MOD:)?[13]:/)) return null;
    const next = tokens[k + 2];
    if (hasParticiple(v) && !(isNominativePronoun(next) || next.getToken() === 'Sie')) return null; // ', bezogen auf ...,'
    if (!isWord(next) || ['du', 'ihr'].includes(lower(next))) return null;
    if (['sei', 'seien'].includes(v.getToken())) return null; // 'Alle Kategorien, sei es Geld oder Kapital, ...'
    if (hasTag(next, /^(PRO:PER|EIG)/) && tokens.slice(k + 3, k + 6).some(isComma)) return null; // 'Der Alte, sagte er, ...', 'haben wir geschlossen,'
    // the verb must not start an enumeration or a clause of its own: no further finite verb
    if (!noFiniteVerb(tokens, k + 2, clauseEnd(tokens, k + 2))) return null;
    return this.superfluousComma(sentence, tokens, k, 'Zwischen dem Satzglied vor dem Verb und dem Verb steht kein Komma.');
  }
}

// [from, to) is one noun phrase, optionally after a preposition, with prepositional or genitive attributes
// ('Der Betrag von 245 Euro', 'Von den bestellten 500 Kartons'); two noun phrases side by side are a clause, not one sentence part
function nounPhraseChain(tokens, from, to) {
  let j = from;
  let phrases = 0;
  while (j < to) {
    const start = j;
    if (hasTag(tokens[j], /^PRP/) && isLowerCase(tokens[j]) || (j === from && hasTag(tokens[j], /^PRP/))) j++;
    const det = j < to && hasTag(tokens[j], /^(ART|PRO:(POS|DEM|IND))/) && !hasTag(tokens[j], /^SUB/);
    if (det) j++;
    while (j < to && (hasTag(tokens[j], /^(ADJ|PA1|PA2|ADV|ZAL)/) || /^\d/.test(tokens[j].getToken())) && !(hasTag(tokens[j], /^SUB/) && isUpperCase(tokens[j]))) j++;
    let nouns = 0;
    while (j < to && (hasTag(tokens[j], /^SUB/) || (j > from && hasTag(tokens[j], /^EIG/) && hasTag(tokens[j - 1], /^PRP/))) && isUpperCase(tokens[j])) { j++; nouns++; }
    if (nouns === 0) return false;
    phrases++;
    if (j >= to) return true;
    // the next phrase must be linked: a preposition or a genitive determiner
    const n = tokens[j];
    if (!(hasTag(n, /^PRP/) && isLowerCase(n)) && !hasTag(n, /^(ART:DEF:GEN|ART:IND:GEN|PRO:(POS|DEM|IND):GEN)/)) return false;
    if (j === start) return false;
  }
  return phrases > 0;
}

// adjectives, nouns and (reflexive) verbs with their prepositional object ('froh über', 'Dank für', 'sich freuen über')
const PREP_OBJECTS = new Map([
  ['froh', ['über']], ['dankbar', ['für']], ['stolz', ['auf']], ['zufrieden', ['mit']], ['einverstanden', ['mit']], ['glücklich', ['über']],
  ['traurig', ['über']], ['begeistert', ['von']], ['interessiert', ['an']], ['verantwortlich', ['für']], ['offen', ['für']],
  ['gespannt', ['auf']], ['neugierig', ['auf']], ['angewiesen', ['auf']], ['zuständig', ['für']], ['überzeugt', ['von']],
  ['erfreut', ['über']], ['böse', ['auf']], ['sauer', ['auf']], ['wütend', ['auf']], ['abhängig', ['von']], ['Dank', ['für']],
  ['freuen', ['über', 'auf']], ['bedanken', ['für', 'bei']], ['entschuldigen', ['für']], ['interessieren', ['für']], ['kümmern', ['um']],
  ['erkundigen', ['nach']], ['beschweren', ['über']], ['konzentrieren', ['auf']], ['verlassen', ['auf']], ['wundern', ['über']],
  ['ärgern', ['über']], ['bewerben', ['um']], ['beziehen', ['auf']],
]);

// Java: none (LTJS). 'Ich wäre froh, über jeden Tipp.' -> 'froh über': no comma before the prepositional object
export class LtjsKommaPraepositionalobjektRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich wäre <marker>froh, über</marker> jeden Tipp.'),
      Example.fixed('Ich wäre <marker>froh über</marker> jeden Tipp.'));
  }

  getId() {
    return 'LTJS_KOMMA_PRAEPOSITIONALOBJEKT';
  }

  getDescription() {
    return 'Kein Komma vor dem Präpositionalobjekt';
  }

  matchAt(sentence, tokens, k) {
    if (!isComma(tokens[k]) || k < 2 || k + 2 >= tokens.length) return null;
    const p = tokens[k + 1];
    if (!hasTag(p, /^PRP/) || !isLowerCase(p)) return null;
    const w = tokens[k - 1];
    let preps;
    if (hasTag(w, /^(ADJ|PA2):PRD/) || w.getToken() === 'Dank') preps = PREP_OBJECTS.get(w.getToken());
    else if (hasTag(w, /^PRO:(REF|PER):AKK/) && ['mich', 'dich', 'sich', 'uns', 'euch'].includes(lower(w))) {
      for (let j = segmentStartAt(tokens, k); j < k - 1 && preps === undefined; j++) {
        if (!isFiniteVerb(tokens[j])) continue;
        for (const l of verbLemmas(tokens[j])) if (PREP_OBJECTS.has(l)) preps = PREP_OBJECTS.get(l);
      }
    }
    if (preps === undefined || !preps.includes(p.getToken())) return null;
    // the prepositional phrase runs to the sentence end without a verb
    let j = k + 2;
    while (j < tokens.length && !isSentenceEnd(tokens[j]) && j - k < 10) {
      const t = tokens[j];
      if (!isWord(t) || (isVerb(t) && !hasTag(t, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/) && !hasTag(t, /^(SUB|ADJ)/))) return null;
      j++;
    }
    if (j >= tokens.length || !isSentenceEnd(tokens[j]) || j === k + 2) return null;
    return this.superfluousComma(sentence, tokens, k, `Vor dem Präpositionalobjekt mit '${p.getToken()}' steht kein Komma.`);
  }
}

// Java: none (LTJS). '... und, verbleibe mit freundlichen Grüßen' -> 'und verbleibe': no comma after 'und' before the verb
export class LtjsKommaNachUndRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich hoffe auf eine baldige Antwort <marker>und, verbleibe</marker> mit freundlichen Grüßen.'),
      Example.fixed('Ich hoffe auf eine baldige Antwort <marker>und verbleibe</marker> mit freundlichen Grüßen.'));
  }

  getId() {
    return 'LTJS_KOMMA_NACH_UND';
  }

  getDescription() {
    return "Kein Komma zwischen 'und' und dem Verb";
  }

  matchAt(sentence, tokens, k) {
    if (!isComma(tokens[k]) || k < 2 || k + 2 >= tokens.length || !['und', 'oder'].includes(tokens[k - 1].getToken())) return null;
    const v = tokens[k + 1];
    if (!isClauseVerb(v) || hasTag(v, /^(ADJ|ADV|PA2)/)) return null;
    // 'und, läuft man gut, so ...': an inserted conditional clause (verb first, own subject) is set off by commas
    if (isNominativePronoun(tokens[k + 2]) || tokens[k + 2].getToken() === 'Sie') return null;
    for (let j = k + 2; j < tokens.length; j++) {
      if (isSegmentPunct(tokens[j]) && !isSentenceEnd(tokens[j])) return null;
      if (zuInfinitiveStart(tokens, j) >= 0) return null; // 'und, ärgert sich ihnen nicht zu geben'
    }
    return this.superfluousComma(sentence, tokens, k, "Nach 'und'/'oder' steht hier kein Komma.");
  }
}

// Java: none (LTJS). 'Der Teig ist aufgegangen aber das Brot war feucht.' -> 'aufgegangen, aber': comma before 'aber' after a clause
export class LtjsKommaAberRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Der Teig ist zwar schön <marker>aufgegangen aber</marker> das Brot war innen feucht.'),
      Example.fixed('Der Teig ist zwar schön <marker>aufgegangen, aber</marker> das Brot war innen feucht.'));
  }

  getId() {
    return 'LTJS_KOMMA_ABER';
  }

  getDescription() {
    return "Komma vor 'aber' nach abgeschlossenem Satz";
  }

  matchAt(sentence, tokens, i) {
    if (tokens[i].getToken() !== 'aber' || i < 3 || i + 2 >= tokens.length || !isWord(tokens[i + 1])) return null;
    const prev = tokens[i - 1];
    if (!isLowerCase(prev) || !isVerb(prev) || hasTag(prev, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/) || hasTag(prev, /^(ADV|PRP|KON|ART|PRO|SUB)/)) return null;
    const before = clauseBefore(tokens, i);
    if (!before.complete) return null;
    // a finite verb before 'aber' ends a verb-final clause, or the main clause has its finite verb earlier ('Er kam aber nicht': particle)
    if (isFiniteVerb(prev) && (!isNonFiniteVerb(prev) || before.f === i - 1)) {
      const cs = clauseStartBefore(tokens, i);
      let sub = false;
      for (let j = cs; j < i - 1; j++) if (isKonUnt(tokens[j]) && SUBORDINATORS.has(lower(tokens[j])) && !AMBIGUOUS_SUBORDINATORS.has(lower(tokens[j]))) sub = true;
      if (!sub) return null;
    } else if (!isNonFiniteVerb(prev) || !(before.f >= 0 && before.f < i - 1)) {
      return null; // 'darin eingelegt aber waren', 'werden aber von ...'
    }
    // the part after 'aber' has a verb (a clause or predicate, not just 'aber fein')
    const e = clauseEnd(tokens, i + 1);
    let verb = false;
    for (let j = i + 1; j < e; j++) if (isVerb(tokens[j]) && isLowerCase(tokens[j]) && !hasTag(tokens[j], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/)) verb = true;
    if (!verb) return null;
    return this.missingComma(sentence, tokens, i, "Hier scheint ein Komma zu fehlen: Vor 'aber' steht ein Komma, wenn es Sätze oder Satzteile verbindet.");
  }
}

// Java: none (LTJS). '..., dass es sich um ein Versehen handelt und hoffen auf Klärung.' -> 'handelt, und': the subordinate clause ends before 'und'
export class LtjsKommaNebensatzEndeRule extends LtjsKommaRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Wir gehen davon aus, dass es sich um ein Versehen <marker>handelt und</marker> hoffen auf eine schnelle Klärung.'),
      Example.fixed('Wir gehen davon aus, dass es sich um ein Versehen <marker>handelt, und</marker> hoffen auf eine schnelle Klärung.'));
  }

  getId() {
    return 'LTJS_KOMMA_NEBENSATZ_ENDE';
  }

  getDescription() {
    return "Komma am Ende des Nebensatzes vor 'und' mit neuem Prädikat";
  }

  matchAt(sentence, tokens, i) {
    const t = tokens[i];
    if (!['und', 'oder'].includes(t.getToken()) || i < 5 || i + 2 >= tokens.length) return null;
    const v1 = tokens[i - 1];
    const v2 = tokens[i + 1];
    if (!isClauseVerb(v1) || !isClauseVerb(v2) || hasTag(v2, /^(ADJ|ADV|PA2)/) || !isWord(tokens[i + 2]) || isSegmentPunct(tokens[i + 2])) return null;
    // the clause before 'und' is a verb-final subordinate clause after a comma
    const cs = segmentStartAt(tokens, i);
    if (cs < 3 || !isComma(tokens[cs - 1])) return null;
    const conj = lower(tokens[cs]);
    if (!(SUBORDINATORS.has(conj) && !AMBIGUOUS_SUBORDINATORS.has(conj) && isKonUnt(tokens[cs]))) return null;
    if (verbFinalLoose(tokens, cs + 1, i, false) === null) return null;
    // the main clause before the comma has the subject of the second verb: v2 agrees with it, not with the subordinate verb
    let f = -1;
    for (let j = clauseStartBefore(tokens, cs - 1); j < cs - 1; j++) if (isClauseVerb(tokens[j]) || (j === 1 && isInitialFiniteVerb(tokens, j))) { f = j; break; }
    if (f < 0 || segmentStartAt(tokens, cs - 1) !== 1) return null;
    const pn2 = personNumbers(v2);
    if (pn2.size === 0 || intersects(pn2, personNumbers(v1)) || !intersects(numbersOf(v2), numbersOf(tokens[f]))) return null;
    if (!noFiniteVerb(tokens, i + 2, clauseEnd(tokens, i + 2))) return null;
    return this.missingComma(sentence, tokens, i, "Hier scheint ein Komma zu fehlen: Der Nebensatz endet vor 'und', danach geht der Hauptsatz weiter.");
  }
}

// rule ids of the LTJS comma rules for German
export const LTJS_KOMMA_RULE_IDS = Object.freeze([
  'LTJS_KOMMA_VORFELD', 'LTJS_KOMMA_NEBENSATZ', 'LTJS_KOMMA_RELATIVSATZ', 'LTJS_KOMMA_INFINITIV', 'LTJS_KOMMA_ABER',
  'LTJS_KOMMA_NEBENSATZ_ENDE', 'LTJS_KOMMA_UND_PRAEDIKAT', 'LTJS_KOMMA_SUBJEKT_VERB', 'LTJS_KOMMA_PRAEPOSITIONALOBJEKT',
  'LTJS_KOMMA_NACH_UND',
]);

// the LTJS comma rules for German
export function getLtjsGermanCommaRules(messages, language) {
  return [
    new LtjsKommaVorfeldRule(messages, language),
    new LtjsKommaNebensatzRule(messages, language),
    new LtjsKommaRelativsatzRule(messages, language),
    new LtjsKommaInfinitivRule(messages, language),
    new LtjsKommaAberRule(messages, language),
    new LtjsKommaNebensatzEndeRule(messages, language),
    new LtjsKommaUndPraedikatRule(messages, language),
    new LtjsKommaSubjektVerbRule(messages, language),
    new LtjsKommaPraepositionalobjektRule(messages, language),
    new LtjsKommaNachUndRule(messages, language),
  ];
}
