// JS twin of harness op "sr-misc" (SpellRuleOps#misc, docs/review/F42-oracle.md).
import { CommonFileTypes } from '../../src/core/rules/spelling/CommonFileTypes.js';
import { VagueSpellChecker } from '../../src/core/rules/spelling/VagueSpellChecker.js';
import { ForeignLanguageChecker } from '../../src/core/rules/spelling/ForeignLanguageChecker.js';
import { SymSpell, Verbosity } from '../../src/core/rules/spelling/symspell/implementation/SymSpell.js';
import { BufferedReader } from '../../src/lib/java/io.js';
import { floatToString } from '../../src/lib/java/toString.js';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { beginCase, safe, strs } from './_spellrule-common.mjs';

export { beginCase };

// Java: SpellRuleOps#items(List)
const items = (l) => l.map((i) => `${i.term}|${i.distance}|${i.count}|${i}`);

// Java: SpellRuleOps#misc(JsonNode)
export function run(a) {
  const kind = a.kind;
  const res = {};
  switch (kind) {
    case 'filetypes': {
      const p = CommonFileTypes.getSuffixPattern();
      res.pattern = p.pattern();
      res.flags = p.flags();
      res.results = strs(a, 'words').map((s) => ({ w: s, matches: p.matcher(s).matches() }));
      break;
    }
    case 'vague': {
      const l = languageFor(a.lang);
      const v = new VagueSpellChecker();
      res.results = strs(a, 'words').map((s) => ({ w: s, valid: safe(() => v.isValidWord(s, l)) }));
      break;
    }
    case 'multitoken': {
      const l = languageFor(a.lang);
      const ms = l.getMultitokenSpeller(); // Java: (MultitokenSpeller) safe(l::getMultitokenSpeller): errors surface as the request error
      if (ms === null || ms === undefined) {
        res.speller = 'null';
        break;
      }
      res.results = strs(a, 'words').map((s) => ({
        w: s,
        sugg: safe(() => ms.getSuggestions(s)),
        suggAccepted: safe(() => ms.getSuggestions(s, true)),
      }));
      break;
    }
    case 'symspell': {
      const maxDist = a.maxDist;
      const sp = new SymSpell(a.capacity !== undefined ? a.capacity : -1, maxDist, a.prefix !== undefined ? a.prefix : 7, a.threshold !== undefined ? a.threshold : 1);
      let sb = '';
      for (const s of strs(a, 'lines')) sb += `${s}\n`;
      res.loaded = safe(() => sp.loadDictionary(new BufferedReader(sb), a.termIdx, a.countIdx));
      const o = [];
      for (const s of strs(a, 'words')) {
        const m = { w: s };
        for (const v of Verbosity.values()) {
          m[`lookup${v}`] = safe(() => items(sp.lookup(s, v)));
          m[`lookup${v}1`] = safe(() => items(sp.lookup(s, v, Math.min(1, maxDist))));
        }
        m.compound = safe(() => items(sp.lookupCompound(s)));
        m.compound1 = safe(() => items(sp.lookupCompound(s, Math.min(1, maxDist))));
        m.segment = safe(() => {
          const seg = sp.wordSegmentation(s);
          return { segmentedString: seg.segmentedString, correctedString: seg.correctedString, distanceSum: seg.distanceSum, probabilityLogSum: seg.probabilityLogSum };
        });
        o.push(m);
      }
      res.results = o;
      break;
    }
    case 'foreign': {
      const o = [];
      for (const c of a.cases) {
        const m = { case: c };
        m.result = safe(() => {
          const r = new ForeignLanguageChecker(String(c.lang), String(c.sentence), c.length, strs(c, 'preferred')).check(c.matches);
          return Object.fromEntries([...r.entries()].map(([k, v]) => [k, Number(floatToString(v))]));
        });
        o.push(m);
      }
      res.results = o;
      break;
    }
    default: throw new Error(`kind ${kind}`);
  }
  return res;
}
