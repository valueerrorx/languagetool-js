// org.languagetool.rules.de.LineExpander (expand spelling lines by suffix flags, e.g. foo/S -> foo, foos)
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';
import { uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { Character } from '../../../lib/java/Character.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { IllegalArgumentException, RuntimeException } from '../../../lib/java/errors.js';
import { javaReplace, javaReplaceAll, javaSplit, javaTrim } from '../../../lib/java/strings.js';

const verbFormCache = new Map(); // Java: LineExpander#verbFormCache (Guava LoadingCache; the 10 minute expiry is not observable)

// Java: LineExpander#verbFormCache CacheLoader#load(String)
function loadVerbForms(verb) {
  if (!verbFormCache.has(verb)) {
    verbFormCache.set(verb, GermanSynthesizer.INSTANCE.synthesizeForPosTags(verb, (s) => s.startsWith('VER:')));
  }
  return verbFormCache.get(verb);
}

// Java: LineExpander#cleanTagsAndEscapeChars(String) (ignore "#..." so it can be used as a tag)
function cleanTagsAndEscapeChars(s) {
  const idx = s.indexOf('#');
  if (idx !== -1) {
    s = s.substring(0, idx);
  }
  return javaTrim(javaReplace(s, '\\', ''));
}

// Java: LineExpander#handleLineWithPrefix(String)
function handleLineWithPrefix(line) {
  const result = [];
  const parts = javaSplit(cleanTagsAndEscapeChars(line), '_');
  if (parts.length !== 2) {
    throw new IllegalArgumentException(`Unexpected line format, expected at most one '_': ${line}`);
  }
  if (parts[0].includes('/') || parts[1].includes('/')) {
    throw new IllegalArgumentException(`Unexpected line format, '_' cannot be combined with '/': ${line}`);
  }
  if (parts[1] === 'in') {
    // special case for the common gender gap characters:
    result.push(`${parts[0]}_in`);
    result.push(`${parts[0]}_innen`);
    result.push(`${parts[0]}*in`);
    result.push(`${parts[0]}*innen`);
    result.push(`${parts[0]}:in`);
    result.push(`${parts[0]}:innen`);
  } else {
    const forms = loadVerbForms(parts[1]);
    if (forms.length === 0) {
      throw new RuntimeException(`Could not expand '${parts[1]}' from line '${line}', no forms found`);
    }
    const formSet = new JavaHashSet(forms);
    for (const form of formSet) {
      if (!form.includes('ß') && form.length > 0 && Character.isLowerCase(form.charCodeAt(0))) {
        // skip these, it's too risky to introduce old spellings like "gewußt" from the synthesizer
        result.push(parts[0] + form);
      }
    }
    result.push(`${parts[0]}zu${parts[1]}`); //  "zu<verb>" is not part of forms from synthesizer
    result.push(`${uppercaseFirstChar(parts[0])}${parts[1]}s`); //  Genitiv, e.g. "des Weitergehens"
  }
  return result;
}

// Java: LineExpander#add(List,String)
function add(result, word) {
  if (!result.includes(word)) {
    result.push(word);
  }
}

// Java: LineExpander (implements org.languagetool.rules.LineExpander)
export class LineExpander {
  static FQCN = 'org.languagetool.rules.de.LineExpander';

  // Java: LineExpander#expandLine(String)
  expandLine(line) {
    return this.isLineWithVerbPrefix(line) ? handleLineWithPrefix(line)
      : this.isLineWithFlag(line) ? this.handleLineWithFlags(line)
        : [cleanTagsAndEscapeChars(line)];
  }

  // Java: LineExpander#isLineWithFlag(String)
  isLineWithFlag(line) {
    const idx = line.indexOf('/');
    return !line.startsWith('#') && idx > 0 && line.charAt(idx - 1) !== '\\';
  }

  // Java: LineExpander#isLineWithVerbPrefix(String)
  isLineWithVerbPrefix(line) {
    const idx = line.indexOf('_');
    return !line.startsWith('#') && idx > 0 && line.charAt(idx - 1) !== '\\';
  }

  // Java: LineExpander#handleLineWithFlags(String)
  handleLineWithFlags(line) {
    const result = [];
    const parts = javaSplit(cleanTagsAndEscapeChars(line), '/');
    if (parts.length !== 2) {
      throw new IllegalArgumentException(`Unexpected line format, expected at most one slash: ${line}`);
    }
    const word = parts[0];
    const suffix = parts[1];
    for (let i = 0; i < suffix.length; i++) {
      const c = suffix.charAt(i);
      if (c === 'S') {
        add(result, word);
        result.push(`${word}s`);
      } else if (c === 'N') {
        add(result, word);
        result.push(`${word}n`);
      } else if (c === 'E') {
        add(result, word);
        result.push(`${word}e`);
      } else if (c === 'F') {
        add(result, word);
        result.push(`${word}in`); // (m/f)
      } else if (c === 'T') {
        add(result, word);
        if (word.endsWith('straße') || word.endsWith('strasse')) {
          result.push(javaReplaceAll(word, 'stra(ß|ss)e', 'str.'));
        }
        if (word.endsWith('Straße') || word.endsWith('Strasse')) {
          result.push(javaReplaceAll(word, 'Stra(ß|ss)e', 'Str.'));
        }
      } else if (c === 'A' || c === 'P') { // Adjektiv / Partizip
        add(result, word);
        if (word.endsWith('e')) {
          result.push(`${word}r`);
          result.push(`${word}s`);
          result.push(`${word}n`);
          result.push(`${word}m`);
        } else {
          result.push(`${word}e`);
          result.push(`${word}er`);
          result.push(`${word}es`);
          result.push(`${word}en`);
          result.push(`${word}em`);
        }
      } else {
        throw new IllegalArgumentException(`Unknown suffix: ${suffix} in line: ${line}`);
      }
    }
    return result;
  }
}
