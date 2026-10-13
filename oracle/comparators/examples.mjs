import { compareCheck } from './check.mjs';
import { deepDiff } from './deep.mjs';

// rule-examples: per example the rule-restricted match list and the unrestricted check result.
export function compareRuleExamples(e, a) {
  const diffs = deepDiff(e.rulesWithExamples, a.rulesWithExamples, 'rulesWithExamples');
  const ee = e.examples ?? [];
  const ae = a.examples ?? [];
  if (ee.length !== ae.length) diffs.push(`examples: count ${ee.length} != ${ae.length}`);
  for (let i = 0; i < Math.min(ee.length, ae.length); i++) {
    const tag = `examples[${i}] ${ee[i].ruleId}/${ee[i].subId} ${ee[i].kind}`;
    for (const f of ['ruleId', 'subId', 'kind', 'example', 'text', 'markerStart', 'markerEnd', 'corrections', 'restrictedError', 'unrestrictedError']) {
      diffs.push(...deepDiff(ee[i][f], ae[i][f], `${tag} ${f}`));
    }
    if (ee[i].restricted && ae[i].restricted) diffs.push(...compareCheck({ matches: ee[i].restricted }, { matches: ae[i].restricted }).map((d) => `${tag} restricted ${d}`));
    else diffs.push(...deepDiff(ee[i].restricted, ae[i].restricted, `${tag} restricted`));
    if (ee[i].unrestricted && ae[i].unrestricted) diffs.push(...compareCheck(ee[i].unrestricted, ae[i].unrestricted).map((d) => `${tag} unrestricted ${d}`));
    else diffs.push(...deepDiff(ee[i].unrestricted, ae[i].unrestricted, `${tag} unrestricted`));
  }
  return diffs;
}

// disambiguation-examples: input, expected, actual per example
export function compareDisambiguationExamples(e, a) {
  const diffs = deepDiff(e.rules, a.rules, 'rules');
  const ee = e.examples ?? [];
  const ae = a.examples ?? [];
  if (ee.length !== ae.length) diffs.push(`examples: count ${ee.length} != ${ae.length}`);
  for (let i = 0; i < Math.min(ee.length, ae.length); i++) {
    diffs.push(...deepDiff(ee[i], ae[i], `examples[${i}] ${ee[i].ruleId}/${ee[i].subId} ${ee[i].kind}`));
  }
  return diffs;
}

// rules-list: rule order and attributes
export function compareRulesList(e, a) {
  return deepDiff(e, a, '');
}
