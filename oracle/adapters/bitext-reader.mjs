// JS twin of harness op "bitext-reader" (BitextOps#reader, docs/review/F39-oracle.md).
import { TabBitextReader } from '../../src/core/bitext/TabBitextReader.js';
import { WordFastTMReader } from '../../src/core/bitext/WordFastTMReader.js';
import { errorOf, inWorkDir, pair, s, writeFile } from './_bitext-common.mjs';

// Java: BitextOps#state(TabBitextReader)
function state(r) {
  return { columnCount: r.getColumnCount(), targetColumnCount: r.getTargetColumnCount(), lineCount: r.getLineCount(), sentencePosition: r.getSentencePosition(), currentLine: r.getCurrentLine() };
}

// Java: BitextOps#reader(JsonNode)
export function run(a) {
  return inWorkDir(() => {
    const res = {};
    let name = 'reader-input.txt';
    if (a.noFile === undefined) writeFile(a, name); else name = String(a.noFile);
    const enc = s(a, 'encoding');
    let r;
    try {
      r = a.kind === 'wordfast' ? new WordFastTMReader(name, enc) : new TabBitextReader(name, enc);
    } catch (t) {
      res.ctorError = errorOf(t);
      return res;
    }
    res.initial = state(r);
    const steps = [];
    const it = r.iterator();
    const max = a.maxSteps !== undefined ? a.maxSteps : 1000;
    for (let i = 0; i < max; i++) {
      const st = {};
      try {
        const h = it.hasNext();
        st.hasNext = h;
        if (!h) { steps.push(st); break; }
        st.pair = pair(it.next());
      } catch (t) {
        st.error = errorOf(t);
        steps.push(st);
        break;
      }
      Object.assign(st, state(r));
      steps.push(st);
    }
    res.steps = steps;
    try { it.remove(); } catch (t) { res.removeError = t.javaClass; }
    return res;
  });
}
