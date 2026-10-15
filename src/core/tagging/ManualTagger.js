// Java: org.languagetool.tagging.ManualTagger
import { decodeUtf8, readerLines } from '../../lib/java/io.js';
import { javaSplit, javaTrim } from '../../lib/java/strings.js';
import { RuntimeException, IOException, NullPointerException } from '../../lib/java/errors.js';
import { isEmpty } from '../text/StringTools.js';
import { TaggedWord } from './TaggedWord.js';

const DEFAULT_SEPARATOR = '\t';

// Java: ManualTagger#loadMapping(InputStream,boolean)
function loadMapping(inputStream) {
  if (inputStream === null || inputStream === undefined) throw new NullPointerException();
  const map = new Map();
  let lineCount = 0;
  let separator = DEFAULT_SEPARATOR;
  for (let line of readerLines(decodeUtf8(inputStream))) {
    line = javaTrim(line);
    lineCount++;
    if (line.startsWith('#separatorRegExp=')) {
      separator = line.replaceAll('#separatorRegExp=', '');
    }
    if (isEmpty(line) || line.charAt(0) === '#') {
      continue;
    }
    if (line.includes(' ')) {
      throw new RuntimeException(`Non-breaking space found in line #${lineCount}: '${line}', please remove it`);
    }
    const hash = line.indexOf('#');
    line = javaTrim(hash < 0 ? line : line.substring(0, hash));
    const parts = javaSplit(line, separator);
    if (parts.length !== 3) {
      throw new IOException(`Unknown line format in line ${lineCount} when loading manual tagger dictionary, expected three tab-separated fields: '${line}'`);
    }
    const form = parts[0];
    const lemma = parts[1];
    const tag = javaTrim(parts[2]);
    if (!map.has(form)) map.set(form, []);
    map.get(form).push(new TaggedWord(lemma, tag));
  }
  return map;
}

export class ManualTagger {
  static FQCN = 'org.languagetool.tagging.ManualTagger';

  // Java: ManualTagger#ManualTagger(InputStream) / (InputStream,boolean); interning is not observable
  constructor(inputStream, internTags = false) {
    this.map = loadMapping(inputStream);
  }

  // Java: ManualTagger#tag(String)
  tag(word) {
    const v = this.map.get(word);
    return v === undefined ? [] : v.map((tw) => new TaggedWord(tw.getLemma(), tw.getPosTag()));
  }
}
