// Port of net.loomchild.segment.srx.io.Srx2SaxParser (XSD validation is not ported, D-048).
import { Buffer } from 'node:buffer';
import { SAXParseException, parseXml, parserOptions } from '../../core/resources/xml.js';
import { decodeUtf8 } from '../java/io.js';
import { LanguageRule, Rule, SrxDocument } from './SrxDocument.js';
import { XmlException } from './Util.js';

// local name of a qualified name (the Java parser is namespace aware)
const localName = (qName) => qName.slice(qName.indexOf(':') + 1);

// Java: Srx2SaxParser$SrxHandler
class SrxHandler {
  // Java: SrxHandler#SrxHandler(SrxDocument)
  constructor(document) {
    this.document = document;
    this.elementName = null;
    this.languageRuleMap = new Map();
    this.languageRule = null;
    this.breakRule = false;
    this.beforeBreak = '';
    this.afterBreak = '';
  }

  // Java: SrxHandler#startDocument()
  startDocument() {
    this.languageRuleMap = new Map();
    this.beforeBreak = '';
    this.afterBreak = '';
    this.resetRule();
  }

  // Java: SrxHandler#getValue(Attributes,String)
  getValue(attributes, name) {
    for (let i = 0; i < attributes.getLength(); i++) {
      const q = attributes.getQName(i);
      if (q === 'xmlns' || q.startsWith('xmlns:')) continue;
      if (name === localName(q)) return attributes.getValue(i);
    }
    return null;
  }

  // Java: SrxHandler#startElement(String,String,String,Attributes)
  startElement(qName, attributes) {
    const name = localName(qName);
    this.elementName = name;
    if (name === 'header') {
      this.document.setCascade('yes' === this.getValue(attributes, 'cascade'));
    } else if (name === 'languagerule') {
      const languageRuleName = this.getValue(attributes, 'languagerulename');
      this.languageRule = new LanguageRule(languageRuleName);
      this.languageRuleMap.set(this.languageRule.getName(), this.languageRule);
    } else if (name === 'languagemap') {
      const languagePattern = this.getValue(attributes, 'languagepattern');
      const languageRuleName = this.getValue(attributes, 'languagerulename');
      this.document.addLanguageMap(languagePattern, this.languageRuleMap.get(languageRuleName) ?? null);
    } else if (name === 'rule') {
      this.breakRule = !('no' === this.getValue(attributes, 'break'));
    }
  }

  // Java: SrxHandler#endElement(String,String,String)
  endElement(qName) {
    this.elementName = null;
    if ('rule' === localName(qName)) {
      const rule = new Rule(this.breakRule, this.beforeBreak, this.afterBreak);
      this.languageRule.addRule(rule);
      this.resetRule();
    }
  }

  // Java: SrxHandler#characters(char[],int,int)
  characters(text) {
    if ('beforebreak' === this.elementName) this.beforeBreak += text;
    else if ('afterbreak' === this.elementName) this.afterBreak += text;
  }

  // Java: SrxHandler#resetRule()
  resetRule() {
    this.breakRule = false;
    this.beforeBreak = '';
    this.afterBreak = '';
  }
}

// Java: Srx2SaxParser#parse(Reader); the reader is the UTF-8 decoded resource stream
export function parse(bytes) {
  const document = new SrxDocument();
  const handler = new SrxHandler(document);
  try {
    parseXml(Buffer.from(decodeUtf8(bytes), 'utf8'), handler, parserOptions('plain'));
  } catch (e) {
    if (e instanceof SAXParseException) throw new XmlException('Fatal error parsing SRX', e);
    throw e;
  }
  return document;
}
