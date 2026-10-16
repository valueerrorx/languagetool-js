// Java: de.danielnaber.jwordsplitter.ExceptionSplits (jwordsplitter 4.7)
import { IOException, RuntimeException } from '../java/errors.js';
import { scannerLines } from '../java/io.js';
import { javaReplace, javaTrim, toLowerCase } from '../java/strings.js';
import { javaSplit } from '../java/regex/index.js';
import { getResourceAsStream } from '../../core/resources/ResourceDataBroker.js';
import { loadFile } from './FileTools.js';

const COMMENT_CHAR = '#';
const DELIMITER_CHAR = '|';

// Java: ExceptionSplits
export class ExceptionSplits {
  // Java: ExceptionSplits#ExceptionSplits() / (String)
  constructor(filename) {
    this.exceptionMap = new Map(); // Java: HashMap (lookup only)
    if (filename === undefined) return;
    const is = getResourceAsStream(filename);
    if (is === null) {
      throw new IOException(`Cannot locate exception list in class path: ${filename}`);
    }
    const exceptions = loadFile(is);
    for (const raw of scannerLines(exceptions)) {
      const line = javaTrim(raw);
      if (!(line.length === 0) && !line.startsWith(COMMENT_CHAR)) {
        const parts = javaSplit(javaReplace(line, '/NS', ''), '\\|');
        const completeWord = javaReplace(line, DELIMITER_CHAR, '');
        const list = [...parts];
        if (completeWord.includes('/')) {
          if (completeWord.endsWith('/NS')) {
            const realWord = toLowerCase(javaReplace(completeWord, '/NS', ''));
            this.exceptionMap.set(realWord, list);
            this.exceptionMap.set(`${realWord}n`, this.addToLastPart(list, 'n'));
            this.exceptionMap.set(`${realWord}s`, this.addToLastPart(list, 's'));
          } else {
            throw new RuntimeException(`Unknown suffix in line: ${line}`);
          }
        } else {
          this.exceptionMap.set(toLowerCase(completeWord), list);
        }
      }
    }
  }

  // Java: ExceptionSplits#addToLastPart(List,String)
  addToLastPart(list, suffix) {
    const result = [...list];
    const lastPos = result.length - 1;
    result[lastPos] = result[lastPos] + suffix;
    return result;
  }

  // Java: ExceptionSplits#getExceptionSplitOrNull(String)
  getExceptionSplitOrNull(word) {
    const lcWord = toLowerCase(word);
    let result = this.exceptionMap.get(lcWord) ?? null;
    if (result !== null) {
      // The following code will only get executed if an exception split is encountered
      const check = this.join(result, '');
      if (lcWord === toLowerCase(check)) {
        // The recombined, lowercased split-word is equal to the lowercase original word
        result = this.splitEqually(result, word);
      }
    }
    return result;
  }

  // Java: ExceptionSplits#splitEqually(List,String)
  splitEqually(splitted, original) {
    const list = [];
    let offset = 0;
    for (const s of splitted) {
      const length = s.length;
      list.push(original.substring(offset, offset + length));
      offset += length;
    }
    return list;
  }

  // Java: ExceptionSplits#join(List,String)
  join(elements, separator) {
    return elements.join(separator);
  }

  // Java: ExceptionSplits#addSplit(String,List)
  addSplit(word, wordParts) {
    this.exceptionMap.set(toLowerCase(word), wordParts);
  }
}
