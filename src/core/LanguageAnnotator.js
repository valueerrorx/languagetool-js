// Java: org.languagetool.LanguageAnnotator (needs VagueSpellChecker; F18 spec R5: ported after the spellers, PLAN F46)
import { notPortedYet } from './language/components.js';

// Java: org.languagetool.LanguageAnnotator
export class LanguageAnnotator {
  static FQCN = 'org.languagetool.LanguageAnnotator';

  // Java: LanguageAnnotator#detectLanguages(String,Language,List)
  detectLanguages() {
    throw notPortedYet('LanguageAnnotator#detectLanguages (VagueSpellChecker, docs/specs/F18.md R5)');
  }
}
