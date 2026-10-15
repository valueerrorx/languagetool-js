// DEV-006 handling for the language registry fixtures (docs/review/F10-porter.md): Java results that depend on a language outside the wave-1 modules.
import { isDeepStrictEqual } from 'node:util';

const IN_SCOPE_BASE = new Set(['de', 'en', 'fr']);
const IN_SCOPE_CLASSES = new Set(['German', 'GermanyGerman', 'AustrianGerman', 'SwissGerman',
  'English', 'AmericanEnglish', 'BritishEnglish', 'AustralianEnglish', 'CanadianEnglish', 'NewZealandEnglish', 'SouthAfricanEnglish',
  'French', 'CanadianFrench', 'SwissFrench', 'BelgianFrench']);
const LIST_RE = /Supported language codes are: [^]*?\. The list of languages is read/g;
const WORKDIR_RE = /\/tmp\/ltjs-oracle-[A-Za-z0-9_]+|<CASE>/g; // Java work dir (user.dir of the oracle run), already replaced by <CASE> when the case normalises paths

const isWrap = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && 'dev006Filtered' in x;
const isTriple = (x) => Array.isArray(x) && x.length === 3 && x.every((y) => typeof y === 'string');
const isRow = (x) => Array.isArray(x) && x.length === 3 && typeof x[0] === 'string' && typeof x[1] === 'string' && typeof x[2] === 'boolean';
const simpleName = (c) => c.replace(/^org\.languagetool\.language\./, '');

// the JS side yields the DEV-006 value for a language that is not registered: unknown-language error, null, false or the en-US fallback
function isNegative(a) {
  if (a === null || typeof a !== 'object') return false;
  if (a.error) return /IllegalArgumentException|RuntimeException/.test(a.error.class);
  if (isWrap(a)) return a.value === null || typeof a.value === 'boolean' || (a.value !== null && typeof a.value === 'object' && a.value.dev006OutOfScope === false);
  return false;
}

// expected item that exists only because Java registers more languages (builder over an out-of-scope base language)
function dependsOnOutOfScopeBase(e, a) {
  if (!isWrap(e)) return false;
  if (e.value !== null && typeof e.value === 'object' && e.value.class === 'org.languagetool.language.LanguageBuilder$ExtendedLanguage' && !IN_SCOPE_BASE.has(e.value.shortCode)) return true;
  return false;
}

function alreadyInstantiated(e) {
  return e && e.error && e.error.message === 'Language was already instantiated, see the cause stacktrace below.';
}

// SimpleGerman (de-DE-x-simple-language, out of scope) extends GermanyGerman: Java reports hasVariant=true for GermanyGerman, the port has no subclass
function withoutSimpleGerman(x) {
  if (Array.isArray(x)) return x.map(withoutSimpleGerman);
  if (x !== null && typeof x === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(x)) o[k] = withoutSimpleGerman(v);
    if (o.class === 'org.languagetool.language.GermanyGerman' && o.hasVariant === true) o.hasVariant = false;
    return o;
  }
  return x;
}

// returns [expectedItem, actualItem] with DEV-006 differences removed
function pair(e0, a) {
  const e = withoutSimpleGerman(e0);
  if (isWrap(e) && e.dev006Filtered === true) return isNegative(a) ? [null, null] : [e, a];
  if (dependsOnOutOfScopeBase(e, a)) return [null, null];
  if (alreadyInstantiated(e) && isWrap(a) && a.value && a.value.class === 'org.languagetool.language.LanguageBuilder$1') return [null, null];
  if (Array.isArray(e) && e.every(isWrap) && e.length > 0) return [e.filter((x) => x.dev006Filtered !== true), a];
  if (Array.isArray(e) && e.length > 0 && e.every(isRow)) return [e.filter((x) => x[2] !== true), a];
  if (Array.isArray(e) && e.length > 0 && e.every(isTriple)) return [e.filter((x) => !x[0].startsWith('org.languagetool.language.') || IN_SCOPE_CLASSES.has(simpleName(x[0]))), a];
  return [e, a];
}

const norm = (v) => JSON.parse(JSON.stringify(v).replace(LIST_RE, 'Supported language codes are: <LIST> The list of languages is read').replace(WORKDIR_RE, '<CWD>').split(JSON.stringify(process.cwd()).slice(1, -1)).join('<CWD>'));

// compares one response line pair; returns true when equal modulo DEV-006
export function equalModuloDev006(e, a) {
  if (e === undefined || a === undefined) return false;
  if (e.ok && a.ok && Array.isArray(e.result) && Array.isArray(a.result)) {
    // list entries are matched by position (calls); inner lists are filtered inside pair()
    const ex = [];
    const ac = [];
    if (e.result.length !== a.result.length) return false;
    for (let i = 0; i < e.result.length; i++) {
      const [x, y] = pair(e.result[i], a.result[i]);
      ex.push(x);
      ac.push(y);
    }
    return isDeepStrictEqual(norm({ ...e, result: ex }), norm({ ...a, result: ac }));
  }
  return isDeepStrictEqual(norm(e), norm(a));
}

// comparator for harness cases whose fixtures carry DEV-006 markers (X-LANG-REGISTRY)
export function compareDev006(expectedLines, actualLines) {
  const diffs = [];
  const n = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < n; i++) {
    if (!equalModuloDev006(expectedLines[i], actualLines[i])) diffs.push(`line ${i + 1}\n- ${JSON.stringify(expectedLines[i])}\n+ ${JSON.stringify(actualLines[i])}`);
  }
  return diffs;
}

// structure:dev006-languages (X-LANGUAGES): Java list restricted to the in-scope classes (D-036)
export function compareLanguagesList(expectedLines, actualLines) {
  const filtered = expectedLines.map((l) => (l.ok && Array.isArray(l.result) ? { ...l, result: l.result.filter((x) => IN_SCOPE_CLASSES.has(simpleName(x.class))) } : l));
  const diffs = [];
  const n = Math.max(filtered.length, actualLines.length);
  for (let i = 0; i < n; i++) {
    if (!isDeepStrictEqual(filtered[i], actualLines[i])) diffs.push(`line ${i + 1}\n- ${JSON.stringify(filtered[i])}\n+ ${JSON.stringify(actualLines[i])}`);
  }
  return diffs;
}
