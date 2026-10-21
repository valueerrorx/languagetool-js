// JS twin of harness op "disambiguation-examples" (ContentOps#disambiguationExamples): DisambiguationRuleTest replay for the language disambiguation.xml.
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { lang, rules } from './_disamb-common.mjs';
import { sortForms } from './disamb-examples.mjs';

// Java: ContentOps#until(Language,List,String,AnalyzedSentence)
function until(l, rs, id, s) {
  let d = l.getDisambiguator().preDisambiguate(s);
  for (const r of rs) {
    if (id === r.getId()) break;
    d = r.replace(d);
  }
  return d;
}

// Java: ContentOps#readingAt(AnalyzedSentence,int,boolean)
function readingAt(sent, start, wantSentStart) {
  for (const rd of sent.getTokens()) {
    if (rd.isSentenceStart() && !wantSentStart) continue;
    if (rd.getStartPos() === start) {
      return sortForms(new AnalyzedSentence([rd]).toShortString(','));
    }
  }
  return '';
}

const errText = (t) => `${t.javaClass ?? `js:${t.constructor.name}`}: ${t.message ?? null}`;

// Java: ContentOps#disambiguationExamples(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const lt = new JLanguageTool(l);
  const rs = await rules(l, null);
  const offset = a.offset !== undefined ? a.offset : 0;
  const limit = a.limit !== undefined ? a.limit : 2147483647;
  const out = [];
  let idx = -1;
  for (const rule of rs) {
    idx++;
    if (idx < offset || idx >= offset + limit) continue;
    const id = rule.getId();
    if (rule.getUntouchedExamples() !== null) {
      for (const good of rule.getUntouchedExamples()) {
        const o = { ruleId: id, subId: rule.getSubId(), ruleIndex: idx, kind: 'untouched', example: good };
        try {
          const g = good.replace(/[\n\t]+/g, '').replace(/<.*?>/g, '');
          const sent = until(l, rs, id, lt.getRawAnalyzedSentence(g));
          const sent2 = until(l, rs, id, lt.getRawAnalyzedSentence(g));
          const after = rule.replace(sent2).toString();
          o.touched = sent.toString() !== after;
          if (sent.toString() !== after) { o.before = sent.toString(); o.after = after; }
        } catch (t) {
          if (t && t.notPorted === true) throw t;
          o.error = errText(t);
        }
        out.push(o);
      }
    }
    if (rule.getExamples() !== null) {
      for (const ex of rule.getExamples()) {
        const o = { ruleId: id, subId: rule.getSubId(), ruleIndex: idx, kind: 'ambiguous', example: ex.getExample(), input: ex.getAmbiguous(), expected: ex.getDisambiguated() };
        try {
          const raw = ex.getExample();
          const ms = raw.indexOf('<marker>');
          const me = raw.indexOf('</marker>') - '<marker>'.length;
          const clean = raw.replace(/<.*?>/g, '');
          const sent = until(l, rs, id, lt.getRawAnalyzedSentence(clean));
          const dis = rule.replace(until(l, rs, id, lt.getRawAnalyzedSentence(clean)));
          const inp = ex.getAmbiguous() === null ? '' : ex.getAmbiguous();
          const outp = ex.getDisambiguated() === null ? '' : ex.getDisambiguated();
          o.markerStart = ms;
          o.markerEnd = me;
          o.actualInput = readingAt(sent, ms, inp.includes('<S>'));
          o.actual = readingAt(dis, ms, outp.includes('<S>'));
        } catch (t) {
          if (t && t.notPorted === true) throw t;
          o.error = errText(t);
        }
        out.push(o);
      }
    }
  }
  return { rules: rs.length, examples: out };
}
