// JS twin of harness op "disamb-examples" (DisambOps#examples): DisambiguationRuleTest replay with rule cascade, XML rules only, no-op chunker.
import { lang, rules, fresh, err, sha1 } from './_disamb-common.mjs';
import { releaseXx } from './_disamb-common.mjs';
import { listGet } from '../../src/lib/java/arrays.js';
import { resetState } from './_unify-common.mjs';
import { resetDisamb } from './_disamb-common.mjs';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';

export function beginCase() { resetState(); resetDisamb(); }

const cleanXML = (s) => s.replace(/<.*?>/g, '');

// Java: String#split(String) for a single-char separator (trailing empty strings removed)
function javaSplitComma(s) {
  const parts = s.split(',');
  while (parts.length > 0 && parts[parts.length - 1] === '' && parts.length > 1) parts.pop();
  if (parts.length === 1 && parts[0] === '' && s !== '') return [];
  return parts;
}

// Java: DisambiguationRuleTest#sortForms(String)
function sortForms(wordForms) {
  if (wordForms === ',[,]') return wordForms;
  if (wordForms.length === 0) return wordForms;
  const word = wordForms.substring(0, wordForms.indexOf('[') + 1);
  const forms = wordForms.substring(wordForms.indexOf('[') + 1, wordForms.length - 1);
  const formToSort = javaSplitComma(forms);
  formToSort.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  return `${word}${formToSort.join(',')}]`;
}

// Java: DisambiguationRuleTest#disambiguateUntil(Language,List,String,AnalyzedSentence) without preDisambiguate
function until(rs, ruleId, s) {
  let d = s;
  for (const r of rs) {
    if (ruleId === r.getId()) break;
    d = r.replace(d);
  }
  return d;
}

const javaTrimLen = (s) => s.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '').length;

// Java: DisambOps#examples(JsonNode)
export async function run(a) {
  try { return await runImpl(a); } finally { if (a.lang === 'xx') releaseXx(); }
}

async function runImpl(a) {
  const l = lang(a.lang);
  const rs = await rules(l, a.xml ?? null);
  const code = a.lang;
  const out = [];
  for (let i = a.offset; i < Math.min(rs.length, a.offset + a.limit); i++) {
    const rule = listGet(rs, i);
    const ro = { i, id: rule.getId(), subId: rule.getSubId() };
    const id = rule.getId();
    const un = [];
    if (rule.getUntouchedExamples() !== null) {
      for (let good of rule.getUntouchedExamples()) {
        try {
          good = good.replace(/[\n\t]+/g, '');
          good = cleanXML(good);
          const sent = until(rs, id, fresh(l, code, good));
          const toReplace = until(rs, id, fresh(l, code, good));
          const rep = rule.replace(toReplace);
          un.push({ blank: javaTrimLen(good) === 0, eq: sent.toString() === rep.toString(), dg: sha1(rep.toString()) });
        } catch (t) { un.push(err(t)); }
      }
    }
    ro.untouched = un;
    const exs = [];
    const examples = rule.getExamples();
    if (examples !== null) {
      for (const example of examples) {
        try {
          const o = {};
          const outputForms = example.getDisambiguated();
          const inputForms = example.getAmbiguous();
          const ms = example.getExample().indexOf('<marker>');
          const me = example.getExample().indexOf('</marker>') - '<marker>'.length;
          o.exp = [ms, me];
          o.noIn = inputForms === null;
          o.noOut = outputForms === null;
          o.same = inputForms !== null && inputForms === outputForms;
          const clean = cleanXML(example.getExample());
          const cleanInput = fresh(l, code, clean);
          const sent = until(rs, id, fresh(l, code, clean));
          const dis = rule.replace(until(rs, id, fresh(l, code, clean)));
          o.eqClean = cleanInput.equals(dis);
          o.eqSent = sent.equals(dis);
          let reading = '';
          let pos = [-1, -1];
          for (const r of sent.getTokens()) {
            if (r.isSentenceStart() && !(inputForms !== null && inputForms.includes('<S>'))) continue;
            if (r.getStartPos() === ms) {
              reading = new AnalyzedSentence([r]).toShortString(',');
              pos = [r.getStartPos(), r.getEndPos()];
              break;
            }
          }
          o.inPos = pos;
          o.inRaw = reading;
          o.inA = sortForms(reading);
          reading = '';
          pos = [-1, -1];
          for (const r of dis.getTokens()) {
            if (r.isSentenceStart() && !(outputForms !== null && outputForms.includes('<S>'))) continue;
            if (r.getStartPos() === ms) {
              reading = new AnalyzedSentence([r]).toShortString(',');
              pos = [r.getStartPos(), r.getEndPos()];
              break;
            }
          }
          o.outPos = pos;
          o.outRaw = reading;
          o.outA = sortForms(reading);
          o.inDg = sha1(sent.toString());
          o.outDg = sha1(dis.toString());
          exs.push(o);
        } catch (t) { exs.push(err(t)); }
      }
    }
    ro.examples = exs;
    out.push(ro);
  }
  return { total: rs.length, rules: out };
}
