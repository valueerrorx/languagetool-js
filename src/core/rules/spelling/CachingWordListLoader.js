// Java: org.languagetool.rules.spelling.CachingWordListLoader (10-minute expiry is not observable: resources never change)
import { javaTrim } from '../../../lib/java/strings.js';
import { getDataBroker } from '../../resources/LtStatics.js';

const cache = new Map(); // Java: CachingWordListLoader#cache

// Java: CachingWordListLoader#cache CacheLoader#load(String)
function load(fileInClassPath) {
  const result = [];
  if (!getDataBroker().resourceExists(fileInClassPath)) {
    return result;
  }
  const lines = getDataBroker().getFromResourceDirAsLines(fileInClassPath);
  for (const line of lines) {
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const t = javaTrim(line);
    const hash = t.indexOf('#');
    result.push(javaTrim(hash < 0 ? t : t.substring(0, hash))); // Java: StringUtils.substringBefore(line.trim(), "#").trim()
  }
  return Object.freeze(result);
}

// Java: CachingWordListLoader
export class CachingWordListLoader {
  static FQCN = 'org.languagetool.rules.spelling.CachingWordListLoader';

  // Java: CachingWordListLoader#loadWords(String)
  loadWords(filePath) {
    if (!cache.has(filePath)) cache.set(filePath, load(filePath));
    return cache.get(filePath);
  }
}
