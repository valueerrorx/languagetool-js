// JS twin of harness op "lang-deagree" (DeAgreeOps#run, docs/review/F54-oracle.md): direct calls into the German agreement helpers.
import { languageFor, newTool, errorOf } from './_check-pipe-common.mjs';
import { ArrayIndexOutOfBoundsException } from '../../src/lib/java/errors.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { POSType } from '../../src/lang/de/tagging/GermanToken.js';
import { AgreementSuggestor2 } from '../../src/lang/de/rules/AgreementSuggestor2.js';
import { GrammarCategory, ReplacementType } from '../../src/lang/de/rules/AgreementRule.js';
import * as GermanHelper from '../../src/lang/de/rules/GermanHelper.js';
import { isVowel } from '../../src/lang/de/rules/GermanTools.js';
import * as PrepositionToCases from '../../src/lang/de/rules/PrepositionToCases.js';
import * as AgreementTools from '../../src/lang/de/rules/AgreementTools.js';
import * as LanguageNames from '../../src/lang/de/rules/LanguageNames.js';

const has = (c, k) => Object.hasOwn(c, k);

// Java: DeAgreeOps#run(JsonNode)
export function run(a) {
  switch (a.mode) {
    case 'suggest': return suggest(a);
    case 'helper': return helper(a);
    case 'tools': return tools(a);
    case 'names': return names();
    default: throw new Error('mode');
  }
}

// Java: DeAgreeOps#tok(List,JsonNode,String) (Arrays.asList#get bounds check)
function tok(t, c, k) {
  if (!has(c, k) || c[k] === null) return null;
  const i = c[k];
  if (i < 0 || i >= t.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${t.length}`);
  return t[i];
}

// Java: DeAgreeOps#suggest(JsonNode)
function suggest(a) {
  const l = languageFor(a.lang);
  const lt = newTool(l);
  const out = [];
  for (const c of a.cases) {
    const r = {};
    try {
      const t = [...lt.getAnalyzedSentence(c.text).getTokensWithoutWhitespace()];
      r.tokens = t.map((x) => x.getToken());
      let type = null;
      if (has(c, 'type') && c.type !== null) type = ReplacementType.valueOf(c.type);
      const s = new AgreementSuggestor2(l.getSynthesizer(), tok(t, c, 'det'), tok(t, c, 'adj1'), tok(t, c, 'adj2'), tok(t, c, 'noun'), type);
      if (has(c, 'prep')) s.setPreposition(tok(t, c, 'prep'));
      if (has(c, 'skipped')) s.setSkipped(c.skipped === null ? 'null' : String(c.skipped));
      r.suggestions = s.getSuggestions(false);
      r.suggestionsFiltered = s.getSuggestions(true);
    } catch (e) {
      Object.assign(r, { error: errorOf(e) });
    }
    out.push(r);
  }
  return { cases: out };
}

const POS_TYPES = ['NOMEN', 'VERB', 'ADJEKTIV', 'DETERMINER', 'PRONOMEN', 'PARTIZIP', 'PROPER_NOUN', 'OTHER']; // POSType fields in declaration order (Class#getFields)

// Java: DeAgreeOps#helper(JsonNode)
function helper(a) {
  const res = {};
  const tags = [];
  if (has(a, 'posTags')) {
    for (const s of a.posTags) {
      const r = { posTag: s };
      for (const m of ['getNounCase', 'getNounNumber', 'getNounGender', 'getDeterminerDefiniteness', 'getComparison', 'getDeterminerCase', 'getDeterminerNumber', 'getDeterminerGender']) {
        try {
          r[m] = GermanHelper[m](s);
        } catch (e) {
          r[m] = { error: errorOf(e) };
        }
      }
      tags.push(r);
    }
  }
  res.posTags = tags;
  const vowels = [];
  if (has(a, 'chars')) {
    for (const ch of a.chars) vowels.push({ char: ch, isVowel: isVowel(ch.charAt(0)) });
  }
  res.vowels = vowels;
  if (has(a, 'texts')) {
    const lt = newTool(languageFor(has(a, 'lang') ? a.lang : 'de-DE'));
    const rs = [];
    for (const tx of a.texts) {
      const toks = [];
      for (const t of lt.getAnalyzedSentence(tx).getTokensWithoutWhitespace()) {
        const types = POS_TYPES.filter((n) => GermanHelper.hasReadingOfType(t, POSType[n]));
        toks.push({ token: t.getToken(), types, nullType: GermanHelper.hasReadingOfType(null, POSType.NOMEN) });
      }
      rs.push({ text: tx, tokens: toks });
    }
    res.texts = rs;
  }
  return res;
}

// Java: DeAgreeOps#tools(JsonNode)
function tools(a) {
  const res = {};
  const ps = [];
  if (has(a, 'prepositions')) {
    for (const p of a.prepositions) {
      const r = { prep: p };
      try {
        const cs = PrepositionToCases.getCasesFor(p);
        r.cases = cs === null ? null : cs.map((x) => x.toString());
      } catch (e) {
        r.error = errorOf(e);
      }
      ps.push(r);
    }
  }
  res.prepositions = ps;
  if (has(a, 'texts')) {
    const lt = newTool(languageFor(has(a, 'lang') ? a.lang : 'de-DE'));
    const sorted = (set) => [...set].sort(javaCompare); // Java: new TreeSet<>(Set)
    const rs = [];
    for (const tx of a.texts) {
      const toks = [];
      for (const t of lt.getAnalyzedSentence(tx).getTokensWithoutWhitespace()) {
        const o = { token: t.getToken() };
        const vs = [];
        for (const om of a.omits) {
          const omit = new Set();
          for (const n of om) omit.add(GrammarCategory.valueOf(n));
          const v = { omit: om };
          for (const skip of [false, true]) {
            try {
              v[`cats_skipSol=${skip}`] = sorted(AgreementTools.getAgreementCategories(t, omit, skip));
            } catch (e) {
              v[`cats_skipSol=${skip}`] = errorOf(e);
            }
          }
          try {
            v.sol = sorted(AgreementTools.getAgreementSOLCategories(t, omit));
          } catch (e) {
            v.sol = errorOf(e);
          }
          vs.push(v);
        }
        o.variants = vs;
        toks.push(o);
      }
      rs.push({ text: tx, tokens: toks });
    }
    res.texts = rs;
  }
  return res;
}

// Java: DeAgreeOps#names()
function names() {
  return { names: [...LanguageNames.get()], regex: LanguageNames.getAsRegex() };
}
