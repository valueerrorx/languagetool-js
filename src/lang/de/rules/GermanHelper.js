// org.languagetool.rules.de.GermanHelper (helper methods for working with German POS tags)
import { javaSplit } from '../../../lib/java/strings.js';
import { PARAGRAPH_END_TAGNAME, SENTENCE_END_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { AnalyzedGermanToken } from '../tagging/AnalyzedGermanToken.js';

// Java: GermanHelper#hasReadingOfType(AnalyzedTokenReadings,GermanToken.POSType)
export function hasReadingOfType(tokenReadings, type) {
  if (tokenReadings === null || tokenReadings === undefined) {
    return false;
  }
  for (const token of tokenReadings.getReadings()) {
    if (token.getPOSTag() !== null &&
        (token.getPOSTag() === SENTENCE_END_TAGNAME ||
         token.getPOSTag() === PARAGRAPH_END_TAGNAME)) {
      return false;
    }
    const germanToken = new AnalyzedGermanToken(token);
    if (germanToken.getType() === type) {
      return true;
    }
  }
  return false;
}

// Java: GermanHelper#getNounCase(String)
export function getNounCase(posTag) {
  // input e.g. SUB:AKK:SIN:NEU
  return getIndexOrEmptyString(posTag, 1);
}

// Java: GermanHelper#getNounNumber(String)
export function getNounNumber(posTag) {
  return getIndexOrEmptyString(posTag, 2);
}

// Java: GermanHelper#getNounGender(String)
export function getNounGender(posTag) {
  return getIndexOrEmptyString(posTag, 3);
}

// Java: GermanHelper#getDeterminerDefiniteness(String)
export function getDeterminerDefiniteness(posTag) {
  // input e.g. ART:DEF:DAT:SIN:FEM
  return getIndexOrEmptyString(posTag, 1);
}

// Java: GermanHelper#getComparison(String)
export function getComparison(posTag) {
  // input e.g. ADJ:AKK:PLU:MAS:KOM:SOL
  let cmp = getIndexOrEmptyString(posTag, 4);
  if (cmp !== 'GRU' && cmp !== 'KOM' && cmp !== 'SUP') {
    // for cases like "PA2:PRD:GRU:VER"
    cmp = getIndexOrEmptyString(posTag, 2);
  }
  return cmp;
}

// Java: GermanHelper#getDeterminerCase(String)
export function getDeterminerCase(posTag) {
  return getIndexOrEmptyString(posTag, 2);
}

// Java: GermanHelper#getDeterminerNumber(String)
export function getDeterminerNumber(posTag) {
  return getIndexOrEmptyString(posTag, 3);
}

// Java: GermanHelper#getDeterminerGender(String)
export function getDeterminerGender(posTag) {
  return getIndexOrEmptyString(posTag, 4);
}

// Java: GermanHelper#getIndexOrEmptyString(String,int)
function getIndexOrEmptyString(posTag, idx) {
  if (posTag === null || posTag === undefined) {
    return '';
  }
  const array = javaSplit(posTag, ':');
  if (array.length > idx) {
    return array[idx];
  } else {
    return '';
  }
}

export const GermanHelper = {
  hasReadingOfType, getNounCase, getNounNumber, getNounGender, getDeterminerDefiniteness, getComparison,
  getDeterminerCase, getDeterminerNumber, getDeterminerGender,
};
