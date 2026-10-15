// Java: org.languagetool.language.Contributor
import { Objects } from '../../lib/java/Objects.js';

// Java: Contributor
export class Contributor {
  static FQCN = 'org.languagetool.language.Contributor';

  // Java: Contributor#Contributor(String,String) / Contributor(String)
  constructor(name, url = null) {
    this.name = Objects.requireNonNull(name, 'name cannot be null');
    this.url = url;
  }

  // Java: Contributor#getName()
  getName() {
    return this.name;
  }

  // Java: Contributor#getUrl()
  getUrl() {
    return this.url;
  }

  // Java: Contributor#toString()
  toString() {
    return this.name;
  }
}
