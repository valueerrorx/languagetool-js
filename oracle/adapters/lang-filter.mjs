// JS twin of harness op "lang-filter" (MetaOps#filter).
import { lang, safe, MetaRule, ruleState } from './_meta-common.mjs';
import { matchDump } from './_check-pipe-common.mjs';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../src/core/rules/model/SuggestedReplacement.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';

const s = (n, k) => (n[k] !== undefined && n[k] !== null ? String(n[k]) : null);

// Java: JLanguageTool#getRawAnalyzedSentence(String); only getText() is observed by the filters, so one token with the text suffices
function sentence(text) {
  return new AnalyzedSentence([new AnalyzedTokenReadings(new AnalyzedToken(text, null, null), 0)]);
}

// Java: MetaOps#dump(RuleMatch,IdentityHashMap)
function dump(m, ruleIdx) {
  const o = matchDump(m);
  o.originalErrorStr = m.getOriginalErrorStr();
  o.ruleObject = ruleIdx.has(m.getRule()) ? ruleIdx.get(m.getRule()) : -1;
  o.ruleState = ruleState(m.getRule());
  return o;
}

// Java: MetaOps#filter(JsonNode)
export function run(a) {
  const l = lang(a);
  return a.cases.map((c) => safe(() => {
    const out = {};
    const rules = [];
    const byKey = new Map();
    const idx = new Map();
    const input = [];
    for (const mj of c.matches) {
      const key = s(mj, 'ruleKey') !== null ? s(mj, 'ruleKey') : `${mj.ruleId}|${s(mj, 'subId')}`;
      let r = byKey.get(key);
      if (r === undefined) {
        r = new MetaRule(mj);
        byKey.set(key, r);
        idx.set(r, rules.length);
        rules.push(r);
      }
      const stext = s(mj, 'sentence') !== null ? s(mj, 'sentence') : String(c.text);
      const sent = mj.noSentence === true ? null : sentence(stext);
      const from = mj.from;
      const to = mj.to;
      const m = new RuleMatch(r, sent, from, to, String(mj.message), s(mj, 'shortMessage'));
      if (mj.sentPos !== undefined) m.setSentencePosition(mj.sentPos[0], mj.sentPos[1]);
      else m.setSentencePosition(from, to);
      if (mj.suggestions !== undefined) {
        m.setSuggestedReplacementObjects(mj.suggestions.map((x) => (typeof x === 'string' ? new SuggestedReplacement(x) : new SuggestedReplacement(String(x.replacement), s(x, 'shortDescription'), s(x, 'suffix')))));
      }
      if (s(mj, 'specificRuleId') !== null) m.setSpecificRuleId(s(mj, 'specificRuleId'));
      if (mj.errorStr !== undefined) {
        if (typeof mj.errorStr === 'boolean') { if (mj.errorStr) m.setOriginalErrorStr(); } else m.setOriginalErrorStr(String(mj.errorStr));
      }
      input.push(m);
    }
    const enabled = c.enabledRules !== undefined && c.enabledRules !== null ? new Set(c.enabledRules.map(String)) : null;
    let outMatches;
    switch (c.fn) {
      case 'filter': outMatches = l.filterRuleMatches(input, new AnnotatedTextBuilder().addText(String(c.text)).build(), enabled); break;
      case 'afterOverlapping': outMatches = l.filterRuleMatchesAfterOverlapping(input); break;
      case 'adjustFrench': outMatches = input.map((m) => l.adjustFrenchRuleMatch(m, enabled)); break;
      default: throw new Error(`bad fn ${c.fn}`);
    }
    out.matches = outMatches.map((m) => dump(m, idx));
    out.rulesAfter = rules.map(ruleState);
    return out;
  }));
}
