// Best-effort static extraction of regex literals from Java sources (used by harvest-regex.mjs).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const FLAG = { UNIX_LINES: 1, CASE_INSENSITIVE: 2, COMMENTS: 4, MULTILINE: 8, LITERAL: 16, DOTALL: 32, UNICODE_CASE: 64, CANON_EQ: 128, UNICODE_CHARACTER_CLASS: 256 };

export function walk(dir, ext, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, ext, out); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

// Removes comments, keeps string literals intact.
export function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1;
    } else if (c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2); const seg = src.slice(i, e + 2);
      out += seg.replace(/[^\n]/g, ' '); i = e + 2;
    } else { out += c; i++; }
  }
  return out;
}

export function unescapeJava(s) {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') { r += s[i]; continue; }
    const n = s[++i];
    if (n === 'n') r += '\n'; else if (n === 't') r += '\t'; else if (n === 'r') r += '\r'; else if (n === 'b') r += '\b';
    else if (n === 'f') r += '\f'; else if (n === 's') r += ' '; else if (n === '"' || n === "'" || n === '\\') r += n;
    else if (n === 'u') { while (s[i + 1] === 'u') i++; r += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16)); i += 4; }
    else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(s[i + 1] ?? '') && parseInt(o + s[i + 1], 8) < 256) o += s[++i]; r += String.fromCharCode(parseInt(o, 8)); }
    else r += '\\' + n;
  }
  return r;
}

// Splits "a, b, c" at top-level commas starting after an open paren at pos; returns {args, end}.
export function parseArgs(src, pos) {
  const args = []; let depth = 0; let cur = ''; let i = pos;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1; cur += src.slice(i, j + 1); i = j; continue; }
    if (c === "'") { let j = i + 1; while (j < src.length && src[j] !== "'") j += src[j] === '\\' ? 2 : 1; cur += src.slice(i, j + 1); i = j; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') { if (depth === 0) { args.push(cur.trim()); return { args, end: i }; } depth--; }
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  return { args, end: i };
}

// Evaluates "lit" + CONST + "lit" using constants; returns string or null.
export function evalString(expr, consts) {
  const toks = []; let i = 0;
  expr = expr.trim();
  const fm = /^String\.format\s*\(/.exec(expr);
  if (fm) {
    const { args, end } = parseArgs(expr, fm[0].length);
    if (end !== expr.length - 1) return null;
    const fmt = evalString(args[0], consts);
    const vals = args.slice(1).map((a) => evalString(a, consts));
    if (fmt === null || vals.some((v) => v === null)) return null;
    let k = 0; let bad = false;
    const out = fmt.replace(/%(%|s)/g, (_, c) => { if (c === '%') return '%'; if (k >= vals.length) { bad = true; return ''; } return vals[k++]; });
    return bad || /%[^%]/.test(out.replace(/%%/g, '')) && false ? null : out;
  }
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') { let j = i + 1; while (j < expr.length && expr[j] !== '"') j += expr[j] === '\\' ? 2 : 1; toks.push({ s: unescapeJava(expr.slice(i + 1, j)) }); i = j + 1; continue; }
    if (c === '+') { toks.push('+'); i++; continue; }
    if (c === '(' || c === ')') { toks.push(c); i++; continue; }
    const m = /^[A-Za-z_][A-Za-z_0-9.]*/.exec(expr.slice(i));
    if (m) { toks.push({ id: m[0] }); i += m[0].length; continue; }
    return null;
  }
  let out = ''; let expectOperand = true;
  for (const t of toks) {
    if (t === '+') { if (expectOperand) return null; expectOperand = true; continue; }
    if (t === '(' || t === ')') continue;
    if (!expectOperand) return null;
    if (t.s !== undefined) out += t.s;
    else { const name = t.id.split('.').pop(); if (!consts.has(name) || consts.get(name) === null) return null; out += consts.get(name); }
    expectOperand = false;
  }
  return expectOperand ? null : out;
}

export function evalFlags(expr) {
  if (expr === undefined || expr === '') return 0;
  let v = 0;
  for (const part of expr.split('|')) {
    const t = part.trim().replace(/^Pattern\./, '');
    if (/^\d+$/.test(t)) v |= parseInt(t, 10);
    else if (t in FLAG) v |= FLAG[t];
    else return null;
  }
  return v;
}

export function collectConsts(src) {
  const consts = new Map();
  const re = /\bString\s+([A-Za-z_][A-Za-z_0-9]*)\s*=\s*([^;]*);/g;
  let m;
  const pending = [];
  while ((m = re.exec(src))) pending.push([m[1], m[2]]);
  for (let round = 0; round < 4; round++) for (const [n, e] of pending) { const v = evalString(e, consts); if (v !== null) consts.set(n, v); }
  return consts;
}

// returns {found:[{kind,pattern,flags,file,line}], dynamic:[{kind,expr,file,line}]}
export function scanFile(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  const consts = collectConsts(src);
  const found = []; const dynamic = [];
  const re = /(Pattern\.compile|Pattern\.matches|\.matches|\.split|\.replaceAll|\.replaceFirst)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const kindRaw = m[1];
    const { args } = parseArgs(src, m.index + m[0].length);
    if (!args.length || args[0] === '') continue;
    const line = src.slice(0, m.index).split('\n').length;
    const kind = kindRaw.replace(/^\./, '').replace('Pattern.', 'Pattern.');
    // library calls with non-regex first arg (e.g. List.split) are filtered by requiring a string-ish first arg
    const pat = evalString(args[0], consts);
    let flags = 0;
    if (kindRaw === 'Pattern.compile') flags = args.length > 1 ? evalFlags(args[1]) : 0;
    if (pat === null) {
      if (kindRaw === 'Pattern.compile' || kindRaw === 'Pattern.matches') dynamic.push({ kind, expr: args[0].slice(0, 120), file, line });
      continue;
    }
    if (flags === null) { dynamic.push({ kind, expr: args.join(', ').slice(0, 160), file, line }); continue; }
    found.push({ kind, pattern: pat, flags, file, line });
  }
  // PatternRuleBuilderHelper / PatternTokenBuilder / AnalyzedTokenReadings helpers with literal regex args
  const CI = FLAG.CASE_INSENSITIVE | FLAG.UNICODE_CASE;
  const helpers = { tokenRegex: ['java-tokenRegex', CI], regex: ['java-tokenRegex', CI], csRegex: ['java-csRegex', 0], csTokenRegex: ['java-csRegex', 0], posRegex: ['java-posRegex', 0], matchesPosTagRegex: ['java-matchesPosTagRegex', 0] };
  const hre = /(?<![A-Za-z_0-9])(?:\.\s*)?(tokenRegex|regex|csRegex|csTokenRegex|posRegex|posRegexWithStringException|matchesPosTagRegex)\s*\(/g;
  while ((m = hre.exec(src))) {
    const name = m[1];
    const before = src.slice(Math.max(0, m.index - 12), m.index);
    if (/(\bString|\bvoid|\bPattern|\bboolean|\bstatic\s+\w+)\s+$/.test(before)) continue; // declaration
    const { args } = parseArgs(src, m.index + m[0].length);
    const line = src.slice(0, m.index).split('\n').length;
    const lit = (a) => (a === undefined ? null : evalString(a, consts));
    if (name === 'posRegexWithStringException') {
      const a0 = lit(args[0]); const a1 = lit(args[1]);
      if (a0 !== null) found.push({ kind: 'java-posRegex', pattern: a0, flags: 0, file, line });
      if (a1 !== null) found.push({ kind: 'java-tokenRegex-exception', pattern: a1, flags: CI, file, line });
      continue;
    }
    const [kind, fl] = helpers[name];
    const v = lit(args[0]);
    if (v === null) { if (name !== 'regex') dynamic.push({ kind, expr: (args[0] ?? '').slice(0, 120), file, line }); continue; }
    found.push({ kind, pattern: v, flags: fl, file, line });
  }
  const pt = /new\s+PatternToken\s*\(/g;
  while ((m = pt.exec(src))) {
    const { args } = parseArgs(src, m.index + m[0].length);
    if (args.length === 4 && args[2] === 'true') {
      const v = evalString(args[0], consts);
      const line = src.slice(0, m.index).split('\n').length;
      if (v !== null && (args[1] === 'true' || args[1] === 'false')) found.push({ kind: 'java-new-PatternToken', pattern: v, flags: args[1] === 'true' ? 0 : CI, file, line });
    }
  }
  return { found, dynamic };
}
