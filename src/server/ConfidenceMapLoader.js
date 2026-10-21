// Java: org.languagetool.server.ConfidenceMapLoader
import { readFileSync, statSync } from 'node:fs';
import { Languages } from '../core/Languages.js';
import { ConfidenceKey } from '../core/RuleMatchesAsJsonSerializer.js';
import { IOException, MalformedInputException, NoSuchFileException, NumberFormatException, RuntimeException } from '../lib/java/errors.js';
import { Float } from '../lib/java/float.js';
import { readerLines } from '../lib/java/io.js';
import { javaReplace, javaSplit } from '../lib/java/strings.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.server.ConfidenceMapLoader');

// Java: Files.readAllLines(Path, UTF_8) (strict decoding, BufferedReader.readLine line ends)
function readAllLines(fileName) {
  let buf;
  try {
    buf = readFileSync(fileName);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') throw new NoSuchFileException(fileName);
    if (e.code === 'EISDIR') throw new IOException('Is a directory');
    throw new IOException(`${fileName}: ${e.message}`);
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
  } catch (e) {
    if (e instanceof TypeError) throw new MalformedInputException('Input length = 1');
    throw e;
  }
  return readerLines(text);
}

// Java: ConfidenceMapLoader (package-private)
export class ConfidenceMapLoader {
  static FQCN = 'org.languagetool.server.ConfidenceMapLoader';

  // Java: ConfidenceMapLoader#load(File) - Map<ConfidenceKey,Float> as a JS Map (later put of an equal key wins at lookup)
  load(filePattern) {
    if (!filePattern.toString().includes('{lang}')) {
      throw new RuntimeException("The 'ruleIdToConfidenceFile' parameter must contain '{lang}' as a placeholder for the language code");
    }
    const confMap = new Map();
    const keys = new Map(); // equal ConfidenceKey -> the key object already in confMap (HashMap.put keeps the first key object)
    for (const lang of Languages.get()) {
      let loadCount = 0;
      const fileName = javaReplace(filePattern.getAbsolutePath(), '{lang}', lang.getShortCode());
      try {
        statSync(fileName);
      } catch {
        continue;
      }
      const lines = readAllLines(fileName);
      for (const line of lines) {
        if (line.startsWith('#')) {
          continue;
        }
        const parts = javaSplit(line, ',');
        if (parts.length >= 2) { // there might be more columns for better debugging, but we don't use them here
          try {
            const confidence = Float.parseFloat(parts[1]);
            const key = new ConfidenceKey(lang, parts[0]);
            const id = `${lang.getShortCodeWithCountryAndVariant()}\u0000${parts[0]}`;
            confMap.set(keys.get(id) ?? (keys.set(id, key), key), confidence);
            loadCount++;
          } catch (e) {
            if (!(e instanceof NumberFormatException)) throw e;
            throw new RuntimeException(`Invalid confidence float value in ${fileName}, expected 'RULE_ID,float_value[,...]': ${line}`);
          }
        } else {
          throw new RuntimeException(`Invalid line in ${fileName}, expected 'RULE_ID,float_value[,...]': ${line}`);
        }
      }
      logger.info(`Loaded ${loadCount} mappings for ${lang} from confidence map for rules from ${fileName}`);
    }
    if (confMap.size === 0) {
      throw new RuntimeException(`No confidence values could be loaded for ${filePattern} -- please check there are actually files that match this pattern`);
    }
    return confMap;
  }
}
