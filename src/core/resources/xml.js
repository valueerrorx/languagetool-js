// SAX-style XML loading that reproduces the Xerces (JAXP default, non-validating, not namespace aware) event stream used by LT's rule loaders.
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Exception, FileNotFoundException, SAXException, UnsupportedEncodingException } from '../../lib/java/errors.js';
import { getDataBroker } from './LtStatics.js';

// Java: org.xml.sax.SAXParseException
export class SAXParseException extends SAXException {
  static FQCN = 'org.xml.sax.SAXParseException';

  // Java: SAXParseException#SAXParseException(String,Locator,Exception)
  constructor(message, lineNumber, columnNumber, cause = null) {
    super(message, cause);
    Object.defineProperty(this, 'lineNumber', { value: lineNumber, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(this, 'columnNumber', { value: columnNumber, writable: true, configurable: true, enumerable: false });
  }

  // Java: SAXParseException#getLineNumber()
  getLineNumber() {
    return this.lineNumber;
  }

  // Java: SAXParseException#getColumnNumber()
  getColumnNumber() {
    return this.columnNumber;
  }

  // Java: SAXParseException#toString() (publicId and systemId are always null here)
  toString() {
    let buf = this.javaClass;
    const m = this.getLocalizedMessage();
    if (this.lineNumber !== -1) buf += `; lineNumber: ${this.lineNumber}`;
    if (this.columnNumber !== -1) buf += `; columnNumber: ${this.columnNumber}`;
    if (m !== null && m !== undefined) buf += `; ${m}`;
    return buf;
  }
}

// Java: com.sun.org.apache.xerces.internal.impl.io.MalformedByteSequenceException
export class MalformedByteSequenceException extends Exception {
  static FQCN = 'com.sun.org.apache.xerces.internal.impl.io.MalformedByteSequenceException';
}

// Java: org.xml.sax.Attributes (document order, then ATTLIST defaults)
export class Attributes {
  constructor(list) {
    this.list = list;
  }

  // Java: Attributes#getLength()
  getLength() {
    return this.list.length;
  }

  // Java: Attributes#getQName(int)
  getQName(i) {
    return i >= 0 && i < this.list.length ? this.list[i][0] : null;
  }

  // Java: Attributes#getValue(int) / getValue(String) (by qName, null if absent)
  getValue(i) {
    if (typeof i === 'string') return this.getValueByQName(i);
    return i >= 0 && i < this.list.length ? this.list[i][1] : null;
  }

  // Java: Attributes#getValue(String)
  getValueByQName(qName) {
    for (const [n, v] of this.list) if (n === qName) return v;
    return null;
  }
}

// Java: RuleEntityResolver (resolveEntity returns the bytes of the entity or null for default resolution)
export class RuleEntityResolver {
  // Java: RuleEntityResolver#resolveEntity(String,String)
  resolveEntity(publicId, systemId) {
    if (systemId !== null && systemId !== undefined && systemId.endsWith('.ent')) {
      return this.getInputStreamLTEntities(systemId);
    }
    return null;
  }

  // Java: RuleEntityResolver#getPathFromLTResourceFolder(String)
  getPathFromLTResourceFolder(input) {
    return input.replace(/.*\/resource\//g, '').replace(/\.\.\//g, '');
  }

  // Java: RuleEntityResolver#getInputStreamLTEntities(String)
  getInputStreamLTEntities(input) {
    return getDataBroker().getFromResourceDirAsStream(this.getPathFromLTResourceFolder(input));
  }
}

const PREDEFINED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const NAME_START = '[\\p{L}\\p{Nl}_:]';
const NAME_CHAR = '[\\p{L}\\p{Nl}\\p{Nd}\\p{Mn}\\p{Mc}\\p{Lm}_:.\\-\\u00B7]';
const NAME_RE = new RegExp(`${NAME_START}${NAME_CHAR}*`, 'uy');
const NMTOKEN_FIX = /[ ]+/g;
const WS = /[ \t\n\r]*/y;
const DEFAULT_EXPANSION_LIMIT = 64000;

// Java: XMLEntityScanner entity (text with scan position); line/column are computed lazily
class Entity {
  constructor(name, text, external) {
    this.name = name;
    this.text = text;
    this.pos = 0;
    this.external = external;
    this.lcPos = 0;
    this.lcLine = 1;
    this.lcLineStart = 0;
  }

  // Java: XMLEntityScanner#getLineNumber()/getColumnNumber() at position p
  lineCol(p) {
    if (p < this.lcPos) {
      this.lcPos = 0;
      this.lcLine = 1;
      this.lcLineStart = 0;
    }
    let i = this.text.indexOf('\n', this.lcPos);
    while (i !== -1 && i < p) {
      this.lcLine++;
      this.lcLineStart = i + 1;
      i = this.text.indexOf('\n', i + 1);
    }
    this.lcPos = p;
    return [this.lcLine, p - this.lcLineStart + 1];
  }
}

function isXmlChar(c, v11) {
  if (v11) return (c >= 0x1 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD) || (c >= 0x10000 && c <= 0x10FFFF);
  return c === 0x9 || c === 0xA || c === 0xD || (c >= 0x20 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD) || (c >= 0x10000 && c <= 0x10FFFF);
}

// decodes UTF-8 like Xerces' UTF8Reader: valid prefix plus the error that follows it
function decodeUtf8(b) {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b), error: null };
  } catch {
    // fall through to the byte-wise decoder to locate the error
  }
  let i = 0;
  let units = 0;
  const n = b.length;
  const cont = (k) => k < n && (b[k] & 0xC0) === 0x80;
  const fail = (nth, total) => {
    const prefix = Buffer.from(b.subarray(0, i)).toString('utf8');
    return { text: prefix, error: { index: prefix.length, message: `Invalid byte ${nth} of ${total}-byte UTF-8 sequence.` } };
  };
  while (i < n) {
    const b0 = b[i];
    if (b0 < 0x80) {
      i++;
      units++;
    } else if (b0 >= 0xC0 && b0 < 0xE0) {
      if (b0 < 0xC2) return fail(1, 2);
      if (!cont(i + 1)) return fail(2, 2);
      i += 2;
      units++;
    } else if ((b0 & 0xF0) === 0xE0) {
      if (!cont(i + 1) || (b0 === 0xE0 && b[i + 1] < 0xA0) || (b0 === 0xED && b[i + 1] >= 0xA0)) return fail(2, 3);
      if (!cont(i + 2)) return fail(3, 3);
      i += 3;
      units++;
    } else if ((b0 & 0xF8) === 0xF0) {
      if (!cont(i + 1) || (b0 === 0xF0 && b[i + 1] < 0x90) || (b0 === 0xF4 && b[i + 1] >= 0x90) || b0 > 0xF4) return fail(2, 4);
      if (!cont(i + 2)) return fail(3, 4);
      if (!cont(i + 3)) return fail(4, 4);
      i += 4;
      units += 2;
    } else {
      return fail(1, 1);
    }
  }
  return { text: Buffer.from(b).toString('utf8'), error: null };
}

// Java: XMLEntityManager#setupCurrentEntity (encoding detection and decoding); returns {text, error}
function decodeDocument(bytes) {
  const b = Buffer.from(bytes);
  let enc = null;
  let skip = 0;
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) skip = 3;
  else if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) { enc = 'utf-16be'; skip = 2; }
  else if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) { enc = 'utf-16le'; skip = 2; }
  else if (b.length >= 4 && b[0] === 0x00 && b[1] === 0x3C && b[2] === 0x00 && b[3] === 0x3F) enc = 'utf-16be';
  else if (b.length >= 4 && b[0] === 0x3C && b[1] === 0x00 && b[2] === 0x3F && b[3] === 0x00) enc = 'utf-16le';
  const body = b.subarray(skip);
  if (enc !== null) {
    return { text: new TextDecoder(enc, { ignoreBOM: true }).decode(body), error: null };
  }
  let kind = 'utf8';
  let label = null;
  const head = body.subarray(0, 512).toString('latin1');
  const m = /^<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"[^"]*"|'[^']*')(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(?:"([A-Za-z][A-Za-z0-9._-]*)"|'([A-Za-z][A-Za-z0-9._-]*)'))?/.exec(head);
  if (m && (m[1] || m[2])) {
    const e = (m[1] || m[2]).toUpperCase();
    if (e === 'UTF-8' || e === 'UTF8') kind = 'utf8';
    else if (['ISO-8859-1', 'ISO8859_1', 'ISO_8859_1', 'LATIN1', 'L1', 'ISO8859-1'].includes(e)) kind = 'latin1';
    else if (['US-ASCII', 'ASCII', 'ISO646-US'].includes(e)) kind = 'ascii';
    else if (e === 'UTF-16') kind = 'utf16decl';
    else if (e.startsWith('UTF-16') || e.startsWith('UTF16') || e.startsWith('UCS-2')) kind = 'utf8';
    else {
      try {
        new TextDecoder(e.toLowerCase());
        kind = 'label';
        label = e.toLowerCase();
      } catch {
        throw new UnsupportedEncodingException(m[1] || m[2]);
      }
    }
  }
  if (kind === 'utf16decl') {
    // the reader is switched after the declaration: the rest of the UTF-8 detected stream is decoded as UTF-16 (BOM, else big-endian)
    const end = body.toString('latin1').indexOf('?>');
    const declLen = end === -1 ? body.length : end + 2;
    let rest = body.subarray(declLen);
    let enc16 = 'utf-16be';
    if (rest.length >= 2 && rest[0] === 0xFF && rest[1] === 0xFE) { enc16 = 'utf-16le'; rest = rest.subarray(2); }
    else if (rest.length >= 2 && rest[0] === 0xFE && rest[1] === 0xFF) rest = rest.subarray(2);
    return { text: body.subarray(0, declLen).toString('utf8') + new TextDecoder(enc16, { ignoreBOM: true }).decode(rest), error: null };
  }
  if (kind === 'latin1') return { text: body.toString('latin1'), error: null };
  if (kind === 'label') return { text: new TextDecoder(label, { ignoreBOM: true }).decode(body), error: null };
  if (kind === 'ascii') {
    let bad = -1;
    for (let i = 0; i < body.length; i++) if (body[i] > 127) { bad = i; break; }
    if (bad === -1) return { text: body.toString('latin1'), error: null };
    // the reader fails on its first chunk, which starts after the XML declaration
    const end = body.toString('latin1').indexOf('?>');
    const declLen = end === -1 ? 0 : end + 2;
    return { text: body.subarray(0, declLen).toString('latin1'), error: { index: declLen, message: `Byte "${body[bad]}" is not a member of the (7-bit) ASCII character set.` } };
  }
  return decodeUtf8(body);
}

// Java: XMLEntityScanner line-end normalisation (XML 1.0 and 1.1)
function normalizeLineEnds(text, v11) {
  if (v11) return text.replace(/\r\u0085|\r\n|[\r\u0085\u2028]/g, '\n');
  return text.indexOf('\r') === -1 ? text : text.replace(/\r\n?/g, '\n');
}

// Java: SAXParser#parse(InputStream,DefaultHandler) with the LT parser settings; input = Buffer/Uint8Array or string (UTF-8 encoded)
export function parseXml(input, handler, options = {}) {
  const p = new XmlParser(handler, options);
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  p.parse(bytes);
}

// profile option sets (docs/review/F07-oracle.md): pattern/disambiguation = unlimited expansion + RuleEntityResolver; plain = JAXP defaults
export function parserOptions(profile) {
  if (profile === 'pattern' || profile === 'disambiguation') return { entityExpansionLimit: 0, entityResolver: new RuleEntityResolver() };
  return { entityExpansionLimit: DEFAULT_EXPANSION_LIMIT, entityResolver: null };
}

class XmlParser {
  constructor(handler, options) {
    this.h = handler;
    this.limit = options.entityExpansionLimit ?? DEFAULT_EXPANSION_LIMIT;
    this.resolver = options.entityResolver ?? null;
    this.baseDir = options.baseDir ?? process.cwd();
    this.stack = [];
    this.cur = null;
    this.decodeError = null;
    this.v11 = false;
    this.entities = new Map();
    this.attlists = new Map();
    this.hasExternalDtd = false;
    this.expansions = 0;
    this.text = '';
    this.openNames = [];
    this.locator = {
      getLineNumber: () => this.lineCol()[0],
      getColumnNumber: () => this.lineCol()[1],
    };
  }

  // position of the scanner in the current entity
  lineCol() {
    return this.cur.lineCol(this.cur.pos);
  }

  // Java: XMLErrorReporter#reportError(fatal) -> SAXParseException
  fatal(message, cause = null, at = null) {
    const [l, c] = at ?? this.lineCol();
    return new SAXParseException(message, l, c, cause);
  }

  // Java: XMLDocumentScannerImpl#scanDocument
  parse(bytes) {
    const dec = decodeDocument(bytes);
    const vm = /^<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*["']1\.1["']/.exec(dec.text);
    this.v11 = vm !== null;
    this.decodeError = dec.error;
    // the declaration is scanned before normalisation can matter; positions stay valid because \r\n only shrinks
    const doc = new Entity('[document]', normalizeLineEnds(dec.text, this.v11), true);
    if (this.decodeError !== null) {
      // map the error index through the normalisation (only the prefix before the error counts)
      this.decodeError.index = normalizeLineEnds(dec.text.slice(0, this.decodeError.index), this.v11).length;
    }
    this.stack = [doc];
    this.cur = doc;
    if (this.h.setDocumentLocator) this.h.setDocumentLocator(this.locator);
    if (this.h.startDocument) this.h.startDocument();
    this.scanProlog();
    this.scanRoot();
    this.scanTrailing();
    if (this.h.endDocument) this.h.endDocument();
  }

  // current character or '' at end of everything; raises pending decode errors; pops finished entities
  peek() {
    for (;;) {
      const e = this.cur;
      if (this.stack.length === 1 && this.decodeError !== null && e.pos >= this.decodeError.index) {
        throw this.fatal(this.decodeError.message, new MalformedByteSequenceException(this.decodeError.message));
      }
      if (e.pos < e.text.length) return e.text[e.pos];
      if (this.stack.length > 1) {
        const done = this.stack.pop();
        this.cur = this.stack[this.stack.length - 1];
        if (done.contentRef !== undefined && this.h.reportContentEvents === true) {
          this.flushText();
          this.h.endEntityRef(done.contentRef);
        }
        continue;
      }
      return '';
    }
  }

  skipSpaces() {
    let any = false;
    for (;;) {
      const c = this.peek();
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.cur.pos++;
        any = true;
      } else return any;
    }
  }

  lookingAt(s) {
    this.peek();
    return this.cur.text.startsWith(s, this.cur.pos);
  }

  skipString(s) {
    if (this.lookingAt(s)) {
      this.cur.pos += s.length;
      return true;
    }
    return false;
  }

  scanName() {
    this.peek();
    NAME_RE.lastIndex = this.cur.pos;
    const m = NAME_RE.exec(this.cur.text);
    if (m === null) return null;
    this.cur.pos += m[0].length;
    return m[0];
  }

  eofError() {
    if (this.decodeError !== null) return this.fatal(this.decodeError.message, new MalformedByteSequenceException(this.decodeError.message));
    return this.fatal('XML document structures must start and end within the same entity.');
  }

  // Java: XMLDocumentScannerImpl$PrologDriver / XMLDeclDriver
  scanProlog() {
    const e = this.cur;
    if (/^<\?xml[ \t\r\n]/.test(e.text)) this.scanXMLDecl();
    let seenRoot = false;
    for (;;) {
      this.skipSpaces();
      const c = this.peek();
      if (c === '') throw this.fatal('Premature end of file.');
      if (c !== '<') throw this.fatal('Content is not allowed in prolog.');
      this.cur.pos++;
      const d = this.peek();
      if (d === '?') {
        this.cur.pos++;
        this.scanPI();
      } else if (d === '!') {
        if (this.skipString('!--')) this.scanComment();
        else if (this.skipString('!DOCTYPE')) {
          if (seenRoot) throw this.fatal('The markup in the document preceding the root element must be well-formed.');
          seenRoot = true;
          this.scanDoctype();
        } else throw this.fatal('The markup in the document preceding the root element must be well-formed.');
      } else if (d === '') {
        throw this.eofError();
      } else if (this.isNameStart()) {
        this.cur.pos--; // rewind to '<'
        return;
      } else throw this.fatal('The markup in the document preceding the root element must be well-formed.');
    }
  }

  isNameStart() {
    NAME_RE.lastIndex = this.cur.pos;
    return NAME_RE.test(this.cur.text);
  }

  // Java: XMLScanner#scanXMLDeclOrTextDecl
  scanXMLDecl() {
    const e = this.cur;
    const end = e.text.indexOf('?>');
    if (end === -1) throw this.fatal('The XML declaration must end with "?>".');
    const m = /^<\?xml[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')(?:[ \t\r\n]+encoding[ \t\r\n]*=[ \t\r\n]*(?:"[^"]*"|'[^']*'))?(?:[ \t\r\n]+standalone[ \t\r\n]*=[ \t\r\n]*(?:"[^"]*"|'[^']*'))?[ \t\r\n]*\?>/.exec(e.text);
    if (m === null) {
      e.pos = end;
      throw this.fatal('The XML declaration must end with "?>".');
    }
    const ver = m[1] ?? m[2];
    if (!/^1\.[0-9]+$/.test(ver)) {
      e.pos = m[0].length;
      throw this.fatal(`XML version "${ver}" is not supported, only XML 1.0 is supported.`);
    }
    e.pos = m[0].length;
  }

  // Java: XMLScanner#scanPI
  scanPI() {
    const target = this.scanName();
    if (target === null) throw this.fatal('The processing instruction must begin with the name of the target.');
    if (/^[xX][mM][lL]$/.test(target)) throw this.fatal('The processing instruction target matching "[xX][mM][lL]" is not allowed.');
    let data = '';
    if (this.skipString('?>')) {
      this.reportPI(target, data);
      return;
    }
    if (!this.skipSpaces()) throw this.fatal(`White space is required between the processing instruction target and data.`);
    const e = this.cur;
    const end = e.text.indexOf('?>', e.pos);
    if (end === -1) {
      e.pos = e.text.length;
      throw this.eofError();
    }
    data = e.text.slice(e.pos, end);
    e.pos = end + 2;
    this.reportPI(target, data);
  }

  // processing instruction event; content PIs flush pending text first when the handler asks for content events
  reportPI(target, data) {
    if (!this.h.processingInstruction) return;
    if (this.h.reportContentEvents === true && this.openNames.length > 0) this.flushText();
    this.h.processingInstruction(target, data);
  }

  // Java: XMLScanner#scanComment
  scanComment() {
    const e = this.cur;
    const end = e.text.indexOf('--', e.pos);
    if (end === -1) {
      e.pos = e.text.length;
      throw this.eofError();
    }
    if (e.text[end + 2] !== '>') {
      e.pos = end + 2;
      throw this.fatal('The string "--" is not permitted within comments.');
    }
    if (this.h.reportContentEvents === true && this.openNames.length > 0) {
      const data = e.text.slice(e.pos, end);
      e.pos = end + 3;
      this.flushText();
      this.h.comment(data);
      return;
    }
    e.pos = end + 3;
  }

  // Java: XMLDocumentScannerImpl$DoctypeDriver / XMLDTDScannerImpl
  scanDoctype() {
    if (!this.skipSpaces()) throw this.fatal('White space is required after "<!DOCTYPE" in the document type declaration.');
    const name = this.scanName();
    if (name === null) throw this.fatal('The root element type must appear after "<!DOCTYPE" in the document type declaration.');
    this.skipSpaces();
    if (this.lookingAt('SYSTEM') || this.lookingAt('PUBLIC')) {
      this.scanExternalId();
      this.hasExternalDtd = true;
    }
    this.skipSpaces();
    if (this.skipString('[')) {
      this.scanInternalSubset();
      this.skipSpaces();
    }
    if (!this.skipString('>')) throw this.fatal('The document type declaration for root element type "' + name + '" must end with \'>\'.');
  }

  // returns {pub, sys}
  scanExternalId() {
    let pub = null;
    let sys = null;
    if (this.skipString('SYSTEM')) {
      this.skipSpaces();
      sys = this.scanLiteral('system');
    } else {
      this.skipString('PUBLIC');
      this.skipSpaces();
      pub = this.scanLiteral('public');
      this.skipSpaces();
      sys = this.scanLiteral('system');
    }
    return { pub, sys };
  }

  scanLiteral(kind) {
    const q = this.peek();
    if (q !== '"' && q !== "'") throw this.fatal(`The ${kind} identifier must begin with either a single or double quote character.`);
    this.cur.pos++;
    const e = this.cur;
    const end = e.text.indexOf(q, e.pos);
    if (end === -1) {
      e.pos = e.text.length;
      throw this.eofError();
    }
    const v = e.text.slice(e.pos, end);
    e.pos = end + 1;
    return v;
  }

  // Java: XMLDTDScannerImpl#scanDecls
  scanInternalSubset() {
    for (;;) {
      this.skipSpaces();
      const c = this.peek();
      if (c === '') throw this.eofError();
      if (c === ']') {
        this.cur.pos++;
        return;
      }
      if (c === '%') {
        this.cur.pos++;
        this.scanPEReference();
        continue;
      }
      if (c !== '<') throw this.fatal('The markup declarations contained or pointed to by the document type declaration must be well-formed.');
      this.cur.pos++;
      if (this.skipString('!--')) this.scanComment();
      else if (this.skipString('?')) this.scanPI();
      else if (this.skipString('!ENTITY')) this.scanEntityDecl();
      else if (this.skipString('!ATTLIST')) this.scanAttlistDecl();
      else if (this.skipString('!ELEMENT') || this.skipString('!NOTATION')) this.skipDecl();
      else throw this.fatal('The markup declarations contained or pointed to by the document type declaration must be well-formed.');
    }
  }

  skipDecl() {
    for (;;) {
      const c = this.peek();
      if (c === '') throw this.eofError();
      this.cur.pos++;
      if (c === '"' || c === "'") {
        const e = this.cur;
        const end = e.text.indexOf(c, e.pos);
        if (end === -1) throw this.eofError();
        e.pos = end + 1;
      } else if (c === '>') return;
    }
  }

  scanPEReference() {
    const name = this.scanName();
    if (name === null) throw this.fatal('The entity name must immediately follow the \'%\' in the entity reference.');
    if (!this.skipString(';')) throw this.fatal(`The reference to entity "${name}" must end with the ';' delimiter.`);
    const ent = this.entities.get('%' + name);
    if (ent === undefined) return; // undeclared parameter entity: ignored while the DTD is not validated
    this.pushEntity(name, ent);
  }

  // Java: XMLDTDScannerImpl#scanEntityDecl
  scanEntityDecl() {
    if (!this.skipSpaces()) throw this.fatal('White space is required after "<!ENTITY" in the entity declaration.');
    let pe = false;
    if (this.skipString('%')) {
      pe = true;
      this.skipSpaces();
    }
    const name = this.scanName();
    if (name === null) throw this.fatal('The entity name must immediately follow the "<!ENTITY" in the entity declaration.');
    this.skipSpaces();
    let decl;
    const q = this.peek();
    if (q === '"' || q === "'") {
      decl = { value: this.scanEntityValue(q) };
    } else {
      const id = this.scanExternalId();
      decl = { pub: id.pub, sys: id.sys };
      this.skipSpaces();
      if (this.skipString('NDATA')) {
        this.skipSpaces();
        this.scanName();
        decl.unparsed = true;
      }
    }
    this.skipSpaces();
    if (!this.skipString('>')) throw this.fatal(`The declaration for the entity "${name}" must end with '>'.`);
    const key = (pe ? '%' : '') + name;
    if (!this.entities.has(key)) this.entities.set(key, decl);
  }

  // Java: XMLScanner#scanEntityValue (char refs and PE refs expanded, general refs kept)
  scanEntityValue(q) {
    this.cur.pos++;
    let out = '';
    for (;;) {
      const c = this.peek();
      if (c === '') throw this.eofError();
      this.cur.pos++;
      if (c === q) return out;
      if (c === '&') {
        if (this.peek() === '#') {
          this.cur.pos++;
          out += this.scanCharRef();
        } else {
          const nm = this.scanName();
          if (nm === null) throw this.fatal('The entity name must immediately follow the \'&\' in the entity reference.');
          if (!this.skipString(';')) throw this.fatal(`The reference to entity "${nm}" must end with the ';' delimiter.`);
          out += `&${nm};`;
        }
      } else if (c === '%') {
        const nm = this.scanName();
        if (nm === null) throw this.fatal('The entity name must immediately follow the \'%\' in the entity reference.');
        if (!this.skipString(';')) throw this.fatal(`The reference to entity "${nm}" must end with the ';' delimiter.`);
        const ent = this.entities.get('%' + nm);
        if (ent !== undefined && ent.value !== undefined) out += ent.value;
      } else out += c;
    }
  }

  // Java: XMLDTDScannerImpl#scanAttlistDecl
  scanAttlistDecl() {
    if (!this.skipSpaces()) throw this.fatal('White space is required after "<!ATTLIST" in the attribute-list declaration.');
    const elem = this.scanName();
    if (elem === null) throw this.fatal('The element type must appear after "<!ATTLIST" in the attribute-list declaration.');
    let map = this.attlists.get(elem);
    if (map === undefined) {
      map = new Map();
      this.attlists.set(elem, map);
    }
    for (;;) {
      this.skipSpaces();
      if (this.skipString('>')) return;
      const an = this.scanName();
      if (an === null) throw this.fatal(`The attribute name must appear after the element type "${elem}" in the attribute-list declaration.`);
      this.skipSpaces();
      let type;
      if (this.skipString('(')) {
        const e = this.cur;
        const end = e.text.indexOf(')', e.pos);
        if (end === -1) throw this.eofError();
        e.pos = end + 1;
        type = 'ENUMERATION';
      } else {
        type = this.scanName();
        if (type === null) throw this.fatal(`The attribute type must appear after the attribute name "${an}" in the attribute-list declaration.`);
        if (type === 'NOTATION') {
          this.skipSpaces();
          const e = this.cur;
          const end = e.text.indexOf(')', e.pos);
          if (end === -1) throw this.eofError();
          e.pos = end + 1;
        }
      }
      this.skipSpaces();
      let dflt = null;
      if (this.skipString('#REQUIRED') || this.skipString('#IMPLIED')) dflt = null;
      else {
        if (this.skipString('#FIXED')) this.skipSpaces();
        const q = this.peek();
        if (q !== '"' && q !== "'") throw this.fatal(`The default value of attribute "${an}" must be specified with a quoted literal.`);
        this.cur.pos++;
        dflt = this.scanAttValue(q, an, elem, type !== 'CDATA');
      }
      if (!map.has(an)) map.set(an, { type, dflt });
    }
  }

  // Java: XMLDocumentFragmentScannerImpl#scanDocument (root element and content)
  scanRoot() {
    if (this.peek() !== '<') throw this.fatal('Premature end of file.');
    this.cur.pos++;
    this.scanStartElement();
    // content loop until the root element is closed
    while (this.openNames.length > 0) this.scanContentStep();
    this.flushText();
  }

  flushText() {
    if (this.text.length > 0) {
      const t = this.text;
      this.text = '';
      this.h.characters(t);
    }
  }

  // one step of Java: XMLDocumentFragmentScannerImpl$FragmentContentDriver#next
  scanContentStep() {
    const e = this.cur;
    const c = this.peek();
    if (c === '') throw this.eofError();
    if (this.cur !== e) return;
    if (c === '<') {
      this.cur.pos++;
      const d = this.peek();
      if (d === '/') {
        this.cur.pos++;
        this.scanEndElement();
      } else if (d === '!') {
        if (this.skipString('!--')) this.scanComment();
        else if (this.skipString('![CDATA[')) this.scanCData();
        else throw this.fatal('The content of elements must consist of well-formed character data or markup.');
      } else if (d === '?') {
        this.cur.pos++;
        this.scanPI();
      } else if (d !== '' && this.isNameStart()) {
        this.scanStartElement();
      } else throw this.fatal('The content of elements must consist of well-formed character data or markup.');
    } else if (c === '&') {
      this.cur.pos++;
      this.scanReferenceInContent();
    } else {
      this.scanCharData();
    }
  }

  // Java: XMLDocumentFragmentScannerImpl#scanContent
  scanCharData() {
    const e = this.cur;
    const t = e.text;
    let i = e.pos;
    const n = t.length;
    const stop = this.stack.length === 1 && this.decodeError !== null ? Math.min(n, this.decodeError.index) : n;
    while (i < stop) {
      const c = t.charCodeAt(i);
      if (c === 0x3C || c === 0x26) break;
      if (c === 0x5D && t.startsWith(']]>', i)) {
        this.text += t.slice(e.pos, i);
        e.pos = i + 3;
        throw this.fatal('The character sequence "]]>" must not appear in content unless used to mark the end of a CDATA section.');
      }
      if (c < 0x20 || c >= 0xD800) {
        let code = c;
        let len = 1;
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
          const lo = t.charCodeAt(i + 1);
          if (lo >= 0xDC00 && lo <= 0xDFFF) {
            code = (c - 0xD800) * 0x400 + (lo - 0xDC00) + 0x10000;
            len = 2;
          }
        }
        if (!isXmlChar(code, this.v11)) {
          this.text += t.slice(e.pos, i);
          e.pos = i + len;
          throw this.fatal(`An invalid XML character (Unicode: 0x${code.toString(16)}) was found in the element content of the document.`);
        }
        i += len;
      } else i++;
    }
    this.text += t.slice(e.pos, i);
    e.pos = i;
  }

  // Java: XMLDocumentFragmentScannerImpl#scanCDATASection
  scanCData() {
    const e = this.cur;
    const end = e.text.indexOf(']]>', e.pos);
    if (end === -1) {
      e.pos = e.text.length;
      throw this.eofError();
    }
    this.text += e.text.slice(e.pos, end);
    e.pos = end + 3;
  }

  // Java: XMLDocumentFragmentScannerImpl#scanCharReference / scanEntityReference
  scanReferenceInContent() {
    if (this.peek() === '#') {
      this.cur.pos++;
      this.text += this.scanCharRef();
      return;
    }
    const name = this.scanName();
    if (name === null) throw this.fatal('The entity name must immediately follow the \'&\' in the entity reference.');
    if (!this.skipString(';')) throw this.fatal(`The reference to entity "${name}" must end with the ';' delimiter.`);
    if (Object.hasOwn(PREDEFINED, name)) {
      this.text += PREDEFINED[name];
      return;
    }
    const ent = this.entities.get(name);
    if (ent === undefined) {
      if (this.hasExternalDtd) return; // skippedEntity: the external DTD subset is not loaded
      throw this.fatal(`The entity "${name}" was referenced, but not declared.`);
    }
    this.pushEntity(name, ent);
    if (this.h.reportContentEvents === true) {
      this.flushText();
      this.cur.contentRef = name;
      this.h.startEntityRef(name);
    }
  }

  // Java: XMLEntityManager#startEntity (expansion count, recursion check, external resolution)
  pushEntity(name, ent) {
    for (let i = 1; i < this.stack.length; i++) {
      if (this.stack[i].name === name) {
        const names = this.stack.slice(i).map((x) => x.name);
        throw this.fatal(`Recursive entity reference "${name}". (Reference path: ${names.join(' -> ')} -> ${name}),`);
      }
    }
    let text;
    if (ent.value !== undefined) text = ent.value;
    else if (ent.unparsed) throw this.fatal(`The unparsed entity reference "&${name};" is not permitted.`);
    else {
      text = this.loadExternal(ent);
    }
    const frame = new Entity(name, text, ent.value === undefined);
    this.stack.push(frame);
    this.cur = frame;
    this.expansions++;
    if (this.limit > 0 && this.expansions > this.limit) {
      throw this.fatal(`JAXP00010001: The parser has encountered more than "${this.limit}" entity expansions in this document; this is the limit imposed by the JDK.`);
    }
  }

  // Java: XMLEntityManager#expandSystemId + EntityResolver / default URL resolution
  loadExternal(ent) {
    let sys = ent.sys;
    if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(sys)) sys = 'file://' + path.posix.join(this.baseDir.split(path.sep).join('/'), sys);
    let bytes = null;
    if (this.resolver !== null) bytes = this.resolver.resolveEntity(ent.pub, sys);
    if (bytes === null) {
      if (!sys.startsWith('file:')) throw new SAXException(`${sys}`);
      const f = fileURLToPath(sys);
      if (!existsSync(f)) throw new FileNotFoundException(f);
      bytes = readFileSync(f);
    }
    const dec = decodeDocument(bytes);
    let text = normalizeLineEnds(dec.text, this.v11);
    text = text.replace(/^<\?xml[ \t\r\n][^]*?\?>/, '');
    return text;
  }

  // Java: XMLDocumentFragmentScannerImpl#scanStartElement
  scanStartElement() {
    const name = this.scanName();
    if (name === null) throw this.fatal('The markup in the document following the root element must be well-formed.');
    const attrs = [];
    const seen = new Set();
    for (;;) {
      const sp = this.skipSpaces();
      const c = this.peek();
      if (c === '>') {
        this.cur.pos++;
        break;
      }
      if (c === '/') {
        this.cur.pos++;
        if (this.peek() !== '>') throw this.fatal(`The empty element tag "${name}" must be terminated by the matching ">".`);
        this.cur.pos++;
        this.emitStart(name, attrs);
        this.emitEnd(name);
        return;
      }
      if (c === '') throw this.eofError();
      if (!sp) throw this.fatal(`Element type "${name}" must be followed by either attribute specifications, ">" or "/>".`);
      const an = this.scanName();
      if (an === null) throw this.fatal(`Element type "${name}" must be followed by either attribute specifications, ">" or "/>".`);
      this.skipSpaces();
      if (!this.skipString('=')) throw this.fatal(`Attribute name "${an}" associated with an element type "${name}" must be followed by the ' = ' character.`);
      this.skipSpaces();
      const q = this.peek();
      if (q !== '"' && q !== "'") throw this.fatal(`Open quote is expected for attribute "${an}" associated with an  element type  "${name}".`);
      this.cur.pos++;
      const decl = this.attlists.get(name)?.get(an);
      const value = this.scanAttValue(q, an, name, decl !== undefined && decl.type !== 'CDATA');
      if (seen.has(an)) throw this.fatal(`Attribute "${an}" was already specified for element "${name}".`);
      seen.add(an);
      attrs.push([an, value]);
    }
    this.emitStart(name, attrs);
    this.openNames.push(name);
  }

  emitStart(name, attrs) {
    this.flushText();
    const decls = this.attlists.get(name);
    if (decls !== undefined) {
      for (const [an, d] of decls) {
        if (d.dflt !== null && !attrs.some((a) => a[0] === an)) attrs.push([an, d.dflt]);
      }
    }
    this.h.startElement(name, new Attributes(attrs), this.locator);
  }

  emitEnd(name) {
    this.flushText();
    this.h.endElement(name);
  }

  // Java: XMLDocumentFragmentScannerImpl#scanEndElement
  scanEndElement() {
    const expected = this.openNames[this.openNames.length - 1];
    const at = this.lineCol();
    const name = expected;
    if (!this.skipString(expected)) {
      throw this.fatal(`The element type "${expected}" must be terminated by the matching end-tag "</${expected}>".`, null, at);
    }
    this.skipSpaces();
    if (!this.skipString('>')) {
      if (this.peek() === '') throw this.eofError();
      throw this.fatal(`The end-tag for element type "${expected}" must end with a '>' delimiter.`);
    }
    this.openNames.pop();
    this.emitEnd(name);
  }

  // Java: XMLScanner#scanAttributeValue (attribute-value normalisation, entity expansion)
  scanAttValue(q, attName, elemName, tokenized) {
    const startDepth = this.stack.length;
    let out = '';
    for (;;) {
      const c = this.peek();
      if (c === '') throw this.eofError();
      if (c === q && this.stack.length === startDepth) {
        this.cur.pos++;
        break;
      }
      if (c === '<') throw this.fatal(`The value of attribute "${attName}" associated with an element type "${elemName}" must not contain the '<' character.`);
      this.cur.pos++;
      if (c === '&') {
        if (this.peek() === '#') {
          this.cur.pos++;
          out += this.scanCharRef();
          continue;
        }
        const nm = this.scanName();
        if (nm === null) throw this.fatal('The entity name must immediately follow the \'&\' in the entity reference.');
        if (!this.skipString(';')) throw this.fatal(`The reference to entity "${nm}" must end with the ';' delimiter.`);
        if (Object.hasOwn(PREDEFINED, nm)) {
          out += PREDEFINED[nm];
          continue;
        }
        const ent = this.entities.get(nm);
        if (ent === undefined) {
          if (this.hasExternalDtd) continue;
          throw this.fatal(`The entity "${nm}" was referenced, but not declared.`);
        }
        if (ent.value === undefined) throw this.fatal(`The external entity reference "&${nm};" is not permitted in an attribute value.`);
        this.pushEntity(nm, ent);
        continue;
      }
      out += c === '\t' || c === '\n' || c === '\r' ? ' ' : c;
    }
    if (tokenized) out = out.replace(NMTOKEN_FIX, ' ').replace(/^ | $/g, '');
    return out;
  }

  // Java: XMLScanner#scanCharReferenceValue; position is after "&#"
  scanCharRef() {
    let hex = false;
    if (this.peek() === 'x') {
      hex = true;
      this.cur.pos++;
    }
    const e = this.cur;
    const re = hex ? /[0-9a-fA-F]*/y : /[0-9]*/y;
    re.lastIndex = e.pos;
    const digits = re.exec(e.text)[0];
    if (digits.length === 0) {
      throw this.fatal(hex ? 'A hexadecimal representation must immediately follow the "&#x" in a character reference.' : 'A decimal representation must immediately follow the "&#" in a character reference.');
    }
    e.pos += digits.length;
    const code = parseInt(digits, hex ? 16 : 10);
    if (!this.skipString(';')) throw this.fatal('The character reference must end with the \';\' delimiter.');
    if (!(code <= 0x10FFFF) || !isXmlChar(code, this.v11)) {
      throw this.fatal(`Character reference "&#${hex ? 'x' : ''}${digits}" is an invalid XML character.`);
    }
    return String.fromCodePoint(code);
  }

  // Java: XMLDocumentScannerImpl$TrailingMiscDriver
  scanTrailing() {
    for (;;) {
      this.skipSpaces();
      const c = this.peek();
      if (c === '') return;
      if (c !== '<') throw this.fatal('Content is not allowed in trailing section.');
      this.cur.pos++;
      if (this.skipString('?')) this.scanPI();
      else if (this.skipString('!--')) this.scanComment();
      else throw this.fatal('The markup in the document following the root element must be well-formed.');
    }
  }
}
