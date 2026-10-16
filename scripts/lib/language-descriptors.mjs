// Derives detection descriptors (code, countries, variant, name, ...) of every distribution language from the Java sources (D-051/DEV-008).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PKG = 'org.languagetool.language.';

// removes // and /* */ comments outside string literals
function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 1;
    } else out += c;
  }
  return out;
}

// Java string literal -> JS string (escapes used in language classes)
function unquote(lit) {
  return JSON.parse(lit.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => `\\u${h}`));
}

// parsed source of one language class
function parseClass(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const name = path.basename(file, '.java');
  const ext = new RegExp(`class\\s+${name}\\s+extends\\s+(\\w+)`).exec(src);
  const consts = {};
  for (const m of src.matchAll(/static\s+final\s+String\s+(\w+)\s*=\s*("(?:[^"\\]|\\.)*")\s*;/g)) consts[m[1]] = unquote(m[2]);
  const methods = {};
  for (const m of src.matchAll(/(?:public|protected)\s+(?:static\s+)?(?:final\s+)?(?:@\w+\s+)?[\w<>[\]]+\s+(\w+)\s*\(\s*\)\s*(?:throws\s+[\w, ]+)?\{/g)) {
    let depth = 1;
    let j = m.index + m[0].length;
    while (depth > 0 && j < src.length) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    if (!(m[1] in methods)) methods[m[1]] = src.slice(m.index + m[0].length, j - 1).trim();
  }
  const holder = /class\s+InstanceHolder\s*\{([\s\S]*?)\n {2}\}/.exec(src);
  return { name, superName: ext ? ext[1] : null, consts, methods, holder: holder ? holder[1] : null };
}

// finds the concrete value of a no-arg method along the superclass chain
function lookup(classes, cls, method) {
  for (let c = classes.get(cls); c; c = classes.get(c.superName)) {
    if (method in c.methods) return { owner: c, body: c.methods[method] };
  }
  return null;
}

// constant along the superclass chain
function constant(classes, owner, id) {
  for (let c = owner; c; c = classes.get(c.superName)) if (id in c.consts) return c.consts[id];
  throw new Error(`unresolved constant ${id} in ${owner.name}`);
}

// evaluates `return <expr>;` of a simple getter
function evalReturn(classes, owner, body) {
  const m = /^return\s+([\s\S]*?);$/.exec(body.trim());
  if (!m) throw new Error(`unsupported body in ${owner.name}: ${body}`);
  const e = m[1].trim();
  if (/^"/.test(e)) return unquote(e);
  if (e === 'null') return null;
  if (e === 'true' || e === 'false') return e === 'true';
  if (/^[A-Z_][A-Z0-9_]*$/.test(e)) return constant(classes, owner, e);
  const arr = /^new\s+String\s*\[\s*\]\s*\{([\s\S]*)\}$/.exec(e);
  if (arr) return arr[1].split(',').map((x) => x.trim()).filter((x) => x !== '').map((x) => (x.startsWith('"') ? unquote(x) : constant(classes, owner, x)));
  throw new Error(`unsupported expression in ${owner.name}: ${e}`);
}

// shortCode argument of the first Languages.getLanguageForShortCode(..) in a code fragment
function shortCodeArg(classes, owner, code) {
  const m = /Languages\.getLanguageForShortCode\(\s*("(?:[^"\\]|\\.)*"|\w+)\s*\)/.exec(code);
  if (!m) return null;
  return m[1].startsWith('"') ? unquote(m[1]) : constant(classes, owner, m[1]);
}

// getDefaultLanguageVariant() -> {self} | {code} (resolved later like Languages.getLanguageForShortCode)
function defaultVariant(classes, cls) {
  const f = lookup(classes, cls, 'getDefaultLanguageVariant');
  if (f === null) return { self: true }; // Java: Language#getDefaultLanguageVariant() returns this
  const e = /^return\s+([\s\S]*?);$/.exec(f.body.trim())?.[1].trim();
  let code = null;
  if (e === 'this') return { self: true };
  if (e && e.startsWith('Languages.getLanguageForShortCode(')) code = shortCodeArg(classes, f.owner, e);
  else if (e === 'InstanceHolder.INSTANCE' && f.owner.holder) code = shortCodeArg(classes, f.owner, f.owner.holder);
  else if (e && /^(\w+\.)?getInstance\(\)$/.test(e)) {
    const target = e.includes('.') ? classes.get(e.split('.')[0]) : f.owner;
    if (target && 'getInstance' in target.methods) code = shortCodeArg(classes, target, target.methods.getInstance);
  }
  if (code === null) throw new Error(`unsupported getDefaultLanguageVariant in ${f.owner.name}: ${f.body}`);
  return { code };
}

// Java: Languages#getLanguageForShortCodeOrNull(String) on the descriptor list (plain and ll-CC codes)
function resolveCode(list, code) {
  const parts = code.split('-');
  for (const d of list) {
    if (parts.length === 1 && d.shortCode.toLowerCase() === code.toLowerCase()) return d;
    if (parts.length === 2 && d.shortCode.toLowerCase() === parts[0].toLowerCase() && d.countries.length === 1 && d.countries[0].toLowerCase() === parts[1].toLowerCase()) return d;
  }
  throw new Error(`default variant code ${code} not resolvable`);
}

// Java: Language#buildShortCodeWithCountryAndVariant()
function longCode(d) {
  let name = d.shortCode;
  if (d.countries.length === 1 && !name.includes('-x-')) {
    name += `-${d.countries[0]}`;
    if (d.variant !== null) name += `-${d.variant}`;
  }
  return name;
}

// classNames in Languages order (merged language-module.properties, duplicates dropped) -> descriptor list
export function buildDescriptors(javaSrc, classNames) {
  const classes = new Map();
  const modules = path.join(javaSrc, 'languagetool-language-modules');
  for (const m of readdirSync(modules).sort()) {
    const dir = path.join(modules, m, 'src/main/java/org/languagetool/language');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (f.endsWith('.java')) classes.set(path.basename(f, '.java'), parseClass(path.join(dir, f)));
  }
  const list = [];
  for (const fqcn of classNames) {
    const cls = fqcn.slice(PKG.length);
    if (!fqcn.startsWith(PKG) || !classes.has(cls)) throw new Error(`no source for ${fqcn}`);
    const val = (method, dflt) => {
      const f = lookup(classes, cls, method);
      return f === null ? dflt : evalReturn(classes, f.owner, f.body);
    };
    const supers = [];
    for (let c = classes.get(classes.get(cls).superName); c; c = classes.get(c.superName)) supers.push(PKG + c.name);
    const shortCode = val('getShortCode', undefined);
    const d = {
      class: fqcn,
      superclasses: supers,
      shortCode,
      name: val('getName', undefined),
      countries: val('getCountries', undefined),
      variant: val('getVariant', null),
      spellcheckOnly: val('isSpellcheckOnlyLanguage', false),
      commonWordsPath: lookup(classes, cls, 'getCommonWordsPath') === null ? `${shortCode}/common_words.txt` : val('getCommonWordsPath', null),
      dv: defaultVariant(classes, cls),
    };
    for (const k of ['shortCode', 'name', 'countries']) if (d[k] === undefined) throw new Error(`${fqcn}: no ${k}`);
    list.push(d);
  }
  for (const d of list) {
    d.code = longCode(d);
  }
  for (const d of list) {
    d.defaultVariant = d.dv.self ? d.code : longCode(resolveCode(list, d.dv.code));
    delete d.dv;
  }
  return list;
}
