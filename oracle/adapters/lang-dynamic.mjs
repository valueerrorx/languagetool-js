// JS twin of harness op "lang-dynamic" (LangOps#dynamic).
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { File } from '../../src/lib/java/io/File.js';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { LanguageBuilder } from '../../src/core/language/LanguageBuilder.js';
import { describe, locale, safe, str, wrap } from './_lang-common.mjs';

// Java: LangOps#dynamic(JsonNode)
export function run(a) {
  try {
    return runCalls(a);
  } finally {
    resetDynamicLanguages(); // each case file is its own JVM in the oracle
  }
}

// Java: LangOps#dynamic(JsonNode) loop
function runCalls(a) {
  return a.calls.map((c) => safe(() => {
    switch (c.fn) {
      case 'add': {
        const l = Languages.addLanguage(str(c.name), str(c.code), c.path === null ? null : new File(String(c.path)));
        return wrap(describe(l, 1), false, null);
      }
      case 'builder': {
        const l = LanguageBuilder.makeAdditionalLanguage(new File(c.path === null ? 'null' : String(c.path)));
        return wrap(describe(l, 1), false, null);
      }
      case 'byClassName': return wrap(describe(Languages.getOrAddLanguageByClassName(str(c.className)), 1), false, null);
      case 'list': return Languages.get().map((x) => [x.constructor.FQCN, x.getShortCodeWithCountryAndVariant(), x.getName()]);
      case 'shortCode': return wrap(describe(Languages.getLanguageForShortCode(str(c.code)), 0), false, null);
      case 'supported': return wrap(Languages.isLanguageSupported(str(c.code)), false, null);
      case 'name': { const l = Languages.getLanguageForName(str(c.name)); return wrap(l === null ? null : describe(l, 0), false, null); }
      case 'locale': return wrap(describe(Languages.getLanguageForLocale(locale(c.locale)), 0), false, null);
      default: throw new IllegalArgumentException(`bad fn ${c.fn}`);
    }
  }));
}
