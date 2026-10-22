// LTJS layer (D-061): clause analysis for the das/dass rules on tagged and disambiguated German tokens.
// Tokens are AnalyzedSentence#getTokensWithoutWhitespace() (index 0 = SENT_START).

const FINITE = /^VER:(AUX:|MOD:)?([123]:|IMP)/;
const VERB = /^(VER|PA2)/;
const UPPER = /^\p{Lu}/u;
const LOWER = /^\p{Ll}/u;

// tokens that end a clause (das/dass clauses are analysed up to here)
const BOUNDARY = new Set([',', ';', ':', '.', '!', '?', '(', ')', '[', ']', '"', '„', '“', '”', '»', '«', '‚', '‘', '’', '–', '—', '-', '--', '…', '/',
  'und', 'oder', 'sowie', 'bzw', 'sondern', 'denn',
  // subordinating conjunctions start a new clause even without a comma ('dass er sehen würde solange er lebte')
  'weil', 'obwohl', 'obgleich', 'wenn', 'falls', 'sobald', 'solange', 'sofern', 'bevor', 'nachdem', 'ehe', 'sodass', 'ob', 'dass']);

// pronouns that can be the neuter antecedent of a relative 'das'
const NEUTER_PRONOUNS = new Set(['was', 'etwas', 'nichts', 'alles', 'vieles', 'einiges', 'manches', 'weniges', 'dasjenige', 'dasselbe', 'jenes', 'welches', 'eines', 'keines', 'beides', 'folgendes', 'anderes', 'mehreres']);
const SUBJECT_PRONOUNS = new Set(['man', 'jemand', 'niemand', 'etwas', 'nichts', 'jeder', 'keiner']);
const PERSON_PRONOUNS = new Set(['man', 'jemand', 'niemand']); // never between an article and its noun

// all POS tags of a token (without null)
export function tags(t) {
  const out = [];
  for (const r of t.getReadings()) if (r.getPOSTag() !== null) out.push(r.getPOSTag());
  return out;
}

export const hasTag = (t, re) => tags(t).some((p) => re.test(p));
export const lower = (t) => t.getToken().toLowerCase();
export const isLowerCase = (t) => LOWER.test(t.getToken());
export const isUpperCase = (t) => UPPER.test(t.getToken());

// no real POS tag (SENT_START/SENT_END/PARA_END and markers like _english_ignore_ do not count)
export function isUnknown(t) {
  return !tags(t).some((p) => p !== 'SENT_START' && p !== 'SENT_END' && p !== 'PARA_END' && !p.startsWith('_'));
}

// '.' inside a sentence (ordinal numbers, abbreviations) does not end a clause
export const isBoundary = (t) => (t.getToken() === '.' ? hasTag(t, /^SENT_END$/) : BOUNDARY.has(t.getToken()));
export const isFiniteVerb = (t) => hasTag(t, FINITE);
export const isVerb = (t) => hasTag(t, VERB);

// every tagged reading is a finite verb (e.g. 'muss', 'hat', 'wird'; not 'haben' which is also an infinitive)
export function isStrictFiniteVerb(t) {
  const ts = tags(t).filter((p) => p !== 'SENT_END' && p !== 'PARA_END');
  return ts.length > 0 && ts.every((p) => FINITE.test(p));
}

// lemmas of the verb readings
export function verbLemmas(t) {
  const out = new Set();
  for (const r of t.getReadings()) {
    const p = r.getPOSTag();
    if (p !== null && VERB.test(p) && r.getLemma() !== null) out.add(r.getLemma());
  }
  return out;
}

export function lemmas(t, re) {
  const out = new Set();
  for (const r of t.getReadings()) {
    const p = r.getPOSTag();
    if (p !== null && re.test(p) && r.getLemma() !== null) out.add(r.getLemma());
  }
  return out;
}

const QUOTE_PAIRS = new Map([['(', ')'], ['„', '“'], ['»', '«'], ['"', '"'], ['‚', '‘']]);

// ',' or '.' between digits without spaces ('4,006', '5.000') is part of a number
function inNumber(tokens, j) {
  const t = tokens[j];
  return (t.getToken() === ',' || t.getToken() === '.') && j > 0 && j + 1 < tokens.length && /^\d+$/.test(tokens[j - 1].getToken())
    && /^\d/.test(tokens[j + 1].getToken()) && !t.isWhitespaceBefore() && !tokens[j + 1].isWhitespaceBefore();
}

// index of the first clause boundary after start (exclusive end of the clause); short (...) and quoted words inside the clause are skipped
export function clauseEnd(tokens, start) {
  let j = start;
  for (;;) {
    while (j < tokens.length && (!isBoundary(tokens[j]) || inNumber(tokens, j))) j++;
    if (j >= tokens.length || !QUOTE_PAIRS.has(tokens[j].getToken()) || j === start) return j;
    const close = QUOTE_PAIRS.get(tokens[j].getToken());
    let k = j + 1;
    while (k < tokens.length && k - j <= 8 && tokens[k].getToken() !== close && !SENTENCE_PUNCT.has(tokens[k].getToken())) k++;
    if (k >= tokens.length || tokens[k].getToken() !== close || k === j + 1) return j;
    j = k + 1;
  }
}

const SENTENCE_PUNCT = new Set(['.', '!', '?', ':', ';', ',']);

// start of the clause that ends before index end (after the previous boundary, at least 1)
export function clauseStart(tokens, end) {
  let j = end - 1;
  while (j > 0 && !isBoundary(tokens[j])) j--;
  return j + 1;
}

const OPENING = new Set(['„', '"', '»', '‚', '(', '[']);

// Verb-final clause [s, e): ends with a finite verb, no other finite verb before it, no zu-infinitive.
// Returns {clusterStart, last} or null.
export function verbFinal(tokens, s, e) {
  if (e - s < 2) return null;
  const last = e - 1;
  if (!isFiniteVerb(tokens[last])) return null;
  let c = last;
  while (c - 1 >= s && isVerb(tokens[c - 1])) c--;
  if (c <= s) return null;
  if (lower(tokens[c - 1]) === 'zu' && (c === last || !isStrictFiniteVerb(tokens[last]))) return null; // 'das Auto zu reparieren', not 'zu schätzen begann'
  for (let j = s; j < last; j++) {
    if (isStrictFiniteVerb(tokens[j])) return null;
  }
  // first word after das/dass a lowercase finite verb: main clause ('das liege am Mehl')
  if (isLowerCase(tokens[s]) && isFiniteVerb(tokens[s]) && !hasTag(tokens[s], /^(ART|PRO|ADJ|ADV|SUB|PRP|KON|ZAL)/)) return null;
  // last word an attributive participle before a quoted or bracketed noun ('das von Kollo vertonte „Volksstück“')
  if (e < tokens.length && OPENING.has(tokens[e].getToken()) && hasTag(tokens[last], /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN):/)) return null;
  return { clusterStart: c, last };
}

// a subject other than das: personal pronoun, man/jemand/niemand, noun or name with nominative reading, unknown capitalised word
export function hasSubjectCandidate(tokens, s, c) {
  for (let j = s; j < c; j++) {
    const t = tokens[j];
    if (hasTag(t, /^PRO:PER:NOM/)) return true;
    if (SUBJECT_PRONOUNS.has(lower(t)) || hasTag(t, /^PRO:IND:NOM:PLU/)) return true;
    if (hasTag(t, /^PRO:DEM:NOM/) && isLowerCase(t) && lower(t) !== 'das' && j + 1 < c && !hasTag(tokens[j + 1], /^(SUB|ADJ|EIG)/)) return true;
    if (hasTag(t, /^(SUB|EIG):NOM/)) return true;
    if (isUnknown(t) && isUpperCase(t)) return true;
  }
  return false;
}

const NEUTER_HEAD = /^(SUB|EIG):(NOM|AKK):SIN:NEU/;

// 'das' at index s-1 could be the article of the following noun phrase ('das Auto fährt', 'das Schicksal teilen könnte' after
// an embedded clause); then the das/dass reading is not decided by the clause, so the rules stay silent
export function articleReading(tokens, s, vf) {
  let j = s;
  let skipped = 0;
  while (j < vf.clusterStart && skipped < 3 && (hasTag(tokens[j], /^(ADJ|PA1|PA2|ADV|PRO:IND)/) || isUnknown(tokens[j])) && isLowerCase(tokens[j])
    && !PERSON_PRONOUNS.has(lower(tokens[j]))) { // 'das man Quellen prüfen muss': no article before 'man'
    j++;
    skipped++;
  }
  if (j >= vf.clusterStart) return false;
  const head = tokens[j];
  return hasTag(head, NEUTER_HEAD) || (isUpperCase(head) && isUnknown(head));
}
const ATTRIBUTE = /^(PRP|ART|PRO:POS|PRO:DEM|ADJ|ZAL|SUB|EIG|PA1|PA2)/;

// sentence-initial 'Das': the article reading needs a main clause with the noun phrase as subject (V2: 'Das Auto fährt, sagt er')
export function articleReadingV2(tokens, s, vf) {
  let j = s;
  let skipped = 0;
  while (j < vf.clusterStart && skipped < 3 && hasTag(tokens[j], /^(ADJ|PA1|PA2|ADV|PRO:IND)/) && isLowerCase(tokens[j]) && !PERSON_PRONOUNS.has(lower(tokens[j]))) {
    j++;
    skipped++;
  }
  if (j >= vf.clusterStart) return false;
  const head = tokens[j];
  if (!(hasTag(head, NEUTER_HEAD) || (isUnknown(head) && isUpperCase(head)))) return false;
  if (vf.clusterStart !== vf.last) return false; // several verbs with the finite verb last: not V2
  for (let k = j + 1; k < vf.clusterStart; k++) {
    const t = tokens[k];
    if (!(hasTag(t, ATTRIBUTE) || (isUnknown(t) && isUpperCase(t)))) return false;
    if (hasTag(t, /^(ADV|PRO:PER|PRO:REF|NEG|KON)/)) return false;
  }
  return true;
}

const SEGMENT_BOUNDARY = new Set([',', ';', ':', '–', '—']);

// words of a noun phrase chain (articles, adjectives, nouns, names, prepositions, numbers, und/oder)
const NP_CHAIN_WORDS = new Set(['und', 'oder', 'sowie', 'wie', 'als', '.', '/', '-', '(', ')', '„', '“', '»', '«', '"', '‚', '‘']);
export const NP_CHAIN = (t) => (hasTag(t, /^(ART|ADJ|PA1|PA2|SUB|EIG|PRP|PRO:(POS|DEM|IND)|ZAL|ADV|NEG|ABK)/) && !isStrictFiniteVerb(t))
  || NP_CHAIN_WORDS.has(t.getToken()) || (isUnknown(t) && /^[\p{L}\d]/u.test(t.getToken()));

// start of the segment (between commas, semicolons, colons, dashes) that ends before index end; quotes, brackets, und/oder do not split
function segmentStart(tokens, end) {
  let j = end - 1;
  let depth = 0; // inside (...) nothing splits
  while (j > 0) {
    const w = tokens[j].getToken();
    if (w === ')') depth++;
    else if (w === '(' && depth > 0) depth--;
    else if (depth === 0 && SEGMENT_BOUNDARY.has(w)) break;
    j--;
  }
  return j + 1;
}

// a segment that may still belong to an earlier noun ('das lieblose', 'gebaut 1920', 'mit dem wir kämpfen')
function continuesNounPhrase(tokens, cs) {
  const t = tokens[cs];
  if (!isLowerCase(t)) return false;
  if (hasTag(t, /^(PA1|PA2)/)) return true;
  if (hasTag(t, /^PRP/) && cs + 1 < tokens.length && hasTag(tokens[cs + 1], /^(ART|PRO:(DEM|REL))/)) return true;
  return hasTag(t, /^(ART|ADJ|PRO:(DEM|REL|POS|IND))/) && !isVerb(t);
}

// a possible neuter singular antecedent of a relative 'das' before the comma at index k: in the segment before the comma,
// and if that segment continues a main clause after an embedded clause ('Ökonomen, die ..., weisen darauf hin,'), in the segment before
export function hasNeuterAntecedentBefore(tokens, k) {
  if (k > 1 && isUnknown(tokens[k - 1]) && isUpperCase(tokens[k - 1])) return true; // a name ('bei Siemens, das ...')
  if (k > 1 && ((hasTag(tokens[k - 1], /^(SUB|EIG)/) && isUpperCase(tokens[k - 1])) || (isUnknown(tokens[k - 1]) && /^[\p{L}\d]/u.test(tokens[k - 1].getToken()))
      || hasTag(tokens[k - 1], /^ABK/))) {
    // the comma follows a noun: the antecedent is in the noun phrase chain before it ('das Konzept der Universität, das'),
    // through appositions and enumerations ('das Gesetz vom 21. Jänner, BGBl. Nr. 45, in der geltenden Fassung, das')
    let end = k;
    for (let level = 0; level < 4; level++) {
      let j = end - 1;
      for (;;) { // noun phrase words; (...) is skipped as a whole
        if (j > 2 && tokens[j - 1].getToken() === ')') {
          let o = j - 2;
          while (o > 1 && tokens[o].getToken() !== '(' && tokens[o].getToken() !== ')') o--;
          if (tokens[o].getToken() === '(') { j = o; continue; }
        }
        if (j > 1 && NP_CHAIN(tokens[j - 1])) { j--; continue; }
        break;
      }
      if (hasNeuterAntecedent(tokens, j, end)) return true;
      // a sentence that starts with an abbreviation, number or lowercase word may be split off its antecedent ('BGBl. Nr. 45, in der Fassung, das')
      if (j <= 1 && (isUnknown(tokens[1]) || hasTag(tokens[1], /^(ABK|ZAL)/) || isLowerCase(tokens[1]))) return true;
      if (!(j === segmentStart(tokens, end) || continuesNounPhrase(tokens, j))) return false;
      if (j < 3 || !SEGMENT_BOUNDARY.has(tokens[j - 1].getToken())) return false;
      end = j - 1;
    }
    return false;
  }
  let cs = segmentStart(tokens, k);
  if (hasNeuterAntecedent(tokens, cs, k)) return true;
  // appositions and enumerations ('das schlaue Ich, das lieblose, das ...'): the segments before count too
  for (let n = 0; n < 3 && cs > 2 && continuesNounPhrase(tokens, cs); n++) {
    const prev = segmentStart(tokens, cs - 1);
    if (hasNeuterAntecedent(tokens, prev, cs - 1)) return true;
    cs = prev;
  }
  if (cs > 2 && isFiniteVerb(tokens[cs]) && isLowerCase(tokens[cs])) {
    const embeddedStart = segmentStart(tokens, cs - 1);
    if (embeddedStart > 1 && hasNeuterAntecedent(tokens, segmentStart(tokens, embeddedStart - 1), embeddedStart - 1)) return true;
  }
  return false;
}

// sentence-initial conjunctions that the tagger also reads as nouns ('Aber' -> das Aber)
const INITIAL_CONJUNCTIONS = new Set(['aber', 'doch', 'denn', 'und', 'oder', 'sondern', 'also', 'jedoch']);

// sentence-initial imperative that is also read as a nominalised infinitive ('Achten Sie darauf,', 'Bedenken wir,')
export function isImperativeInitial(tokens, j) {
  return j === 1 && tokens.length > 2 && (tokens[2].getToken() === 'Sie' || tokens[2].getToken() === 'wir')
    && (hasTag(tokens[1], /^SUB:.*:INF/) || hasTag(tokens[1], /^VER:(INF|[13]:PLU)/));
}

// a possible neuter singular antecedent of a relative 'das' in tokens [from, to)
export function hasNeuterAntecedent(tokens, from, to) {
  for (let j = from; j < to; j++) {
    const t = tokens[j];
    if (j === 1 && (INITIAL_CONJUNCTIONS.has(lower(t)) || isImperativeInitial(tokens, 1))) continue; // 'Aber können wir', 'Achten Sie'
    // a capitalised adjective before its noun ('Neuere archäologische Funde') is no noun
    if (hasTag(t, /^ADJ/) && j + 1 < tokens.length && hasTag(tokens[j + 1], /^(SUB|ADJ|PA1|PA2)/)) continue;
    if (hasTag(t, /^(SUB|EIG):[A-Z]+:SIN:NEU/)) {
      if (!hasTag(t, /^PRO/)) return true;
      // 'Ich' is a pronoun unless a neuter determiner precedes ('das schlaue Ich')
      let d = j - 1;
      while (d > from && hasTag(tokens[d], /^(ADJ|PA1|PA2)/) && isLowerCase(tokens[d])) d--;
      if (d >= from && hasTag(tokens[d], /^(ART|PRO:[A-Z]+):.*SIN:NEU/) && isLowerCase(tokens[d])) return true;
      continue;
    }
    if (NEUTER_PRONOUNS.has(lower(t))) return true;
    // 'das von Rudolf Taschner geleitete Math.space': unknown head after a neuter participle, 'das' before
    if (isUpperCase(t) && isUnknown(t) && j > from && hasTag(tokens[j - 1], /^(ADJ|PA1|PA2):[A-Z]+:SIN:NEU/)) {
      for (let d = j - 2; d >= Math.max(from, j - 9); d--) if (tokens[d].getToken() === 'das') return true;
    }
    if (isUpperCase(t) && j > from && !hasTag(t, /^(SUB|EIG)/)) {
      let d = j - 1;
      while (d > from && (hasTag(tokens[d], /^(ADJ|PA1|PA2|ADV)/) || isUnknown(tokens[d])) && isLowerCase(tokens[d])) d--;
      if (hasTag(tokens[d], /^(ART|PRO:[A-Z]+):.*SIN:NEU/) && isLowerCase(tokens[d])) return true;
    }
  }
  return false;
}

// grammatical features "CAS:NUM:GEN" of the readings matching re (e.g. ART:DEF:NOM:SIN:NEU -> NOM:SIN:NEU)
function features(t, re) {
  const out = new Set();
  for (const p of tags(t)) {
    if (!re.test(p)) continue;
    const m = /:(NOM|AKK|DAT|GEN):(SIN|PLU):(MAS|FEM|NEU|NOG|ALG)/.exec(p);
    if (m) out.add(`${m[1]}:${m[2]}:${m[3]}`);
  }
  return out;
}

const TIME_NOUNS = new Set(['Jahr', 'Monat', 'Woche', 'Tag', 'Mal', 'Abend', 'Morgen', 'Nacht', 'Stunde', 'Minute', 'Sekunde', 'Zeit',
  'Wochenende', 'Winter', 'Sommer', 'Frühling', 'Herbst', 'Moment', 'Augenblick', 'Weile', 'Jahrzehnt', 'Jahrhundert', 'Semester',
  'Quartal', 'Vormittag', 'Nachmittag', 'Mittag', 'Halbjahr']);

const casesOf = (set) => new Set([...set].map((f) => f.split(':')[0]));

// cases of a noun agreeing with its determiner (or of the noun alone)
function agreeingCases(dets, nouns) {
  if (dets === null || dets.size === 0) return casesOf(nouns);
  const out = new Set();
  for (const n of nouns) {
    const [c, num, g] = n.split(':');
    for (const d of dets) {
      const [dc, dn, dg] = d.split(':');
      if (dc === c && dn === num && (dg === g || dg === 'ALG' || dg === 'NOG' || g === 'NOG')) out.add(c);
    }
  }
  return out;
}

// a noun, adjective, number or name follows (quotes are skipped)
function nounAhead(tokens, j, c) {
  while (j < c && QUOTE_PAIRS.has(tokens[j].getToken())) j++;
  return j < c && (hasTag(tokens[j], /^(SUB|ADJ|ZAL|EIG)/) || isUpperCase(tokens[j]));
}

// noun phrases and pronouns of [s, c) outside prepositional phrases: [{cases: Set of NOM/AKK/DAT/GEN, time: boolean}]
export function coreArguments(tokens, s, c) {
  const args = [];
  let inPP = false;
  let lastInPP = false;
  let det = null;
  for (let j = s; j < c; j++) {
    const t = tokens[j];
    if ((hasTag(t, /^PRP/) || lower(t) === 'als' || lower(t) === 'wie') && isLowerCase(t)) { // 'als Gesetz bezeichnet' is no argument either
      inPP = true;
      det = null;
      continue;
    }
    const next = j + 1 < c ? tokens[j + 1] : null;
    const nounFollows = next !== null && (hasTag(next, /^(ART|PRO:POS|ADJ|PA1|PA2|SUB|EIG)/) || (isUnknown(next) && isUpperCase(next)));
    if (lastInPP && ((COORDINATING.has(lower(t)) && nounFollows) || t.getToken() === '(')) { // 'durch die Gesetze und Rechtssicherheit', 'in Kassel (Hessen)'
      inPP = true;
      continue;
    }
    if (lastInPP && t.getToken() === ')') continue;
    if (lastInPP && j > s && isUpperCase(t) && (hasTag(t, /^EIG/) || isUnknown(t)) && (hasTag(tokens[j - 1], /^EIG/) || isUnknown(tokens[j - 1])) && isUpperCase(tokens[j - 1])) {
      continue; // multi-word name in a prepositional phrase ('an Jesus Christus')
    }
    if (lastInPP && j > s && isUpperCase(t) && (hasTag(t, /^EIG/) || isUnknown(t)) && hasTag(tokens[j - 1], /^SUB/)) {
      continue; // name after a noun in a prepositional phrase ('aus dem Flughafen Tempelhof')
    }
    if (hasTag(t, /^(ART|PRO:POS|PRO:DEM|PRO:IND)/) && isLowerCase(t) && j + 1 < c && !SUBJECT_PRONOUNS.has(lower(t))
        && (hasTag(tokens[j + 1], /^(ADJ|PA1|PA2|SUB|EIG|ZAL)/) || (isUnknown(tokens[j + 1]) && isUpperCase(tokens[j + 1])))
        && !hasTag(tokens[j + 1], /^(VER|PRP|KON)/)) {
      if (det === null && lower(t) !== 'dessen' && lower(t) !== 'deren') det = features(t, /^(ART|PRO:POS|PRO:DEM|PRO:IND)/); // a genitive possessor: no case of the noun
      continue;
    }
    let arg = null;
    if (hasTag(t, /^(SUB|EIG)/)) {
      const nf = features(t, /^(SUB|EIG)/);
      const nomNumbers = new Set([...nf].filter((f) => f.startsWith('NOM:') && agreeingCases(det, new Set([f])).size > 0).map((f) => f.split(':')[1]));
      const pluralNoun = nomNumbers.size > 0 && !nomNumbers.has('SIN') && !hasTag(t, /^EIG/) && !/^\p{Lu}{2}/u.test(t.getToken()); // not 'die USA'
      arg = { cases: agreeingCases(det, nf), time: [...lemmas(t, /^SUB/)].some((l) => TIME_NOUNS.has(l)), pluralNoun };
    } else if (isUnknown(t) && isUpperCase(t)) {
      arg = { cases: new Set(['NOM', 'AKK', 'DAT']), time: false };
    } else if (hasTag(t, /^(PRO:PER|PRO:REF)/) || SUBJECT_PRONOUNS.has(lower(t)) || hasTag(t, /^PRO:(IND|DEM):(NOM|AKK|DAT|GEN)/)) {
      const cs = new Set();
      for (const p of tags(t)) {
        const m = /^PRO:[A-Z]+:(NOM|AKK|DAT|GEN)/.exec(p);
        if (m) cs.add(m[1]);
      }
      if (cs.size === 0) cs.add('NOM').add('AKK');
      arg = { cases: cs, time: false, dativePronoun: cs.has('DAT') && hasTag(t, /^PRO:(PER|REF)/) };
    } else if ((hasTag(t, /^ADJ:(NOM|AKK|DAT|GEN)/) || hasTag(t, /^ZAL/)) && isLowerCase(t) && !nounAhead(tokens, j + 1, c)) {
      // adjective or number without noun ('dass wenige kamen', 'dass zwei fehlen')
      const cs = casesOf(features(t, /^ADJ/));
      if (cs.size === 0) cs.add('NOM').add('AKK');
      arg = { cases: cs, time: false };
    } else {
      continue;
    }
    if (!inPP) args.push(arg);
    lastInPP = inPP;
    inPP = false;
    det = null;
  }
  return args;
}

// number of noun phrases/pronouns outside prepositional phrases that can be subject or accusative object in [s, c)
export function coreArgumentCount(tokens, s, c) {
  return coreArguments(tokens, s, c).filter((a) => a.cases.has('NOM') || a.cases.has('AKK')).length;
}

const COORDINATING = new Set(['und', 'oder', 'sowie', 'bzw', 'sowohl', 'als', 'auch', 'wie']);
const DOUBLE_ACCUSATIVE = new Set(['kosten', 'lehren', 'nennen', 'fragen', 'abfragen', 'heißen', 'schimpfen', 'angehen', 'schelten', 'taufen', 'rufen']);
const only = (a, c) => a.cases.size === 1 && a.cases.has(c);

// the verb-final clause after 'das' leaves no role for a relative pronoun 'das' (nominative or accusative):
// passive or sein-perfect with another subject, copula with two nominatives or a predicative adjective and a subject,
// or an unambiguous nominative subject plus an unambiguous accusative object
export function relativeImpossible(tokens, s, vf) {
  const args = coreArguments(tokens, s, vf.clusterStart).filter((a) => !a.time);
  const cluster = tokens.slice(vf.clusterStart, vf.last + 1);
  const clusterLemmas = new Set(cluster.flatMap((t) => [...verbLemmas(t)]));
  const participle = cluster.some((t) => hasTag(t, /^VER:PA2/) && ![...lemmas(t, /^VER:PA2/)].some((l) => l === 'sein' || l === 'werden'));
  const nominatives = args.filter((a) => a.cases.has('NOM'));
  const sureNominative = args.some((a) => only(a, 'NOM'));
  if (participle && !clusterLemmas.has('haben') && (clusterLemmas.has('werden') || clusterLemmas.has('sein')) && sureNominative) return true;
  const copula = cluster.length === 1 && [...clusterLemmas].some((l) => l === 'sein' || l === 'werden' || l === 'bleiben');
  if (copula && nominatives.length >= 2 && sureNominative) return true;
  if (copula && sureNominative) {
    for (let j = s; j < vf.clusterStart; j++) if (hasTag(tokens[j], /^ADJ:PRD/) && !hasTag(tokens[j], /^(ADV|SUB)/)) return true;
  }
  if (args.some((a) => only(a, 'NOM')) && args.some((a) => only(a, 'AKK')) && ![...clusterLemmas].some((l) => DOUBLE_ACCUSATIVE.has(l))) return true;
  return false;
}

// keeps the case of the first letter: das -> dass, Das -> Dass
export function dassFor(t) {
  return isUpperCase(t) ? 'Dass' : 'dass';
}

export function dasFor(t) {
  return isUpperCase(t) ? 'Das' : 'das';
}
