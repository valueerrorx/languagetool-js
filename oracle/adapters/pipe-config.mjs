// JS twin of harness op "pipe-config" (PipeOps#config, docs/review/F35-oracle.md).
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { doubleToString, floatToString } from '../../src/lib/java/toString.js';
import { errorOf, languageFor } from './_check-pipe-common.mjs';
import { notPorted } from './_pipe-common.mjs';

// Java: String.valueOf(boxed) of a typed value {t,v}; Double/Float need the Java renderings
function render(x) {
  if (x === null) return null;
  if (x.t === 'Double') return { t: x.t, v: doubleToString(Number(x.v)) };
  if (x.t === 'Float') return { t: x.t, v: floatToString(Math.fround(Number(x.v))) };
  if (x.t === 'Integer' || x.t === 'Long') return { t: x.t, v: BigInt(x.v).toString() };
  return { t: x.t, v: String(x.v) };
}

// Java: PipeOps#config(JsonNode)
export function run(a) {
  const uc = new UserConfig();
  let lt;
  try {
    lt = new JLanguageTool(languageFor(a.lang), [], null, null, null, uc, true, false, []);
  } catch (e) {
    throw notPorted(String(e.message));
  }
  const steps = [];
  for (const st of a.steps) {
    const r = {};
    try {
      switch (st.do) {
        case 'set': lt.setConfigValues(new Map(Object.entries(st.map).map(([k, v]) => [k, v === null ? null : v.map((x) => x)]))); break;
        case 'setNull': lt.setConfigValues(null); break;
        case 'get': { const v = uc.getConfigValueByID(st.id); r.result = v === null ? null : v.map(render); break; }
        default: throw new Error(st.do);
      }
    } catch (t) {
      Object.assign(r, errorOf(t));
    }
    steps.push(r);
  }
  return { steps };
}
