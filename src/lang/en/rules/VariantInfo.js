// org.languagetool.rules.en.VariantInfo
import { Objects } from '../../../lib/java/Objects.js';

// Java: VariantInfo (package-private value object)
export class VariantInfo {
  static FQCN = 'org.languagetool.rules.en.VariantInfo';

  // Java: VariantInfo(String,String)
  constructor(variantName, otherVariant) {
    this.variantName = Objects.requireNonNull(variantName);
    this.otherVariantValue = Objects.requireNonNull(otherVariant);
  }

  // Java: VariantInfo#getVariantName()
  getVariantName() {
    return this.variantName;
  }

  // Java: VariantInfo#otherVariant()
  otherVariant() {
    return this.otherVariantValue;
  }
}
