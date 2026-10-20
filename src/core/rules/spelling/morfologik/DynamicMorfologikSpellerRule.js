// Java: DynamicMorfologikLanguage#getRelevantRules anonymous subclass `new MorfologikSpellerRule(bundle, this) {..}` (org.languagetool.DynamicMorfologikLanguage$1)
import { registerComponent } from '../../../language/components.js';
import { toUpperCase } from '../../../../lib/java/strings.js';
import { MorfologikSpellerRule } from './MorfologikSpellerRule.js';

// Java: DynamicMorfologikLanguage$1 (captures the enclosing language: dictPath, code)
export function newDynamicMorfologikSpellerRule(messages, language) {
  class DynamicMorfologikSpellerRule extends MorfologikSpellerRule {
    static FQCN = 'org.languagetool.DynamicMorfologikLanguage$1';
    static JAVA_ABSTRACT = false;

    // Java: DynamicMorfologikLanguage$1#getFileName()
    getFileName() {
      return language.dictPath.getAbsolutePath();
    }

    // Java: DynamicMorfologikLanguage$1#getId()
    getId() {
      return `${toUpperCase(language.code)}_SPELLER_RULE`;
    }

    // Java: DynamicMorfologikLanguage$1#getSpellingFileName()
    getSpellingFileName() {
      return null;
    }
  }
  return new DynamicMorfologikSpellerRule(messages, language);
}

registerComponent('org.languagetool.DynamicMorfologikLanguage$1', newDynamicMorfologikSpellerRule);
