// Java: org.languagetool.language.identifier.SimpleLanguageIdentifier (speller based; R5: ported with the spelling steps, PLAN F46)
import { LanguageIdentifier } from './LanguageIdentifier.js';

// Java: org.languagetool.language.identifier.SimpleLanguageIdentifier
export class SimpleLanguageIdentifier extends LanguageIdentifier {
  static FQCN = 'org.languagetool.language.identifier.SimpleLanguageIdentifier';

  // Java: SimpleLanguageIdentifier#SimpleLanguageIdentifier() / (List) (needs the default spellers of the preferred languages)
  constructor() {
    super(1000);
    throw Object.assign(new Error('not ported yet: SimpleLanguageIdentifier needs spellers (docs/specs/F18.md R5, F46)'), { notPorted: true });
  }
}
