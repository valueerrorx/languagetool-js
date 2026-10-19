// Java: org.languagetool.rules.spelling.hunspell.Hunspell (cache + resource loading; always the stream path, as for JAR resources)
import { RuntimeException } from '../../../../lib/java/errors.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { DumontsHunspellDictionary } from './DumontsHunspellDictionary.js';

const resourceCache = new Map(); // Java: Hunspell#resourceCache (key dicPath + affPath)

export class Hunspell {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.Hunspell';

  // test hook: each oracle case file is its own JVM
  static clearCaches() {
    resourceCache.clear();
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
