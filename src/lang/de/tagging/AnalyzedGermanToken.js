// Java: org.languagetool.tagging.de.AnalyzedGermanToken (one reading of a German word, parsed from its POS tag)
import { splitByChar } from '../../../lib/java/StringUtils.js';
import { Determination, Genus, Kasus, Numerus, POSType } from './GermanToken.js';

// Java: AnalyzedGermanToken
export class AnalyzedGermanToken {
  static FQCN = 'org.languagetool.tagging.de.AnalyzedGermanToken';

  // Java: AnalyzedGermanToken#AnalyzedGermanToken(AnalyzedToken)
  constructor(token) {
    const posTag = token.getPOSTag();
    let parts;
    if (posTag === null || (parts = splitByChar(posTag, ':')).length < 3) {
      this.type = null;
      this.casus = null;
      this.numerus = null;
      this.genus = null;
      this.determination = null;
      return;
    }
    let tempType = null;
    let tempCasus = null;
    let tempNumerus = null;
    let tempGenus = null;
    let tempDetermination = null;
    for (const part of parts) {
      if (part === 'EIG') {
        tempType = POSType.PROPER_NOUN;
      } else if (part === 'SUB' && tempType === null) {
        tempType = POSType.NOMEN;
      } else if (part === 'PA1' || part === 'PA2') {
        tempType = POSType.PARTIZIP;
      } else if (part === 'VER' && tempType === null) {
        tempType = POSType.VERB;
      } else if (part === 'ADJ' && tempType === null) {
        tempType = POSType.ADJEKTIV;
      } else if (part === 'PRO' && tempType === null) {
        tempType = POSType.PRONOMEN;
      } else if (part === 'ART' && tempType === null) {
        tempType = POSType.DETERMINER;
      } else if (part === 'AKK') {
        tempCasus = Kasus.AKKUSATIV;
      } else if (part === 'GEN') {
        tempCasus = Kasus.GENITIV;
      } else if (part === 'NOM') {
        tempCasus = Kasus.NOMINATIV;
      } else if (part === 'DAT') {
        tempCasus = Kasus.DATIV;
      } else if (part === 'PLU') {
        tempNumerus = Numerus.PLURAL;
      } else if (part === 'SIN') {
        tempNumerus = Numerus.SINGULAR;
      } else if (part === 'MAS') {
        tempGenus = Genus.MASKULINUM;
      } else if (part === 'FEM') {
        tempGenus = Genus.FEMININUM;
      } else if (part === 'NEU') {
        tempGenus = Genus.NEUTRUM;
      } else if (part === 'NOG') {
        tempGenus = Genus.FEMININUM; // NOG = no genus because only used as plural
      } else if (part === 'ALG') {
        tempGenus = Genus.ALLGEMEIN;
      } else if (part === 'IND') {
        tempDetermination = Determination.INDEFINITE;
      } else if (part === 'DEF') {
        tempDetermination = Determination.DEFINITE;
      }
    }
    this.type = tempType;
    this.casus = tempCasus;
    this.numerus = tempNumerus;
    this.genus = tempGenus;
    this.determination = tempDetermination;
  }

  // Java: AnalyzedGermanToken#getType()
  getType() {
    return this.type;
  }

  // Java: AnalyzedGermanToken#getCasus()
  getCasus() {
    return this.casus;
  }

  // Java: AnalyzedGermanToken#getNumerus()
  getNumerus() {
    return this.numerus;
  }

  // Java: AnalyzedGermanToken#getGenus()
  getGenus() {
    return this.genus;
  }

  // Java: AnalyzedGermanToken#getDetermination()
  getDetermination() {
    return this.determination;
  }
}
