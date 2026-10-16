// org.languagetool.rules.patterns.Match (configuration of a <match/> element; MatchState comes with F29)
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { isEmpty } from '../text/StringTools.js';
import { notPortedYet } from '../language/components.js';

// Java: Match.CaseConversion
export class CaseConversion extends JavaEnum {
  static FQCN = 'org.languagetool.rules.patterns.Match.CaseConversion';
}
['NONE', 'STARTLOWER', 'STARTUPPER', 'ALLLOWER', 'ALLUPPER', 'PRESERVE', 'FIRSTUPPER', 'NOTASHKEEL']
  .forEach((n, i) => { CaseConversion[n] = new CaseConversion(n, i); });

// Java: Match.IncludeRange
export class IncludeRange extends JavaEnum {
  static FQCN = 'org.languagetool.rules.patterns.Match.IncludeRange';
}
['NONE', 'FOLLOWING', 'ALL'].forEach((n, i) => { IncludeRange[n] = new IncludeRange(n, i); });

// Java: Match
export class Match {
  static FQCN = 'org.languagetool.rules.patterns.Match';
  static CaseConversion = CaseConversion;
  static IncludeRange = IncludeRange;

  // Java: Match#Match(String,String,boolean,String,String,CaseConversion,boolean,boolean,IncludeRange)
  constructor(posTag, posTagReplace, postagRegexp, regexMatch, regexReplace, caseConversionType, setPOS, suppressMisspelled, includeSkipped) {
    this.posTag = posTag;
    this.postagRegexp = postagRegexp;
    this.caseConversionType = caseConversionType;
    this.pRegexMatch = regexMatch !== null && regexMatch !== undefined ? Pattern.compile(regexMatch) : null;
    this.pPosRegexMatch = null;
    if (postagRegexp && posTag !== null && posTag !== undefined) {
      this.pPosRegexMatch = Pattern.compile(posTag);
    }
    this.regexReplace = regexReplace;
    this.posTagReplace = posTagReplace;
    this.setPos = setPOS;
    this.includeSkipped = includeSkipped;
    this.suppressMisspelled = suppressMisspelled;
    this.staticLemma = false;
    this.lemma = null;
    this.tokenRef = 0;
    this.inMessageOnly = false;
  }

  // Java: Match#createState(Synthesizer,AnalyzedTokenReadings) / createState(Synthesizer,AnalyzedTokenReadings[],int,int)
  createState() {
    throw notPortedYet('MatchState (F29)');
  }

  // Java: Match#setsPos()
  setsPos() {
    return this.setPos;
  }

  // Java: Match#posRegExp()
  posRegExp() {
    return this.postagRegexp;
  }

  // Java: Match#setLemmaString(String)
  setLemmaString(lemmaString) {
    if (!isEmpty(lemmaString)) {
      this.lemma = lemmaString;
      this.staticLemma = true;
      this.postagRegexp = true;
      if (this.posTag !== null && this.posTag !== undefined) {
        this.pPosRegexMatch = Pattern.compile(this.posTag);
      }
    }
  }

  // Java: Match#getLemma()
  getLemma() {
    return this.lemma;
  }

  // Java: Match#isStaticLemma()
  isStaticLemma() {
    return this.staticLemma;
  }

  // Java: Match#checksSpelling()
  checksSpelling() {
    return this.suppressMisspelled;
  }

  // Java: Match#setTokenRef(int)
  setTokenRef(i) {
    this.tokenRef = i;
  }

  // Java: Match#getTokenRef()
  getTokenRef() {
    return this.tokenRef;
  }

  // Java: Match#convertsCase()
  convertsCase() {
    return this.caseConversionType !== CaseConversion.NONE;
  }

  // Java: Match#getCaseConversionType()
  getCaseConversionType() {
    return this.caseConversionType;
  }

  // Java: Match#setInMessageOnly(boolean)
  setInMessageOnly(inMessageOnly) {
    this.inMessageOnly = inMessageOnly;
  }

  // Java: Match#isInMessageOnly()
  isInMessageOnly() {
    return this.inMessageOnly;
  }

  // Java: Match#getPosTag()
  getPosTag() {
    return this.posTag;
  }

  // Java: Match#getRegexMatch()
  getRegexMatch() {
    return this.pRegexMatch;
  }

  // Java: Match#getRegexReplace()
  getRegexReplace() {
    return this.regexReplace;
  }

  // Java: Match#getPosRegexMatch()
  getPosRegexMatch() {
    return this.pPosRegexMatch;
  }

  // Java: Match#isPostagRegexp()
  isPostagRegexp() {
    return this.postagRegexp;
  }

  // Java: Match#getPosTagReplace()
  getPosTagReplace() {
    return this.posTagReplace;
  }

  // Java: Match#getIncludeSkipped()
  getIncludeSkipped() {
    return this.includeSkipped;
  }
}
