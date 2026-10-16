// Java: de.danielnaber.jwordsplitter.AbstractWordSplitter (jwordsplitter 4.7)
import { javaTrim, toLowerCase } from '../java/strings.js';
import { ExceptionSplits } from './ExceptionSplits.js';
import { InputTooLongException } from './InputTooLongException.js';

// Java: AbstractWordSplitter (abstract hooks: getWordList(InputStream), getWordList(), getDisambiguator(), getDefaultMinimumWordLength(), getInterfixCharacters())
export class AbstractWordSplitter {
  // Java: AbstractWordSplitter#AbstractWordSplitter(boolean) / (boolean,InputStream) / (boolean,Set); the overload is chosen by the argument type
  constructor(hideInterfixCharacters, wordsOrStream) {
    this.words = null;
    this.exceptionSplits = new ExceptionSplits();
    this.strictMode = true;
    this.minimumWordLength = this.getDefaultMinimumWordLength();
    this.maximumWordLength = 70;
    this.hideInterfixCharacters = hideInterfixCharacters;
    if (wordsOrStream === undefined) {
      this.words = this.getWordList();
    } else if (wordsOrStream instanceof Set) {
      this.words = wordsOrStream;
    } else {
      this.words = this.getWordList(wordsOrStream);
    }
  }

  // Java: AbstractWordSplitter#setMinimumWordLength(int)
  setMinimumWordLength(len) {
    this.minimumWordLength = len;
  }

  // Java: AbstractWordSplitter#setMaximumWordLength(int)
  setMaximumWordLength(len) {
    this.maximumWordLength = len;
  }

  // Java: AbstractWordSplitter#setExceptionFile(String)
  setExceptionFile(filename) {
    this.exceptionSplits = new ExceptionSplits(filename);
  }

  // Java: AbstractWordSplitter#addException(String,List)
  addException(completeWord, wordParts) {
    this.exceptionSplits.addSplit(toLowerCase(completeWord), wordParts);
  }

  // Java: AbstractWordSplitter#setStrictMode(boolean)
  setStrictMode(strictMode) {
    this.strictMode = strictMode;
  }

  // Java: AbstractWordSplitter#getAllSplits(String)
  getAllSplits(word) {
    if (word.length > this.maximumWordLength) {
      throw new InputTooLongException(`Input too long (${word.length} characters), maximum is ${
        this.maximumWordLength} characters to avoid potentially long processing times: '${word}'`);
    }
    const result1 = this.getAllSplitsFrom(word, true);
    const result2 = this.getAllSplitsFrom(word, false);
    const result = [...result1];
    for (const split of result2) {
      if (!result.some((r) => listEquals(r, split))) {
        result.push(split);
      }
    }
    return result;
  }

  // Java: AbstractWordSplitter#getAllSplits(String,boolean) (Thread.interrupted() check has no JS counterpart)
  getAllSplitsFrom(word, fromLeft) {
    const result = [];
    const start = fromLeft ? this.minimumWordLength : word.length - this.minimumWordLength;
    for (let i = start; this.isLoopEnd(fromLeft, i, word);) {
      const left = word.substring(0, i);
      const right = word.substring(i, word.length);
      const relevantWord = fromLeft ? left : right;
      const isSimpleWord = this.isSimpleWord(relevantWord);
      if (isSimpleWord) {
        result.push([left, right]);
        const otherSplits = this.getAllSplits(fromLeft ? right : left);
        if (otherSplits.length > 0) {
          for (const otherSplit of otherSplits) {
            const sub = [];
            if (fromLeft) {
              sub.push(left);
              sub.push(...otherSplit);
            } else {
              sub.push(...otherSplit);
              sub.push(right);
            }
            result.push([...sub]);
          }
        }
      }
      i = fromLeft ? i + 1 : i - 1;
    }
    return result;
  }

  // Java: AbstractWordSplitter#isLoopEnd(boolean,int,String)
  isLoopEnd(fromLeft, i, word) {
    if (fromLeft) {
      return i < word.length - this.minimumWordLength;
    }
    return i > this.minimumWordLength;
  }

  // Java: AbstractWordSplitter#getSubWords(String)
  getSubWords(word) {
    return this.splitWord(word, true);
  }

  // Java: AbstractWordSplitter#splitWord(String) / splitWord(String,boolean)
  splitWord(word, collectSubwords = false) {
    if (word === null || word === undefined) {
      return [];
    }
    if (word.length > this.maximumWordLength) {
      throw new InputTooLongException(`Input too long (${word.length} characters), maximum is ${
        this.maximumWordLength} characters to avoid potentially long processing times: '${word}'`);
    }
    const trimmedWord = javaTrim(word);
    const exceptionSplit = this.exceptionSplits.getExceptionSplitOrNull(trimmedWord);
    if (exceptionSplit !== null) {
      return exceptionSplit;
    }
    const parts = this.split(trimmedWord, false, collectSubwords);
    if (parts === null) {
      return [trimmedWord];
    }
    const disambiguatedParts = this.getDisambiguator().disambiguate(parts);
    this.cleanLeadingAndTrailingHyphens(disambiguatedParts);
    return disambiguatedParts;
  }

  // Java: AbstractWordSplitter#cleanLeadingAndTrailingHyphens(List)
  cleanLeadingAndTrailingHyphens(disambiguatedParts) {
    for (let i = 0; i < disambiguatedParts.length; i++) {
      const element = disambiguatedParts[i];
      if (element.startsWith('-')) {
        disambiguatedParts[i] = element.substring(1);
      }
      if (element.endsWith('-')) {
        disambiguatedParts[i] = element.substring(0, element.length - 1); // Java: uses the original element, so "-x-" -> "-x"
      }
    }
  }

  // Java: AbstractWordSplitter#split(String,boolean,boolean)
  split(word, allowInterfixRemoval, collectSubwords) {
    let parts = this.exceptionSplits.getExceptionSplitOrNull(word);
    if (parts !== null) {
      return parts;
    }
    const lcWord = toLowerCase(word);
    const removableInterfix = this.findInterfixOrNull(lcWord);
    const wordWithoutInterfix = this.removeInterfix(word, removableInterfix);
    const canInterfixBeRemoved = removableInterfix !== null && allowInterfixRemoval;

    if (this.isSimpleWord(word) && !collectSubwords) {
      parts = [word];
    } else if (canInterfixBeRemoved && this.isSimpleWord(wordWithoutInterfix)) {
      if (this.hideInterfixCharacters) {
        parts = [wordWithoutInterfix];
      } else {
        parts = [wordWithoutInterfix, removableInterfix];
      }
    } else {
      parts = this.splitFromRight(word, collectSubwords);

      if (parts === null && this.isSimpleWord(word)) {
        parts = [];
        parts.push(word);
      } else if (parts !== null && this.isSimpleWord(word) && !parts.includes(word)) {
        parts.push(word);
      }

      if (parts === null && this.endsWithInterfix(lcWord)) {
        parts = this.splitFromRight(wordWithoutInterfix, collectSubwords);
        if (parts !== null && !this.hideInterfixCharacters) {
          parts.push(removableInterfix);
        }
      }
    }
    return parts;
  }

  // Java: AbstractWordSplitter#splitFromRight(String,boolean)
  splitFromRight(word, collectSubwords) {
    let parts = this.exceptionSplits.getExceptionSplitOrNull(word);
    if (parts !== null) {
      return parts;
    }

    for (let i = word.length - this.minimumWordLength; i >= this.minimumWordLength; i--) {
      const leftPart = word.substring(0, i);
      const rightPart = word.substring(i);
      if (!this.strictMode) {
        const exceptionSplit = this.getExceptionSplitOrNullLR(rightPart, leftPart);
        if (exceptionSplit !== null) {
          return exceptionSplit;
        }
      }
      if (this.isSimpleWord(rightPart)) {
        const leftPartParts = this.split(leftPart, true, collectSubwords);
        const isLeftPartAWord = leftPartParts !== null;
        if (isLeftPartAWord) {
          if (collectSubwords) {
            if (parts === null) {
              parts = [];
            }
            for (const leftPartPart of leftPartParts) {
              if (!parts.includes(leftPartPart)) {
                parts.push(leftPartPart);
              }
            }
            if (!parts.includes(rightPart)) {
              parts.push(rightPart);
            }
            const rightPartExceptions = this.exceptionSplits.getExceptionSplitOrNull(rightPart);
            if (rightPartExceptions !== null) {
              for (const exception of rightPartExceptions) {
                if (!parts.includes(exception)) {
                  parts.push(exception);
                }
              }
            }
          } else {
            parts = [...leftPartParts];
            parts.push(rightPart);
          }
        } else if (!this.strictMode) {
          parts = [];
          parts.push(leftPart);
          parts.push(rightPart);
        }
      } else if (!this.strictMode) {
        if (this.isSimpleWord(leftPart)) {
          parts = [];
          parts.push(leftPart);
          parts.push(rightPart);
        }
      }
    }
    return parts;
  }

  // Java: AbstractWordSplitter#getExceptionSplitOrNull(String,String)
  getExceptionSplitOrNullLR(rightPart, leftPart) {
    const exceptionSplit = this.exceptionSplits.getExceptionSplitOrNull(rightPart);
    if (exceptionSplit !== null) {
      const parts = [];
      parts.push(leftPart);
      parts.push(...exceptionSplit);
      return parts;
    }
    const exceptionSplit2 = this.exceptionSplits.getExceptionSplitOrNull(leftPart);
    if (exceptionSplit2 !== null) {
      const parts = [];
      parts.push(...exceptionSplit2);
      parts.push(rightPart);
      return parts;
    }
    return null;
  }

  // Java: AbstractWordSplitter#findInterfixOrNull(String)
  findInterfixOrNull(word) {
    const interfixes = this.getInterfixCharacters();
    const lcWord = toLowerCase(word);
    for (const interfix of interfixes) {
      if (lcWord.endsWith(interfix)) {
        return interfix;
      }
    }
    return null;
  }

  // Java: AbstractWordSplitter#endsWithInterfix(String)
  endsWithInterfix(word) {
    const interfixes = this.getInterfixCharacters();
    for (const interfix of interfixes) {
      if (word.endsWith(interfix)) {
        return true;
      }
    }
    return false;
  }

  // Java: AbstractWordSplitter#removeInterfix(String,String)
  removeInterfix(word, interfixOrNull) {
    if (interfixOrNull !== null) {
      return word.substring(0, word.length - interfixOrNull.length);
    }
    return word;
  }

  // Java: AbstractWordSplitter#isSimpleWord(String)
  isSimpleWord(part) {
    return part.length >= this.minimumWordLength && this.words.has(toLowerCase(part));
  }
}

// Java: List#equals(Object) for lists of strings
function listEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
