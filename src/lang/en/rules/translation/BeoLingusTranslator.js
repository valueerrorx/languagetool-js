// org.languagetool.rules.en.translation.BeoLingusTranslator (German / English translator, D-019)
import { Languages } from '../../../../core/Languages.js';
import { getResourceAsStream } from '../../../../core/resources/ResourceDataBroker.js';
import { GlobalConfig } from '../../../../core/rules/model/GlobalConfig.js';
import { DataSource } from '../../../../core/rules/translation/DataSource.js';
import { TranslationEntry } from '../../../../core/rules/translation/TranslationEntry.js';
import { uppercaseFirstChar } from '../../../../core/text/StringTools.js';
import { IOException, MalformedInputException, NoSuchFileException, RuntimeException } from '../../../../lib/java/errors.js';
import { ArrayIndexOutOfBoundsException } from '../../../../lib/java/errors.js';
import { JavaHashSet } from '../../../../lib/java/collections/JavaHashSet.js';
import { readerLines } from '../../../../lib/java/io.js';
import { Pattern, javaReplaceAll, javaReplaceFirst, javaSplit } from '../../../../lib/java/regex/index.js';
import { javaReplace, javaTrim, toLowerCase } from '../../../../lib/java/strings.js';
import { Inflector } from './Inflector.js';
import { LoggerFactory } from '../../../../lib/slf4j/Logger.js';
import { currentTimeMillis } from '../../../../lib/java/clock.js';

const logger = LoggerFactory.getLogger('org.languagetool.rules.en.translation.BeoLingusTranslator');

const enUsPattern = Pattern.compile('.*?\\w+ \\[(Br|Am)\\.\\] ?/ ?\\w+ \\[(Br|Am)\\.\\].*');

let instance = null;

// Source: https://www.cafe-lingua.de/englische-grammatik/verben-mit-to-infinitiv.php
const verbsWithTo = new Set(['afford', 'agree', 'aim', 'appear', 'arrange',
  'attempt', 'beg', 'care', 'choose', 'claim', 'condescend', 'consent', 'dare', 'decide', 'demand', 'deserve',
  'determine', 'endeavour', 'expect', 'fail', 'forget', 'guarantee', 'happen', 'have', 'help', 'hesitate', 'hope',
  'learn', 'long', 'manage', 'mean', 'need', 'neglect', 'offer', 'plan', 'prepare', 'pretend', 'proceed', 'promise',
  'refuse', 'resolve', 'seem', 'stop', 'swear', 'tend', 'threaten', 'trouble', 'undertake', 'volunteer', 'vow', 'want', 'wish']);

// Java: Files.readAllLines(Path) (UTF-8, strict)
function readAllLines(file) {
  const name = file.getAbsolutePath().startsWith('/') ? file.getAbsolutePath() : `/${file.getAbsolutePath()}`;
  const buf = getResourceAsStream(name);
  if (buf === null) throw new NoSuchFileException(file.getPath());
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
  } catch (e) {
    if (e instanceof TypeError) throw new MalformedInputException('Input length = 1');
    throw e;
  }
  return readerLines(text);
}

// Java: BeoLingusTranslator (implements Translator)
export class BeoLingusTranslator {
  static FQCN = 'org.languagetool.rules.en.translation.BeoLingusTranslator';

  // Java: BeoLingusTranslator#getInstance(File) / getInstance(GlobalConfig)
  static getInstance(arg) {
    if (arg instanceof GlobalConfig || arg === null || arg === undefined) return BeoLingusTranslator.getInstanceFromConfig(arg);
    const config = new GlobalConfig();
    config.setBeolingusFile(arg);
    return BeoLingusTranslator.getInstanceFromConfig(config);
  }

  // Java: BeoLingusTranslator#getInstance(GlobalConfig)
  static getInstanceFromConfig(globalConfig) {
    if (instance === null && globalConfig !== null && globalConfig !== undefined && globalConfig.getBeolingusFile() !== null) {
      const t1 = currentTimeMillis();
      logger.info(`Init dict from ${globalConfig.getBeolingusFile()}...`);
      instance = new BeoLingusTranslator(globalConfig.getBeolingusFile());
      const t2 = currentTimeMillis();
      logger.info(`Init dict done (${t2 - t1}ms) - loaded ${instance.getDeEnSize()} de -> en items.`);
    }
    return instance;
  }

  // Java: BeoLingusTranslator#BeoLingusTranslator(File)
  constructor(file) {
    this.de2en = new Map();
    this.en2de = new Map();
    this.inflector = new Inflector();
    this.tagger = Languages.getLanguageForShortCode('de').getTagger();
    const lines = readAllLines(file);
    for (const line of lines) {
      if (javaTrim(line).length === 0 || line.startsWith('#')) {
        continue;
      }
      const parts = javaSplit(line, ' :: ');
      if (parts.length < 1) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
      const german = parts[0];
      if (parts.length < 2) throw new ArrayIndexOutOfBoundsException(`Index 1 out of bounds for length ${parts.length}`);
      const english = parts[1];
      const germanParts = javaSplit(german, '\\|');
      const englishParts = javaSplit(english, '\\|');
      if (germanParts.length !== englishParts.length) {
        throw new IOException(`Invalid line format (DE item count != EN item count): ${line}`);
      }
      let i = 0;
      for (const germanPart of germanParts) {
        this.handleItem(this.de2en, germanParts, englishParts, i, germanPart);
        // handleItem(en2de, englishParts, germanParts, i, englishParts[i]);  -- direction not supported yet
        i++;
      }
    }
  }

  // Java: BeoLingusTranslator#handleItem(Map,String[],String[],int,String)
  handleItem(map, germanParts, englishParts, i, germanPart) {
    germanPart = javaReplaceAll(germanPart, '/.*?/', ''); // e.g. "oder {conj} /o.; od./"
    const germanSubParts = this.split(germanPart);
    for (const germanSubPart of germanSubParts) {
      const key = this.cleanForLookup(germanSubPart);
      const oldEntries = map.get(key);
      if (oldEntries !== undefined) {
        if (javaTrim(englishParts[i]).length !== 0) {
          oldEntries.push(new TranslationEntry(this.split(germanPart), this.split(javaTrim(englishParts[i])), germanParts.length));
          map.set(key, oldEntries);
        }
      } else {
        const l = [];
        if (javaTrim(englishParts[i]).length !== 0) {
          l.push(new TranslationEntry(this.split(germanPart), this.split(englishParts[i]), germanParts.length));
          map.set(key, l);
        }
      }
    }
  }

  // "tyre [Br.]/tire [Am.] pump" -> "tyre pump [Br.]" + "tire pump [Am.]"
  // Java: BeoLingusTranslator#split(String)
  split(s) {
    const parts = this.splitAtSemicolon(s);
    const newParts = [];
    for (const part of parts) {
      if (enUsPattern.matcher(part).matches()) {
        const variant1 = javaReplaceFirst(part, '^(.*?)(\\w+) (\\[(?:Br|Am)\\.\\]) ?/ ?\\w+ \\[(?:Br|Am)\\.\\](.*)', '$1$2$4 $3');
        const variant2 = javaReplaceFirst(part, '^(.*?)(\\w+) (\\[(?:Br|Am)\\.\\]) ?/ ?(\\w+) (\\[(?:Br|Am)\\.\\])(.*)', '$1$4$6 $5');
        newParts.push(variant1);
        newParts.push(variant2);
      } else {
        newParts.push(part);
      }
    }
    return newParts;
  }

  // Java: BeoLingusTranslator#getDeEnSize()
  getDeEnSize() {
    return this.de2en.size;
  }

  // split input like "family doctors; family physicians" at ";", unless it's in "{...}":
  // Java: BeoLingusTranslator#splitAtSemicolon(String)
  splitAtSemicolon(s) {
    const list = javaSplit(s, ';\\s+').map((k) => javaTrim(k));
    const mergedList = [];
    let mergeListPos = 0;
    let merging = false;
    for (const item of list) {
      const openPos = item.indexOf('{');
      const closePos = item.indexOf('}');
      if (merging) {
        mergedList[mergeListPos - 1] = `${mergedList[mergeListPos - 1]}; ${item}`;
        mergeListPos--;
        if (closePos >= 0) {
          merging = false;
        }
      } else if (openPos > closePos) {
        // ";" inside "{...}" - merge those again
        mergedList.push(item);
        merging = true;
      } else {
        mergedList.push(item);
      }
      mergeListPos++;
    }
    return mergedList;
  }

  // Java: BeoLingusTranslator#translate(String,String,String)
  translate(term, fromLang, toLang) {
    let map;
    if (fromLang === 'de' && toLang === 'en') {
      map = this.de2en;
    } else if (fromLang === 'en' && toLang === 'de') {
      map = this.en2de;
    } else {
      throw new RuntimeException(`Not supported: ${fromLang} -> ${toLang}`);
    }
    const entries = map.get(toLowerCase(term));
    const entriesSet = new JavaHashSet();
    if (entries !== undefined) {
      entriesSet.addAll(entries);
    }
    const translationsForBaseforms = this.getTranslationsForBaseforms(term, map);
    for (const trans of translationsForBaseforms) {
      if (entries !== undefined) {
        const first = entries.find((k) => listEquals(k.getL1(), trans.getL1()));
        if (first !== undefined && listEquals(first.getL1(), trans.getL1())) {
          // skip duplicates
        } else {
          entriesSet.add(trans);
        }
      } else {
        entriesSet.add(trans);
      }
    }
    const sortedList = [...entriesSet];
    sortedList.sort((t1, t2) => Math.sign(t2.getItemCount() - t1.getItemCount())); // Integer.compare
    return sortedList;
  }

  // Java: BeoLingusTranslator#getTranslationsForBaseforms(String,Map)
  getTranslationsForBaseforms(term, map) {
    const result = [];
    try {
      const readings = this.tagger.tag([term]);
      readings.push(...this.tagger.tag([uppercaseFirstChar(term)])); // user can spell German noun lowercase here
      for (const reading of readings) {
        const aTokens = reading.getReadings();
        this.addResultsForTokens(map, aTokens, result);
      }
      return result;
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(`Could not tag '${term}'`, e);
      throw e;
    }
  }

  // Java: BeoLingusTranslator#addResultsForTokens(Map,List,List)
  addResultsForTokens(map, aTokens, result) {
    for (const aToken of aTokens) {
      const lemma = aToken.getLemma();
      if (lemma !== null && lemma !== undefined) {
        const tmp = map.get(toLowerCase(lemma));
        if (tmp !== undefined) {
          for (const tmpEntry of tmp) {
            if (!result.some((r) => r.equals(tmpEntry))) {
              const entry = this.cleanTranslationEntry(tmpEntry, aToken);
              if (entry !== null) {
                result.push(entry);
              }
            }
          }
        }
      }
    }
  }

  // Java: BeoLingusTranslator#cleanTranslationEntry(TranslationEntry,AnalyzedToken)
  cleanTranslationEntry(tmpEntry, aToken) {
    const l = [];
    for (const s of tmpEntry.getL2()) {
      const inflected = this.inflector.inflect(this.cleanTranslationForReplace(s, null), aToken.getPOSTag());
      for (const inflectedForm of inflected) {
        const cleanEntry = `${inflectedForm} ${this.getTranslationSuffix(s)}`;
        l.push(javaTrim(cleanEntry));
      }
    }
    return l.length > 0 ? new TranslationEntry(tmpEntry.getL1(), l, tmpEntry.getItemCount()) : null;
  }

  // Java: BeoLingusTranslator#cleanForLookup(String)
  cleanForLookup(s) {
    let r = javaReplaceAll(s, '\\{.*?\\}', '');
    r = javaReplaceAll(r, '\\[.*?\\]', '');
    r = javaReplaceAll(r, '\\(.*?\\)', '');
    r = javaReplaceAll(r, '/.*?/\\b', ''); // abbreviations, e.g. "oder {conj} /o.; od./"
    r = javaReplace(r, 'jdn./etw. ', '');
    r = javaReplace(r, 'jdm./etw. ', '');
    r = javaReplace(r, 'etw./jdn. ', '');
    r = javaReplace(r, 'etw./jdm. ', '');
    r = javaReplace(r, 'etw. ', '');
    r = javaReplace(r, 'jdn. ', '');
    r = javaReplace(r, 'jdm. ', '');
    return toLowerCase(javaTrim(r));
  }

  // Java: BeoLingusTranslator#cleanTranslationForReplace(String,String)
  cleanTranslationForReplace(s, prevWord) {
    let clean = javaReplaceAll(s, '\\[.*?\\]', ''); // e.g. "[coll.]", "[Br.]"
    clean = javaReplaceAll(clean, '\\{.*?\\}', ''); // e.g. "to go {went; gone}"
    clean = javaReplaceAll(clean, '\\(.*?\\)', ''); // e.g. "icebox (old-fashioned)"
    clean = javaReplace(clean, 'sth./sb.', '');
    clean = javaReplace(clean, 'sb./sth.', '');
    clean = javaReplace(clean, 'sth.', '');
    clean = javaReplace(clean, 'sb.', '');
    clean = javaReplaceAll(clean, '/[A-Z]+/', ''); // e.g. "heavy goods vehicle /HGV/"
    clean = javaReplaceAll(clean, ' /[A-Z][a-z]+\\.?/', ''); // e.g. "Tuesday /Tue/", "station /Sta./"
    clean = javaReplace(clean, '<> ', ''); // "to fathom out <> sth."
    clean = javaReplaceAll(clean, '<(.*)>', ''); // "decease [adm.]; demise [poet.] <death>"
    clean = javaReplaceAll(clean, '\\s+', ' ');
    clean = javaTrim(clean);
    if ('to' === prevWord && clean.startsWith('to ')) {
      return clean.substring(3);
    }
    if ('to' !== prevWord && clean.startsWith('to ') && !verbsWithTo.has(prevWord)) {
      return clean.substring(3);
    }
    return clean;
  }

  // Java: BeoLingusTranslator#getMessage()
  getMessage() {
    return 'Translate to English?';
  }

  // Java: BeoLingusTranslator#getTranslationSuffix(String)
  getTranslationSuffix(s) {
    let sb = '';
    const lookingFor = [];
    const remove = (x) => {
      const idx = lookingFor.indexOf(x);
      if (idx >= 0) lookingFor.splice(idx, 1);
    };
    for (let i = 0; i < s.length; i++) {
      const c = s.charAt(i);
      if (c === '[') {
        lookingFor.push(']');
      } else if (c === ']' && lookingFor.includes(']')) {
        sb += c;
        sb += ' ';
        remove(']');
      } else if (c === '<') {
        lookingFor.push('>');
      } else if (c === '>' && lookingFor.includes('>')) {
        sb += c;
        sb += ' ';
        remove('>');
      } else if (c === '(') {
        lookingFor.push(')');
      } else if (c === ')') {
        sb += c;
        sb += ' ';
        remove(')');
      } else if (c === '{') {
        lookingFor.push('}');
      } else if (c === '}') {
        sb += c;
        sb += ' ';
        remove('}');
      }
      if (lookingFor.length > 0) {
        sb += c;
      }
    }
    return javaTrim(sb);
  }

  // Java: BeoLingusTranslator#getDataSource()
  getDataSource() {
    return new DataSource('https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html', 'BEOLINGUS', 'http://dict.tu-chemnitz.de');
  }
}

// Java: List#equals(Object) for lists of strings
function listEquals(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
