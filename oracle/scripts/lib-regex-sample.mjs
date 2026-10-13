// Crude generator of a string a Java regex would (probably) match; only used to pick fixture inputs (expected values still come from Java).
export function sample(pat, mode = 'first') {
  let i = 0;
  const n = pat.length;
  function alt(depth) {
    const branches = [];
    let cur = '';
    while (i < n) {
      const ch = pat[i];
      if (ch === ')') { if (depth > 0) break; i++; continue; }
      if (ch === '|') { branches.push(cur); cur = ''; i++; continue; }
      cur += atomQ();
    }
    branches.push(cur);
    return mode === 'first' ? branches[0] : branches[branches.length - 1];
  }
  function atomQ() {
    const a = atom();
    let min = 1; let max = 1;
    const ch = pat[i];
    if (ch === '*') { min = 0; max = 1; i++; } else if (ch === '+') { min = 1; max = 1; i++; } else if (ch === '?') { min = 0; max = 1; i++; } else if (ch === '{') {
      const m = /^\{(\d+)(?:,(\d*))?\}/.exec(pat.slice(i));
      if (m) { min = +m[1]; max = Math.max(min, 1); i += m[0].length; if (mode !== 'first' && m[2] !== undefined) min = Math.max(min, Math.min(m[2] === '' ? min + 1 : +m[2], 3)); }
    }
    if (pat[i] === '?' || pat[i] === '+') i++;
    const cnt = mode === 'first' ? min : Math.max(min, max);
    return a.repeat(Math.min(cnt, 40));
  }
  function esc() {
    const c = pat[i + 1]; i += 2;
    if (c === undefined) return '';
    if (c === 'd') return '1'; if (c === 'D') return 'x'; if (c === 'w') return 'a'; if (c === 'W') return '-';
    if (c === 's') return ' '; if (c === 'S') return 'x'; if (c === 'h') return ' '; if (c === 'R') return '\n';
    if (c === 't') return '\t'; if (c === 'n') return '\n'; if (c === 'r') return '\r'; if (c === 'f') return '\f';
    if ('bBAzZG'.includes(c)) return '';
    if (c === 'p' || c === 'P') {
      let name;
      if (pat[i] === '{') { const e = pat.indexOf('}', i); name = pat.slice(i + 1, e); i = e + 1; } else { name = pat[i]; i++; }
      const neg = c === 'P';
      const m = { Lu: 'A', Ll: 'a', L: 'a', P: '.', Punct: '.', Alpha: 'a', Nd: '1', N: '1', Zs: ' ', Ps: '(', C: '\u0001', IsPunctuation: '.', javaLowerCase: 'a' }[name] ?? 'a';
      return neg ? (m === 'a' ? '1' : 'a') : m;
    }
    if (c === 'u') { const h = pat.slice(i, i + 4); i += 4; return String.fromCharCode(parseInt(h, 16) || 0x78); }
    if (c === 'Q') { const e = pat.indexOf('\\E', i); const s = pat.slice(i, e < 0 ? n : e); i = e < 0 ? n : e + 2; return s; }
    if (/[0-9]/.test(c)) return '';
    return c;
  }
  function cls() {
    i++; // [
    let neg = false;
    if (pat[i] === '^') { neg = true; i++; }
    let first = null; let depth = 1; const lits = [];
    while (i < n && depth > 0) {
      const ch = pat[i];
      if (ch === ']' && lits.length + (first ? 1 : 0) >= 0 && !(i === 0)) { depth--; i++; if (depth === 0) break; continue; }
      if (ch === '[') { depth++; i++; continue; }
      if (ch === '&' && pat[i + 1] === '&') { i += 2; continue; }
      if (ch === '\\') { lits.push(esc()); continue; }
      lits.push(ch); i++;
    }
    const picks = lits.filter((x) => x && !/^[-^&]$/.test(x));
    if (neg) { for (const cand of ['x', 'q', '1', 'Z']) if (!picks.includes(cand)) return cand; return 'x'; }
    first = picks[0] ?? 'a';
    return mode === 'first' ? first : (picks[picks.length - 1] ?? first);
  }
  function atom() {
    const ch = pat[i];
    if (ch === '\\') return esc();
    if (ch === '[') return cls();
    if (ch === '(') {
      i++;
      let look = false;
      if (pat[i] === '?') {
        const rest = pat.slice(i + 1, i + 4);
        if (rest[0] === '=' || rest[0] === '!' || rest.startsWith('<=') || rest.startsWith('<!')) look = true;
        const m = /^\?(?:[a-zA-Z-]*[:)]|:|>|<[A-Za-z][A-Za-z0-9]*>)/.exec(pat.slice(i));
        if (!look) { if (m) { i += m[0].length; if (m[0].endsWith(')')) return ''; } else { i += 1; } } else i += rest[0] === '<' ? 3 : 2;
      }
      const s = alt(1);
      if (pat[i] === ')') i++;
      return look ? '' : s;
    }
    if (ch === '.') { i++; return 'x'; }
    if (ch === '^' || ch === '$') { i++; return ''; }
    i++;
    return ch;
  }
  try { return alt(0); } catch { return ''; }
}
