// org.languagetool.tagging.disambiguation.rules.DisambiguationRuleHandler (SAX handler for disambiguation.xml; loading only)
import { IllegalStateException, NullPointerException, SAXException } from '../../lib/java/errors.js';
import { listGet } from '../../lib/java/arrays.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { Integer } from '../../lib/java/int.js';
import { Locale } from '../../lib/java/Locale.js';
import { StringBuilder, toUpperCase } from '../../lib/java/strings.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { Languages } from '../Languages.js';
import { RuleEntityResolver } from '../resources/xml.js';
import { DisambiguatedExample } from '../text/SmallTypes.js';
import { Match } from '../patterns/Match.js';
import { XMLRuleHandler } from '../patterns/XMLRuleHandler.js';
import { DisambiguationPatternRule } from './DisambiguationPatternRule.js';

const { RULE, PATTERN, CASE_SENSITIVE, YES, ANTIPATTERN, EXCEPTION, AND, UNIFY, NEGATE, UNIFY_IGNORE, TYPE, TOKEN, POSTAG, MATCH,
  POSTAG_REGEXP, NO, RULEGROUP, UNIFICATION, FEATURE, EXAMPLE, MARKER, ID, NAME } = XMLRuleHandler;

const WD = 'wd';
const ACTION = 'action';
const DISAMBIG = 'disambig';

// Java: attrs.getValue(..).method() on a possibly absent attribute
function nn(v) {
  if (v === null || v === undefined) throw new NullPointerException('Cannot invoke "String.equals(Object)" because the return value of "org.xml.sax.Attributes.getValue(String)" is null');
  return v;
}

// Java: NPE helpful message of Match#setLemmaString(String) on a null receiver field
function matchNpe(field) {
  return new NullPointerException(`Cannot invoke "org.languagetool.rules.patterns.Match.setLemmaString(String)" because "this.${field}" is null`);
}

// Java: DisambiguationRuleHandler
export class DisambiguationRuleHandler extends XMLRuleHandler {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguationRuleHandler';

  // Java: DisambiguationRuleHandler(Language,String)
  constructor(lang, xmlPath) {
    super();
    this.rules = [];
    this.inDisambiguation = false;
    this.subId = 0;
    this.name = null;
    this.ruleGroupId = null;
    this.ruleGroupName = null;
    this.filterClassName = null;
    this.filterArgs = null;
    this.disamb = new StringBuilder();
    this.wd = new StringBuilder();
    this.example = new StringBuilder();
    this.antiPatternCounter = 0;
    this.inRule = false;
    this.rulegroupAntiPatterns = [];
    this.ruleAntiPatterns = [];
    this.inAntiPattern = false;
    this.inWord = false;
    this.disambiguatedPOS = null;
    this.startPos = -1;
    this.endPos = -1;
    this.tokenCountForMarker = 0;
    this.posSelector = null;
    this.uniCounter = 0;
    this.newWdList = null;
    this.wdLemma = null;
    this.wdPos = null;
    this.inExample = false;
    this.untouched = false;
    this.untouchedExamples = null;
    this.disambExamples = null;
    this.input = null;
    this.output = null;
    this.disambigAction = null;
    if (lang !== null && lang !== undefined) {
      this.language = Languages.getLanguageForShortCode(lang.getShortCodeWithCountryAndVariant());
    }
    this.sourceFile = xmlPath;
  }

  // Java: DisambiguationRuleHandler#resolveEntity(String,String); the scanner takes the resolver from parserOptions('disambiguation')
  resolveEntity(publicId, systemId) {
    return new RuleEntityResolver().resolveEntity(publicId, systemId);
  }

  // Java: DisambiguationRuleHandler#getDisambRules()
  getDisambRules() {
    return this.rules;
  }

  // ===========================================================
  // SAX DocumentHandler methods
  // ===========================================================

  // Java: DisambiguationRuleHandler#startElement(String,String,String,Attributes); the scanner passes (qName, attrs)
  startElement(qName, attrs) {
    switch (qName) {
      case RULE:
        this.inRule = true;
        this.id = attrs.getValue(ID);
        if (this.inRuleGroup) {
          this.subId++;
        }
        this.name = attrs.getValue(NAME);
        if (this.inRuleGroup && this.id === null) {
          this.id = this.ruleGroupId;
        }
        if (this.inRuleGroup && this.name === null) {
          this.name = this.ruleGroupName;
        }
        break;
      case 'rules':
        if (this.language === null) {
          this.language = Languages.getLanguageForShortCode(attrs.getValue('lang'));
        }
        break;
      case PATTERN:
        this.inPattern = true;
        this.tokenCountForMarker = 0;
        if (attrs.getValue(CASE_SENSITIVE) !== null && YES === attrs.getValue(CASE_SENSITIVE)) {
          this.caseSensitive = true;
        }
        break;
      case ANTIPATTERN:
        this.inAntiPattern = true;
        this.antiPatternCounter++;
        this.caseSensitive = YES === attrs.getValue(CASE_SENSITIVE);
        this.tokenCounter = 0;
        this.tokenCountForMarker = 0;
        break;
      case EXCEPTION:
        this.setExceptions(attrs);
        break;
      case AND:
        this.inAndGroup = true;
        this.tokenCountForMarker++;
        if (this.inUnification) {
          this.uniCounter++;
        }
        break;
      case UNIFY:
        this.inUnification = true;
        this.uniNegation = YES === attrs.getValue(NEGATE);
        this.uniCounter = 0;
        break;
      case UNIFY_IGNORE:
        this.inUnificationNeutral = true;
        break;
      case 'feature':
        this.uFeature = attrs.getValue(ID);
        break;
      case TYPE:
        this.uType = attrs.getValue(ID);
        this.uTypeList.push(this.uType);
        break;
      case TOKEN:
        this.setToken(attrs);
        if (!this.inAndGroup) {
          this.tokenCountForMarker++;
        }
        break;
      case DISAMBIG:
        this.inDisambiguation = true;
        this.disambiguatedPOS = attrs.getValue(POSTAG);
        if (attrs.getValue(ACTION) === null) {
          // default mode:
          this.disambigAction = DisambiguationPatternRule.DisambiguatorAction.REPLACE;
        } else {
          this.disambigAction = DisambiguationPatternRule.DisambiguatorAction
            .valueOf(toUpperCase(attrs.getValue(ACTION), Locale.ENGLISH));
        }
        this.disamb = new StringBuilder();
        break;
      case MATCH: {
        this.inMatch = true;
        this.match = new StringBuilder();
        let caseConversion = Match.CaseConversion.NONE;
        if (attrs.getValue('case_conversion') !== null) {
          caseConversion = Match.CaseConversion.valueOf(toUpperCase(attrs
            .getValue('case_conversion'), Locale.ENGLISH));
        }
        let includeRange = Match.IncludeRange.NONE;
        if (attrs.getValue('include_skipped') !== null) {
          includeRange = Match.IncludeRange.valueOf(toUpperCase(attrs
            .getValue('include_skipped'), Locale.ENGLISH));
        }
        const mWorker = new Match(attrs.getValue(POSTAG), attrs
          .getValue('postag_replace'), YES
          === attrs.getValue(POSTAG_REGEXP), attrs
          .getValue('regexp_match'), attrs.getValue('regexp_replace'),
        caseConversion, YES === attrs.getValue('setpos'),
        YES === attrs.getValue('suppress_mispelled'),
        includeRange);
        if (this.inDisambiguation) {
          if (attrs.getValue(NO) !== null) {
            const refNumber = Integer.parseInt(attrs.getValue(NO));
            this.refNumberSanityCheck(refNumber);
            mWorker.setTokenRef(refNumber);
            this.posSelector = mWorker;
          }
        } else if (this.inToken && attrs.getValue(NO) !== null) {
          const refNumber = Integer.parseInt(attrs.getValue(NO));
          this.refNumberSanityCheck(refNumber);
          mWorker.setTokenRef(refNumber);
          this.tokenReference = mWorker;
          this.elements.append('\\');
          this.elements.append(refNumber);
        }
        break;
      }
      case RULEGROUP:
        this.ruleGroupId = attrs.getValue(ID);
        this.ruleGroupName = attrs.getValue(NAME);
        this.inRuleGroup = true;
        this.subId = 0;
        if (this.rulegroupAntiPatterns !== null) {
          this.rulegroupAntiPatterns.length = 0;
        }
        this.antiPatternCounter = 0;
        break;
      case UNIFICATION:
        this.uFeature = attrs.getValue(FEATURE);
        this.inUnificationDef = true;
        break;
      case 'equivalence':
        this.uType = attrs.getValue(TYPE);
        break;
      case WD:
        this.wdLemma = attrs.getValue('lemma');
        this.wdPos = attrs.getValue('pos');
        this.inWord = true;
        this.wd = new StringBuilder();
        break;
      case EXAMPLE:
        this.inExample = true;
        if (this.untouchedExamples === null) {
          this.untouchedExamples = [];
        }
        if (this.disambExamples === null) {
          this.disambExamples = [];
        }
        this.untouched = nn(attrs.getValue(TYPE)) === 'untouched';
        if (nn(attrs.getValue(TYPE)) === 'ambiguous') {
          this.input = attrs.getValue('inputform');
          this.output = attrs.getValue('outputform');
        }
        this.example = new StringBuilder();
        break;
      case 'filter':
        this.filterClassName = attrs.getValue('class');
        this.filterArgs = attrs.getValue('args');
        break;
      case MARKER:
        if (this.inMarker) {
          throw new IllegalStateException('\'<marker>\' may not be nested in rule \'' + this.id + '\'');
        }
        this.example.append('<marker>');
        if (this.inPattern || this.inAntiPattern) {
          this.startPos = this.tokenCounter;
          this.inMarker = true;
        }
        break;
      default:
        break;
    }
  }

  // Java: DisambiguationRuleHandler#refNumberSanityCheck(int)
  refNumberSanityCheck(refNumber) {
    if (refNumber > this.patternTokens.length) {
      throw new SAXException('Only backward references in match elements are possible, tried to specify token '
        + refNumber + '\n Line: ' + this.pLocator.getLineNumber()
        + ', column: ' + this.pLocator.getColumnNumber() + '.');
    }
  }

  // Java: DisambiguationRuleHandler#endElement(String,String,String); the scanner passes (qName)
  endElement(qName) {
    switch (qName) {
      case RULE: {
        const rule = new DisambiguationPatternRule(this.id,
          this.name, this.language, this.patternTokens, this.disambiguatedPOS, this.posSelector,
          this.disambigAction);

        this.endPositionCorrection = this.endPos - this.tokenCountForMarker;
        if (this.startPos !== -1 && this.endPos !== -1) {
          rule.setStartPositionCorrection(this.startPos);
          rule.setEndPositionCorrection(this.endPositionCorrection);
        } else {
          this.startPos = 0;
          this.endPos = this.tokenCountForMarker;
        }
        rule.setSubId(this.inRuleGroup ? Integer.toString(this.subId) : '1');

        const matchedTokenCount = this.endPos - this.startPos;
        if (this.newWdList !== null) {
          if (this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.ADDCHUNK
              || this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.ADD || this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.REMOVE
              || this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.REPLACE) {
            if ((this.newWdList.length !== 0 && this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.REPLACE)
                && this.newWdList.length !== matchedTokenCount) {
              throw new SAXException(
                this.language.getName() + ' rule error. The number of interpretations specified with wd: '
                + this.newWdList.length
                + ' must be equal to the number of matched tokens (' + matchedTokenCount + ')'
                + '\n Line: ' + this.pLocator.getLineNumber() + ', column: '
                + this.pLocator.getColumnNumber() + '.');
            }
            rule.setNewInterpretations(this.newWdList.slice());
          }
          this.newWdList.length = 0;
        }
        this.caseSensitive = false;
        if (this.disambExamples !== null) {
          rule.setExamples(this.disambExamples);
        }
        if (this.untouchedExamples !== null) {
          rule.setUntouchedExamples(this.untouchedExamples);
        }
        XMLRuleHandler.setRuleFilter(this.filterClassName, this.filterArgs, rule);
        if (this.rulegroupAntiPatterns.length !== 0) {
          rule.setAntiPatterns(this.rulegroupAntiPatterns);
        }
        if (this.ruleAntiPatterns.length !== 0) {
          rule.setAntiPatterns(this.ruleAntiPatterns);
          this.ruleAntiPatterns.length = 0;
        }
        this.rules.push(rule);
        if (this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.UNIFY && matchedTokenCount !== this.uniCounter) {
          throw new SAXException(this.language.getName() + ' rule error. The number unified tokens: '
            + this.uniCounter + ' must be equal to the number of matched tokens: ' + matchedTokenCount
            + '\n Line: ' + this.pLocator.getLineNumber() + ', column: '
            + this.pLocator.getColumnNumber() + '.');
        }
        const singleTokenCorrection = this.endPos - this.startPos > 1;
        if ((!singleTokenCorrection && (this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.FILTER || this.disambigAction === DisambiguationPatternRule.DisambiguatorAction.REPLACE))
            && (matchedTokenCount > 1)) {
          throw new SAXException(
            this.language.getName() + ' rule error. Cannot replace or filter more than one token at a time.'
            + '\n Line: ' + this.pLocator.getLineNumber() + ', column: '
            + this.pLocator.getColumnNumber() + '.');
        }
        this.patternTokens.length = 0;
        this.posSelector = null;
        this.disambExamples = null;
        this.untouchedExamples = null;
        this.startPos = -1;
        this.endPos = -1;
        this.filterClassName = null;
        this.filterArgs = null;
        this.inRule = false;
        break;
      }
      case EXCEPTION:
        this.finalizeExceptions();
        break;
      case AND:
        this.inAndGroup = false;
        this.andGroupCounter = 0;
        this.tokenCounter++;
        break;
      case TOKEN:
        if (this.inUnification && !this.inAndGroup) {
          this.uniCounter++;
        }
        // The disambiguation Unifier is always in the default language variant
        this.finalizeTokens(this.language.getDefaultLanguageVariant().getDisambiguationUnifierConfiguration());
        break;
      case PATTERN:
        this.inPattern = false;
        this.tokenCounter = 0;
        break;
      case MATCH:
        if (this.inDisambiguation) {
          if (this.posSelector === null) throw matchNpe('posSelector');
          this.posSelector.setLemmaString(this.match.toString());
        } else if (this.inToken) {
          if (this.tokenReference === null) throw matchNpe('tokenReference');
          this.tokenReference.setLemmaString(this.match.toString());
        }
        this.inMatch = false;
        break;
      case DISAMBIG:
        this.inDisambiguation = false;
        break;
      case RULEGROUP:
        this.inRuleGroup = false;
        break;
      case UNIFICATION:
        if (this.inUnificationDef) {
          this.inUnificationDef = false;
          this.tokenCounter = 0;
        }
        break;
      case 'feature':
        this.equivalenceFeatures.put(this.uFeature, this.uTypeList);
        this.uTypeList = [];
        break;
      case UNIFY: {
        this.inUnification = false;
        this.equivalenceFeatures = new JavaHashMap();
        // set negation on the last token only!
        const lastElement = this.patternTokens.length - 1;
        listGet(this.patternTokens, lastElement).setLastInUnification();
        if (this.uniNegation) {
          listGet(this.patternTokens, lastElement).setUniNegation();
        }
        break;
      }
      case UNIFY_IGNORE:
        this.inUnificationNeutral = false;
        break;
      case WD:
        this.addNewWord(this.wd.toString(), this.wdLemma, this.wdPos);
        this.inWord = false;
        break;
      case ANTIPATTERN: {
        const disRule = new DisambiguationPatternRule(
          this.id + '_antipattern:' + this.antiPatternCounter,
          'antipattern', this.language, this.patternTokens, null, null,
          DisambiguationPatternRule.DisambiguatorAction.IMMUNIZE);
        if (this.startPos !== -1 && this.endPos !== -1) {
          disRule.setStartPositionCorrection(this.startPos);
          disRule.setEndPositionCorrection(this.endPos - this.tokenCountForMarker);
        }
        this.patternTokens.length = 0;
        if (this.inRule) {
          if (this.ruleAntiPatterns === null) {
            this.ruleAntiPatterns = [];
          }
          this.ruleAntiPatterns.push(disRule);
        } else { // a rulegroup shares all antipatterns not included in a single rule
          if (this.rulegroupAntiPatterns === null) {
            this.rulegroupAntiPatterns = [];
          }
          this.rulegroupAntiPatterns.push(disRule);
        }
        this.tokenCounter = 0;
        this.inAntiPattern = false;
        break;
      }
      case EXAMPLE:
        this.inExample = false;
        if (this.untouched) {
          this.untouchedExamples.push(this.example.toString());
        } else {
          this.disambExamples.push(new DisambiguatedExample(this.example.toString(), this.input, this.output));
        }
        break;
      case MARKER:
        this.example.append('</marker>');
        if (this.inPattern || this.inAntiPattern) {
          this.endPos = this.tokenCountForMarker;
          this.inMarker = false;
        }
        break;
      default:
        break;
    }
  }

  // Java: DisambiguationRuleHandler#addNewWord(String,String,String)
  addNewWord(word, lemma, pos) {
    const newWd = new AnalyzedToken(word, pos, lemma);
    if (this.newWdList === null) {
      this.newWdList = [];
    }
    this.newWdList.push(newWd);
  }

  // Java: DisambiguationRuleHandler#characters(char[],int,int); the scanner passes the text
  characters(s) {
    if (this.inException) {
      this.exceptions.append(s);
    } else if (this.inToken && (this.inPattern || this.inAntiPattern)) {
      this.elements.append(s);
    } else if (this.inMatch) {
      this.match.append(s);
    } else if (this.inWord) {
      this.wd.append(s);
    } else if (this.inDisambiguation) {
      this.disamb.append(s);
    } else if (this.inExample) {
      this.example.append(s);
    }
  }
}
