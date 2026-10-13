// Detects Java regex constructs in a pattern string (heuristic tokenizer, tracks character classes).
export function constructs(pat, flags = 0) {
  const c = new Set();
  const n = pat.length;
  let i = 0; let cls = 0; // class nesting depth
  const ci = (flags & 2) !== 0;
  let inlineI = false; let hasBackref = false;
  while (i < n) {
    const ch = pat[i];
    if (ch === '\\') {
      const nx = pat[i + 1];
      if (nx === undefined) { c.add('trailing-backslash'); i++; continue; }
      if (nx === 'Q') { c.add('\\Q..\\E'); const e = pat.indexOf('\\E', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (nx === 'p' || nx === 'P') {
        let name;
        if (pat[i + 2] === '{') { const e = pat.indexOf('}', i + 3); name = pat.slice(i + 3, e < 0 ? n : e); i = e < 0 ? n : e + 1; } else { name = pat[i + 2]; i += 3; }
        c.add(`\\${nx}{${name}}`); c.add(nx === 'p' ? '\\p{..}' : '\\P{..}');
        if (/^(In|block=|blk=)/.test(name)) c.add('\\p{InBlock}');
        else if (/^(script=|sc=|Is[A-Z][a-z]+$)/.test(name) && !/^Is(Alphabetic|Letter|Digit|Uppercase|Lowercase|Punctuation|White_?Space|Ideographic|Control|Hex_Digit|Assigned|Emoji.*|Titlecase|Noncharacter_Code_Point|Join_Control|Cased)$/i.test(name)) c.add('\\p{IsScript}');
        continue;
      }
      if (/[1-9]/.test(nx)) { c.add('backreference \\n'); hasBackref = true; i += 2; continue; }
      if (nx === 'k') { c.add('named backreference \\k<>'); hasBackref = true; i += 2; continue; }
      if (nx === 'u') { c.add('\\uXXXX'); i += 6; continue; }
      if (nx === 'x') { c.add(pat[i + 2] === '{' ? '\\x{h..h}' : '\\xhh'); i += 2; continue; }
      if (nx === '0') { c.add('\\0octal'); i += 2; continue; }
      if (nx === 'c') { c.add('\\cX'); i += 3; continue; }
      if ('bB'.includes(nx)) { c.add('\\' + nx); i += 2; continue; }
      if ('AzZG'.includes(nx)) { c.add('\\' + nx); i += 2; continue; }
      if ('hHvVRXN'.includes(nx)) { c.add('\\' + nx); i += 2; continue; }
      if ('wWdDsS'.includes(nx)) { c.add('\\' + nx + (cls ? ' (in class)' : '')); i += 2; continue; }
      if ('tnrfae'.includes(nx)) { c.add('\\' + nx); i += 2; continue; }
      i += 2; continue;
    }
    if (cls) {
      if (ch === '[') { c.add('nested class'); cls++; i++; continue; }
      if (ch === ']') { cls--; i++; continue; }
      if (ch === '&' && pat[i + 1] === '&') { c.add('class intersection &&'); i += 2; continue; }
      if (ch === '^' && pat[i - 1] === '[') c.add('negated class');
      if (ch === '-' && pat[i + 1] === '[' ) c.add('class subtraction/union with nested');
      i++; continue;
    }
    if (ch === '[') { cls = 1; c.add('char class'); i++; continue; }
    if (ch === '(') {
      if (pat[i + 1] === '?') {
        const rest = pat.slice(i + 2, i + 8);
        if (rest[0] === ':') c.add('non-capturing group');
        else if (rest[0] === '=') c.add('lookahead (?=');
        else if (rest[0] === '!') c.add('negative lookahead (?!');
        else if (rest[0] === '>') c.add('atomic group (?>');
        else if (rest.startsWith('<=')) c.add('lookbehind (?<=');
        else if (rest.startsWith('<!')) c.add('negative lookbehind (?<!');
        else if (rest[0] === '<') c.add('named group (?<n>');
        else if (rest[0] === '#') c.add('comment (?#');
        else {
          const m = /^([a-zA-Z]*)(?:-([a-zA-Z]*))?([:)])/.exec(pat.slice(i + 2));
          if (m) {
            c.add(m[3] === ')' ? 'inline flags (?x)' : 'scoped inline flags (?x:...)');
            for (const f of (m[1] + (m[2] ? '-' + m[2] : ''))) if (/[a-zA-Z-]/.test(f)) c.add(`inline flag ${f}`);
            if (m[1].includes('i')) inlineI = true;
            if (m[2]) c.add('inline flag negation (?-x)');
            if (m[3] === ')' && i > 0) c.add('inline flags not at pattern start');
          } else c.add('unparsed (? construct');
        }
      } else c.add('capturing group');
      i++; continue;
    }
    if (ch === '|') { c.add('alternation'); i++; continue; }
    if (ch === '*' || ch === '+' || ch === '?') {
      const nx = pat[i + 1];
      if (nx === '+') c.add('possessive quantifier');
      else if (nx === '?' && ch !== '?') c.add('lazy quantifier');
      else if (nx === '?' && ch === '?' && pat[i - 1] !== '(') c.add('lazy ??');
      i++; continue;
    }
    if (ch === '{') {
      const m = /^\{(\d+)(,(\d*))?\}([+?])?/.exec(pat.slice(i));
      if (m) { c.add('counted quantifier {n,m}'); if (m[4] === '+') c.add('possessive quantifier'); if (m[4] === '?') c.add('lazy quantifier'); i += m[0].length; continue; }
      c.add('literal { (not a quantifier)'); i++; continue;
    }
    if (ch === '.') c.add('dot');
    else if (ch === '^') c.add('^ anchor');
    else if (ch === '$') c.add('$ anchor');
    else if (ch === '}') c.add('literal }');
    else if (ch === ')') { /* close */ }
    else if (ch === ' ' && (flags & 4)) c.add('whitespace under COMMENTS');
    else if (ch.charCodeAt(0) > 127) c.add('non-ASCII literal');
    i++;
  }
  if (hasBackref && (ci || inlineI)) c.add('backreference under case-insensitive');
  if (flags & 2) c.add('flag CASE_INSENSITIVE'); if (flags & 64) c.add('flag UNICODE_CASE'); if (flags & 256) c.add('flag UNICODE_CHARACTER_CLASS');
  if (flags & 32) c.add('flag DOTALL'); if (flags & 8) c.add('flag MULTILINE'); if (flags & 16) c.add('flag LITERAL'); if (flags & 4) c.add('flag COMMENTS'); if (flags & 1) c.add('flag UNIX_LINES');
  return c;
}
