// Java: org.languagetool.rules.spelling.morfologik.MorfologikSpeller (dictionary cache only; the speller follows with the spelling step)
import { Dictionary } from '../../../../lib/fsa/DictionaryLookup.js';
import { RuntimeException, Throwable } from '../../../../lib/java/errors.js';
import { getDataBroker } from '../../../resources/LtStatics.js';

// Java: com.google.common.util.concurrent.UncheckedExecutionException
export class UncheckedExecutionException extends RuntimeException {
  static FQCN = 'com.google.common.util.concurrent.UncheckedExecutionException';
}

const dictCache = new Map(); // Java: MorfologikSpeller#dictCache (expiry after 10 minutes is not observable)

// Java: MorfologikSpeller#dictCache CacheLoader#load(String)
function load(fileInClassPath) {
  const dataBroker = getDataBroker();
  if (dataBroker.resourceExists(fileInClassPath)) {
    return Dictionary.read(dataBroker.getFromResourceDirAsUrl(fileInClassPath));
  }
  return Dictionary.readPath(fileInClassPath);
}

// Java: MorfologikSpeller#getDictionaryWithCaching(String)
export function getDictionaryWithCaching(fileInClassPath) {
  if (!dictCache.has(fileInClassPath)) {
    try {
      dictCache.set(fileInClassPath, load(fileInClassPath));
    } catch (e) {
      // LoadingCache#getUnchecked: loader exceptions become UncheckedExecutionException(cause)
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
  }
  return dictCache.get(fileInClassPath);
}
