// JS twin of harness op "sax-dump" (XmlOps#saxDump) on src/core/resources/xml.js.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXml, parserOptions, SAXParseException } from '../../src/core/resources/xml.js';
import { RESOURCES_ROOT } from '../../src/core/resources/ResourceDataBroker.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { FileNotFoundException } from '../../src/lib/java/errors.js';

// Java: String#getBytes(UTF_8) replaces unpaired surrogates with '?'
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Java resolves relative system ids against user.dir = the oracle work dir; recorded in the golden meta
function baseDir() {
  const f = path.join(ROOT, 'tests/golden/X-XML/sax-synthetic/meta.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).workDir : process.cwd();
}

// Java: XmlOps#err(Throwable)
function err(t) {
  const e = { class: t.javaClass ?? t.constructor.name, message: t.getMessage?.() ?? t.message ?? null };
  if (t instanceof SAXParseException) {
    e.line = t.getLineNumber();
    e.column = t.getColumnNumber();
  }
  const causes = [];
  for (let c = t.getCause?.() ?? null; c && causes.length < 10; c = c.getCause?.() ?? null) causes.push(err(c));
  if (causes.length > 0) e.causes = causes;
  return e;
}

// Java: XmlOps#esc(String)
function esc(s) {
  return s.replace(/[\\\t\n\r]/g, (c) => (c === '\\' ? '\\\\' : c === '\t' ? '\\t' : c === '\n' ? '\\n' : '\\r'));
}

const sortedObj = (m) => Object.fromEntries([...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));

// Java: XmlOps.Digester
class Digester {
  constructor() {
    this.md = createHash('sha256');
    this.first = [];
    this.elements = new Map();
    this.attrNames = new Map();
    this.events = 0;
    this.attrs = 0;
    this.textNodes = 0;
    this.textChars = 0;
    this.depth = 0;
    this.maxDepth = 0;
  }

  // Java: XmlOps.Digester#emit(String)
  emit(line) {
    this.events++;
    if (this.first.length < 200) this.first.push(line.length > 300 ? `${line.substring(0, 300)}...[len=${line.length}]` : line);
    this.md.update(Buffer.from(`${line.replace(LONE_SURROGATE, '?')}\n`, 'utf8'));
  }

  // Java: XmlOps.Digester#startElement
  startElement(qName, atts) {
    const sorted = new Map();
    for (let i = 0; i < atts.getLength(); i++) sorted.set(atts.getQName(i), atts.getValue(i));
    let b = `S\t${qName}`;
    for (const k of [...sorted.keys()].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))) {
      b += `\t${k}=${esc(sorted.get(k))}`;
      this.attrNames.set(k, (this.attrNames.get(k) ?? 0) + 1);
    }
    this.attrs += sorted.size;
    this.elements.set(qName, (this.elements.get(qName) ?? 0) + 1);
    if (++this.depth > this.maxDepth) this.maxDepth = this.depth;
    this.emit(b);
  }

  // Java: XmlOps.Digester#endElement
  endElement(qName) {
    this.depth--;
    this.emit(`E\t${qName}`);
  }

  // Java: XmlOps.Digester#flush() via characters (the parser delivers one maximal run per node)
  characters(text) {
    this.textNodes++;
    this.textChars += text.length;
    this.emit(`T\t${esc(text)}`);
  }
}

// Java: XmlOps#open(JsonNode)
function open(a) {
  if (a.bytesBase64 !== undefined) return Buffer.from(a.bytesBase64, 'base64');
  if (a.xml !== undefined) return Buffer.from(a.xml, 'utf8');
  // the oracle classpath puts the server module's logback.xml first; resources/ keeps the core copy first (.dup/1 = server copy)
  if (a.path === '/logback.xml') return readFileSync(path.join(RESOURCES_ROOT, '.dup/1/logback.xml'));
  const bytes = getDataBroker().getAsStream(a.path);
  if (bytes === null) throw new FileNotFoundException(`Not found in classpath: ${a.path}`);
  return bytes;
}

// Java: XmlOps#saxDump(JsonNode)
export function run(a) {
  const profile = a.profile !== undefined ? a.profile : 'plain';
  const out = { profile };
  const is = open(a);
  const d = new Digester();
  let error = null;
  try {
    parseXml(is, d, { ...parserOptions(profile), baseDir: baseDir() });
  } catch (t) {
    if (t === undefined || t === null || typeof t.getMessage !== 'function') throw t;
    error = err(t);
  }
  out.error = error;
  out.events = d.events;
  out.elementTotal = [...d.elements.values()].reduce((s, x) => s + x, 0);
  out.attributeTotal = d.attrs;
  out.textNodes = d.textNodes;
  out.textChars = d.textChars;
  out.maxDepth = d.maxDepth;
  out.sha256 = d.md.digest('hex');
  out.elementCounts = sortedObj(d.elements);
  out.attributeNameCounts = sortedObj(d.attrNames);
  out.first200 = d.first;
  return out;
}
