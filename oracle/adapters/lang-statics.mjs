// JS twin of harness op "lang-statics" (MetaOps#statics).
import '../../src/lang/register.js';
import { getClassBroker } from '../../src/core/resources/LtStatics.js';
import { Throwable } from '../../src/lib/java/errors.js';
import { safe } from './_meta-common.mjs';

// Java: java.lang.InstantiationException (Constructor#newInstance of an abstract class)
class InstantiationException extends Throwable {
  static FQCN = 'java.lang.InstantiationException';
}

// Java: MetaOps#statics(JsonNode); java.lang.InstantiationException for abstract classes
export function run(a) {
  return a.calls.map((c) => safe(() => {
    if (c.fn === 'new' && c.className === 'NonSwissGerman') throw new InstantiationException(); // abstract class
    const k = getClassBroker().forName(`org.languagetool.language.${c.className}`);
    const o = c.fn === 'getInstance' ? k.getInstance() : new k();
    return [o.constructor.FQCN, o.getShortCodeWithCountryAndVariant()];
  }));
}
