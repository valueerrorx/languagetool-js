// org.languagetool.AnalyzedTokenReadings
import { Pattern } from '../lib/java/regex/index.js';
import { Objects } from '../lib/java/Objects.js';
import { arraysHashCode, listHashCode } from '../lib/java/hash.js';
import { NullPointerException, NoSuchElementException, ArrayIndexOutOfBoundsException, UnsupportedOperationException } from '../lib/java/errors.js';
import { toLowerCase } from '../lib/java/strings.js';
import { AnalyzedToken } from './AnalyzedToken.js';
import { GlobalConfig } from './rules/model/GlobalConfig.js';
import { SENTENCE_START_TAGNAME, SENTENCE_END_TAGNAME, PARAGRAPH_END_TAGNAME } from './JLanguageTool.js';
import { isWhitespace as stringToolsIsWhitespace } from './text/StringTools.js';

const NON_WORD_REGEX = Pattern.compile('[.?!…:;,~’\'"„“”»«‚‘›‹()\\[\\]\\-–—*×∗·+÷/=]');

// Java: dereference of a possibly null argument
function deref(x) {
  if (x === null || x === undefined) throw new NullPointerException();
  return x;
}

export class AnalyzedTokenReadings {
  static FQCN = 'org.languagetool.AnalyzedTokenReadings';

  // Java: AnalyzedTokenReadings(AnalyzedToken[],int) / (AnalyzedToken,int) / (List,int) / (AnalyzedTokenReadings,List,String) / (AnalyzedToken)
  constructor(tokens, startPos, ruleApplied) {
    if (tokens instanceof AnalyzedTokenReadings) {
      // Constructor from a previous AnalyzedTokenReadings with new readings, and annotation of the change
      const oldAtr = tokens;
      const newReadings = startPos;
      this.init(newReadings, oldAtr.getStartPos());
      if (oldAtr.isSentenceEnd()) {
        this.setSentEnd();
      }
      if (oldAtr.isParagraphEnd()) {
        this.setParagraphEnd();
      }
      this.setWhitespaceBefore(oldAtr.getWhitespaceBefore());
      this.setChunkTags(oldAtr.getChunkTags());
      if (oldAtr.isImmunized()) {
        this.immunize(oldAtr.getImmunizationSourceLine());
      }
      if (oldAtr.isIgnoredBySpeller()) {
        this.ignoreSpelling();
      }
      if (oldAtr.hasTypographicApostrophe()) {
        this.setTypographicApostrophe();
      }
      this.setHistoricalAnnotations(oldAtr.getHistoricalAnnotations());
      if (isRecordingHistoricalAnnotations(ruleApplied)) {
        this.addHistoricalAnnotations(oldAtr.toString(), ruleApplied);
      }
      return;
    }
    if (tokens instanceof AnalyzedToken) {
      this.init([tokens], startPos === undefined ? 0 : startPos);
    } else {
      this.init(tokens, startPos);
    }
  }

  // Java: AnalyzedTokenReadings(List<AnalyzedToken>,int)
  init(tokens, startPos) {
    this.isImmunizedFlag = false;
    this.immunizationSourceLine = 0;
    this.isIgnoredBySpellerFlag = false;
    this.historicalAnnotations = '';
    this.hasTypographicApostropheFlag = false;
    this.chunkTags = [];
    this.fixPos = 0;
    this.tokenLowerCase = null;
    this.cleanToken = null;
    this.anTokReadings = tokens.slice();
    this.startPos = startPos;
    if (this.anTokReadings.length === 0) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
    this.token = this.anTokReadings[0].getToken();
    this.isWhitespaceFlag = stringToolsIsWhitespace(this.token);
    this.isWhitespaceBeforeFlag = this.anTokReadings[0].isWhitespaceBefore();
    this.isLinebreakFlag = '\n' === this.token || '\r\n' === this.token || '\r' === this.token || '\n\r' === this.token;
    this.isSentStart = SENTENCE_START_TAGNAME === this.anTokReadings[0].getPOSTag();
    this.isParaEnd = this.hasPosTag(PARAGRAPH_END_TAGNAME);
    this.isSentEnd = this.hasPosTag(SENTENCE_END_TAGNAME);
    this.isPosTagUnknownFlag = tokens.length === 1 && tokens[0].getPOSTag() === null;
    this.setNoRealPOStag();
    this.hasSameLemmasFlag = this.areLemmasSame();
    this.whitespaceBeforeChar = '';
  }

  // Java: AnalyzedTokenReadings#getReadings()
  getReadings() {
    return this.anTokReadings;
  }

  // Java: AnalyzedTokenReadings#getAnalyzedToken(int)
  getAnalyzedToken(idx) {
    if (idx < 0 || idx >= this.anTokReadings.length) {
      throw new ArrayIndexOutOfBoundsException(`Index ${idx} out of bounds for length ${this.anTokReadings.length}`);
    }
    return this.anTokReadings[idx];
  }

  // Java: AnalyzedTokenReadings#hasPosTag(String)
  hasPosTag(posTag) {
    for (const reading of this.anTokReadings) {
      if (deref(posTag) === reading.getPOSTag()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasPosTagAndLemma(String,String)
  hasPosTagAndLemma(posTag, lemma) {
    for (const reading of this.anTokReadings) {
      if (deref(posTag) === reading.getPOSTag() && deref(lemma) === reading.getLemma()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasReading()
  hasReading() {
    return this.anTokReadings !== null && this.anTokReadings.length > 0;
  }

  // Java: AnalyzedTokenReadings#hasLemma(String)
  hasLemma(lemma) {
    for (const reading of this.anTokReadings) {
      if (reading.getLemma() !== null && deref(lemma) === reading.getLemma()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasAnyLemma(String...)
  hasAnyLemma(...lemmas) {
    for (const lemma of lemmas) {
      for (const reading of this.anTokReadings) {
        if (deref(lemma) === reading.getLemma()) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasPartialPosTag(String)
  hasPartialPosTag(posTag) {
    for (const reading of this.anTokReadings) {
      if (reading.getPOSTag() !== null && reading.getPOSTag().includes(deref(posTag))) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasAnyPartialPosTag(String...)
  hasAnyPartialPosTag(...posTags) {
    for (const posTag of posTags) {
      if (this.hasPartialPosTag(posTag)) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#hasPosTagStartingWith(String)
  hasPosTagStartingWith(posTag) {
    for (const reading of this.anTokReadings) {
      if (reading.getPOSTag() !== null && reading.getPOSTag().startsWith(deref(posTag))) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#matchesPosTagRegex(String) / (Pattern)
  matchesPosTagRegex(posTagRegex) {
    const pattern = typeof posTagRegex === 'string' ? Pattern.compile(posTagRegex) : posTagRegex;
    for (const reading of this.anTokReadings) {
      if (reading.getPOSTag() !== null && pattern.matcher(reading.getPOSTag()).matches()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#matchesChunkRegex(String)
  matchesChunkRegex(chunkRegex) {
    const pattern = Pattern.compile(chunkRegex);
    for (const chunk of this.getChunkTags()) {
      if (chunk !== null && pattern.matcher(chunk.getChunkTag()).matches()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#readingWithTagRegex(String) / (Pattern)
  readingWithTagRegex(posTagRegex) {
    const pattern = typeof posTagRegex === 'string' ? Pattern.compile(posTagRegex) : posTagRegex;
    for (const reading of this.anTokReadings) {
      if (reading.getPOSTag() !== null && pattern.matcher(reading.getPOSTag()).matches()) {
        return reading;
      }
    }
    return null;
  }

  // Java: AnalyzedTokenReadings#readingWithLemma(String)
  readingWithLemma(lemma) {
    for (const reading of this.anTokReadings) {
      if (reading.getLemma() !== null && reading.getLemma() === lemma) {
        return reading;
      }
    }
    return null;
  }

  // Java: AnalyzedTokenReadings#addReading(AnalyzedToken,String)
  addReading(token, ruleApplied) {
    const oldValue = isRecordingHistoricalAnnotations(ruleApplied) ? this.toString() : null;
    const l = this.anTokReadings.slice(0, this.anTokReadings.length - 1);
    if (this.anTokReadings[this.anTokReadings.length - 1].getPOSTag() !== null) {
      l.push(this.anTokReadings[this.anTokReadings.length - 1]);
    }
    token.setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    l.push(token);
    this.anTokReadings = l;
    if (token.getToken().length > this.token.length) { // in case a longer token is added
      this.token = token.getToken();
      this.tokenLowerCase = null;
    }
    this.anTokReadings[this.anTokReadings.length - 1].setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    this.isParaEnd = this.hasPosTag(PARAGRAPH_END_TAGNAME);
    this.isSentEnd = this.hasPosTag(SENTENCE_END_TAGNAME);
    this.setNoRealPOStag();
    this.hasSameLemmasFlag = this.areLemmasSame();
    this.addHistoricalAnnotations(oldValue, ruleApplied);
  }

  // Java: AnalyzedTokenReadings#removeReading(AnalyzedToken,String)
  removeReading(token, ruleApplied) {
    const oldValue = isRecordingHistoricalAnnotations(ruleApplied) ? this.toString() : null;
    const l = [];
    const tmpTok = new AnalyzedToken(token.getToken(), token.getPOSTag(), token.getLemma());
    tmpTok.setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    let removedSentEnd = false;
    let removedParaEnd = false;
    for (const anTokReading of this.anTokReadings) {
      if (!anTokReading.matches(tmpTok)) {
        l.push(anTokReading);
      } else if (SENTENCE_END_TAGNAME === anTokReading.getPOSTag()) {
        removedSentEnd = true;
      } else if (PARAGRAPH_END_TAGNAME === anTokReading.getPOSTag()) {
        removedParaEnd = true;
      }
    }
    if (l.length === 0) {
      l.push(new AnalyzedToken(this.token, null, null));
      l[0].setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    }
    this.anTokReadings = l;
    this.setNoRealPOStag();
    if (removedSentEnd) {
      this.isSentEnd = false;
      this.setSentEnd();
    }
    if (removedParaEnd) {
      this.isParaEnd = false;
      this.setParagraphEnd();
    }
    this.hasSameLemmasFlag = this.areLemmasSame();
    this.addHistoricalAnnotations(oldValue, ruleApplied);
  }

  // Java: AnalyzedTokenReadings#leaveReading(AnalyzedToken)
  leaveReading(token) {
    const l = [];
    const tmpTok = new AnalyzedToken(token.getToken(), token.getPOSTag(), token.getLemma());
    tmpTok.setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    for (const anTokReading of this.anTokReadings) {
      if (anTokReading.matches(tmpTok)) {
        l.push(anTokReading);
      }
    }
    if (l.length === 0) {
      l.push(new AnalyzedToken(this.token, null, null));
      l[0].setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    }
    this.anTokReadings = l;
    this.setNoRealPOStag();
    this.hasSameLemmasFlag = this.areLemmasSame();
  }

  // Java: AnalyzedTokenReadings#getReadingsLength()
  getReadingsLength() {
    return this.anTokReadings.length;
  }

  // Java: AnalyzedTokenReadings#isWhitespace()
  isWhitespace() {
    return this.isWhitespaceFlag;
  }

  // Java: AnalyzedTokenReadings#isLinebreak()
  isLinebreak() {
    return this.isLinebreakFlag;
  }

  // Java: AnalyzedTokenReadings#isSentenceStart()
  isSentenceStart() {
    return this.isSentStart;
  }

  // Java: AnalyzedTokenReadings#isParagraphEnd()
  isParagraphEnd() {
    return this.isParaEnd;
  }

  // Java: AnalyzedTokenReadings#setParagraphEnd()
  setParagraphEnd() {
    if (!this.isParagraphEnd()) {
      const paragraphEnd = new AnalyzedToken(this.getToken(),
        PARAGRAPH_END_TAGNAME, this.getAnalyzedToken(0).getLemma());
      this.addReading(paragraphEnd, 'add_paragaph_end');
    }
  }

  // Java: AnalyzedTokenReadings#isSentenceEnd()
  isSentenceEnd() {
    return this.isSentEnd;
  }

  // Java: AnalyzedTokenReadings#isFieldCode()
  isFieldCode() {
    return '\u0001' === this.token || '\u0002' === this.token;
  }

  // Java: AnalyzedTokenReadings#setSentEnd()
  setSentEnd() {
    if (!this.isSentenceEnd()) {
      const sentenceEnd = new AnalyzedToken(this.getToken(),
        SENTENCE_END_TAGNAME, this.getAnalyzedToken(0).getLemma());
      this.addReading(sentenceEnd, '');
    }
  }

  // Java: AnalyzedTokenReadings#getStartPos()
  getStartPos() {
    return this.startPos;
  }

  // Java: AnalyzedTokenReadings#getEndPos()
  getEndPos() {
    return (this.startPos + this.token.length) | 0;
  }

  // Java: AnalyzedTokenReadings#setStartPos(int)
  setStartPos(position) {
    this.startPos = position;
  }

  // Java: AnalyzedTokenReadings#setPosFix(int)
  setPosFix(fix) {
    this.fixPos = fix;
  }

  // Java: AnalyzedTokenReadings#getPosFix()
  getPosFix() {
    return this.fixPos;
  }

  // Java: AnalyzedTokenReadings#getToken()
  getToken() {
    return this.token;
  }

  // Java: AnalyzedTokenReadings#setWhitespaceBefore(String)
  setWhitespaceBefore(prevToken) {
    this.isWhitespaceBeforeFlag = prevToken.length !== 0 && stringToolsIsWhitespace(prevToken);
    for (const aTok of this.anTokReadings) {
      aTok.setWhitespaceBefore(this.isWhitespaceBeforeFlag);
    }
    if (this.isWhitespaceBeforeFlag) {
      this.whitespaceBeforeChar = prevToken;
    }
  }

  // Java: AnalyzedTokenReadings#getWhitespaceBefore()
  getWhitespaceBefore() {
    return this.whitespaceBeforeChar;
  }

  // Java: AnalyzedTokenReadings#isWhitespaceBefore()
  isWhitespaceBefore() {
    return this.isWhitespaceBeforeFlag;
  }

  // Java: AnalyzedTokenReadings#immunize(int)
  immunize(sourceLine) {
    this.isImmunizedFlag = true;
    this.immunizationSourceLine = sourceLine;
  }

  // Java: AnalyzedTokenReadings#isImmunized() (debug log line "'<token>' is immunized by antipattern in line <n>" omitted, log lines are not compared)
  isImmunized() {
    return this.isImmunizedFlag;
  }

  // Java: AnalyzedTokenReadings#getImmunizationSourceLine()
  getImmunizationSourceLine() {
    return this.immunizationSourceLine;
  }

  // Java: AnalyzedTokenReadings#ignoreSpelling()
  ignoreSpelling() {
    this.isIgnoredBySpellerFlag = true;
  }

  // Java: AnalyzedTokenReadings#isIgnoredBySpeller()
  isIgnoredBySpeller() {
    return this.isIgnoredBySpellerFlag;
  }

  // Java: AnalyzedTokenReadings#isPosTagUnknown()
  isPosTagUnknown() {
    return this.isPosTagUnknownFlag;
  }

  // Java: AnalyzedTokenReadings#setNoRealPOStag()
  setNoRealPOStag() {
    let hasNoPOStag = !this.isLinebreak();
    for (const an of this.anTokReadings) {
      const posTag = an.getPOSTag();
      if (PARAGRAPH_END_TAGNAME === posTag ||
          SENTENCE_END_TAGNAME === posTag) {
        continue;
      }
      if (posTag !== null) {
        hasNoPOStag = false;
        break;
      }
    }
    for (const an of this.anTokReadings) {
      an.setNoPOSTag(hasNoPOStag);
    }
  }

  // Java: AnalyzedTokenReadings#getHistoricalAnnotations()
  getHistoricalAnnotations() {
    return this.historicalAnnotations;
  }

  // Java: AnalyzedTokenReadings#setHistoricalAnnotations(String)
  setHistoricalAnnotations(historicalAnnotations) {
    if (GlobalConfig.isVerbose()) {
      this.historicalAnnotations = historicalAnnotations;
    }
  }

  // Java: AnalyzedTokenReadings#addHistoricalAnnotations(String,String)
  addHistoricalAnnotations(oldValue, ruleApplied) {
    if (isRecordingHistoricalAnnotations(ruleApplied)) {
      this.historicalAnnotations = this.getHistoricalAnnotations() + '\n' + ruleApplied + ': ' + oldValue + ' -> '
          + this;
    }
  }

  // Java: AnalyzedTokenReadings#getTokenLowerCase() (package-private)
  getTokenLowerCase() {
    let result = this.tokenLowerCase;
    if (result === null) {
      result = toLowerCase(this.token);
      this.tokenLowerCase = result;
    }
    return result;
  }

  // Java: AnalyzedTokenReadings#setChunkTags(List)
  setChunkTags(chunkTags) {
    this.chunkTags = Objects.requireNonNull(chunkTags);
  }

  // Java: AnalyzedTokenReadings#getChunkTags()
  getChunkTags() {
    return this.chunkTags;
  }

  // Java: AnalyzedTokenReadings#toString()
  toString() {
    let sb = '';
    sb += this.token;
    sb += '[';
    for (const element of this.anTokReadings) {
      sb += element.toString();
      if (!element.isWhitespaceBefore()) {
        sb += '*';
      }
      sb += ',';
    }
    sb = sb.substring(0, sb.length - 1);
    if (this.chunkTags.length !== 0) {
      sb += ',';
      sb += this.chunkTags.map((c) => (c === null || c === undefined ? '' : c.toString())).join('|');
    }
    sb += ']';
    if (this.isImmunized()) {
      sb += '{!},';
    }
    return sb;
  }

  // Java: AnalyzedTokenReadings#isTagged()
  isTagged() {
    for (const element of this.anTokReadings) {
      if (!element.hasNoTag()) {
        return true;
      }
    }
    return false;
  }

  // Java: AnalyzedTokenReadings#areLemmasSame()
  areLemmasSame() {
    const previousLemma = this.anTokReadings[0].getLemma();
    if (previousLemma === null) {
      for (const element of this.anTokReadings) {
        if (element.getLemma() !== null) {
          return false;
        }
      }
      return true;
    }
    for (const element of this.anTokReadings) {
      if (previousLemma !== element.getLemma()) {
        return false;
      }
    }
    return true;
  }

  // Java: AnalyzedTokenReadings#hasSameLemmas()
  hasSameLemmas() {
    return this.hasSameLemmasFlag;
  }

  // Java: AnalyzedTokenReadings#isNonWord()
  isNonWord() {
    return NON_WORD_REGEX.matcher(this.token).matches();
  }

  // Java: AnalyzedTokenReadings#hashCode()
  hashCode() {
    return (arraysHashCode(this.anTokReadings) +
      Objects.hash(this.isLinebreakFlag, this.isParaEnd, this.isSentEnd, this.isSentStart, this.isWhitespaceFlag,
        this.isWhitespaceBeforeFlag, { hashCode: () => listHashCode(this.chunkTags) }, this.startPos, this.token)) | 0;
  }

  // Java: AnalyzedTokenReadings#equals(Object)
  equals(obj) {
    if (this === obj) { return true; }
    if (obj === null || obj === undefined || obj.constructor !== this.constructor) {
      return false;
    }
    const other = obj;
    return this.anTokReadings.length === other.anTokReadings.length
      && this.anTokReadings.every((t, i) => Objects.equals(t, other.anTokReadings[i]))
      && this.isLinebreakFlag === other.isLinebreakFlag
      && this.isParaEnd === other.isParaEnd
      && this.isSentEnd === other.isSentEnd
      && this.isSentStart === other.isSentStart
      && this.isWhitespaceFlag === other.isWhitespaceFlag
      && this.isWhitespaceBeforeFlag === other.isWhitespaceBeforeFlag
      && this.isImmunizedFlag === other.isImmunizedFlag
      && this.startPos === other.startPos
      && this.chunkTags.length === other.chunkTags.length
      && this.chunkTags.every((c, i) => Objects.equals(c, other.chunkTags[i]))
      && this.hasSameLemmasFlag === other.hasSameLemmasFlag
      && this.isIgnoredBySpellerFlag === other.isIgnoredBySpellerFlag
      && this.token === other.token
      && this.hasTypographicApostropheFlag === other.hasTypographicApostropheFlag;
  }

  // Java: AnalyzedTokenReadings#iterator()
  iterator() {
    let i = 0;
    const self = this;
    return {
      // Java: Iterator#hasNext()
      hasNext() {
        return i < self.getReadingsLength();
      },
      // Java: Iterator#next()
      next() {
        const idx = i;
        i += 1;
        if (idx < 0 || idx >= self.anTokReadings.length) {
          throw new NoSuchElementException(`No such element: ${i}, element count: ${self.anTokReadings.length}`);
        }
        return self.anTokReadings[idx];
      },
      // Java: Iterator#remove()
      remove() {
        throw new UnsupportedOperationException();
      },
    };
  }

  // Java: Iterable#iterator() as JS iteration protocol
  [Symbol.iterator]() {
    const it = this.iterator();
    return {
      next: () => (it.hasNext() ? { value: it.next(), done: false } : { value: undefined, done: true }),
    };
  }

  // Java: AnalyzedTokenReadings#setCleanToken(String)
  setCleanToken(cleanToken) {
    this.cleanToken = cleanToken;
  }

  // Java: AnalyzedTokenReadings#getCleanToken()
  getCleanToken() {
    return this.cleanToken !== null ? this.cleanToken : this.token;
  }

  // Java: AnalyzedTokenReadings#setTypographicApostrophe()
  setTypographicApostrophe() {
    this.hasTypographicApostropheFlag = true;
  }

  // Java: AnalyzedTokenReadings#hasTypographicApostrophe()
  hasTypographicApostrophe() {
    return this.hasTypographicApostropheFlag;
  }
}

// Java: AnalyzedTokenReadings#isRecordingHistoricalAnnotations(String)
function isRecordingHistoricalAnnotations(ruleApplied) {
  return ruleApplied.length !== 0 && GlobalConfig.isVerbose();
}
