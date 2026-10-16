// Java: org.languagetool.language.identifier.detector.UnicodeBasedDetector
import { isDigit, isWhitespace } from '../../../../lib/java/Character.js';

const DEFAULT_MAX_CHECK_LENGTH = 50;
const THRESHOLD = 0.5; // 0.5f is exact

// Java: (float) a / b compared with a float threshold (int operands < 2^24: double division then fround is exact)
const ratio = (a, b) => Math.fround(a / b);

// Java: org.languagetool.language.identifier.detector.UnicodeBasedDetector
export class UnicodeBasedDetector {
  // Java: UnicodeBasedDetector#UnicodeBasedDetector() / (int)
  constructor(maxCheckLength = DEFAULT_MAX_CHECK_LENGTH) {
    this.maxCheckLength = maxCheckLength;
  }

  // Java: UnicodeBasedDetector#getDominantLangCodes(String)
  getDominantLangCodes(str) {
    let arabicChars = 0;
    let cyrillicChars = 0;
    let cjkChars = 0;
    let khmerChars = 0;
    let tamilChars = 0;
    let greekChars = 0;
    let devanagariChars = 0;
    let thaiChars = 0;
    let hebrewChars = 0;
    let hangulChars = 0;
    let significantChars = 0;
    const n = Math.min(str.length, this.maxCheckLength);
    for (let i = 0; i < n; i++) {
      const val = str.charCodeAt(i);
      if (!isWhitespace(val) && !isDigit(val) && val !== 0x2e) significantChars++;
      if (val >= 0x0600 && val <= 0x06ff) arabicChars++;
      if (val >= 0x0400 && val <= 0x04ff) cyrillicChars++;
      if ((val >= 0x4e00 && val <= 0x9fff) || (val >= 0x3040 && val <= 0x309f) || (val >= 0x30a0 && val <= 0x30ff)) cjkChars++;
      if (val >= 0x1780 && val <= 0x17ff) khmerChars++;
      if (val >= 0xb82 && val <= 0xbfa) tamilChars++;
      if ((val >= 0x0370 && val <= 0x03ff) || (val >= 0x1f00 && val <= 0x1fff)) greekChars++;
      if (val >= 0x0900 && val <= 0x097f) devanagariChars++;
      if (val >= 0x0e00 && val <= 0x0e7f) thaiChars++;
      if ((val >= 0x0590 && val <= 0x05ff) || (val >= 0xfb1d && val <= 0xfb40)) hebrewChars++;
      if ((val >= 0xac00 && val <= 0xd7af) || (val >= 0x1100 && val <= 0x11ff) || (val >= 0x3130 && val <= 0x318f)
        || (val >= 0xa960 && val <= 0xa97f) || (val >= 0xd7b0 && val <= 0xd7ff)) hangulChars++;
    }
    const langCodes = [];
    if (ratio(arabicChars, significantChars) >= THRESHOLD) langCodes.push('ar', 'fa');
    if (ratio(cyrillicChars, significantChars) >= THRESHOLD) langCodes.push('ru', 'uk', 'be');
    if (ratio(cjkChars, significantChars) >= THRESHOLD) langCodes.push('zh', 'ja'); // Korean: see hangulChars
    if (ratio(khmerChars, significantChars) >= THRESHOLD) langCodes.push('km');
    if (ratio(tamilChars, significantChars) >= THRESHOLD) langCodes.push('ta');
    if (ratio(greekChars, significantChars) >= THRESHOLD) langCodes.push('el');
    if (ratio(devanagariChars, significantChars) >= THRESHOLD) langCodes.push('hi', 'mr');
    if (ratio(thaiChars, significantChars) >= THRESHOLD) langCodes.push('th');
    if (ratio(hebrewChars, significantChars) >= THRESHOLD) langCodes.push('he');
    if (ratio(hangulChars, significantChars) >= THRESHOLD) langCodes.push('ko');
    return langCodes;
  }
}
