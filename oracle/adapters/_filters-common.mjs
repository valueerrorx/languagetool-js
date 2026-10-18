// Shared code of the X-FILTERS adapters: JS twins of FilterOps helpers (docs/review/F34-oracle.md).
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import '../../src/core/patterns/filterRegistry.js';
import { getClassBroker } from '../../src/core/resources/LtStatics.js';
import { RuleFilterCreator } from '../../src/core/patterns/RuleFilterCreator.js';
import { notPortedYet } from '../../src/core/language/components.js';
import { inline } from './_unify-common.mjs';
import { lang as langWithXx, fresh } from './_disamb-common.mjs';
import { err } from './_ruleinfra-common.mjs';
import { dump } from './rule-match.mjs';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';

export { err, dump, fresh, inline };
export const lang = langWithXx;

// named filter configurations of the current case file (op filter-cfg)
export const CFG = new Map();
export function resetFilters() { CFG.clear(); }

// Java: FilterOps RULE_XML
const RULE_XML = (code) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${code}"><category id="C" name="c"><rule id="FILTER_RULE" name="r"><pattern><token>x</token></pattern><message>m</message></rule></category></rules>\n`;
export const ruleFor = (l) => inline(l, RULE_XML(l.getShortCode()))[0];

// the fixed clock of the request (Java: libfaketime start-at of the case file); read lazily by src/lib/java/clock.js; returns the restore function
export function setClock(at) {
  const prev = process.env.LTJS_FIXED_TIME;
  if (at !== undefined) process.env.LTJS_FIXED_TIME = at;
  return () => { if (prev === undefined) delete process.env.LTJS_FIXED_TIME; else process.env.LTJS_FIXED_TIME = prev; };
}

// Java: Map<String,String> built with HashMap (null values allowed)
export function pairMap(n) {
  const m = new JavaHashMap();
  if (n !== undefined && n !== null) for (const p of n) m.put(p[0], p[1] === undefined ? null : p[1]);
  return m;
}

// abstract base class of the port by FQCN (pending placeholders are notPorted)
export function baseClass(fqcn) {
  const C = getClassBroker().forName(fqcn);
  if (C.JAVA_PENDING === true) throw notPortedYet(`${fqcn} (abstract filter class not ported yet)`);
  return C;
}

// optional port module (Calendar helper of the date filters)
export async function optional(rel, what) {
  const f = path.resolve(import.meta.dirname, '../../src', rel);
  if (!existsSync(f)) throw notPortedYet(what);
  return import(pathToFileURL(f).href);
}

export const filterCreator = () => RuleFilterCreator.getInstance();
