import { deepDiff } from './deep.mjs';

// Fields per docs/ORACLE.md 3.4; historicalAnnotations is a Java diagnostic and not compared.
const TOKEN_FIELDS = ['text', 'startPos', 'endPos', 'whitespaceBefore', 'readings', 'chunkTags', 'immunized', 'ignoreSpelling',
  'sentenceStart', 'sentenceEnd', 'paragraphEnd', 'whitespace', 'linebreak'];

function tokenList(e, a, path, diffs) {
  if (e.length !== a.length) diffs.push(`${path}: token count ${e.length} != ${a.length}`);
  for (let i = 0; i < Math.min(e.length, a.length); i++) {
    for (const f of TOKEN_FIELDS) diffs.push(...deepDiff(e[i][f], a[i][f], `${path}[${i}:${JSON.stringify(e[i].text)}].${f}`));
  }
}

export function compareAnalyze(e, a) {
  const diffs = [];
  const es = e.sentences ?? [];
  const as = a.sentences ?? [];
  if (es.length !== as.length) diffs.push(`sentences: count ${es.length} != ${as.length}`);
  for (let i = 0; i < Math.min(es.length, as.length); i++) {
    for (const f of ['text', 'offset']) diffs.push(...deepDiff(es[i][f], as[i][f], `sentences[${i}].${f}`));
    tokenList(es[i].tokens ?? [], as[i].tokens ?? [], `sentences[${i}].tokens`, diffs);
    if ('preDisambigTokens' in es[i] || 'preDisambigTokens' in as[i]) tokenList(es[i].preDisambigTokens ?? [], as[i].preDisambigTokens ?? [], `sentences[${i}].preDisambigTokens`, diffs);
  }
  return diffs;
}
