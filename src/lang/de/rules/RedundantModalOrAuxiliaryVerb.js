// org.languagetool.rules.de.RedundantModalOrAuxiliaryVerb
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';

const VERB_TEXT = ' scheint redundant zu sein. Prüfen Sie, ob es gelöscht oder der Satz umformuliert werden kann.';
const SUB_TEXT = 'Der Satzteil scheint redundant zu sein. Prüfen Sie, ob es gelöscht oder der Satz umformuliert werden kann.';
// the class "!-–" is a range U+0021..U+2013 (Java original), compiled by the Java regex layer
const MARKS_REGEX = Pattern.compile('[,;.:?!-–—’\'"„“”»«‚‘›‹()\\[\\]]');

// Java: RedundantModalOrAuxiliaryVerb#isBreakToken(String)
function isBreakToken(sToken) {
  return MARKS_REGEX.matcher(sToken).matches() || sToken === 'und' || sToken === 'oder' || sToken === 'sowie';
}

// Java: RedundantModalOrAuxiliaryVerb
export class RedundantModalOrAuxiliaryVerb extends Rule {
  static FQCN = 'org.languagetool.rules.de.RedundantModalOrAuxiliaryVerb';

  // Java: RedundantModalOrAuxiliaryVerb(ResourceBundle)
  constructor(messages) {
    super(messages);
    super.setCategory(Categories.STYLE.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setDefaultOff();
  }

  // Java: RedundantModalOrAuxiliaryVerb#getId()
  getId() {
    return 'REDUNDANT_MODAL_VERB';
  }

  // Java: RedundantModalOrAuxiliaryVerb#getDescription()
  getDescription() {
    return 'Redundantes Modal- oder Hilfsverb';
  }

  // Java: RedundantModalOrAuxiliaryVerb#hasParticipleAt(int,int,AnalyzedTokenReadings[])
  hasParticipleAt(nConjunction, nStart, tokens) {
    if (tokens[nConjunction - 1].hasPosTagStartingWith('PA2')) {
      const sParticiple = tokens[nConjunction - 1].getToken();
      for (let i = nStart; i < tokens.length; i++) {
        const sToken = tokens[i].getToken();
        if (isBreakToken(sToken)) {
          return -1;
        } else if (sToken === sParticiple) {
          if (i === tokens.length - 1 || isBreakToken(tokens[i + 1].getToken())) {
            return i;
          }
          return (-1);
        }
      }
    }
    return -1;
  }

  // Java: RedundantModalOrAuxiliaryVerb#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    let nt;
    let nVerb;
    let doBreak;
    for (nt = 2; nt < tokens.length; nt++) {
      const isModVerb = tokens[nt].hasPosTagStartingWith('VER:MOD');
      if ((isModVerb || tokens[nt].hasPosTagStartingWith('VER:AUX'))
          && nt + 1 < tokens.length && tokens[nt - 1].getToken() !== tokens[nt + 1].getToken()) {
        const sVerb = tokens[nt].getToken();
        nVerb = nt;
        doBreak = false;
        let suggestion = null;
        for (nt++; nt < tokens.length; nt++) {
          let sToken = tokens[nt].getToken();
          if (MARKS_REGEX.matcher(sToken).matches()) {
            break;
          }
          if (sToken === 'und' || sToken === 'oder' || sToken === 'sowie') {
            const nConjunction = nt;
            doBreak = true;
            for (nt++; nt < tokens.length; nt++) {
              sToken = tokens[nt].getToken();
              if (isBreakToken(sToken)) {
                break;
              }
              if (sToken === sVerb) {
                let ruleMatch = null;
                if (nt - 1 === nConjunction) {
                  if (nVerb === nConjunction - 1) {
                    break;
                  }
                  let n;
                  for (n = 1; nt + n < tokens.length && equalsIgnoreCase(tokens[nt + n].getToken(), tokens[nVerb + n].getToken()); n++);
                  if (n > 1) {
                    if (nVerb + n === nConjunction) {
                      break;
                    }
                    const msg = SUB_TEXT;
                    ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt + n - 1].getEndPos(), msg);
                  } else {
                    const msg = 'Das ' + (isModVerb ? 'Modalverb' : 'Hilfsverb') + VERB_TEXT;
                    ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt].getEndPos(), msg);
                  }
                } else if (equalsIgnoreCase(tokens[nt - 1].getToken(), tokens[nVerb - 1].getToken())
                    && tokens[nt - 1].hasPosTagStartingWith('PRO:PER') && !tokens[nt - 1].hasPosTagStartingWith('ART')) {
                  const msg = SUB_TEXT;
                  if (nVerb === nConjunction - 1) {
                    ruleMatch = new RuleMatch(this, sentence, tokens[nVerb - 2].getEndPos(), tokens[nVerb].getEndPos(), msg);
                  } else {
                    ruleMatch = new RuleMatch(this, sentence, tokens[nt - 2].getEndPos(), tokens[nt].getEndPos(), msg);
                  }
                } else if (nt + 1 < tokens.length && equalsIgnoreCase(tokens[nt + 1].getToken(), tokens[nVerb + 1].getToken())
                    && (tokens[nt + 1].hasPosTagStartingWith('PRO:IND')
                        || (tokens[nt + 1].hasPosTagStartingWith('PRO:PER') && tokens[nt + 1].getToken() !== 'Sie'
                            && !tokens[nt + 1].hasPosTagStartingWith('ART')))) {
                  if (tokens[nt + 1].hasPosTagStartingWith('PRO:PER:AKK') && tokens[nt].matchesPosTagRegex('VER:(AUX|MOD):.*KJ1')) {
                    const msg = 'Das ' + (isModVerb ? 'Modalverb' : 'Hilfsverb') + VERB_TEXT;
                    ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt].getEndPos(), msg);
                  } else {
                    const msg = SUB_TEXT;
                    ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt + 1].getEndPos(), msg);
                  }
                } else {
                  if (tokens[nt - 1].hasPosTagStartingWith('PRO:PER')
                      || tokens[nt - 1].getToken() === 'da' || tokens[nt - 1].getToken() === 'zu'
                      || tokens[nVerb + 1].getToken() === tokens[nt - 1].getToken()
                      || nt + 1 < tokens.length && (tokens[nt + 1].hasPosTagStartingWith('PRO:PER')
                          || tokens[nt - 1].getToken() === tokens[nt + 1].getToken()
                          || tokens[nt - 1].getToken() === tokens[nt + 1].getToken()
                          || tokens[nVerb - 1].getToken() === tokens[nt + 1].getToken()
                          || (tokens[nVerb + 1].hasPosTagStartingWith('VER:MOD') && tokens[nt + 1].hasPosTagStartingWith('VER:MOD'))
                          || (nVerb === nConjunction - 1 && !isBreakToken(tokens[nt + 1].getToken())))
                      || (nVerb < nConjunction - 1 && (nt + 1 === tokens.length || isBreakToken(tokens[nt + 1].getToken())))) {
                    break;
                  }
                  if (nVerb === nConjunction - 1) {
                    let n;
                    for (n = 1; nVerb - n > 0 && nt - n > nConjunction && tokens[nVerb - n].getToken() === tokens[nt - n].getToken(); n++);
                    if (n > 1) {
                      const msg = SUB_TEXT;
                      ruleMatch = new RuleMatch(this, sentence, tokens[nVerb - n].getEndPos(), tokens[nVerb].getEndPos(), msg);
                    } else {
                      const msg = 'Das ' + (isModVerb ? 'Modalverb' : 'Hilfsverb') + VERB_TEXT;
                      ruleMatch = new RuleMatch(this, sentence, tokens[nVerb - 1].getEndPos(), tokens[nVerb].getEndPos(), msg);
                    }
                  } else {
                    const paAt = this.hasParticipleAt(nConjunction, nt + 1, tokens);
                    if (paAt > 0) {
                      const msg = SUB_TEXT;
                      ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[paAt].getEndPos(), msg);
                      suggestion = '';
                      for (let i = nt + 1; i < paAt; i++) {
                        suggestion += (' ' + tokens[i].getToken());
                      }
                    } else {
                      let n;
                      for (n = 1; n + nVerb < nConjunction && n + nt < tokens.length && tokens[nVerb + n].getToken() === tokens[nt + n].getToken(); n++);
                      if (n + nVerb === nConjunction) {
                        const msg = SUB_TEXT;
                        ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt + n - 1].getEndPos(), msg);
                      } else {
                        const msg = 'Das ' + (isModVerb ? 'Modalverb' : 'Hilfsverb') + VERB_TEXT;
                        ruleMatch = new RuleMatch(this, sentence, tokens[nt - 1].getEndPos(), tokens[nt].getEndPos(), msg);
                      }
                    }
                  }
                }
                if (ruleMatch !== null) {
                  const suggestions = [];
                  if (suggestion === null) {
                    suggestions.push('');
                  } else {
                    suggestions.push(suggestion);
                  }
                  ruleMatch.setSuggestedReplacements(suggestions);
                  ruleMatches.push(ruleMatch);
                }
                break;
              }
            }
          }
          if (doBreak) {
            break;
          }
        }
      }
    }
    return this.toRuleMatchArray(ruleMatches);
  }
}
