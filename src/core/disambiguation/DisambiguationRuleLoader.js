// org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader (parses disambiguation.xml into DisambiguationPatternRules)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { parseXml, parserOptions } from '../resources/xml.js';
import { DisambiguationRuleHandler } from './DisambiguationRuleHandler.js';

// Java: DisambiguationRuleLoader
export class DisambiguationRuleLoader {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguationRuleLoader';

  // Java: DisambiguationRuleLoader#getRules(InputStream,Language,String); stream = bytes
  getRules(stream, language, xmlPath) {
    const handler = new DisambiguationRuleHandler(language, xmlPath);
    // Java: SAXParserFactory/XMLReader features (no external DTD, unlimited entity expansion) = parserOptions('disambiguation')
    // Java: Tools.setPasswordAuthenticator() when a custom authenticator is used (HTTP only, no effect on file parsing)
    if (stream === null || stream === undefined) {
      throw new IllegalArgumentException('InputStream cannot be null'); // SAXParser#parse(InputStream,DefaultHandler)
    }
    parseXml(stream, handler, parserOptions('disambiguation'));
    return handler.getDisambRules();
  }
}
