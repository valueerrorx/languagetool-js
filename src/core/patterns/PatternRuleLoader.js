// org.languagetool.rules.patterns.PatternRuleLoader (parses grammar.xml files into pattern rules)
import { readFileSync } from '../resources/files.js';
import { IOException, JavaError, NoSuchFileException, NullPointerException, Throwable } from '../../lib/java/errors.js';
import { registerComponent } from '../language/components.js';
import { parseXml, parserOptions } from '../resources/xml.js';
import { PatternRuleHandler } from './PatternRuleHandler.js';

// Java: Files.newInputStream(Path) + reading it: returns the bytes; a directory fails on the first read
function readFileBytes(file) {
  const path = file.getAbsolutePath();
  try {
    return { bytes: readFileSync(path), error: null };
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') throw new NoSuchFileException(file.getPath());
    if (e.code === 'EISDIR') return { bytes: null, error: new IOException('Is a directory') };
    throw new IOException(`${file.getPath()}: ${e.message}`);
  }
}

// Java: PatternRuleLoader
export class PatternRuleLoader {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleLoader';

  // Java: PatternRuleLoader() (field initializer)
  constructor() {
    this.relaxedMode = false;
  }

  /**
   * @param file XML file with pattern rules
   */
  // Java: PatternRuleLoader#getRules(File,Language)
  getRulesFromFile(file, lang) {
    const { bytes, error } = readFileBytes(file);
    const ruleLoader = new PatternRuleLoader(); // Java: a new loader, relaxedMode of this one is not passed on
    return ruleLoader.getRulesFromStream(bytes, file.getAbsolutePath(), lang, error);
  }

  /**
   * If set to true, don't throw an exception if id or name is not set.
   * Used for online rule editor.
   */
  // Java: PatternRuleLoader#setRelaxedMode(boolean)
  setRelaxedMode(relaxedMode) {
    this.relaxedMode = relaxedMode;
  }

  // Java: PatternRuleLoader#getRules(File,Language) / getRules(InputStream,String,Language) (overloads by argument count)
  getRules(...args) {
    if (args.length === 2) return this.getRulesFromFile(args[0], args[1]);
    return this.getRulesFromStream(args[0], args[1], args[2]);
  }

  /**
   * @param is stream with the XML rules (bytes)
   * @param filename used only for verbose exception message - should refer to where the stream comes from
   */
  // Java: PatternRuleLoader#getRules(InputStream,String,Language); readError = failure of the first read of the stream
  getRulesFromStream(is, filename, lang, readError = null) {
    try {
      const handler = new PatternRuleHandler(filename, lang);
      handler.setRelaxedMode(this.relaxedMode);
      // Java: Tools.setPasswordAuthenticator() when a custom authenticator is used (HTTP only, no effect on file parsing)
      if (readError !== null) throw readError;
      parseXml(is, handler, parserOptions('pattern'));
      return handler.getRules();
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE (catch (Exception e))
      if (!(e instanceof Throwable) || e instanceof JavaError) throw e;
      throw new IOException('Cannot load or parse input stream of \'' + filename + '\'', e);
    }
  }
}

registerComponent(PatternRuleLoader.FQCN, () => new PatternRuleLoader());
