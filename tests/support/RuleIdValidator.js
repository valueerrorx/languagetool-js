// Ported from RuleIdValidator (languagetool-core test); SAX handler instead of DefaultHandler
import { Buffer } from 'node:buffer';
import { NullPointerException, RuntimeException, Throwable } from '../../src/lib/java/errors.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { parseXml, parserOptions } from '../../src/core/resources/xml.js';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { RepeatedPatternRule } from '../../src/core/patterns/RepeatedPatternRuleTransformer.js';
import { ConsistencyPatternRule } from '../../src/core/patterns/ConsistencyPatternRuleTransformer.js';

// Java: RuleIdValidator.XmlIdHandler
class XmlIdHandler {
  // Java: XmlIdHandler(String)
  constructor(xmlPath) {
    this.xmlPath = xmlPath;
    this.ids = new Set();
    this.idPrefix = '';
  }

  // Java: XmlIdHandler#startElement(String,String,String,Attributes)
  startElement(qName, attrs) {
    if (qName === 'rules' && attrs.getValue('idprefix') !== null) {
      this.idPrefix = attrs.getValue('idprefix');
    }
    if (qName === 'rule' || qName === 'rulegroup') {
      const id = attrs.getValue('id');
      if (id !== null) {
        this.ids.add(this.idPrefix + id);
      }
    }
  }

  // Java: XmlIdHandler#endElement(String,String,String)
  endElement(qName) {
    if (qName === 'rules') {
      this.idPrefix = '';
    }
  }

  // Java: DefaultHandler#characters(char[],int,int)
  characters() {}
}

// Java: RuleIdValidator
export class RuleIdValidator {
  // Java: RuleIdValidator(Language)
  constructor(lang) {
    this.lang = lang;
  }

  // Java: RuleIdValidator#validateUniqueness()
  validateUniqueness() {
    console.log(`Check rule id uniqueness for ${this.lang}...`);
    const fileNames = this.lang.getRuleFileNames();
    const idsToFile = new Map();
    const allRules = new JLanguageTool(this.lang).getAllRules();
    console.log(`Loaded ${allRules.length} rules...`);
    for (const rule of allRules) {
      if (!(rule instanceof AbstractPatternRule || rule instanceof RepeatedPatternRule
        || rule instanceof ConsistencyPatternRule)) {
        idsToFile.set(rule.getId(), `Java (${rule.constructor.FQCN})`);
      }
    }
    for (const fileName of fileNames) {
      try {
        const is = getDataBroker().getAsStream(fileName);
        if (is === null) {
          console.log(`Skipping ${fileName} - not found`); // e.g. nl/grammar-test-1.xml
          continue;
        }
        const handler = new XmlIdHandler(fileName);
        parseXml(Buffer.from(is), handler, parserOptions('pattern'));
        for (const id of handler.ids) {
          if (idsToFile.has(id)) {
            throw new RuntimeException(`id '${id}' found at least twice. Found in ${fileName} and ${idsToFile.get(id)}`);
          }
          idsToFile.set(id, fileName);
        }
      } catch (e) {
        if (e && e.notPorted === true) throw e;
        if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
        if (!(e instanceof Throwable)) throw e;
        throw new RuntimeException(e); // Java: catch (Exception e) also wraps the id-twice RuntimeException
      }
    }
  }
}
