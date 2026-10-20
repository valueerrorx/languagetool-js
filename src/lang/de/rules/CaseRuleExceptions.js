// org.languagetool.rules.de.CaseRuleExceptions
import { StringMatcher } from '../../../core/patterns/StringMatcher.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { splitByChar } from '../../../lib/java/StringUtils.js';
import { isWhitespace } from '../../../lib/java/Character.js';

// Java: CaseRuleExceptions#loadExceptions(String...)
function loadExceptions(...paths) {
  const result = new Set();
  for (const path of paths) {
    const lines = JLanguageTool.getDataBroker().getFromResourceDirAsLines(path);
    for (const line of lines) {
      if (line.length === 0 || line.startsWith('#')) {
        continue;
      }
      if (isWhitespace(line.charCodeAt(0)) || isWhitespace(line.charCodeAt(line.length - 1))) {
        throw new IllegalArgumentException("Invalid line in " + path + ", starts or ends with whitespace: '" + line + "'");
      }
      result.add(line);
    }
  }
  return result;
}

// Java: CaseRuleExceptions#exceptions (static init, loaded lazily on first use)
let exceptions = null;

// Java: CaseRuleExceptions#getExceptions()
export function getExceptions() {
  if (exceptions === null) {
    exceptions = loadExceptions(
      '/de/eigennamen_gross.txt',  // Premium
      '/de/case_rule_exceptions.txt'
    );
  }
  return exceptions;
}

// Java: CaseRuleExceptions#getExceptionPatterns()
export function getExceptionPatterns() {
  const exceptionPatterns = []; // ObjectOpenHashSet of arrays (identity), only iterated for a boolean result
  for (const phrase of getExceptions()) {
    const parts = splitByChar(phrase, ' ');
    const patterns = new Array(parts.length);
    for (let j = 0; j < parts.length; j++) {
      patterns[j] = StringMatcher.regexp(parts[j]);
    }
    exceptionPatterns.push(patterns);
  }
  return exceptionPatterns;
}

export const CaseRuleExceptions = { getExceptions, getExceptionPatterns };
