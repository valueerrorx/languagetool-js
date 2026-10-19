// opennlp.tools.postag.POSDictionary (case sensitive, tags.tagdict XML read through DictionaryEntryPersistor).
import { IOException } from '../java/errors.js';
import { javaTrim } from '../java/strings.js';

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// Java: SAX entity resolution of attribute values and character data
function unescape(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITY[e] ?? m;
  });
}

// Java: opennlp.tools.postag.POSDictionary
export class POSDictionary {
  static FQCN = 'opennlp.tools.postag.POSDictionary';

  // Java: POSDictionary#POSDictionary()
  constructor() {
    this.dictionary = new Map();
    this.caseSensitive = true;
  }

  // Java: POSDictionary#getTags(String)
  getTags(word) {
    return this.dictionary.get(word) ?? null;
  }

  // Java: POSDictionary#create(InputStream) (DictionaryEntryPersistor SAX handler; entry = tags attribute + exactly one token)
  static create(buf) {
    const text = buf.toString('utf8');
    const d = new POSDictionary();
    const head = /<dictionary(\s[^>]*)?>/.exec(text);
    if (head === null) throw new IOException('Invalid dictionary format!');
    const cs = /case_sensitive="([^"]*)"/.exec(head[1] ?? '');
    d.caseSensitive = cs === null ? true : unescape(cs[1]).toLowerCase() === 'true';
    if (!d.caseSensitive) throw new IOException('case_sensitive=false tag dictionaries are not used by LanguageTool');
    const re = /<entry\s+tags="([^"]*)"\s*>\s*<token>([^<]*)<\/token>\s*<\/entry>/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const tags = unescape(m[1]).split(' ');
      d.dictionary.set(javaTrim(unescape(m[2])), tags);
    }
    return d;
  }
}
