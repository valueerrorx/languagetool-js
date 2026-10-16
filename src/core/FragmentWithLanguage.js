// Java: org.languagetool.FragmentWithLanguage
import { Objects } from '../lib/java/Objects.js';

// Java: org.languagetool.FragmentWithLanguage
export class FragmentWithLanguage {
  static FQCN = 'org.languagetool.FragmentWithLanguage';

  // Java: FragmentWithLanguage#FragmentWithLanguage(String,String)
  constructor(langCode, fragment) {
    this.langCode = Objects.requireNonNull(langCode);
    this.fragment = Objects.requireNonNull(fragment);
  }

  // Java: FragmentWithLanguage#getLangCode()
  getLangCode() {
    return this.langCode;
  }

  // Java: FragmentWithLanguage#getFragment()
  getFragment() {
    return this.fragment;
  }

  // Java: FragmentWithLanguage#toString()
  toString() {
    return `| ${this.langCode}: ${this.fragment} |`;
  }
}
