// JS twin of harness op "xml-validate" (XmlOps#validate): well-formedness only (D-048); XSD and DTD-validity results are notPorted.
import { XMLValidator, notPorted } from '../../src/core/resources/XMLValidator.js';

// Java: XmlOps#validate(JsonNode)
export function run(a) {
  const mode = a.mode;
  const v = new XMLValidator();
  switch (mode) {
    case 'dtd': {
      // a failure carries a Xerces message text, which is not ported: only "ok" is comparable
      try {
        v.validateWithDtd(a.path, a.schema, a.docType);
      } catch (e) {
        throw e.notPorted === true ? e : notPorted('Xerces message text (D-048)');
      }
      return { mode, ok: true };
    }
    case 'string-dtd':
      throw notPorted('DTD validity of a string (D-048)');
    case 'xsd':
    case 'xsd-merge':
    case 'string-xsd':
      throw notPorted('XML Schema validation (D-048)');
    default:
      throw Object.assign(new Error(`unknown mode: ${mode}`), { javaClass: 'java.lang.IllegalArgumentException' });
  }
}
