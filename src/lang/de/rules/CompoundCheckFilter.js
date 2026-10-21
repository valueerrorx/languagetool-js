// org.languagetool.rules.de.CompoundCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { RuntimeException, NullPointerException } from '../../../lib/java/errors.js';
import { decodeUtf8, scannerLines } from '../../../lib/java/io.js';
import { javaReplaceAll, javaSplit, javaTrim, toLowerCase } from '../../../lib/java/strings.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { MostlySingularMultiMap } from '../../../core/tools/MostlySingularMultiMap.js';

// Java: CompoundCheckFilter.Lazy#relevantWords (lazy holder)
let relevantWords = null;
function getRelevantWords() {
  if (relevantWords === null) relevantWords = loadWords('/de/addedCompound.txt');
  return relevantWords;
}

// Java: CompoundCheckFilter#loadWords(String) (private static)
function loadWords(path) {
  const map = new Map();
  const inputStream = JLanguageTool.getDataBroker().getFromRulesDirAsStream(path);
  for (const rawLine of scannerLines(decodeUtf8(inputStream))) {
    const line = javaTrim(javaReplaceAll(rawLine, '#.*$', '')); // replace comments
    if (line.length === 0) {
      continue;
    }
    const parts = javaSplit(line, ';');
    if (parts.length !== 2) {
      throw new RuntimeException('Format error in file ' + path + ', line: '
        + line + ', ' + 'expected 2 semicolon-separated parts, got '
        + parts.length);
    }
    const part0 = toLowerCase(javaTrim(parts[0]));
    const part1 = toLowerCase(javaTrim(parts[1]));
    if (!map.has(part0)) map.set(part0, []);
    map.get(part0).push(part1);
  }
  return new MostlySingularMultiMap(map);
}

// Java: CompoundCheckFilter
export class CompoundCheckFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.de.CompoundCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.CompoundCheckFilter()' }];

  // Java: CompoundCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const a1 = arguments_.get('part1');
    const a2 = arguments_.get('part2');
    if (a1 === null || a1 === undefined || a2 === null || a2 === undefined) throw new NullPointerException();
    const part1 = toLowerCase(a1);
    const part2 = toLowerCase(a2);
    const list = getRelevantWords().getList(part1);
    return list !== null && list.includes(part2) ? match : null;
  }
}

registerClass(CompoundCheckFilter.FQCN, CompoundCheckFilter);
