// JS twin of harness op "X-LANGUAGES" (Harness#languages): Languages.get() order with codes and names.
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';

// Java: Harness#languages()
export function run() {
  return Languages.get().map((l) => ({ shortCode: l.getShortCode(), shortCodeWithCountryAndVariant: l.getShortCodeWithCountryAndVariant(), name: l.getName(), class: l.constructor.FQCN }));
}
