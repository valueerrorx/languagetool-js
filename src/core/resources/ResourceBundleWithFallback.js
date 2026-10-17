// Message bundle wrapper: whitespace-only values fall back to the English bundle.
import { ResourceBundle } from '../../lib/java/ResourceBundle.js';
import { Objects } from '../../lib/java/Objects.js';
import { javaTrim } from '../../lib/java/strings.js';

// Java: org.languagetool.ResourceBundleWithFallback
export class ResourceBundleWithFallback extends ResourceBundle {
  static FQCN = 'org.languagetool.ResourceBundleWithFallback';

  // Java: ResourceBundleWithFallback#ResourceBundleWithFallback(ResourceBundle,ResourceBundle)
  constructor(bundle, fallbackBundle) {
    super();
    this.bundle = bundle;
    this.fallbackBundle = fallbackBundle;
  }

  // Java: ResourceBundleWithFallback#handleGetObject(String)
  handleGetObject(key) {
    const s = this.bundle.getString(key);
    if (javaTrim(s).length === 0) return this.fallbackBundle.getString(key);
    return s;
  }

  // Java: ResourceBundleWithFallback#getKeys()
  getKeys() {
    return this.bundle.getKeys();
  }

  // Java: ResourceBundleWithFallback#equals(Object)
  equals(o) {
    if (o === this) return true;
    if (!(o instanceof ResourceBundleWithFallback)) return false;
    return Objects.equals(this.bundle, o.bundle) && Objects.equals(this.fallbackBundle, o.fallbackBundle);
  }
}
