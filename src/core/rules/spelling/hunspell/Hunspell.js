// Java: org.languagetool.rules.spelling.hunspell.Hunspell (cache + resource loading; always the stream path, as for JAR resources)
import { RuntimeException } from '../../../../lib/java/errors.js';
import { getResourceAsStream } from '../../../resources/ResourceDataBroker.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { DumontsHunspellDictionary } from './DumontsHunspellDictionary.js';

// resource-dir-relative dictionary paths (e.g. /de/hunspell/de_DE) resolve like getFromResourceDirAsStream
export function dictionaryResourcePath(name) {
  const n = name.startsWith('/') ? name : `/${name}`;
  return n.startsWith('/org/languagetool/resource') ? n : `/org/languagetool/resource${n}`;
}

const resourceCache = new Map(); // Java: Hunspell#resourceCache (key dicPath + affPath)
const pathCache = new Map(); // Java: Hunspell#pathCache (key dictionary path + affix path)

export class Hunspell {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.Hunspell';

  // test hook: each oracle case file is its own JVM
  static clearCaches() {
    resourceCache.clear();
    pathCache.clear();
  }

  // Java: Hunspell#getDictionary(Path,Path) (files on disk, e.g. dynamic languages; reads via the resource broker)
  static getDictionary(dictionary, affix) {
    const key = `${dictionary}\u0000${affix}`;
    const cached = pathCache.get(key);
    if (cached !== undefined && !cached.isClosed()) return cached;
    const dicBytes = getResourceAsStream(dictionaryResourcePath(dictionary));
    if (dicBytes === null) throw new RuntimeException(`ENOENT: no such file or directory, open '${dictionary}'`);
    let affBytes = getResourceAsStream(dictionaryResourcePath(affix));
    if (affBytes === null) {
      // libhunspell prints the error and still loads the .dic with default affix settings (native stderr)
      process.stderr.write(`error: ${affix}: cannot open\nerror: ${affix}: cannot open\n`);
      affBytes = new Uint8Array(0);
    }
    const dict = new DumontsHunspellDictionary(dicBytes, affBytes, false);
    pathCache.set(key, dict);
    return dict;
  }

  // Java: Hunspell#forDictionaryInResources(String,String) / (String,String,String) / (String)
  static forDictionaryInResources(language, resourcePathOrDic, affPath) {
    if (affPath === undefined) {
      if (resourcePathOrDic === undefined) return Hunspell.forDictionaryInResources(language, '');
      return Hunspell.forDictionaryInResources(language, `${resourcePathOrDic}${language}.dic`, `${resourcePathOrDic}${language}.aff`);
    }
    const dicPath = resourcePathOrDic;
    const key = `${dicPath}\u0000${affPath}`;
    const cached = resourceCache.get(key);
    if (cached !== undefined && !cached.isClosed()) return cached;
    const broker = getDataBroker();
    // Java: getFromResourceDirAsUrl(dicPath/affPath) throws when a resource is missing
    broker.getFromResourceDirAsUrl(dicPath);
    broker.getFromResourceDirAsUrl(affPath);
    const dictionaryStream = broker.getFromResourceDirAsStream(dicPath);
    const affixStream = broker.getFromResourceDirAsStream(affPath);
    if (dictionaryStream === null || affixStream === null) {
      throw new RuntimeException(`Could not find the dictionary for language "${language}" in the classpath`);
    }
    const dict = new DumontsHunspellDictionary(dictionaryStream, affixStream, false);
    resourceCache.set(key, dict);
    return dict;
  }
}
