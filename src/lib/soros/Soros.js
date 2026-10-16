// Java: org.languagetool.synthesis.Soros (Soros interpreter, numbertext.org, 2009-2010 (c) Laszlo Nemeth, LGPL/BSD)
import { Pattern } from '../java/regex/Pattern.js';
import { javaReplaceAll, javaReplaceFirst, javaSplit } from '../java/regex/index.js';
import { javaReplace } from '../java/strings.js';

const m = '\\";#';
const m2 = '$()|[]';
const c = '\uE000\uE001\uE002\uE003';
const c2 = '\uE004\uE005\uE006\uE007\uE008\uE009';
const slash = '\uE000';
const pipe = '\uE003';

// Java: Soros#translate(String,String,String,String)
function translate(s, chars, chars2, delim) {
  for (let i = 0; i < chars.length; i++) {
    s = javaReplace(s, delim + chars.charAt(i), '' + chars2.charAt(i));
  }
  return s;
}

// pattern to recognize function calls in the replacement string
const func = Pattern.compile(translate(
  '(?:\\|?(?:\\$\\()+)?' + // optional nested calls
  '(\\|?\\$\\(([^\\(\\)]*)\\)\\|?)' + // inner call (2 subgroups)
  '(?:\\)+\\|?)?', // optional nested calls
  m2.substring(0, c.length), c, '\\')); // \$, \(, \), \| -> \uE000..\uE003

// Java: Soros
export class Soros {
  static FQCN = 'org.languagetool.synthesis.Soros';

  // Java: Soros#Soros(String,String)
  constructor(source, lang) {
    this.patterns = [];
    this.values = [];
    this.begins = [];
    this.ends = [];
    this.numbertext = false;
    source = translate(source, m, c, '\\'); // \\, \", \;, \# -> \uE000..\uE003
    // switch off all country-dependent lines, and switch on the requested ones
    source = javaReplaceAll(javaReplaceAll(javaReplaceAll(source, '(^|[\n;])([^\n;#]*#[^\n]*\\[:[^\n:\\]]*:][^\n]*)', '$1#$2'),
      '(^|[\n;])#([^\n;#]*#[^\n]*\\[:' + javaReplace(lang, '_', '-') + ':][^\n]*)', '$1$2'),
    '(#[^\n]*)?(\n|$)', ';'); // remove comments
    if (source.indexOf('__numbertext__') === -1) {
      source = '__numbertext__;' + source;
    }
    source = javaReplace(source, '__numbertext__',
      // default left zero deletion
      '"([a-z][-a-z]* )?0+(0|[1-9]\\d*)" $(\\1\\2);' +
      // separator function
      '"\uE00A(.*)\uE00A(.+)\uE00A(.*)" \\1\\2\\3;' +
      // no separation, if subcall returns with empty string
      '"\uE00A.*\uE00A\uE00A.*"');

    const p = Pattern.compile('^\\s*("[^"]*"|[^\\s]*)\\s*(.*[^\\s])?\\s*$');
    const macro = Pattern.compile('== *(.*[^ ]?) ==');
    let prefix = '';
    for (let s of javaSplit(source, ';')) {
      const matchmacro = macro.matcher(s);
      if (matchmacro.matches()) {
        prefix = matchmacro.group(1);
        continue;
      }
      let sp = p.matcher(s);
      if (prefix !== '' && s !== '' && sp.matches()) {
        s = javaReplaceFirst(javaReplaceFirst(sp.group(1), '^"', ''), '"$', '');
        s = '"' + (s.startsWith('^') ? '^' : '') + prefix + (s === '' ? '' : ' ') +
          javaReplaceFirst(s, '^\\^', '') + '" ' + sp.group(2);
        sp = p.matcher(s);
      }
      if (s !== '' && sp.matches()) {
        s = translate(javaReplaceFirst(javaReplaceFirst(sp.group(1), '^"', ''), '"$', ''),
          c.substring(1), m.substring(1), '');
        s = javaReplace(s, slash, '\\\\'); // -> \\, ", ;, #
        let s2 = '';
        if (sp.group(2) !== null) s2 = javaReplaceFirst(javaReplaceFirst(sp.group(2), '^"', ''), '"$', '');
        s2 = translate(s2, m2, c2, '\\'); // \$, \(, \), \|, \[, \] -> \uE004..\uE009
        // call inner separator: [ ... $1 ... ] -> $(\uE00A ... \uE00A$1\uE00A ... )
        s2 = javaReplaceAll(s2, '^\\[[$](\\d\\d?|\\([^\\)]+\\))', '\\$(\uE00A\uE00A|\\$$1\uE00A'); // add "|"
        s2 = javaReplaceAll(s2, '\\[([^$\\[\\\\]*)[$](\\d\\d?|\\([^\\)]+\\))', '\\$(\uE00A$1\uE00A\\$$2\uE00A');
        s2 = javaReplaceAll(s2, '\uE00A\\]$', '|\uE00A)'); // add "|" in terminating position
        s2 = javaReplace(s2, ']', ')');
        s2 = javaReplaceAll(s2, '(\\$\\d|\\))\\|\\$', '$1||\\$'); // $()|$() -> $()||$()
        s2 = translate(s2, c, m, ''); // \uE000..\uE003-> \, ", ;, #
        s2 = translate(s2, m2.substring(0, c.length), c, ''); // $, (, ), | -> \uE000..\uE003
        s2 = translate(s2, c2, m2, ''); // \uE004..\uE009 -> $, (, ), |, [, ]
        s2 = javaReplaceAll(s2, '[$]', '\\$'); // $ -> \$
        s2 = javaReplaceAll(s2, '\uE000(\\d)', '\uE000\uE001\\$$1\uE002'); // $n -> $(\n)
        s2 = javaReplaceAll(s2, '\\\\(\\d)', '\\$$1'); // \[n] -> $[n]
        s2 = javaReplace(s2, '\\n', '\n'); // \n -> [new line]
        this.patterns.push(Pattern.compile('^' + javaReplaceFirst(javaReplaceFirst(s, '^\\^', ''), '\\$$', '') + '$'));
        this.begins.push(s.startsWith('^'));
        this.ends.push(s.endsWith('$'));
        this.values.push(s2);
      }
    }
  }

  // Java: Soros#run(String) / run(String,boolean,boolean)
  run(input, begin = true, end = true) {
    for (let i = 0; i < this.patterns.length; i++) {
      if ((!begin && this.begins[i]) || (!end && this.ends[i])) continue;
      const mm = this.patterns[i].matcher(input);
      if (!mm.matches()) continue;
      let s = mm.replaceAll(this.values[i]);
      let n = func.matcher(s);
      while (n.find()) {
        let b = false;
        let e = false;
        if (n.group(1).startsWith(pipe) || n.group().startsWith(pipe)) b = true;
        else if (n.start() === 0) b = begin;
        if (n.group(1).endsWith(pipe) || n.group().endsWith(pipe)) e = true;
        else if (n.end() === s.length) e = end;
        s = s.substring(0, n.start(1)) + this.run(n.group(2), b, e) + s.substring(n.end(1));
        n = func.matcher(s);
      }
      return s;
    }
    return '';
  }
}
