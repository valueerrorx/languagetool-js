// XMLValidator reduced to well-formedness (D-048); XSD/DTD validity is not ported.
import { Buffer } from 'node:buffer';
import { IOException, RuntimeException } from '../../lib/java/errors.js';
import { getDataBroker } from './LtStatics.js';
import { getResource } from './ResourceDataBroker.js';
import { parseXml, parserOptions } from './xml.js';

// raised for the XSD modes and anything that needs a validating parser
export function notPorted(what) {
  return Object.assign(new Error(`not ported: ${what}`), { notPorted: true });
}

// Java: XMLValidator (JDK 17+ entity limits raised by the static initializer)
export class XMLValidator {
  // Java: XMLValidator#validateXMLString(String,String,String)
  validateXMLString(xml, dtdFile, docType) {
    this.validateInternal(xml, dtdFile, docType);
  }

  // Java: XMLValidator#validateWithDtd(String,String,String)
  validateWithDtd(filename, dtdPath, docType) {
    const xmlStream = getDataBroker().getAsStream(filename);
    if (xmlStream === null) throw new IOException(`Not found in classpath: ${filename}`);
    try {
      const xml = Buffer.from(xmlStream).toString('utf8');
      this.validateInternal(xml, dtdPath, docType);
    } catch (e) {
      if (e.notPorted === true) throw e;
      throw new IOException(`Cannot load or parse '${filename}'`, e);
    }
  }

  // Java: XMLValidator#validateWithXmlSchema(String,String)
  validateWithXmlSchema() {
    throw notPorted('XML Schema validation (D-048)');
  }

  // Java: XMLValidator#validateStringWithXmlSchema(String,String,String)
  validateStringWithXmlSchema() {
    throw notPorted('XML Schema validation (D-048)');
  }

  // Java: XMLValidator#validateInternal(String,String,String); DTD validity itself is not checked, only well-formedness
  validateInternal(xml, dtdPath, docType) {
    const cleanXml = xml.replace(/<!DOCTYPE.+>/g, '');
    const decl = '<?xml version="1.0"';
    const endDecl = '?>';
    if (getResource(dtdPath) === null) throw new RuntimeException(`DTD not found in classpath: ${dtdPath}`);
    const pos = cleanXml.indexOf(decl);
    const endPos = cleanXml.indexOf(endDecl);
    if (pos === -1) throw new IOException(`No XML declaration found in '${cleanXml.substring(0, Math.min(100, cleanXml.length))}...'`);
    const root = { name: null };
    const handler = { startElement(qName) { if (root.name === null) root.name = qName; }, endElement() {}, characters() {} };
    parseXml(Buffer.from(cleanXml, 'utf8'), handler, { ...parserOptions('plain'), entityExpansionLimit: 10000000 });
    if (root.name !== docType) throw notPorted('DTD validity (D-048)');
  }
}
