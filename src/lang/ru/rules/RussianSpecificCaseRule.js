// Java: org.languagetool.rules.ru.RussianSpecificCaseRule
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { JLanguageTool } from '../../../core/JLanguageTool.js';
import { javaSplit, javaTrim, toLowerCase } from '../../../lib/java/strings.js';
import { isAllUppercase, startsWithUppercase } from '../../../core/text/StringTools.js';

let maxLen = 0; // Java: static maxLen
let lcToProperSpelling = null; // Java: static lcToProperSpelling (built together with phrases)

// Java: RussianSpecificCaseRule#loadPhrases(String); builds the static phrase set and the lowercase map
function loadPhrases(path) {
  const l = [];
  const lines = JLanguageTool.getDataBroker().getFromResourceDirAsLines(path);
  for (const line of lines) {
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const parts = javaSplit(line, ' ').length;
    maxLen = Math.max(parts, maxLen);
    l.push(javaTrim(line));
  }
  return l;
}

// Java: RussianSpecificCaseRule static initializers
function init() {
  if (lcToProperSpelling === null) {
    const phrases = new Set(loadPhrases('/ru/specific_case.txt'));
    lcToProperSpelling = new Map();
    for (const phrase of phrases) {
      lcToProperSpelling.set(toLowerCase(phrase), phrase);
    }
  }
}

// Java: RussianSpecificCaseRule
export class RussianSpecificCaseRule extends Rule {
  static FQCN = 'org.languagetool.rules.ru.RussianSpecificCaseRule';

  // Java: RussianSpecificCaseRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    init();
    super.setCategory(Categories.CASING.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.addExamplePair(Example.wrong('Река <marker>рытый банк</marker> находится в Прикаспийской низменности.'),
      Example.fixed('Река <marker>Рытый Банк</marker> находится в Прикаспийской низменности'));
  }

  // Java: RussianSpecificCaseRule#getId()
  getId() {
    return 'RU_SPECIFIC_CASE';
  }

  // Java: RussianSpecificCaseRule#getDescription()
  getDescription() {
    return 'Написание специальных наименований в верхнем или нижнем регистре';
  }

  // Java: RussianSpecificCaseRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    for (let i = 0; i < tokens.length; i++) {
      const l = [];
      let j = 0;
      while (l.length < maxLen && i + j < tokens.length) {
        l.push(tokens[i + j].getToken());
        j++;
        const phrase = l.join(' ');
        const lcPhrase = toLowerCase(phrase);
        const properSpelling = lcToProperSpelling.get(lcPhrase);
        if (properSpelling !== undefined && !isAllUppercase(phrase) && phrase !== properSpelling) {
          if (i > 0 && tokens[i - 1].isSentenceStart() && !startsWithUppercase(properSpelling)) {
            // avoid suggesting e.g. "vitamin C" at sentence start:
            continue;
          }
          let msg;
          if (this.allWordsUppercase(properSpelling)) {
            msg = 'Для специальных наименований используйте начальную заглавную букву.';
          } else {
            msg = 'Для специальных наименований используйте предложенное написание заглавных и строчных букв.';
          }
          const match = new RuleMatch(this, sentence, tokens[i].getStartPos(), tokens[i + j - 1].getEndPos(), msg);
          match.setSuggestedReplacement(properSpelling);
          matches.push(match);
        }
      }
    }
    return this.toRuleMatchArray(matches);
  }

  // Java: RussianSpecificCaseRule#allWordsUppercase(String)
  allWordsUppercase(s) {
    return javaSplit(s, ' ').every((w) => startsWithUppercase(w));
  }
}
