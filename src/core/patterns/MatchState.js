// org.languagetool.rules.patterns.MatchState (state of one <match> evaluation: synthesis, regexp/postag replace, case conversion)
import { AnalyzedToken } from '../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { SENTENCE_START_TAGNAME, SENTENCE_END_TAGNAME, PARAGRAPH_END_TAGNAME } from '../JLanguageToolConstants.js';
import { isEmpty, removeTashkeel } from '../text/StringTools.js';
import { NullPointerException } from '../../lib/java/errors.js';
import { arrayGet, listGet } from '../../lib/java/arrays.js';
import { javaCompare } from '../../lib/java/strings.js';
import { IncludeRange } from './Match.js';
import { convertCase as helperConvertCase } from './CaseConversionHelper.js';
import { PatternRuleMatcher } from './PatternRuleMatcher.js';

// Java: dereference of a possibly null value (NullPointerException)
function nn(x) {
  if (x === null || x === undefined) throw new NullPointerException();
  return x;
}

// Java: TreeSet<String>#add / toArray (natural String order, null not allowed)
class TreeSetOfString {
  constructor() {
    this.items = new Set();
  }

  add(s) {
    nn(s);
    this.items.add(s);
  }

  addAll(list) {
    for (const s of list) this.add(s);
  }

  isEmpty() {
    return this.items.size === 0;
  }

  toArray() {
    return [...this.items].sort(javaCompare);
  }
}

// Java: MatchState
export class MatchState {
  static FQCN = 'org.languagetool.rules.patterns.MatchState';

  // Java: MatchState#MatchState(Match,Synthesizer)
  constructor(match, synthesizer) {
    this.formattedToken = null;
    this.matchedToken = null;
    this.skippedTokens = null;
    this.match = match;
    this.synthesizer = synthesizer;
    const lemma = match.getLemma();
    if (!isEmpty(lemma)) {
      this.formattedToken = new AnalyzedTokenReadings(new AnalyzedToken(lemma, match.getPosTag(), lemma), 0);
    }
  }

  // Java: MatchState#setToken(AnalyzedTokenReadings) / setToken(AnalyzedTokenReadings[],int,int)
  setToken(token, index, next) {
    if (index === undefined) {
      if (this.match.isStaticLemma()) {
        this.matchedToken = token;
      } else {
        this.formattedToken = token;
      }
      return;
    }
    const tokens = token;
    let idx = index;
    if (index >= tokens.length) {
      // TODO: hacky workaround, find a proper solution. See EnglishPatternRuleTest.testBug()
      idx = tokens.length - 1;
    }
    this.setToken(arrayGet(tokens, idx));
    const includeSkipped = this.match.getIncludeSkipped();
    if (includeSkipped === IncludeRange.FOLLOWING) {
      this.formattedToken = null;
    }
    if (next > 1 && includeSkipped !== IncludeRange.NONE) {
      let sb = '';
      for (let k = index + 1; k < index + next; k++) {
        if (arrayGet(tokens, k).isWhitespaceBefore()
            && !(k === index + 1 && includeSkipped === IncludeRange.FOLLOWING)) {
          sb += ' ';
        }
        sb += arrayGet(tokens, k).getToken();
      }
      this.skippedTokens = sb;
    } else {
      this.skippedTokens = '';
    }
  }

  // Java: MatchState#filterReadings()
  filterReadings() {
    const l = [];
    if (this.formattedToken !== null) {
      if (this.match.isStaticLemma()) {
        // Note: we want the token without ignored characters so we can't use matchedToken.getToken()
        nn(this.matchedToken).leaveReading(new AnalyzedToken(this.matchedToken.getReadings()[0].getToken(),
          this.match.getPosTag(), this.formattedToken.getToken()));
        this.formattedToken = this.matchedToken;
      }
      // Note: we want the token without ignored characters so we can't use formattedToken.getToken()
      let token = this.formattedToken.getAnalyzedToken(0).getToken();
      const regexMatch = this.match.getRegexMatch();
      const regexReplace = this.match.getRegexReplace();
      if (regexMatch !== null && regexReplace !== null) {
        /* only replace if it is something to replace */
        token = regexMatch.matcher(token).replaceAll(regexReplace);
      }
      token = this.convertCase(token, token, null);

      const posTag = this.match.getPosTag();
      if (posTag !== null) {
        const numRead = this.formattedToken.getReadingsLength();
        if (this.match.isPostagRegexp()) {
          const pPosRegexMatch = this.match.getPosRegexMatch();
          const posTagReplace = this.match.getPosTagReplace();
          let targetPosTag;
          for (let i = 0; i < numRead; i++) {
            const testTag = this.formattedToken.getAnalyzedToken(i).getPOSTag();
            if (testTag !== null && nn(pPosRegexMatch).matcher(testTag).matches()) {
              targetPosTag = testTag;
              if (posTagReplace !== null) {
                targetPosTag = pPosRegexMatch.matcher(targetPosTag).replaceAll(posTagReplace);
              }
              l.push(new AnalyzedToken(token, targetPosTag,
                this.formattedToken.getAnalyzedToken(i).getLemma()));
              l[l.length - 1].setWhitespaceBefore(this.formattedToken.isWhitespaceBefore());
            }
          }
          if (l.length === 0) {
            l.push(...this.getNewToken(numRead, token));
          }
        } else {
          l.push(...this.getNewToken(numRead, token));
        }
        const lemma = this.formattedToken.getAnalyzedToken(0).getLemma();
        if (this.formattedToken.isSentenceEnd()) {
          l.push(new AnalyzedToken(this.formattedToken.getToken(), SENTENCE_END_TAGNAME, lemma));
        }
        if (this.formattedToken.isParagraphEnd()) {
          l.push(new AnalyzedToken(this.formattedToken.getToken(), PARAGRAPH_END_TAGNAME, lemma));
        }
      }
    }
    if (l.length === 0) {
      return this.formattedToken;
    }
    const anTkRead = new AnalyzedTokenReadings(l, this.formattedToken.getStartPos());
    // TODO: in case original had ignored characters we want to restore readings.token
    // but there's no setToken() available :(
    anTkRead.setWhitespaceBefore(this.formattedToken.getWhitespaceBefore());
    if (this.formattedToken.getChunkTags().length !== 0) {
      anTkRead.setChunkTags(this.formattedToken.getChunkTags());
    }
    if (this.formattedToken.isImmunized()) {
      anTkRead.immunize(this.formattedToken.getImmunizationSourceLine());
    }
    return anTkRead;
  }

  // Java: MatchState#convertCase(String,String,Language)
  convertCase(s, sample, lang) {
    return helperConvertCase(this.match.getCaseConversionType(), s, sample, lang);
  }

  // Java: MatchState#getNewToken(int,String)
  getNewToken(numRead, token) {
    const posTag = this.match.getPosTag();
    const list = [];
    let lemma = '';
    for (let j = 0; j < numRead; j++) {
      const tempPosTag = this.formattedToken.getAnalyzedToken(j).getPOSTag();
      if (tempPosTag !== null) {
        if (tempPosTag === posTag && this.formattedToken.getAnalyzedToken(j).getLemma() !== null) {
          lemma = this.formattedToken.getAnalyzedToken(j).getLemma();
        }
        if (isEmpty(lemma)) {
          lemma = this.formattedToken.getAnalyzedToken(0).getLemma();
        }
        list.push(new AnalyzedToken(token, posTag, lemma));
        list[list.length - 1].setWhitespaceBefore(
          this.formattedToken.isWhitespaceBefore());
      }
    }
    return list;
  }

  // Java: MatchState#toFinalString(Language)
  toFinalString(lang) {
    let formattedString = [null];
    if (this.formattedToken !== null) {
      const readingCount = this.formattedToken.getReadingsLength();
      formattedString[0] = this.formattedToken.getToken();

      const pRegexMatch = this.match.getRegexMatch();
      const regexReplace = this.match.getRegexReplace();
      if (pRegexMatch !== null) {
        if (lang !== null && lang.getShortCode() === 'ar') {
          formattedString[0] = removeTashkeel(formattedString[0]);
        }
        formattedString[0] = pRegexMatch.matcher(formattedString[0]).replaceAll(regexReplace);
      }

      const posTag = this.match.getPosTag();
      if (posTag !== null) {
        if (this.synthesizer === null) {
          formattedString[0] = this.formattedToken.getToken();
        } else if (this.match.isPostagRegexp()) {
          const wordForms = new TreeSetOfString();
          let oneForm = false;
          for (let k = 0; k < readingCount; k++) {
            if (this.formattedToken.getAnalyzedToken(k).getLemma() === null) {
              const posUnique = this.formattedToken.getAnalyzedToken(k).getPOSTag();
              if (posUnique === null) {
                wordForms.add(this.formattedToken.getToken());
                oneForm = true;
              } else {
                if (SENTENCE_START_TAGNAME === posUnique
                    || SENTENCE_END_TAGNAME === posUnique
                    || PARAGRAPH_END_TAGNAME === posUnique) {
                  if (!oneForm) {
                    wordForms.add(this.formattedToken.getToken());
                  }
                  oneForm = true;
                } else {
                  oneForm = false;
                }
              }
            }
          }
          const targetPosTag = this.getTargetPosTag();
          if (!oneForm) {
            for (let i = 0; i < readingCount; i++) {
              const possibleWordForms = this.synthesizer.synthesize(
                this.formattedToken.getAnalyzedToken(i), targetPosTag, true);
              if (possibleWordForms !== null && possibleWordForms !== undefined && possibleWordForms.length > 0) {
                wordForms.addAll(possibleWordForms);
              }
            }
          }
          if (wordForms.isEmpty()) {
            formattedString[0] = '(' + this.formattedToken.getToken() + ')';
          } else {
            formattedString = wordForms.toArray();
          }
        } else {
          const wordForms = new TreeSetOfString();
          for (let i = 0; i < readingCount; i++) {
            const possibleWordForms = this.synthesizer.synthesize(this.formattedToken.getAnalyzedToken(i), posTag);
            if (possibleWordForms !== null && possibleWordForms !== undefined) {
              wordForms.addAll(possibleWordForms);
            }
          }
          formattedString = wordForms.toArray();
        }
      }
    }
    let original;
    if (this.match.isStaticLemma()) {
      original = this.matchedToken !== null ? this.matchedToken.getToken() : '';
    } else {
      original = this.formattedToken !== null ? this.formattedToken.getToken() : '';
    }
    for (let i = 0; i < formattedString.length; i++) {
      formattedString[i] = this.convertCase((formattedString[i] !== null ? formattedString[i] : ''), original, lang);
    }
    // TODO should case conversion happen before or after including skipped tokens?
    const includeSkipped = this.match.getIncludeSkipped();
    if (includeSkipped !== IncludeRange.NONE && this.skippedTokens !== null
        && this.skippedTokens.length !== 0) {
      const helper = new Array(formattedString.length);
      for (let i = 0; i < formattedString.length; i++) {
        if (formattedString[i] === null) {
          formattedString[i] = '';
        }
        helper[i] = formattedString[i] + this.skippedTokens;
      }
      formattedString = helper;
    }
    if (this.match.checksSpelling() && lang !== null) {
      const formattedStringElements = formattedString.slice();
      // tagger-based speller
      const analyzed = lang.getTagger().tag(formattedStringElements);
      for (let i = 0; i < formattedString.length; i++) {
        const analyzedToken = listGet(analyzed, i).getAnalyzedToken(0);
        if (analyzedToken.getLemma() === null && analyzedToken.hasNoTag()) {
          formattedString[i] = PatternRuleMatcher.MISTAKE;
        }
      }
    }
    return formattedString;
  }

  // Java: MatchState#getTargetPosTag()
  getTargetPosTag() {
    let targetPosTag = this.match.getPosTag();
    const posTags = [];
    const pPosRegexMatch = this.match.getPosRegexMatch();
    const posTagReplace = this.match.getPosTagReplace();
    if (this.match.isStaticLemma()) {
      for (const analyzedToken of nn(this.matchedToken)) {
        const tst = analyzedToken.getPOSTag();
        if (tst !== null && nn(pPosRegexMatch).matcher(tst).matches()) {
          posTags.push(tst);
        }
      }
      targetPosTag = nn(this.synthesizer).getTargetPosTag(posTags, targetPosTag);
      if (pPosRegexMatch !== null && posTagReplace !== null && posTags.length !== 0) {
        targetPosTag = pPosRegexMatch.matcher(nn(targetPosTag)).replaceAll(posTagReplace);
      }
    } else {
      for (const analyzedToken of nn(this.formattedToken)) {
        const tst = analyzedToken.getPOSTag();
        if (tst !== null && nn(pPosRegexMatch).matcher(tst).matches()) {
          posTags.push(tst);
        }
      }
      targetPosTag = nn(this.synthesizer).getTargetPosTag(posTags, targetPosTag);
      if (pPosRegexMatch !== null && posTagReplace !== null) {
        if (posTags.length === 0) {
          posTags.push(targetPosTag);
        }
        let sb = '';
        const posTagLen = posTags.length;
        let l = 0;
        for (let lPosTag of posTags) {
          l++;
          lPosTag = pPosRegexMatch.matcher(nn(lPosTag)).replaceAll(posTagReplace);
          if (this.match.setsPos()) {
            lPosTag = this.synthesizer.getPosTagCorrection(lPosTag);
          }
          sb += lPosTag;
          if (l < posTagLen) {
            sb += '|';
          }
        }
        targetPosTag = sb;
      }
    }
    return targetPosTag;
  }

  // Java: MatchState#toTokenString()
  toTokenString() {
    const stringToFormat = this.toFinalString(null);
    return stringToFormat.join('|');
  }

  // Java: MatchState#getMatch()
  getMatch() {
    return this.match;
  }
}
