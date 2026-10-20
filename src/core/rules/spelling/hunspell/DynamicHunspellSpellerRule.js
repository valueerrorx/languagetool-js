// Java: DynamicHunspellLanguage#getRelevantRules anonymous subclass `new HunspellRule(bundle, this, userConfig) {..}` (org.languagetool.DynamicHunspellLanguage$1)
import { registerComponent } from '../../../language/components.js';
import { javaReplaceAll, toUpperCase } from '../../../../lib/java/strings.js';
import { HunspellRule } from './HunspellRule.js';

// Java: DynamicHunspellLanguage$1 (captures the enclosing language: dictPath, code)
export function newDynamicHunspellSpellerRule(messages, language, userConfig = null) {
  class DynamicHunspellSpellerRule extends HunspellRule {
    static FQCN = 'org.languagetool.DynamicHunspellLanguage$1';

    // Java: DynamicHunspellLanguage$1#getId()
    getId() {
      return `${toUpperCase(language.code)}_SPELLER_RULE`;
    }

    // Java: DynamicHunspellLanguage$1#getDictFilenameInResources(String)
    getDictFilenameInResources() {
      return javaReplaceAll(language.dictPath.getAbsolutePath(), '.dic$', '');
    }

    // Java: DynamicHunspellLanguage$1#getSpellingFileName()
    getSpellingFileName() {
      return null;
    }
  }
  return new DynamicHunspellSpellerRule(messages, language, userConfig);
}

registerComponent('org.languagetool.DynamicHunspellLanguage$1', newDynamicHunspellSpellerRule);
