// org.languagetool.rules.patterns.bitext.BitextPatternRuleLoader (parses bitext.xml files)
import { IOException, JavaError, NullPointerException, Throwable } from '../../lib/java/errors.js';
import { parseXml, parserOptions, RuleEntityResolver } from '../resources/xml.js';
import { BitextPatternRuleHandler } from './BitextPatternRuleHandler.js';

// Java: BitextPatternRuleLoader
export class BitextPatternRuleLoader {
  static FQCN = 'org.languagetool.rules.patterns.bitext.BitextPatternRuleLoader';

  // Java: BitextPatternRuleLoader#getRules(InputStream,String); is = bytes
  getRules(is, filename) {
    try {
      const handler = new BitextPatternRuleHandler();
      // the handler inherits PatternRuleHandler#resolveEntity; JAXP default entity limits
      parseXml(is, handler, { ...parserOptions('plain'), entityResolver: new RuleEntityResolver() });
      return handler.getBitextRules();
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE (catch (Exception e))
      if (!(e instanceof Throwable) || e instanceof JavaError) throw e;
      throw new IOException('Cannot load or parse \'' + filename + '\'', e);
    }
  }
}
