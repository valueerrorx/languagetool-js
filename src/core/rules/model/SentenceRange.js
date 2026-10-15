// org.languagetool.SentenceRange
import { Pattern } from '../../../lib/java/regex/index.js';
import { Objects } from '../../../lib/java/Objects.js';
import { javaTrim } from '../../../lib/java/strings.js';

const BEGINS_WITH_SPACE = Pattern.compile('^\\s*');
const ENDS_WITH_SPACE = Pattern.compile('\\s+$');

export class SentenceRange {
  static FQCN = 'org.languagetool.SentenceRange';

  // Java: SentenceRange#SentenceRange(int,int)
  constructor(fromPos, toPos) {
    this.fromPos = fromPos;
    this.toPos = toPos;
  }

  // Java: SentenceRange#getRangesFromSentences(AnnotatedText,List)
  static getRangesFromSentences(annotatedText, sentences) {
    const sentenceRanges = [];
    let pos = 0;
    const markupTextLength = annotatedText.getTextWithMarkup().length;
    const diff = markupTextLength - annotatedText.getPlainText().length;
    for (const sentence of sentences) {
      if (javaTrim(sentence).length === 0) {
        pos += sentence.length;
        continue;
      }
      const sentenceNoBeginWhitespace = BEGINS_WITH_SPACE.matcher(sentence).replaceFirst('');
      const sentenceNoEndWhitespace = ENDS_WITH_SPACE.matcher(sentence).replaceFirst('');
      const fromPos = pos + (sentence.length - sentenceNoBeginWhitespace.length);
      const toPos = pos + sentenceNoEndWhitespace.length;
      let fromPosOrig = fromPos + diff;
      let toPosOrig = toPos + diff;
      if (fromPosOrig !== markupTextLength) {
        fromPosOrig = annotatedText.getOriginalTextPositionFor(fromPos, false);
      }
      if (toPosOrig !== markupTextLength) {
        toPosOrig = annotatedText.getOriginalTextPositionFor(toPos, true);
      }
      sentenceRanges.push(new SentenceRange(fromPosOrig, toPosOrig));
      pos += sentence.length;
    }
    return sentenceRanges;
  }

  // Java: SentenceRange#getFromPos()
  getFromPos() {
    return this.fromPos;
  }

  // Java: SentenceRange#getToPos()
  getToPos() {
    return this.toPos;
  }

  // Java: SentenceRange#toString()
  toString() {
    return `${this.fromPos}-${this.toPos}`;
  }

  // Java: SentenceRange#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.fromPos === o.fromPos && this.toPos === o.toPos;
  }

  // Java: SentenceRange#hashCode()
  hashCode() {
    return Objects.hash(this.fromPos, this.toPos);
  }

  // Java: SentenceRange#compareTo(SentenceRange)
  compareTo(o) {
    return this.fromPos < o.fromPos ? -1 : this.fromPos === o.fromPos ? 0 : 1;
  }
}
