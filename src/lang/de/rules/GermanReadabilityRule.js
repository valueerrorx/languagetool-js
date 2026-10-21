// org.languagetool.rules.de.GermanReadabilityRule
import { ReadabilityRule } from '../../../core/rules/ReadabilityRule.js';
import { Category, CategoryId, Location } from '../../../core/rules/model/Category.js';
import { isVowel } from './GermanTools.js';

// Java: GermanReadabilityRule
export class GermanReadabilityRule extends ReadabilityRule {
  static FQCN = 'org.languagetool.rules.de.GermanReadabilityRule';

  // Java: GermanReadabilityRule(ResourceBundle,Language,UserConfig,boolean[,int|boolean[,int,boolean]]); (…,tooEasyTest,boolean) = defaultOn with level -1
  constructor(messages, lang, userConfig, tooEasyTest, level = -1, defaultOn = false) {
    if (typeof level === 'boolean') {
      defaultOn = level;
      level = -1;
    }
    super(messages, lang, userConfig, tooEasyTest, level, defaultOn);
    super.setCategory(new Category(new CategoryId('CREATIVE_WRITING'), messages.getString('category_creative_writing'), Location.INTERNAL, false));
    // Java: the own final field tooEasyTest is assigned after super(): getId() called by the super constructor still sees false (config lookup under ..._DIFFICULT_DE)
    this.tooEasyTestDe = tooEasyTest;
  }

  // Java: GermanReadabilityRule#getId() / getId(boolean)
  getId(tooEasyTest = this.tooEasyTestDe) {
    if (tooEasyTest) {
      return 'READABILITY_RULE_SIMPLE_DE';
    } else {
      return 'READABILITY_RULE_DIFFICULT_DE';
    }
  }

  // Java: GermanReadabilityRule#getDescription()
  getDescription() {
    if (this.tooEasyTestDe) {
      return 'Lesbarkeit: Zu einfacher Text';
    } else {
      return 'Lesbarkeit: Zu schwieriger Text';
    }
  }

  // Java: GermanReadabilityRule#printMessageLevel(int)
  printMessageLevel(level) {
    let sLevel = null;
    if (level === 0) {
      sLevel = 'Sehr schwer';
    } else if (level === 1) {
      sLevel = 'Schwer';
    } else if (level === 2) {
      sLevel = 'Mittelschwer';
    } else if (level === 3) {
      sLevel = 'Mittel';
    } else if (level === 4) {
      sLevel = 'Mittelleicht';
    } else if (level === 5) {
      sLevel = 'Leicht';
    } else if (level === 6) {
      sLevel = 'Sehr leicht';
    }
    if (sLevel !== null) {
      return ' {Grad ' + level + ': ' + sLevel + '}';
    }
    return '';
  }

  // Java: GermanReadabilityRule#getMessage(int,int,int,int)
  getMessage(level) {
    let simple;
    let few;
    if (this.tooEasyTestDe) {
      simple = 'einfach';
      few = 'wenige';
    } else {
      simple = 'schwierig';
      few = 'viele';
    }
    return 'Lesbarkeit: Der Text dieses Absatzes ist zu ' + simple + this.printMessageLevel(level) + '. Zu '
        + few + ' Wörter pro Satz und zu ' + few + ' Silben pro Wort.';
  }

  // Java: GermanReadabilityRule#getConfigureText()
  getConfigureText() {
    return 'Grad der Lesbarkeit 0 (sehr schwierig) bis 6 (sehr einfach):';
  }

  // Java: GermanReadabilityRule#getFleschReadingEase(double,double)
  getFleschReadingEase(asl, asw) {
    return 180 - asl - (58.5 * asw); //  German
  }

  // Java: GermanReadabilityRule#simpleSyllablesCount(String)
  simpleSyllablesCount(word) {
    if (word.length === 0) {
      return 0;
    }
    let nSyllables = 0;
    if (isVowel(word.charAt(0))) {
      nSyllables++;
    }
    let lastDouble = false;
    for (let i = 1; i < word.length; i++) {
      const c = word.charAt(i);
      if (isVowel(c)) {
        const cl = word.charAt(i - 1);
        if (lastDouble) {
          nSyllables++;
          lastDouble = false;
        } else if (((c === 'i' || c === 'y') && (cl === 'a' || cl === 'e' || cl === 'A' || cl === 'E')) ||
            (c === 'u' && (cl === 'a' || cl === 'e' || cl === 'o' || cl === 'A' || cl === 'E' || cl === 'O')) ||
            (c === 'e' && (cl === 'e' || cl === 'i' || cl === 'E' || cl === 'I')) ||
            (c === 'a' && (cl === 'a' || cl === 'A'))) {
          lastDouble = true;
        } else {
          nSyllables++;
          lastDouble = false;
        }
      } else {
        lastDouble = false;
      }
    }
    return nSyllables === 0 ? 1 : nSyllables;
  }
}
