// JS twin of harness op "unify-seq" (UnifyOps#seq): direct Unifier call sequences. Feature maps: Map (insertion order) or JavaHashMap when hash=true.
import { resetState, lang, preload, sentences, atrsDump } from './_unify-common.mjs';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';

// Java: UnifyOps#err(Throwable)
function errOf(t) {
  if (t && t.notPorted === true) throw t;
  const cls = t.javaClass ?? `js:${t.constructor.name}`;
  return { error: { class: cls, message: cls === 'java.lang.NullPointerException' ? null : (t.message ?? null) } };
}

// Java: UnifyOps#feats(JsonNode,boolean)
function feats(f, hash) {
  if (f === undefined || f === null) return null;
  const m = hash ? new JavaHashMap() : new Map();
  for (const [k, ts] of f) { if (hash) m.put(k, ts); else m.set(k, ts); }
  return m;
}

// Java: UnifyOps#seq(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const pre = a.preload ?? 'disamb';
  if (pre !== '') await preload(l, pre === 'disamb');
  const dis = a.which === 'disamb';
  const hash = a.hash === true;
  const info = [];
  const texts = sentences(l, a.lang, a.texts, info);
  const scripts = [];
  for (const script of a.scripts) {
    const u = dis ? l.getDefaultLanguageVariant().getDisambiguationUnifier() : l.getUnifier();
    const copies = new Map();
    const res = [];
    for (const st of script) {
      try {
        let atr = null;
        if (st.t !== undefined) {
          const key = `${st.t}:${st.k}`;
          atr = copies.get(key);
          if (atr === undefined) {
            const orig = texts[st.t].getTokensWithoutWhitespace()[st.k];
            atr = new AnalyzedTokenReadings(orig.getReadings().map((x) => new AnalyzedToken(x.getToken(), x.getPOSTag(), x.getLemma())), orig.getStartPos());
            copies.set(key, atr);
          }
        }
        let r;
        switch (st.o) {
          case 'isUnified': {
            const tk = atr.getAnalyzedToken(st.r);
            const f = feats(st.f, hash);
            r = st.m !== undefined ? u.isUnified(tk, f, st.last, st.m) : u.isUnified(tk, f, st.last);
            break;
          }
          case 'isSatisfied': r = u.isSatisfied(atr.getAnalyzedToken(st.r), feats(st.f, hash)); break;
          case 'startNextToken': u.startNextToken(); r = null; break;
          case 'startUnify': u.startUnify(); r = null; break;
          case 'reset': u.reset(); r = null; break;
          case 'getFinalUnificationValue': r = u.getFinalUnificationValue(feats(st.f, hash)); break;
          case 'getUnifiedTokens': r = atrsDump(u.getUnifiedTokens()); break;
          case 'getFinalUnified': r = atrsDump(u.getFinalUnified()); break;
          case 'addNeutralElement': u.addNeutralElement(atr); r = null; break;
          default: throw new Error(`unknown step ${st.o}`);
        }
        res.push(r);
      } catch (t) {
        res.push(errOf(t));
      }
    }
    scripts.push(res);
  }
  return { texts: info, scripts };
}

// parity hook: fresh state per case file (Java: one JVM per case)
export function beginCase() { resetState(); }
