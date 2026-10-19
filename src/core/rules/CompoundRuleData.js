// org.languagetool.rules.CompoundRuleData
import { IllegalArgumentException, IOException, RuntimeException } from '../../lib/java/errors.js';
import { javaReplaceFirst, javaSplit, javaTrim, toLowerCase } from '../../lib/java/strings.js';
import { JLanguageTool } from '../JLanguageTool.js';
import { MAX_TERMS } from './compoundConstants.js';

// Java: CompoundRuleData
export class CompoundRuleData {
  static FQCN = 'org.languagetool.rules.CompoundRuleData';

  // Java: CompoundRuleData(String) / CompoundRuleData(String...) / CompoundRuleData(LineExpander,String...)
  constructor(...args) {
    this.incorrectCompounds = new Set();
    this.joinedSuggestion = new Set();
    this.joinedLowerCaseSuggestion = new Set();
    this.dashSuggestion = new Set();
    this.firstWords = new Set();
    this.hasDigitPatterns_ = false;
    let expander = null;
    if (args.length > 0 && typeof args[0] !== 'string') {
      expander = args.shift();
    }
    this.expander = expander;
    for (const path of args) {
      try {
        this.loadCompoundFile(path);
      } catch (e) {
        if (e instanceof IOException) throw new RuntimeException('Could not load compound data from ' + path, e);
        throw e;
      }
    }
  }

  // Java: CompoundRuleData#getIncorrectCompounds()
  getIncorrectCompounds() {
    return this.incorrectCompounds;
  }

  // Java: CompoundRuleData#getJoinedSuggestion()
  getJoinedSuggestion() {
    return this.joinedSuggestion;
  }

  // Java: CompoundRuleData#getDashSuggestion()
  getDashSuggestion() {
    return this.dashSuggestion;
  }

  // Java: CompoundRuleData#getJoinedLowerCaseSuggestion()
  getJoinedLowerCaseSuggestion() {
    return this.joinedLowerCaseSuggestion;
  }

  // Java: CompoundRuleData#getFirstWords()
  getFirstWords() {
    return this.firstWords;
  }

  // Java: CompoundRuleData#hasDigitPatterns()
  hasDigitPatterns() {
    return this.hasDigitPatterns_;
  }

  // Java: CompoundRuleData#loadCompoundFile(String)
  loadCompoundFile(path) {
    const lines = JLanguageTool.getDataBroker().getFromResourceDirAsLines(path);
    for (let line of lines) {
      if (line.length === 0 || line.startsWith('#')) {
        continue; // ignore comments
      }
      line = javaTrim(javaReplaceFirst(line, '#.*$', ''));
      let expandedLines = [];
      if (this.expander !== null) {
        expandedLines = this.expander.expandLine(line);
      } else {
        expandedLines.push(line);
      }
      for (let expLine of expandedLines) {
        expLine = expLine.replaceAll('-', ' '); // the set contains the incorrect spellings, i.e. the ones without hyphen
        this.validateLine(path, expLine);
        if (expLine.endsWith('+')) {
          expLine = this.removeLastCharacter(expLine);
          this.joinedSuggestion.add(expLine);
        } else if (expLine.endsWith('*')) {
          expLine = this.removeLastCharacter(expLine);
          this.dashSuggestion.add(expLine);
        } else if (expLine.endsWith('?')) { // github issue #779
          expLine = this.removeLastCharacter(expLine);
          this.joinedSuggestion.add(expLine);
          this.joinedLowerCaseSuggestion.add(expLine);
        } else if (expLine.endsWith('$')) { // github issue #779
          expLine = this.removeLastCharacter(expLine);
          this.joinedSuggestion.add(expLine);
          this.dashSuggestion.add(expLine);
          this.joinedLowerCaseSuggestion.add(expLine);
        } else {
          this.joinedSuggestion.add(expLine);
          this.dashSuggestion.add(expLine);
        }
        this.incorrectCompounds.add(expLine);
        const spaceIndex = expLine.indexOf(' ');
        if (spaceIndex > 0) {
          const firstWord = toLowerCase(expLine.substring(0, spaceIndex));
          if (!firstWord.includes('\\d')) {
            this.firstWords.add(firstWord);
          }
        }
        if (expLine.includes('\\d')) {
          this.hasDigitPatterns_ = true;
        }
      }
    }
  }

  // Java: CompoundRuleData#validateLine(String,String)
  validateLine(path, line) {
    const parts = javaSplit(line, ' ');
    if (parts.length === 1) {
      throw new IllegalArgumentException('Not a compound in file ' + path + ': ' + line);
    }
    if (parts.length > MAX_TERMS) {
      throw new IllegalArgumentException('Too many compound parts in file ' + path + ': ' + line + ', maximum allowed: ' + MAX_TERMS);
    }
    if (this.incorrectCompounds.has(toLowerCase(line))) {
      throw new IllegalArgumentException('Duplicated word in file ' + path + ': ' + line);
    }
  }

  // Java: CompoundRuleData#removeLastCharacter(String)
  removeLastCharacter(str) {
    return str.substring(0, str.length - 1);
  }
}
