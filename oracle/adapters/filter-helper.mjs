// JS twin of harness op "filter-helper" (FilterOps#filterHelper): YMDDateHelper and NewLineMatchFilter.
import { resetState } from './_unify-common.mjs';
import { lang, fresh, ruleFor, dump, err, setClock, pairMap, resetFilters, optional } from './_filters-common.mjs';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';

export function beginCase() { resetState(); resetFilters(); }

const pairsOf = (m) => [...m.keySet()].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)).map((k) => [k, m.get(k)]);

// Java: FilterOps#filterHelper(JsonNode)
export async function run(a) {
  const restore = setClock(a.clockAt);
  try {
    switch (a.kind) {
      case 'ymd': {
        const { YMDDateHelper } = await optional('core/rules/YMDDateHelper.js', 'org.languagetool.rules.YMDDateHelper');
        const h = new YMDDateHelper();
        const args = pairMap(a.args);
        if (a.method === 'parseDate') {
          const r = h.parseDate(args);
          return { same: r === args, pairs: pairsOf(r) };
        }
        const l = lang(a.lang);
        const s = fresh(l, a.lang, a.text);
        const m = new RuleMatch(ruleFor(l), s, a.from, a.to, a.message, a.shortMessage ?? null);
        return { dump: dump(h.correctDate(m, args)) };
      }
      case 'newline': {
        const { NewLineMatchFilter } = await optional('core/rules/NewLineMatchFilter.js', 'org.languagetool.rules.NewLineMatchFilter');
        const l = lang(a.lang);
        const rule = ruleFor(l);
        const input = a.matches.map((mn) => {
          const m = new RuleMatch(rule, null, mn.from, mn.to, 'msg');
          if (mn.suggestions !== undefined && mn.suggestions !== null) m.setSuggestedReplacements(mn.suggestions);
          return m;
        });
        const at = new AnnotatedTextBuilder().addText(a.text).build();
        const out = new NewLineMatchFilter().filter([...input], at);
        return {
          kept: out.map((m) => ({ in: input.indexOf(m), from: m.getFromPos(), to: m.getToPos(), suggestions: [...m.getSuggestedReplacements()] })),
          inAfter: input.map((m) => [m.getFromPos(), m.getToPos(), [...m.getSuggestedReplacements()]]),
        };
      }
      default: throw new IllegalArgumentException(`unknown helper kind ${a.kind}`);
    }
  } catch (t) { return err(t); } finally { restore(); }
}
