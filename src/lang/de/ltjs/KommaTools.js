// LTJS layer (D-061): clause helpers for the German comma rules (tagged and disambiguated tokens, index 0 = SENT_START).
import { hasTag, tags, lower, isLowerCase, isUpperCase, isUnknown, isFiniteVerb, isStrictFiniteVerb, isVerb, verbLemmas, lemmas } from './DasDassTools.js';

export const isWord = (t) => t !== undefined && /^[\p{L}\d]/u.test(t.getToken());
export const isComma = (t) => t !== undefined && t.getToken() === ',';
export const isSentenceEnd = (t) => t === undefined || hasTag(t, /^SENT_END$/);

// tokens that separate clauses or insertions (the comma rules only look inside such segments)
const SEGMENT_PUNCT = new Set([',', ';', ':', '(', ')', '[', ']', '"', '„', '“', '”', '»', '«', '‚', '‘', '–', '—', '…', '/', '--']);
export const isSegmentPunct = (t) => SEGMENT_PUNCT.has(t.getToken()) || (t.getToken() === '-' && t.isWhitespaceBefore())
  || (t.getToken() === '.' && hasTag(t, /^SENT_END$/)) || t.getToken() === '!' || t.getToken() === '?';

// first index of the segment that ends before index end (after the previous punctuation, at least 1)
export function segmentStartAt(tokens, end) {
  let j = end - 1;
  while (j > 0 && !isSegmentPunct(tokens[j])) j--;
  return j + 1;
}

// first punctuation index at or after start (exclusive end of the segment)
export function segmentEndAt(tokens, start) {
  let j = start;
  while (j < tokens.length && !isSegmentPunct(tokens[j])) j++;
  return j;
}

// a lowercase finite verb that is no article, pronoun, preposition, conjunction, noun or number ('kommt', 'werden', 'kann')
export function isClauseVerb(t) {
  return isFiniteVerb(t) && isLowerCase(t) && !hasTag(t, /^(ART|PRO|PRP|KON|SUB|ZAL)/);
}

// person:number of the finite readings ('1:SIN', '3:PLU')
export function personNumbers(t) {
  const out = new Set();
  for (const p of tags(t)) {
    const m = /^VER:(?:AUX:|MOD:)?([123]):(SIN|PLU)/.exec(p);
    if (m) out.add(`${m[1]}:${m[2]}`);
  }
  return out;
}

export const numbersOf = (t) => new Set([...personNumbers(t)].map((x) => x.split(':')[1]));
export const intersects = (a, b) => [...a].some((x) => b.has(x));

// infinitive, participle or zu-infinitive reading
export const isNonFiniteVerb = (t) => hasTag(t, /^(VER:(INF|PA2|EIZ)|PA2)/);
export const hasInfinitive = (t) => hasTag(t, /^VER:(AUX:|MOD:)?INF/);
export const hasParticiple = (t) => hasTag(t, /^(VER:PA2|PA2)/);

// zu-infinitive ending at j ('zu kommen', 'anzurufen'); returns the first index of it or -1
export function zuInfinitiveStart(tokens, j) {
  const t = tokens[j];
  if (!isLowerCase(t)) return -1;
  if (hasTag(t, /^VER:(AUX:|MOD:)?EIZ/)) return j;
  if (hasInfinitive(t) && j > 1 && tokens[j - 1].getToken() === 'zu') return j - 1;
  return -1;
}

// finite verb at j that only has finite readings or is a sure main-clause verb form (no infinitive/participle reading)
export const isOnlyFinite = (t) => isFiniteVerb(t) && !isNonFiniteVerb(t);

export const PERSONAL_NOMINATIVE = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man']);

// a personal pronoun (or man) with a nominative reading
export function isNominativePronoun(t) {
  return PERSONAL_NOMINATIVE.has(lower(t)) && (hasTag(t, /^PRO:(PER|IND):NOM/) || lower(t) === 'man');
}

// lemma of the finite verb at j (all lemmas of verb readings)
export const lemmaSet = (t) => verbLemmas(t);

// finite verb at the clause start j (V1: 'Hast du ...', also if the tagger reads it as a noun too: 'Hast')
export function isInitialFiniteVerb(tokens, j) {
  const t = tokens[j];
  if (!isFiniteVerb(t) || !hasTag(t, /^VER/)) return false;
  if (!hasTag(t, /^(SUB|EIG|ADJ|PRP|ART|PRO|KON|ADV)/)) return true;
  const next = tokens[j + 1];
  return next !== undefined && hasTag(next, /^PRO:PER:NOM/) && isLowerCase(next) || (next !== undefined && next.getToken() === 'Sie');
}

// noun (common noun or name, capitalised)
export const isNoun = (t) => isUpperCase(t) && (hasTag(t, /^(SUB|EIG)/) || isUnknown(t));

export { hasTag, tags, lower, isLowerCase, isUpperCase, isUnknown, isFiniteVerb, isStrictFiniteVerb, isVerb, verbLemmas, lemmas };

const OPENING = new Set(['„', '"', '»', '‚', '(', '[']);

// like DasDassTools#verbFinal, but the last verb may be an infinitive form (the disambiguator drops the finite plural reading
// of 'fallen', 'zusammenhängen'); returns {clusterStart, last} or null
export function verbFinalLoose(tokens, s, e, allowInfinitive = true) {
  if (e - s < 2) return null;
  const last = e - 1;
  const lt = tokens[last];
  if (!(isFiniteVerb(lt) || (allowInfinitive && hasInfinitive(lt) && !hasTag(lt, /^VER:(AUX:|MOD:)?EIZ/))) || !isLowerCase(lt)) return null;
  let c = last;
  while (c - 1 >= s && isVerb(tokens[c - 1])) c--;
  if (c <= s) return null;
  if (lower(tokens[c - 1]) === 'zu' && (c === last || !isStrictFiniteVerb(lt))) return null;
  for (let j = s; j < last; j++) if (isStrictFiniteVerb(tokens[j])) return null;
  if (isLowerCase(tokens[s]) && isFiniteVerb(tokens[s]) && !hasTag(tokens[s], /^(ART|PRO|ADJ|ADV|SUB|PRP|KON|ZAL|PA2)/)) return null;
  if (e < tokens.length && OPENING.has(tokens[e].getToken()) && hasTag(lt, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN):/)) return null;
  return { clusterStart: c, last };
}

// finite verb of a main clause: a clause verb that is not an attributive participle ('die untersuchten Cluster')
export const isMainFinite = (t) => isClauseVerb(t) && !hasTag(t, /^(ADJ|PA1|PA2):(NOM|AKK|DAT|GEN)/);

const PRONOUN_PERSON = new Map([['ich', ['1:SIN']], ['du', ['2:SIN']], ['er', ['3:SIN']], ['es', ['3:SIN']], ['man', ['3:SIN']],
  ['wir', ['1:PLU']], ['ihr', ['2:PLU']], ['sie', ['3:SIN', '3:PLU']], ['Sie', ['3:PLU', '3:SIN']]]);

// nominative number:gender of the articles by their form (the disambiguator may have dropped the reading after 'bis', 'seit')
const ARTICLE_NOMINATIVE = new Map([['der', ['SIN:MAS']], ['die', ['SIN:FEM', 'PLU:MAS', 'PLU:FEM', 'PLU:NEU']], ['das', ['SIN:NEU']],
  ['ein', ['SIN:MAS', 'SIN:NEU']], ['eine', ['SIN:FEM']], ['den', []], ['dem', []], ['des', []], ['einen', []], ['einem', []], ['einer', []], ['eines', []]]);

// person:number of the noun phrases and personal pronouns in [s, c) that can only be nominative (outside prepositional phrases):
// a determiner and its noun must agree ('ein gutes Zeichen' -> 3:SIN, 'während der Tage' -> none)
export function nominativePersons(tokens, s, c) {
  const out = new Set();
  let inPP = false;
  for (let j = s; j < c; j++) {
    const t = tokens[j];
    const w = t.getToken();
    if (hasTag(t, /^PRP/) && isLowerCase(t)) { inPP = true; continue; }
    if (PRONOUN_PERSON.has(w) || PRONOUN_PERSON.has(lower(t)) && j === s) {
      if (hasTag(t, /^PRO:(PER|IND):NOM/) || w === 'man') for (const x of PRONOUN_PERSON.get(PRONOUN_PERSON.has(w) ? w : lower(t))) out.add(x);
      inPP = false;
      continue;
    }
    if (!inPP && isLowerCase(t) && hasTag(t, /^PRO:(DEM|IND):NOM/) && !(j + 1 < c && (hasTag(tokens[j + 1], /^(SUB|EIG|ADJ|PA1|PA2)/) || isUpperCase(tokens[j + 1])))) {
      for (const p of tags(t)) { // standalone 'diese', 'keiner', 'viele'
        const m = /^PRO:(DEM|IND):NOM:(SIN|PLU)/.exec(p);
        if (m) out.add(`3:${m[2]}`);
      }
      continue;
    }
    if (hasTag(t, /^(SUB|EIG)/) && isUpperCase(t)) {
      if (!inPP) {
        let d = j - 1;
        while (d >= s && hasTag(tokens[d], /^(ADJ|PA1|PA2|ZAL)/) && isLowerCase(tokens[d]) && !hasTag(tokens[d], /^(ART|PRO)/)) d--;
        const det = d >= s && hasTag(tokens[d], /^(ART|PRO:(POS|DEM|IND))/) && isLowerCase(tokens[d]) ? tokens[d] : null;
        for (const p of tags(t)) {
          const m = /^(SUB|EIG):NOM:(SIN|PLU):(MAS|FEM|NEU|NOG)/.exec(p);
          if (!m) continue;
          const nom = det === null ? null : ARTICLE_NOMINATIVE.get(lower(det));
          if (nom !== undefined && nom !== null) { if (nom.some((x) => x === `${m[2]}:${m[3]}` || (m[3] === 'NOG' && x.startsWith(m[2])))) out.add(`3:${m[2]}`); continue; }
          if (det === null || tags(det).some((q) => new RegExp(`^(ART|PRO:(POS|DEM|IND)):(DEF:|IND:)?NOM:${m[2]}:(${m[3]}|ALG|NOG)`).test(q) || (m[3] === 'NOG' && new RegExp(`:NOM:${m[2]}:`).test(q)))) out.add(`3:${m[2]}`);
        }
      }
      inPP = false;
    }
  }
  return out;
}

// the finite verb of the verb-final clause [s, c..last] agrees with a sure nominative subject in it
export function subjectAgrees(tokens, s, vf) {
  let verb = personNumbers(tokens[vf.last]);
  if (verb.size === 0 && hasInfinitive(tokens[vf.last])) verb = new Set(['1:PLU', '3:PLU']); // finite plural reading dropped by the disambiguator
  if (verb.size === 0) return false;
  return intersects(nominativePersons(tokens, s, vf.clusterStart), verb);
}
