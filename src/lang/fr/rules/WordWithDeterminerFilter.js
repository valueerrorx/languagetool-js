// org.languagetool.rules.fr.WordWithDeterminerFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { IllegalArgumentException, RuntimeException } from '../../../lib/java/errors.js';
import { Integer } from '../../../lib/java/int.js';
import { listGet } from '../../../lib/java/arrays.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaMatches, javaReplace, toUpperCase } from '../../../lib/java/strings.js';
import { Languages } from '../../../core/Languages.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { RuleFilter } from '../../../core/patterns/RuleFilter.js';
import { isAllUppercase, isCapitalizedWord, uppercaseFirstChar } from '../../../core/text/StringTools.js';
import { FrenchSynthesizer } from '../synthesis/FrenchSynthesizer.js';

const detPattern = Pattern.compile('(P.)?D .*|J .*|V.* ppa .*'); // Java: WordWithDeterminerFilter#detPattern
const wordPattern = Pattern.compile('[ZNJ] .*|V.* ppa .*'); // Java: WordWithDeterminerFilter#wordPattern
// 0=MS, 1=FS, 2=MP, 3=FP
const genderNumber = ['([me]) (s|sp)', '([fe]) (s|sp)', '([me]) (p|sp)', '([fe]) (p|sp)']; // Java: WordWithDeterminerFilter#genderNumber
const determiner = '((P.)?D |J |V.* ppa )'; // Java: WordWithDeterminerFilter#determiner
const exceptionsDeterminer = ['bels', 'fols', 'mols', 'nouvels']; // Java: WordWithDeterminerFilter#exceptionsDeterminer
const categoryToCheck = 'CAT_ELISION'; // Java: WordWithDeterminerFilter#categoryToCheck
const rulesToCheck = ['CET_CE', 'CE_CET', 'MA_VOYELLE', 'MON_NFS', 'VIEUX']; // Java: WordWithDeterminerFilter#rulesToCheck

// Java: WordWithDeterminerFilter (create suggestions for: determiner + noun/adjective)
export class WordWithDeterminerFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.fr.WordWithDeterminerFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.WordWithDeterminerFilter()' }];

  // Java: WordWithDeterminerFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const lt = Languages.getLanguageForShortCode('fr').createDefaultJLanguageTool();
    const wordFrom = this.getRequired('wordFrom', arguments_);
    const determinerFrom = this.getRequired('determinerFrom', arguments_);
    let posWord = 0;
    let posDeterminer = 0;
    if (wordFrom !== null && determinerFrom !== null) {
      posWord = Integer.parseInt(wordFrom);
      if (posWord < 1 || posWord > patternTokens.length) {
        throw new IllegalArgumentException('WordWithDeterminerFilter: Index out of bounds in '
            + match.getRule().getFullId() + ', wordFrom: ' + posWord);
      }
      posDeterminer = Integer.parseInt(determinerFrom);
      if (posDeterminer < 1 || posDeterminer > patternTokens.length) {
        throw new IllegalArgumentException('WordWithDeterminerFilter: Index out of bounds in '
            + match.getRule().getFullId() + ', posDeterminer: ' + posWord);
      }
    } else {
      throw new IllegalArgumentException('WordWithDeterminerFilter: undefined parameters wordFrom or determinerFrom in '
          + match.getRule().getFullId());
    }
    const atrDeterminer = patternTokens[posDeterminer - 1];
    const atrWord = patternTokens[posWord - 1];
    const isDeterminerCapitalized = isCapitalizedWord(atrDeterminer.getToken());
    const isWordCapitalized = isCapitalizedWord(atrWord.getToken());
    const isDeterminerAllupper = isAllUppercase(atrDeterminer.getToken())
        && !equalsIgnoreCase(atrDeterminer.getToken(), "L'");
    const isWordAllupper = isAllUppercase(atrWord.getToken());
    const atDeterminer = this.getAnalyzedToken(atrDeterminer, detPattern);
    const atWord = this.getAnalyzedToken(atrWord, wordPattern);
    if (atWord === null || atDeterminer === null) {
      throw new RuntimeException(
          "Error analyzing sentence: '" + match.getSentence().getText() + "' with rule " + match.getRule().getFullId());
    }
    const isNoun = atWord.getPOSTag().startsWith('N') || atWord.getPOSTag().startsWith('Z');
    const isAdjective = atWord.getPOSTag().startsWith('J');

    let prefix = '[ZNJ] ';
    if (isNoun && !isAdjective) {
      prefix = '[NZ] ';
    } else if (!isNoun && isAdjective) {
      prefix = 'J ';
    }

    // synthesize all forms
    const determinerForms = new Array(4);
    const wordForms = new Array(4);
    for (let i = 0; i < 4; i++) {
      determinerForms[i] = FrenchSynthesizer.INSTANCE.synthesize(atDeterminer, determiner + genderNumber[i], true);
      wordForms[i] = FrenchSynthesizer.INSTANCE.synthesize(atWord, prefix + genderNumber[i], true);
      // if it cannot be synthesyzed, keep the original determiner
      if (determinerForms[i].length === 0 && javaMatches(atDeterminer.getPOSTag(), '.+' + genderNumber[i])) {
        determinerForms[i] = [atDeterminer.getToken()];
      }
      // if it cannot be synthesyzed, keep the original word
      if (wordForms[i].length === 0 && javaMatches(atWord.getPOSTag(), '.+' + genderNumber[i])) {
        wordForms[i] = [atWord.getToken()];
      }
    }
    // generate suggestions
    const replacements = [];
    for (let i = 0; i < 4; i++) {
      for (let cw = 0; cw < wordForms[i].length; cw++) {
        for (let cd = 0; cd < determinerForms[i].length; cd++) {
          if (exceptionsDeterminer.includes(determinerForms[i][cd])) {
            continue;
          }
          if (determinerForms[i][cd] != null && wordForms[i][cw] != null) {
            let det = determinerForms[i][cd];
            let word = wordForms[i][cw];
            if (isDeterminerCapitalized) {
              det = uppercaseFirstChar(det);
            }
            if (isWordCapitalized) {
              word = uppercaseFirstChar(word);
            }
            if (isDeterminerAllupper) {
              det = toUpperCase(det);
            }
            if (isWordAllupper) {
              word = toUpperCase(word);
            }
            let r = det + ' ' + word;
            r = javaReplace(r, "' ", "'");
            // remove suggestions with errors
            if (this.suggestionHasNoErrors(r, lt) && !replacements.includes(r)) {
              if (r.endsWith(atWord.getToken())) {
                replacements.unshift(r);
              } else {
                replacements.push(r);
              }
            }
          }
        }
      }
    }
    const message = match.getMessage();
    const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(),
        message, match.getShortMessage());
    ruleMatch.setType(match.getType());
    // add existing suggestion in the XML rule
    replacements.splice(0, 0, ...match.getSuggestedReplacements());
    if (replacements.length > 0) {
      ruleMatch.setSuggestedReplacements(replacements);
    }
    return ruleMatch;
  }

  // Java: WordWithDeterminerFilter#suggestionHasNoErrors(String,JLanguageTool)
  suggestionHasNoErrors(newSuggestion, lt) {
    const analyzedSentence = listGet(lt.analyzeText(newSuggestion), 0);
    for (const r of lt.getAllActiveRules()) {
      if (r.getCategory().getId().toString() === categoryToCheck || rulesToCheck.includes(r.getId())) {
        const matches = r.match(analyzedSentence);
        if (matches.length > 0) {
          return false;
        }
      }
    }
    return true;
  }

  // Java: WordWithDeterminerFilter#getAnalyzedToken(AnalyzedTokenReadings,Pattern)
  getAnalyzedToken(aToken, pattern) {
    for (const analyzedToken of aToken) {
      let posTag = analyzedToken.getPOSTag();
      if (posTag === null) {
        posTag = 'UNKNOWN';
      }
      const m = pattern.matcher(posTag);
      if (m.matches()) {
        return analyzedToken;
      }
    }
    return null;
  }
}

registerClass(WordWithDeterminerFilter.FQCN, WordWithDeterminerFilter);
