// JS twin of harness op "lt-api" (CheckPipeOps#ltApi); 'default'/'mother:' use no built-ins (JS rule lists F17, Java side filtered to SYN_).
import { Languages } from '../../src/core/Languages.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { PREFIX, make, makeAll } from './_synth-rules.mjs';
import {
  annotated, categories, errorOf, filteredSet, ids, languageFor, matchDump, newTool, select, strs, tones, withNoopAnalysis,
} from './_check-pipe-common.mjs';

// Java: CheckPipeOps#step(JLanguageTool,JsonNode)
function step(lt, st) {
  const d = st.do;
  switch (d) {
    case 'addRule': lt.addRule(make(st.rule)); return null;
    case 'addRuleNull': lt.addRule(null); return null;
    case 'setRules': lt.setRules(makeAll(st.rules)); return null;
    case 'setRulesNull': lt.setRules(null); return null;
    case 'disableRule': lt.disableRule(String(st.id)); return null;
    case 'disableRules': lt.disableRules(strs(st, 'ids')); return null;
    case 'enableRule': lt.enableRule(String(st.id)); return null;
    case 'disableCategory': lt.disableCategory(new CategoryId(String(st.id))); return null;
    case 'enableCategory': lt.enableRuleCategory(new CategoryId(String(st.id))); return null;
    case 'isCategoryDisabled': return lt.isCategoryDisabled(new CategoryId(String(st.id)));
    case 'disabledRules': return filteredSet(lt.getDisabledRules());
    case 'cleanOverlapping': lt.setCleanOverlappingMatches(st.value === true); return null;
    case 'allRules': return ids(lt.getAllRules());
    case 'allActive': return ids(lt.getAllActiveRules());
    case 'categories': return categories(lt);
    case 'patternRules': return lt.getPatternRulesByIdAndSubId(st.id === null ? null : String(st.id), st.subId === null ? null : String(st.subId)).map((r) => r.getFullId());
    case 'select': {
      const lines = [];
      select(lt, st.selection, lines);
      return lines;
    }
    case 'check': {
      const level = st.level !== undefined ? Level.valueOf(st.level) : Level.DEFAULT;
      const cr = lt.check2(annotated(st), true, ParagraphHandling.NORMAL, null, Mode.ALL, level, tones(st), null);
      return { matches: cr.getRuleMatches().filter((m) => m.getRule().getId().startsWith(PREFIX)).map(matchDump) };
    }
    default: throw new IllegalArgumentException(`step ${d}`);
  }
}

// Java: CheckPipeOps#ltApi(JsonNode)
export function run(a) {
  const ctor = a.ctor ?? 'default';
  const l = languageFor(a.lang);
  return withNoopAnalysis(l, true, () => {
    const res = {};
    let lt;
    try {
      if (ctor === 'default') lt = newTool(l);
      else if (ctor.startsWith('mother:')) lt = newTool(l, Languages.getLanguageForShortCode(ctor.substring(7))); // mother tongue: no tagger needed
      else if (ctor === 'nullLang') lt = new JLanguageTool(null);
      else if (ctor === 'nullLangMother') lt = new JLanguageTool(null, null);
      else if (ctor === 'nullAlt') lt = new JLanguageTool(l, null, null, null, null, null, true, false, null);
      else if (ctor === 'custom') lt = new JLanguageTool(l, [], null, null, null, null, true, false, makeAll(a.rules));
      else throw new IllegalArgumentException(`ctor ${ctor}`);
    } catch (t) {
      res.ctorError = errorOf(t).error;
      return res;
    }
    lt.setCleanOverlappingMatches(false);
    res.steps = a.steps.map((st) => {
      try {
        return { result: step(lt, st) };
      } catch (t) {
        return errorOf(t);
      }
    });
    return res;
  });
}
