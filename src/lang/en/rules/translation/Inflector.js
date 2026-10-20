// org.languagetool.rules.en.translation.Inflector (package-private in Java)
import { AnalyzedToken } from '../../../../core/AnalyzedToken.js';
import { Languages } from '../../../../core/Languages.js';
import { ArrayIndexOutOfBoundsException, IOException, RuntimeException } from '../../../../lib/java/errors.js';
import { replaceOnce } from '../../../../lib/java/StringUtils.js';
import { javaMatches, javaSplit } from '../../../../lib/java/regex/index.js';

// Java: Inflector
export class Inflector {
  static FQCN = 'org.languagetool.rules.en.translation.Inflector';

  // Java: Inflector#Inflector()
  constructor() {
    this.enSynth = Languages.getLanguageForShortCode('en').getSynthesizer();
  }

  /**
   * @param enToken base form of English token (from BeoLingus)
   */
  // Java: Inflector#inflect(String,String)
  inflect(enToken, dePosTag) {
    const parts = javaSplit(replaceOnce(enToken, 'to ', ''), ' ');
    if (parts.length === 0) {
      throw new ArrayIndexOutOfBoundsException(`Index ${parts.length - 1} out of bounds for length ${parts.length}`);
    }
    const lastPartForms = this.inflectSingleWord(parts[parts.length - 1], dePosTag);
    const startParts = parts.length > 1 ? parts.slice(0, parts.length - 1).join(' ') : '';
    const result = [];
    for (const lastPartForm of lastPartForms) {
      // only the last part is inflected, e.g. "tire pump" -> "tire pumps"
      result.push(`${startParts} ${lastPartForm}`.trim());
    }
    return result;
  }

  // Java: Inflector#inflectSingleWord(String,String)
  inflectSingleWord(enToken, dePosTag) {
    const forms = [];
    if (dePosTag === null || dePosTag === undefined) {
      forms.push(enToken);
      return forms;
    }
    if (javaMatches(dePosTag, 'SUB.*PLU.*')) {
      forms.push(...this.getForms(enToken, 'NNP?S'));
    } else if (javaMatches(dePosTag, 'VER:3:SIN:PRÄ.*')) {
      forms.push(...this.getForms(enToken, 'VBZ'));
    } else if (javaMatches(dePosTag, 'VER:3:SIN:PRT:.*')) {
      forms.push(...this.getForms(enToken, 'VBD'));
    } else if (javaMatches(dePosTag, 'PA1:PRD:GRU:VER')) {
      forms.push(...this.getForms(enToken, 'VBG'));
    } else if (javaMatches(dePosTag, 'PA2:PRD:GRU:VER')) {
      forms.push(...this.getForms(enToken, 'VBN'));
    } else if (javaMatches(dePosTag, 'ADJ:PRD:KOM|ADJ:.*:KOM.*')) {
      forms.push(...this.getForms(enToken, 'JJR'));
    } else if (javaMatches(dePosTag, 'ADJ:.*:SUP.*')) {
      forms.push(...this.getForms(enToken, 'JJS'));
    } else {
      forms.push(enToken);
    }
    return forms;
  }

  // Java: Inflector#getForms(String,String)
  getForms(enToken, posTagRegex) {
    try {
      return [...this.enSynth.synthesize(new AnalyzedToken(enToken, 'fake-value', enToken), posTagRegex, true)];
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }
}
