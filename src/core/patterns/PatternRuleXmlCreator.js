// org.languagetool.rules.patterns.PatternRuleXmlCreator (rule XML as string from the rule files)
import { Buffer } from 'node:buffer';
import { isDigit } from '../../lib/java/Character.js';
import { NullPointerException, RuntimeException, TransformerException, XPathExpressionException } from '../../lib/java/errors.js';
import { notPortedYet } from '../language/components.js';
import { javaCompare, javaTrim } from '../../lib/java/strings.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { parseXml, parserOptions } from '../resources/xml.js';

// Java: Xerces DOM nodes of the LS parser (elements, text, comments, processing instructions)
class ElementNode {
  constructor(name, attrs) {
    this.name = name;
    // NamedNodeMap of a Xerces element keeps the attributes sorted by name
    this.attrs = attrs.slice().sort((a, b) => javaCompare(a[0], b[0]));
    this.children = [];
  }

  // XPath [@id='x']: attribute value
  attr(name) {
    for (const [n, v] of this.attrs) if (n === name) return v;
    return null;
  }

  childElements(name) {
    return this.children.filter((c) => c instanceof ElementNode && c.name === name);
  }
}
class TextNode {
  constructor(data) { this.data = data; }
}
class CommentNode {
  constructor(data) { this.data = data; }
}
class PINode {
  constructor(target, data) { this.target = target; this.data = data; }
}

// Java: AbstractDOMParser/DOMParserImpl event handling with the IgnoreWhitespaceFilter (text nodes with blank content are rejected)
class DomBuilder {
  constructor() {
    this.reportContentEvents = true;
    this.root = null;
    this.current = null;
    this.stack = [];
    this.inEntityRef = false;
    this.entityContainers = [];
  }

  // Java: AbstractDOMParser#setCharacterData(boolean) with IgnoreWhitespaceFilter#acceptNode
  setCharacterData() {
    if (this.current === null) return;
    const kids = this.current.children;
    const child = kids.length === 0 ? null : kids[kids.length - 1];
    if (child !== null && child instanceof TextNode && !this.inEntityRef) {
      if (javaTrim(child.data).length === 0) kids.pop();
    }
  }

  // Java: AbstractDOMParser#startElement
  startElement(name, attrs) {
    this.setCharacterData();
    const el = new ElementNode(name, attrs.list);
    if (this.current === null) {
      this.root = el;
    } else {
      this.current.children.push(el);
    }
    this.stack.push(this.current);
    this.current = el;
  }

  // Java: AbstractDOMParser#endElement
  endElement() {
    this.setCharacterData();
    this.current = this.stack.pop();
  }

  // Java: AbstractDOMParser#characters
  characters(text) {
    if (this.current === null) return;
    const kids = this.current.children;
    const last = kids.length === 0 ? null : kids[kids.length - 1];
    if (last !== null && last instanceof TextNode) {
      last.data += text;
    } else {
      kids.push(new TextNode(text));
    }
  }

  // Java: AbstractDOMParser#comment
  comment(data) {
    if (this.current === null) return; // prolog and trailing comments are document children
    this.setCharacterData();
    this.current.children.push(new CommentNode(data));
  }

  // Java: AbstractDOMParser#processingInstruction
  processingInstruction(target, data) {
    if (this.current === null) return; // prolog PIs (xml-stylesheet) are document children
    this.setCharacterData();
    this.current.children.push(new PINode(target, data));
  }

  // Java: AbstractDOMParser#startGeneralEntity: an EntityReference node collects the expansion
  startEntityRef() {
    this.setCharacterData();
    const er = new ElementNode('#entity-reference', []);
    this.current.children.push(er);
    this.stack.push(this.current);
    this.current = er;
    this.inEntityRef = true;
  }

  // Java: AbstractDOMParser#endGeneralEntity (create-entity-ref-nodes off: the children replace the reference, text nodes merge)
  endEntityRef() {
    this.setCharacterData();
    const er = this.current;
    this.current = this.stack.pop();
    const kids = this.current.children;
    kids.pop(); // the EntityReference node
    for (const child of er.children) {
      const prev = kids.length === 0 ? null : kids[kids.length - 1];
      if (child instanceof TextNode && prev !== null && prev instanceof TextNode) {
        prev.data += child.data;
      } else {
        kids.push(child);
      }
    }
    this.inEntityRef = false;
  }
}

// Java: DOMImplementationLS parser + IgnoreWhitespaceFilter; the parsed trees are kept per rule file (parsing is deterministic)
const documentCache = new Map(); // filename -> {bytes, root}

// Java: PatternRuleXmlCreator#getDocument(InputStream)
function getDocument(filename, bytes) {
  if (bytes === null) throw new NullPointerException();
  const cached = documentCache.get(filename);
  if (cached !== undefined && cached.bytes.equals(bytes)) return cached.root;
  const builder = new DomBuilder();
  parseXml(bytes, builder, { ...parserOptions('plain'), entityResolver: null });
  documentCache.set(filename, { bytes: Buffer.from(bytes), root: builder.root });
  return builder.root;
}

// Java: ToStream#writeAttrString / characters (JDK 17 xalan serializer, UTF-8 writer)
function escapeText(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x3C) out += '&lt;';
    else if (c === 0x3E) out += '&gt;';
    else if (c === 0x26) out += '&amp;';
    else if (c === 0x0D) out += '&#13;';
    else if (c >= 0x7F && c <= 0x9F) out += `&#${c};`;
    else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xDC00 && s.charCodeAt(i + 1) <= 0xDFFF) {
      out += `&#${s.codePointAt(i)};`;
      i++;
    } else out += s[i];
  }
  return out;
}

// Java: ToStream#writeAttrString
function escapeAttr(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x3C) out += '&lt;';
    else if (c === 0x3E) out += '&gt;';
    else if (c === 0x26) out += '&amp;';
    else if (c === 0x22) out += '&quot;';
    else if (c === 0x09) out += '&#9;';
    else if (c === 0x0A) out += '&#10;';
    else if (c === 0x0D) out += '&#13;';
    else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xDC00 && s.charCodeAt(i + 1) <= 0xDFFF) {
      out += `&#${s.codePointAt(i)};`;
      i++;
    } else out += s[i];
  }
  return out;
}

// Java: TransformerFactory identity transform of a DOMSource node (method xml, no declaration, no indent)
function serialize(node) {
  if (node instanceof TextNode) return escapeText(node.data);
  if (node instanceof CommentNode) return `<!--${node.data}-->`;
  if (node instanceof PINode) return node.data.length === 0 ? `<?${node.target}?>` : `<?${node.target} ${node.data}?>`;
  let s = `<${node.name}`;
  for (const [n, v] of node.attrs) s += ` ${n}="${escapeAttr(v)}"`;
  if (node.children.length === 0) return `${s}/>`;
  s += '>';
  for (const c of node.children) s += serialize(c);
  return `${s}</${node.name}>`;
}

// Java: com.sun.org.apache.xpath.internal.compiler.Lexer#tokenize on "'" + id + "']" (only the tokens that decide the first error)
function xpathTokens(pat) {
  const tokens = [];
  const nChars = pat.length;
  let start = -1;
  let isNum = false;
  for (let i = 0; i < nChars; i++) {
    let c = pat.charAt(i);
    if (c === '"' || c === '\'') {
      const quote = c;
      if (start !== -1) tokens.push(pat.substring(start, i));
      start = i;
      for (i++; i < nChars && (c = pat.charAt(i)) !== quote; i++);
      if (c === quote && i < nChars) {
        tokens.push(pat.substring(start, i + 1));
        start = -1;
      } else {
        throw new TransformerException(`misquoted literal... expected ${quote === '"' ? 'double' : 'single'} quote!`);
      }
    } else if (c === '\n' || c === '\r' || c === ' ' || c === '\t') {
      if (start !== -1) {
        tokens.push(pat.substring(start, i));
        start = -1;
      }
    } else if ('@-([)]|/*+=,\\^!$<>'.includes(c)) {
      if (c === '-' && !(isNum || start === -1)) continue; // part of a name token
      if (c === '-') isNum = false;
      if (start !== -1) {
        tokens.push(pat.substring(start, i));
        start = -1;
      }
      tokens.push(c);
    } else {
      if (c === ':') throw notPortedYet('XPath namespace tokens in a rule id (unreachable.md)');
      if (start === -1) {
        start = i;
        isNum = isDigit(c.charCodeAt(0));
      } else if (isNum) {
        isNum = isDigit(c.charCodeAt(0));
      }
    }
  }
  if (start !== -1) tokens.push(pat.substring(start));
  return tokens;
}

// Java: XPath.evaluate(expr, doc, NODE) for the four fixed expressions; id is inserted unescaped as in Java; returns the id when the XPath compiles
export function xpathLiteral(id) {
  if (id.includes('\'')) {
    try {
      const tokens = xpathTokens(`'${id}']`);
      // XPathParser: after "@id=" literal the predicate expects "]" unless an operator, "[" or "/" continues the expression
      const t = tokens[1];
      if (t === '[' || t === '/' || t === '|' || t === '=' || t === '<' || t === '>' || t === '+' || t === '-' || t === '*'
        || (t === '!' && tokens[2] === '=') || t === ']' || t === 'or' || t === 'and' || t === 'div' || t === 'mod') {
        throw notPortedYet('XPath injection through a rule id (unreachable.md)');
      }
      throw new TransformerException(`Expected ], but found: ${t}`);
    } catch (e) {
      if (e instanceof TransformerException) throw new XPathExpressionException(e);
      throw e;
    }
  }
  return id;
}

// Java: PatternRuleXmlCreator
export class PatternRuleXmlCreator {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleXmlCreator';

  /**
   * Return the given pattern rule as an indented XML string.
   */
  // Java: PatternRuleXmlCreator#toXML(PatternRuleId,Language)
  toXML(ruleId, language) {
    const filenames = language.getRuleFileNames();
    for (const filename of filenames) {
      try {
        const is = getDataBroker().getAsStream(filename);
        const doc = getDocument(filename, is);
        const id = xpathLiteral(ruleId.getId());
        const categories = doc.name === 'rules' ? doc.childElements('category') : [];
        // "/rules/category/rule[@id='id']"
        for (const cat of categories) {
          for (const r of cat.childElements('rule')) {
            if (r.attr('id') === id) return this.nodeToString(r);
          }
        }
        // "/rules/category/rulegroup/rule[@id='id']"
        for (const cat of categories) {
          for (const g of cat.childElements('rulegroup')) {
            for (const r of g.childElements('rule')) {
              if (r.attr('id') === id) return this.nodeToString(r);
            }
          }
        }
        if (ruleId.getSubId() !== null) {
          // "/rules/category/rulegroup[@id='id']/rule"
          const ruleGroupNodes = [];
          for (const cat of categories) {
            for (const g of cat.childElements('rulegroup')) {
              if (g.attr('id') === id) ruleGroupNodes.push(...g.childElements('rule'));
            }
          }
          for (let i = 0; i < ruleGroupNodes.length; i++) {
            if (String(i + 1) === ruleId.getSubId()) {
              return this.nodeToString(ruleGroupNodes[i]);
            }
          }
        } else {
          // "/rules/category/rulegroup[@id='id']"
          for (const cat of categories) {
            for (const g of cat.childElements('rulegroup')) {
              if (g.attr('id') === id) return this.nodeToString(g);
            }
          }
        }
      } catch (e) {
        if (e && e.notPorted === true) throw e;
        if (!(e instanceof Error) || e.javaClass === undefined) throw e;
        throw new RuntimeException('Could not turn rule \'' + ruleId + '\' for language ' + language + ' into a string', e);
      }
    }
    throw new RuntimeException('Could not find rule \'' + ruleId + '\' for language ' + language + ' in files: ' + `[${filenames.join(', ')}]`);
  }

  // Java: PatternRuleXmlCreator#nodeToString(Node)
  nodeToString(node) {
    // We have to use our own simple indentation. as the Java transformer indentation
    // introduces whitespace e.g. in the <suggestion> elements, breaking rules:
    return serialize(node)
      .split('<token').join('\n    <token')
      .split('<and').join('\n    <and')
      .split('</and>').join('\n    </and>')
      .split('<phraseref').join('\n    <phraseref')
      .split('<antipattern').join('\n  <antipattern')
      .split('<pattern').join('\n  <pattern')
      .split('</pattern').join('\n  </pattern')
      .split('</antipattern').join('\n  </antipattern')
      .split('</rule>').join('\n</rule>')
      .split('<filter').join('\n  <filter')
      .split('<message').join('\n  <message')
      .split('<short').join('\n  <short')
      .split('<url').join('\n  <url')
      .split('<example').join('\n  <example')
      .split('</suggestion><suggestion>').join('</suggestion>\n  <suggestion>')
      .split('</message><suggestion>').join('</message>\n  <suggestion>');
  }
}
