// Java: org.languagetool.tokenizers.SRXSentenceTokenizer
import { IMPLEMENTS } from '../../../lib/java/interfaces.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { registerComponent } from '../../language/components.js';
import { SentenceTokenizer } from './SentenceTokenizer.js';
import { createSrxDocument, tokenize } from './SrxTools.js';

export class SRXSentenceTokenizer {
  static FQCN = 'org.languagetool.tokenizers.SRXSentenceTokenizer';
  static [IMPLEMENTS] = [SentenceTokenizer];

  // Java: SRXSentenceTokenizer#SRXSentenceTokenizer(Language[,String])
  constructor(language, srxInClassPath = '/segment.srx') {
    if (language === null || language === undefined) throw new NullPointerException();
    this.language = language;
    this.srxDocument = createSrxDocument(srxInClassPath);
    this.parCode = null;
    this.setSingleLineBreaksMarksParagraph(false);
  }

  // Java: SRXSentenceTokenizer#tokenize(String)
  tokenize(text) {
    return tokenize(text, this.srxDocument, this.language.getShortCode() + this.parCode);
  }

  // Java: SRXSentenceTokenizer#singleLineBreaksMarksPara()
  singleLineBreaksMarksPara() {
    return '_one' === this.parCode;
  }

  // Java: SRXSentenceTokenizer#setSingleLineBreaksMarksParagraph(boolean)
  setSingleLineBreaksMarksParagraph(lineBreakParagraphs) {
    this.parCode = lineBreakParagraphs ? '_one' : '_two';
  }
}

registerComponent(SRXSentenceTokenizer.FQCN, (...args) => new SRXSentenceTokenizer(...args));
