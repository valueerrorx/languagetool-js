// org.languagetool.rules.SuggestionFilter (filter suggestions against a rule)
import { Objects } from '../../lib/java/Objects.js';
import { javaReplace } from '../../lib/java/strings.js';
import { listGet } from '../../lib/java/arrays.js';

// Java: SuggestionFilter
export class SuggestionFilter {
  static FQCN = 'org.languagetool.rules.SuggestionFilter';

  // Java: SuggestionFilter#SuggestionFilter(Rule,Language)
  constructor(rule, lang) {
    this.rule = Objects.requireNonNull(rule);
    this.lt = lang.createDefaultJLanguageTool();
  }

  // Java: SuggestionFilter#filter(List,String)
  filter(replacements, template) {
    const newReplacements = [];
    for (const repl of replacements) {
      const analyzedSentences = this.lt.analyzeText(javaReplace(template, '{}', repl));
      const matches = this.rule.match(listGet(analyzedSentences, 0));
      if (matches.length === 0) {
        newReplacements.push(repl);
      }
    }
    return newReplacements;
  }
}
