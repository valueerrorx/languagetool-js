// org.languagetool.rules.patterns.PatternRuleHandler (SAX handler that turns grammar.xml into PatternRule/RegexPatternRule objects)
import { IllegalStateException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { listGet } from '../../lib/java/arrays.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { StringBuilder, javaSplit } from '../../lib/java/strings.js';
import { MalformedURLException, URL } from '../../lib/java/URL.js';
import { Languages } from '../Languages.js';
import { RuleEntityResolver } from '../resources/xml.js';
import { getMessageBundleForLanguage } from '../resources/ResourceBundleTools.js';
import { Category, CategoryId } from '../rules/model/Category.js';
import { CorrectExample, ErrorTriggeringExample, IncorrectExample } from '../rules/model/Examples.js';
import { ITSIssueType } from '../rules/model/ITSIssueType.js';
import { DisambiguationPatternRule } from '../disambiguation/DisambiguationPatternRule.js';
import { PatternRule } from './PatternRule.js';
import { RegexPatternRule } from './RegexPatternRule.js';
import { RegexpMode, XMLRuleHandler } from './XMLRuleHandler.js';

const { ID, NAME, PREMIUM, YES, OFF, GOAL_SPECIFIC, TRUE, FALSE, TEMP_OFF, DEFAULT, TYPE, CASE_SENSITIVE, MARK, PATTERN, ANTIPATTERN,
  MATCH, UNIFICATION, RULE, RULEGROUP, NO, PHRASES, MESSAGE, SUGGESTION, TABNAME, MINPREVMATCHES, DISTANCETOKENS, PRIO, AND, OR, UNIFY,
  UNIFY_IGNORE, FEATURE, TOKEN, EXCEPTION, EXAMPLE, MARKER } = XMLRuleHandler;

const MARKER_TAG = '<marker>';
const RAW_TAG = 'raw_pos';
const PLEASE_SPELL_ME = '<pleasespellme/>';

const EXTERNAL = 'external';

// Java: PatternRuleHandler
export class PatternRuleHandler extends XMLRuleHandler {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleHandler';
  static TYPE = TYPE;
  static MARKER_TAG = MARKER_TAG;
  static RAW_TAG = RAW_TAG;
  static PLEASE_SPELL_ME = PLEASE_SPELL_ME;

  // Java: PatternRuleHandler() / (String) / (String,Language)
  constructor(sourceFile = null, lang = null) {
    super();
    this.category = null;
    this.categoryIssueType = null;
    this.ruleGroupIssueType = null;
    this.ruleIssueType = null;
    this.name = null;
    this.filterClassName = null;
    this.filterArgs = null;

    this.rulegroupAntiPatterns = [];
    this.ruleAntiPatterns = [];
    this.subId = 0;
    this.interpretPosTagsPreDisambiguation = false;

    this.defaultOff = false;
    this.defaultTempOff = false;
    this.ruleGroupDefaultOff = false;
    this.ruleGroupDefaultTempOff = false;

    this.ruleGroupDescription = null;
    this.startPos = -1;
    this.endPos = -1;
    this.tokenCountForMarker = 0;

    this.antiPatternCounter = 0;

    this.inRule = false;

    this.relaxedMode = false;
    this.inAntiPattern = false;

    this.isRuleSuppressMisspelled = false;
    this.isSuggestionSuppressMisspelled = false;

    this.minPrevMatches = 0;
    this.ruleGroupMinPrevMatches = 0;
    this.distanceTokens = 0;
    this.ruleGroupDistanceTokens = 0;

    this.idPrefix = null;
    this.internedUrls = new Map();

    this.sourceFile = sourceFile;
    if (lang !== null && lang !== undefined) {
      this.language = Languages.getLanguageForShortCode(lang.getShortCodeWithCountryAndVariant());
    }
  }

  // Java: PatternRuleHandler#resolveEntity(String,String); the scanner takes the resolver from parserOptions('pattern')
  resolveEntity(publicId, systemId) {
    return new RuleEntityResolver().resolveEntity(publicId, systemId);
  }

  /**
   * If set to true, don't throw an exception if id or name is not set.
   * Used for online rule editor.
   */
  // Java: PatternRuleHandler#setRelaxedMode(boolean)
  setRelaxedMode(relaxedMode) {
    this.relaxedMode = relaxedMode;
  }

  // ===========================================================
  // SAX DocumentHandler methods
  // ===========================================================

  // Java: PatternRuleHandler#startElement(String,String,String,Attributes); the scanner passes (qName, attrs)
  startElement(qName, attrs) {
    switch (qName) {
      case 'category': {
        const catName = attrs.getValue(NAME);
        this.premiumCategoryAttribute = attrs.getValue(PREMIUM); // check if all rules should be premium by default in this category
        const catId = attrs.getValue(ID);
        const location = YES === attrs.getValue(EXTERNAL) ? Category.Location.EXTERNAL : Category.Location.INTERNAL;
        const onByDefault = OFF !== attrs.getValue(DEFAULT);
        const tabName = attrs.getValue(TABNAME);
        this.category = new Category(new CategoryId(catId), catName, location, onByDefault, tabName);
        if (attrs.getValue(TYPE) !== null) {
          this.categoryIssueType = attrs.getValue(TYPE);
        }
        if (attrs.getValue('tags') !== null) {
          this.categoryTags.push(...javaSplit(attrs.getValue('tags'), ' '));
        }
        if (attrs.getValue('tone_tags') !== null) {
          this.categoryToneTags.push(...javaSplit(attrs.getValue('tone_tags'), ' '));
        }
        this.isGoalSpecificCategoryAttribute = attrs.getValue(GOAL_SPECIFIC);
        const prioCategoryAttributeValue = attrs.getValue(PRIO);
        if (prioCategoryAttributeValue !== null) {
          this.prioCategoryAttribute = Integer.parseInt(prioCategoryAttributeValue);
        }
        break;
      }
      case 'rules': {
        const languageStr = attrs.getValue('lang');
        this.premiumFileAttribute = attrs.getValue(PREMIUM); // check if all rules should be premium by default in this file
        this.idPrefix = attrs.getValue('idprefix');
        if (this.language === null) {
          this.language = Languages.getLanguageForShortCode(languageStr);
        }
        this.messages = getMessageBundleForLanguage(this.language);
        break;
      }
      case 'regexp':
        this.inRegex = true;
        this.regexMode = 'exact' === attrs.getValue('type') ? RegexpMode.EXACT : RegexpMode.SMART;
        this.regexCaseSensitive = attrs.getValue(CASE_SENSITIVE) !== null && YES === attrs.getValue(CASE_SENSITIVE);
        this.regexpMark = attrs.getValue(MARK) !== null ? Integer.parseInt(attrs.getValue(MARK)) : 0;
        break;
      case RULE: {
        this.xmlLineNumber = this.pLocator.getLineNumber();
        this.regex = new StringBuilder();
        this.inRule = true;
        this.shortMessage = new StringBuilder();
        this.message = new StringBuilder();
        this.suggestionsOutMsg = new StringBuilder();
        this.url = new StringBuilder();
        this.id = attrs.getValue(ID);
        this.name = attrs.getValue(NAME);
        const minPrevMatchesStr = attrs.getValue(MINPREVMATCHES);
        if (minPrevMatchesStr !== null) {
          if (this.inRuleGroup && this.ruleGroupMinPrevMatches > 0) {
            throw new RuntimeException('Rule group ' + this.ruleGroupId + ' has ' + MINPREVMATCHES + '=' + this.ruleGroupMinPrevMatches
              + ', thus rule ' + this.id + ' cannot specify ' + MINPREVMATCHES);
          }
          this.minPrevMatches = Integer.parseInt(minPrevMatchesStr);
        } else {
          this.minPrevMatches = this.ruleGroupMinPrevMatches;
        }
        const distanceTokensStr = attrs.getValue(DISTANCETOKENS);
        if (distanceTokensStr !== null) {
          if (this.inRuleGroup && this.ruleGroupDistanceTokens > 0) {
            throw new RuntimeException('Rule group ' + this.ruleGroupId + ' has ' + DISTANCETOKENS + '=' + this.ruleGroupDistanceTokens
              + ', thus rule ' + this.id + ' cannot specify ' + DISTANCETOKENS);
          }
          this.distanceTokens = Integer.parseInt(distanceTokensStr);
        } else {
          this.distanceTokens = this.ruleGroupDistanceTokens;
        }
        const premiumRule = attrs.getValue(PREMIUM);
        // check if this rule is premium
        if (premiumRule !== null) {
          if (YES === premiumRule) {
            this.isPremiumRule = true;
          } else if (NO === premiumRule) {
            this.isPremiumRule = false;
          }
        } else if (this.premiumRuleGroupAttribute !== null) {
          if (YES === this.premiumRuleGroupAttribute) {
            this.isPremiumRule = true;
          } else if (NO === this.premiumRuleGroupAttribute) {
            this.isPremiumRule = false;
          }
        } else if (this.premiumCategoryAttribute !== null) {
          if (YES === this.premiumCategoryAttribute) {
            this.isPremiumRule = true;
          } else if (NO === this.premiumCategoryAttribute) {
            this.isPremiumRule = false;
          }
        } else if (this.premiumFileAttribute !== null) {
          if (YES === this.premiumFileAttribute) {
            this.isPremiumRule = true;
          } else if (NO === this.premiumFileAttribute) {
            this.isPremiumRule = false;
          }
        } else {
          this.isPremiumRule = false;
        }
        if (this.inRuleGroup) {
          this.subId++;
          if (this.id === null) {
            this.id = this.ruleGroupId;
          }
          if (this.name === null) {
            this.name = this.ruleGroupDescription;
          }
        }
        if (this.id === null && !this.relaxedMode) {
          throw new RuntimeException('id is null for rule with name \'' + this.name + '\'');
        }
        this.id = this.idPrefix !== null ? this.idPrefix + this.id : this.id;
        if (this.inRuleGroup && this.ruleGroupDefaultOff && attrs.getValue(DEFAULT) !== null) {
          throw new RuntimeException('Rule group ' + this.ruleGroupId + ' is off by default, thus a subrule of ' + this.id + ' cannot specify \'default=...\'. \u001b[1m Remove \'default=...\' from rule group or subrule level in ' + this.ruleGroupId + '!\u001b[0m');
        }
        if (this.inRuleGroup && this.ruleGroupDefaultTempOff && attrs.getValue(DEFAULT) !== null) {
          throw new RuntimeException('Rule group ' + this.ruleGroupId + ' is off by default, thus a subrule of ' + this.id + ' cannot specify \'default=...\'. \u001b[1m Remove \'default=...\' from rule group or subrule level in ' + this.ruleGroupId + '!\u001b[0m');
        }
        if (this.inRuleGroup && this.ruleGroupDefaultOff) {
          this.defaultOff = true;
        } else if (this.inRuleGroup && this.ruleGroupDefaultTempOff) {
          this.defaultTempOff = true;
        } else {
          this.defaultOff = OFF === attrs.getValue(DEFAULT);
          this.defaultTempOff = TEMP_OFF === attrs.getValue(DEFAULT);
        }
        this.correctExamples = [];
        this.antipatternExamples = [];
        this.incorrectExamples = [];
        this.errorTriggeringExamples = [];
        this.suggestionMatches.length = 0;
        this.suggestionMatchesOutMsg.length = 0;
        if (attrs.getValue(TYPE) !== null) {
          this.ruleIssueType = attrs.getValue(TYPE);
        }
        this.isRuleSuppressMisspelled = false;
        if (attrs.getValue('tags') !== null) {
          this.ruleTags.push(...javaSplit(attrs.getValue('tags'), ' '));
        }
        if (attrs.getValue('tone_tags') !== null) {
          this.ruleToneTags.push(...javaSplit(attrs.getValue('tone_tags'), ' '));
        }
        const isGoalSpecificRule = attrs.getValue(GOAL_SPECIFIC);
        // check if this rule is goal specific
        if (isGoalSpecificRule !== null) {
          if (TRUE === isGoalSpecificRule) {
            this.isGoalSpecific = true;
          } else if (FALSE === isGoalSpecificRule) {
            this.isGoalSpecific = false;
          }
        } else if (this.isGoalSpecificRuleGroupAttribute !== null) {
          if (TRUE === this.isGoalSpecificRuleGroupAttribute) {
            this.isGoalSpecific = true;
          } else if (FALSE === this.isGoalSpecificRuleGroupAttribute) {
            this.isGoalSpecific = false;
          }
        } else if (this.isGoalSpecificCategoryAttribute !== null) {
          if (TRUE === this.isGoalSpecificCategoryAttribute) {
            this.isGoalSpecific = true;
          } else if (FALSE === this.isGoalSpecificCategoryAttribute) {
            this.isGoalSpecific = false;
          }
        } else {
          this.isGoalSpecific = false;
        }
        const prioRuleAttributeValue = attrs.getValue(PRIO);
        if (prioRuleAttributeValue !== null) {
          this.prioRuleAttribute = Integer.parseInt(prioRuleAttributeValue);
        }
        break;
      }
      case PATTERN:
        this.startPattern(attrs);
        this.tokenCountForMarker = 0;
        this.interpretPosTagsPreDisambiguation = YES === attrs.getValue(RAW_TAG);
        break;
      case ANTIPATTERN:
        this.xmlLineNumberAntiPattern = this.pLocator.getLineNumber();
        this.inAntiPattern = true;
        this.antiPatternCounter++;
        this.caseSensitive = YES === attrs.getValue(CASE_SENSITIVE);
        this.tokenCounter = 0;
        this.tokenCountForMarker = 0;
        break;
      case AND:
        this.inAndGroup = true;
        this.tokenCountForMarker++;
        break;
      case OR:
        this.inOrGroup = true;
        this.tokenCountForMarker++;
        break;
      case UNIFY:
        this.inUnification = true;
        this.uniNegation = YES === attrs.getValue(XMLRuleHandler.NEGATE);
        break;
      case UNIFY_IGNORE:
        this.inUnificationNeutral = true;
        break;
      case FEATURE:
        this.uFeature = attrs.getValue(ID);
        break;
      case TYPE:
        this.uType = attrs.getValue(ID);
        this.uTypeList.push(this.uType);
        break;
      case TOKEN:
        this.setToken(attrs);
        if (!this.inAndGroup && !this.inOrGroup) {
          this.tokenCountForMarker++;
        }
        break;
      case EXCEPTION:
        this.setExceptions(attrs);
        break;
      case EXAMPLE: {
        const typeVal = attrs.getValue(TYPE);
        if (this.inAntiPattern) {
          if (this.inRuleGroup && !this.inRule) {
            this.inAntiPatternForRuleGroupExample = true;
            this.antiPatternForRuleGroupExample = new StringBuilder();
          } else {
            this.inAntiPatternExample = true;
            this.antiPatternExample = new StringBuilder();
          }
        } else if ('incorrect' === typeVal || attrs.getValue('correction') !== null) {
          this.inIncorrectExample = true;
          this.incorrectExample = new StringBuilder();
          if (attrs.getValue('correction') !== null) {
            this.exampleCorrection = new StringBuilder();
            this.exampleCorrection.append(attrs.getValue('correction'));
          }
        } else if ('triggers_error' === typeVal) {
          this.inErrorTriggerExample = true;
          this.errorTriggerExample = new StringBuilder();
        } else {
          // no attribute implies the sentence is a correct example
          this.inCorrectExample = true;
          this.correctExample = new StringBuilder();
        }
        break;
      }
      case 'filter':
        this.filterClassName = attrs.getValue('class');
        this.filterArgs = attrs.getValue('args');
        break;
      case MESSAGE:
        this.inMessage = true;
        this.inSuggestion = false;
        this.message = new StringBuilder();
        this.isRuleSuppressMisspelled = YES === attrs.getValue('suppress_misspelled');
        if (this.isRuleSuppressMisspelled) {
          this.message.append(PLEASE_SPELL_ME);
        }
        break;
      case SUGGESTION: {
        let strToAppend = '<suggestion>';
        this.isSuggestionSuppressMisspelled = YES === attrs.getValue('suppress_misspelled');
        if (this.isSuggestionSuppressMisspelled || this.isRuleSuppressMisspelled) {
          strToAppend = strToAppend + PLEASE_SPELL_ME;
        }
        if (this.inMessage) {
          this.message.append(strToAppend);
        } else { // suggestions outside message
          this.suggestionsOutMsg.append(strToAppend);
        }
        this.inSuggestion = true;
        break;
      }
      case 'short':
        if (this.inRule) {
          this.inShortMessage = true;
          this.shortMessage = new StringBuilder();
        } else {
          this.inShortMessageForRuleGroup = true;
          this.shortMessageForRuleGroup = new StringBuilder();
        }
        break;
      case 'url':
        if (this.inRule) {
          this.inUrl = true;
          this.url = new StringBuilder();
        } else {
          this.inUrlForRuleGroup = true;
          this.urlForRuleGroup = new StringBuilder();
        }
        break;
      case RULEGROUP: {
        this.ruleGroupId = attrs.getValue(ID);
        this.premiumRuleGroupAttribute = attrs.getValue(PREMIUM);
        this.ruleGroupDescription = attrs.getValue(NAME);
        this.ruleGroupDefaultOff = OFF === attrs.getValue(DEFAULT);
        this.ruleGroupDefaultTempOff = TEMP_OFF === attrs.getValue(DEFAULT);
        this.urlForRuleGroup = new StringBuilder();
        this.shortMessageForRuleGroup = new StringBuilder();
        this.inRuleGroup = true;
        this.subId = 0;
        if (attrs.getValue(TYPE) !== null) {
          this.ruleGroupIssueType = attrs.getValue(TYPE);
        }
        if (attrs.getValue('tags') !== null) {
          this.ruleGroupTags.push(...javaSplit(attrs.getValue('tags'), ' '));
        }
        if (attrs.getValue('tone_tags') !== null) {
          this.ruleGroupToneTags.push(...javaSplit(attrs.getValue('tone_tags'), ' '));
        }
        this.isGoalSpecificRuleGroupAttribute = attrs.getValue(GOAL_SPECIFIC);
        const minPrevMatchesStr2 = attrs.getValue(MINPREVMATCHES);
        if (minPrevMatchesStr2 !== null) {
          this.ruleGroupMinPrevMatches = Integer.parseInt(minPrevMatchesStr2);
        }
        const distanceTokensStr2 = attrs.getValue(DISTANCETOKENS);
        if (distanceTokensStr2 !== null) {
          this.ruleGroupDistanceTokens = Integer.parseInt(distanceTokensStr2);
        }
        this.antipatternForRuleGroupsExamples = [];
        const prioRuleGroupAttributeValue = attrs.getValue(PRIO);
        if (prioRuleGroupAttributeValue !== null) {
          this.prioRuleGroupAttribute = Integer.parseInt(prioRuleGroupAttributeValue);
        }
        break;
      }
      case MATCH:
        this.setMatchElement(attrs, this.inSuggestion && (this.isSuggestionSuppressMisspelled || this.isRuleSuppressMisspelled));
        break;
      case MARKER:
        if (this.inMarker) {
          throw new IllegalStateException('\'<marker>\' may not be nested in rule \'' + this.id + '\'');
        }
        if (this.inIncorrectExample) {
          this.incorrectExample.append(MARKER_TAG);
        } else if (this.inCorrectExample) {
          this.correctExample.append(MARKER_TAG);
        } else if (this.inErrorTriggerExample) {
          this.errorTriggerExample.append(MARKER_TAG);
        } else if (this.inPattern || this.inAntiPattern) {
          this.startPos = this.tokenCounter;
          this.inMarker = true;
        }
        break;
      case UNIFICATION:
        this.uFeature = attrs.getValue('feature');
        this.inUnificationDef = true;
        break;
      case 'equivalence':
        this.uType = attrs.getValue(TYPE);
        break;
      case PHRASES:
        this.inPhrases = true;
        break;
      case 'includephrases':
        break;
      case 'phrase':
        if (this.inPhrases) {
          this.phraseId = attrs.getValue(ID);
        }
        break;
      case 'phraseref':
        if (attrs.getValue('idref') !== null) {
          this.preparePhrase(attrs);
          this.tokenCountForMarker++;
        }
        break;
      default:
        break;
    }
  }

  // Java: PatternRuleHandler#endElement(String,String,String); the scanner passes (qName)
  endElement(qName) {
    switch (qName) {
      case 'category':
        this.categoryIssueType = null;
        this.categoryTags.length = 0;
        this.categoryToneTags.length = 0;
        this.isGoalSpecific = false;
        this.premiumCategoryAttribute = null;
        this.isGoalSpecificCategoryAttribute = null;
        this.prioCategoryAttribute = 0;
        break;
      case 'regexp':
        this.inRegex = false;
        break;
      case RULE:
        this.suggestionMatchesOutMsg = this.addLegacyMatches(this.suggestionMatchesOutMsg, this.suggestionsOutMsg.toString(), false);
        if (this.relaxedMode && this.id === null) {
          this.id = '';
        }
        if (this.relaxedMode && this.name === null) {
          this.name = '';
        }
        if (this.phrasePatternTokens.length === 0) {
          // Elements contain information whether they are inside a <marker>...</marker>,
          // but for phraserefs this depends on the position where the phraseref is used
          // not where it's defined. Thus we have to copy the elements so each use of
          // the phraseref can carry their own information:
          const tmpPatternTokens = [];
          this.createRules(this.patternTokens.slice(), tmpPatternTokens, 0);
        } else {
          if (this.patternTokens.length !== 0) {
            for (const ph of this.phrasePatternTokens) {
              ph.push(...this.patternTokens);
            }
          }
          for (const phrasePatternToken of this.phrasePatternTokens) {
            this.processElement(phrasePatternToken);
            const tmpPatternTokens = [];
            this.createRules(phrasePatternToken, tmpPatternTokens, 0);
          }
        }
        this.patternTokens.length = 0;
        if (this.phrasePatternTokens !== null) {
          this.phrasePatternTokens.length = 0;
        }
        this.ruleIssueType = null;
        this.inRule = false;
        this.filterClassName = null;
        this.filterArgs = null;
        this.minPrevMatches = 0;
        this.distanceTokens = 0;
        this.ruleTags.length = 0;
        this.ruleToneTags.length = 0;
        this.isPremiumRule = false;
        this.isGoalSpecific = false;
        this.prioRuleAttribute = 0;
        break;
      case EXCEPTION:
        this.finalizeExceptions();
        break;
      case AND:
        this.inAndGroup = false;
        this.andGroupCounter = 0;
        this.tokenCounter++;
        break;
      case OR:
        this.inOrGroup = false;
        this.orGroupCounter = 0;
        this.tokenCounter++;
        break;
      case TOKEN:
        this.finalizeTokens(this.language.getUnifierConfiguration());
        break;
      case PATTERN:
        this.inPattern = false;
        if (this.lastPhrase) {
          this.patternTokens.length = 0;
        }
        this.tokenCounter = 0;
        break;
      case ANTIPATTERN: {
        let antiId = this.id;
        if (this.inRuleGroup) {
          if (this.subId > 0) {
            antiId = this.ruleGroupId + '[' + this.subId + ']';
          } else {
            antiId = this.ruleGroupId;
          }
        }
        const rule = new DisambiguationPatternRule(
          antiId + '_antipattern:' + this.antiPatternCounter,
          'antipattern', this.language, this.patternTokens, null, null,
          DisambiguationPatternRule.DisambiguatorAction.IMMUNIZE);
        rule.setXmlLineNumber(this.xmlLineNumberAntiPattern);
        if (this.startPos !== -1 && this.endPos !== -1) {
          rule.setStartPositionCorrection(this.startPos);
          rule.setEndPositionCorrection(this.endPos - this.tokenCountForMarker);
        } else {
          // No '<marker>'? Then add artificial <marker>s around all tokens to work
          // around issue https://github.com/languagetool-org/languagetool/issues/189:
          for (const patternToken of this.patternTokens) {
            patternToken.setInsideMarker(true);
          }
        }
        this.patternTokens.length = 0;
        if (this.inRule) {
          this.ruleAntiPatterns.push(rule);
        } else { // a rulegroup shares all antipatterns not included in a single rule
          this.rulegroupAntiPatterns.push(rule);
        }
        this.tokenCounter = 0;
        this.inAntiPattern = false;
        this.endPos = -1;
        this.startPos = -1;
        this.inAntiPatternExample = false;
        this.xmlLineNumberAntiPattern = -1;
        break;
      }
      case EXAMPLE:
        if (this.inAntiPatternExample) {
          this.antipatternExamples.push(new CorrectExample(this.antiPatternExample.toString()));
        } else if (this.inAntiPatternForRuleGroupExample) {
          this.antipatternForRuleGroupsExamples.push(new CorrectExample(this.antiPatternForRuleGroupExample.toString()));
        } else if (this.inCorrectExample) {
          this.correctExamples.push(new CorrectExample(this.correctExample.toString()));
        } else if (this.inIncorrectExample) {
          if (this.inAntiPattern) {
            throw new RuntimeException('<antipattern>s can only contain <example>s without errors (i.e. no \'correction=...\'). '
              + 'Rule id: ' + this.id + '[' + this.subId + '], antipattern no ' + this.antiPatternCounter);
          }
          let example;
          if (this.exampleCorrection === null) {
            example = new IncorrectExample(this.incorrectExample.toString());
          } else {
            const corrections = javaSplit(this.exampleCorrection.toString(), '\\|');
            if (this.exampleCorrection.toString().endsWith('|')) { // suggestions plus an empty suggestion (split() will ignore trailing empty items)
              corrections.push('');
            }
            example = new IncorrectExample(this.incorrectExample.toString(), corrections);
          }
          this.incorrectExamples.push(example);
        } else if (this.inErrorTriggerExample) {
          this.errorTriggeringExamples.push(new ErrorTriggeringExample(this.errorTriggerExample.toString()));
        }
        this.inCorrectExample = false;
        this.inIncorrectExample = false;
        this.inErrorTriggerExample = false;
        this.correctExample = new StringBuilder();
        this.incorrectExample = new StringBuilder();
        this.errorTriggerExample = new StringBuilder();
        this.exampleCorrection = null;
        this.antiPatternExample = new StringBuilder();
        this.antiPatternForRuleGroupExample = new StringBuilder();
        this.inAntiPatternExample = false;
        this.inAntiPatternForRuleGroupExample = false;
        break;
      case MESSAGE:
        this.suggestionMatches = this.addLegacyMatches(this.suggestionMatches, this.message.toString(), true);
        this.inMessage = false;
        break;
      case SUGGESTION:
        if (this.inMessage) {
          this.message.append('</suggestion>');
        } else { // suggestion outside message
          this.suggestionsOutMsg.append('</suggestion>');
        }
        this.inSuggestion = false;
        break;
      case 'short':
        this.inShortMessage = false;
        this.inShortMessageForRuleGroup = false;
        break;
      case 'url':
        this.inUrl = false;
        this.inUrlForRuleGroup = false;
        break;
      case MATCH:
        if (this.inMessage) {
          listGet(this.suggestionMatches, this.suggestionMatches.length - 1).setLemmaString(this.match.toString());
        } else if (this.inSuggestion) {
          listGet(this.suggestionMatchesOutMsg, this.suggestionMatchesOutMsg.length - 1).setLemmaString(this.match.toString());
        } else if (this.inToken) {
          if (this.tokenReference === null) {
            throw new NullPointerException('Cannot invoke "org.languagetool.rules.patterns.Match.setLemmaString(String)" because "this.tokenReference" is null');
          }
          this.tokenReference.setLemmaString(this.match.toString());
        }
        this.inMatch = false;
        break;
      case RULEGROUP:
        this.urlForRuleGroup = new StringBuilder();
        this.shortMessageForRuleGroup = new StringBuilder();
        this.inRuleGroup = false;
        this.ruleGroupIssueType = null;
        this.rulegroupAntiPatterns.length = 0;
        this.antiPatternCounter = 0;
        this.ruleGroupDefaultOff = false;
        this.ruleGroupDefaultTempOff = false;
        this.defaultOff = false;
        this.defaultTempOff = false;
        this.ruleGroupMinPrevMatches = 0;
        this.ruleGroupDistanceTokens = 0;
        this.ruleGroupTags.length = 0;
        this.ruleGroupToneTags.length = 0;
        this.premiumRuleGroupAttribute = null;
        this.isGoalSpecificRuleGroupAttribute = null;
        this.antipatternForRuleGroupsExamples.length = 0;
        this.prioRuleGroupAttribute = 0;
        break;
      case MARKER:
        if (this.inCorrectExample) {
          this.correctExample.append('</marker>');
        } else if (this.inIncorrectExample) {
          this.incorrectExample.append('</marker>');
        } else if (this.inErrorTriggerExample) {
          this.errorTriggerExample.append('</marker>');
        } else if (this.inPattern || this.inAntiPattern) {
          this.endPos = this.tokenCountForMarker;
          this.inMarker = false;
        }
        break;
      case 'phrase':
        if (this.inPhrases) {
          this.finalizePhrase();
        }
        break;
      case 'includephrases':
        this.patternTokens.length = 0;
        break;
      case PHRASES:
        if (this.inPhrases) {
          this.inPhrases = false;
        }
        break;
      case UNIFICATION:
        this.inUnificationDef = false;
        break;
      case FEATURE:
        this.equivalenceFeatures.set(this.uFeature, this.uTypeList);
        this.uTypeList = [];
        break;
      case UNIFY: {
        this.inUnification = false;
        // clear the features...
        this.equivalenceFeatures = new Map();
        // set negation on the last token only!
        const lastElement = this.patternTokens.length - 1;
        listGet(this.patternTokens, lastElement).setLastInUnification();
        if (this.uniNegation) {
          this.patternTokens[lastElement].setUniNegation();
        }
        break;
      }
      case UNIFY_IGNORE:
        this.inUnificationNeutral = false;
        break;
      default:
        break;
    }
  }

  /**
   * Create rule from an Element list.
   * In case of OR groups, several rules are created recursively.
   *
   * @param elemList The complete original Element list
   * @param tmpPatternTokens Temporary list being created
   * @param numElement Index of elemList being analyzed
   */
  // Java: PatternRuleHandler#createRules(List,List,int)
  createRules(elemList, tmpPatternTokens, numElement) {
    let shortMessage = '';
    if (this.shortMessage !== null && this.shortMessage.length() > 0) {
      shortMessage = this.shortMessage.toString();
    } else if (this.shortMessageForRuleGroup !== null && this.shortMessageForRuleGroup.length() > 0) {
      shortMessage = this.shortMessageForRuleGroup.toString();
    }
    if (this.minPrevMatches > 0 && shortMessage.length === 0 && this.messages !== null) {
      // it's a word repetition rule
      shortMessage = this.messages.getString('desc_repetition_short');
    }
    if (numElement >= elemList.length) {
      let rule;
      if (tmpPatternTokens.length > 0) {
        rule = new PatternRule(this.id, this.language, tmpPatternTokens, this.name,
          this.message.toString(), shortMessage,
          this.suggestionsOutMsg.toString(), this.phrasePatternTokens.length > 1, this.interpretPosTagsPreDisambiguation);
        rule.addTags(this.ruleTags);
        rule.addTags(this.ruleGroupTags);
        rule.addTags(this.categoryTags);
        rule.addToneTags(this.ruleToneTags);
        rule.addToneTags(this.ruleGroupToneTags);
        rule.setSourceFile(this.sourceFile);
        rule.setMinPrevMatches(this.minPrevMatches);
        rule.setDistanceTokens(this.distanceTokens);
        rule.setXmlLineNumber(this.xmlLineNumber);
      } else if (this.regex.length() > 0) {
        // UNICODE_CHARACTER_CLASS (equivalent to the inline (?U) flag) makes \b, \w, \d and \s
        // Unicode-aware. Without it the behavior of word boundaries next to non-ASCII letters
        // depends on the JDK version (it changed between JDK 17 and JDK 21), which breaks many
        // <regexp> rules. Setting it here avoids adding (?U) by hand to every <regexp> pattern.
        const flags = Pattern.UNICODE_CHARACTER_CLASS | (this.regexCaseSensitive ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        let regexStr = this.regex.toString();
        if (this.regexMode === RegexpMode.SMART) {
          // Note: it's not that easy to add \b because the regex might look like '(foo)' or '\d' so we cannot just look at the last character
          regexStr = this.replaceSpacesInRegex(regexStr);
        }
        if (this.ruleAntiPatterns.length > 0 || this.rulegroupAntiPatterns.length > 0) {
          throw new RuntimeException('<regexp> rules currently cannot be used together with <antipattern>. Rule id: ' + this.id + '[' + this.subId + ']');
        }
        rule = new RegexPatternRule(this.id, this.name, this.message.toString(), shortMessage, this.suggestionsOutMsg.toString(), this.language, Pattern.compile(regexStr, flags), this.regexpMark);
        rule.setSourceFile(this.sourceFile);
      } else {
        throw new IllegalStateException('Neither \'<pattern>\' tokens nor \'<regexp>\' is set in rule \'' + this.id + '\'');
      }
      XMLRuleHandler.setRuleFilter(this.filterClassName, this.filterArgs, rule);
      this.prepareRule(rule);
      this.rules.push(rule);
    } else {
      const patternToken = elemList[numElement];
      if (patternToken.hasOrGroup()) {
        // When creating a new rule, we finally clear the backed-up variables. All the elements in
        // the OR group should share the values of backed-up variables. That's why these variables
        // are backed-up.
        const suggestionMatchesBackup = this.suggestionMatches.slice();
        const suggestionMatchesOutMsgBackup = this.suggestionMatchesOutMsg.slice();
        const startPosBackup = this.startPos;
        const endPosBackup = this.endPos;
        const ruleAntiPatternsBackup = this.ruleAntiPatterns.slice();
        for (const patternTokenOfOrGroup of patternToken.getOrGroup()) {
          const tmpElements2 = [];
          tmpElements2.push(...tmpPatternTokens);
          tmpElements2.push(patternTokenOfOrGroup.clone());
          this.createRules(elemList, tmpElements2, numElement + 1);
          this.startPos = startPosBackup;
          this.endPos = endPosBackup;
          this.suggestionMatches = suggestionMatchesBackup;
          this.suggestionMatchesOutMsg = suggestionMatchesOutMsgBackup;
          this.ruleAntiPatterns.push(...ruleAntiPatternsBackup);
        }
      }
      tmpPatternTokens.push(patternToken.clone());
      this.createRules(elemList, tmpPatternTokens, numElement + 1);
    }
  }

  // Java: PatternRuleHandler#replaceSpacesInRegex(String)
  replaceSpacesInRegex(s) {
    let sb = '';
    let inBracket = false;
    for (let i = 0; i < s.length; i++) {
      const c = s.charAt(i);
      if (c === '[') {
        inBracket = true;
      } else if (c === ']') {
        inBracket = false;
      }
      if (c === ' ' && !inBracket) {
        sb += '(?:[\\s  ]+)';
      } else {
        sb += c;
      }
    }
    return sb;
  }

  // Java: PatternRuleHandler#prepareRule(AbstractPatternRule)
  prepareRule(rule) {
    rule.setPremium(this.isPremiumRule);
    rule.setSourceFile(this.sourceFile);
    if (this.startPos !== -1 && this.endPos !== -1) {
      rule.setStartPositionCorrection(this.startPos);
      rule.setEndPositionCorrection(this.endPos - this.tokenCountForMarker);
    }
    this.startPos = -1;
    this.endPos = -1;
    const allCorrectExamples = [];
    allCorrectExamples.push(...this.correctExamples);
    allCorrectExamples.push(...this.antipatternExamples);
    allCorrectExamples.push(...this.antipatternForRuleGroupsExamples);
    if (allCorrectExamples.length !== 0) {
      rule.setCorrectExamples(allCorrectExamples);
    }
    if (this.incorrectExamples.length !== 0) {
      rule.setIncorrectExamples(this.incorrectExamples);
    }
    if (this.errorTriggeringExamples.length !== 0) {
      rule.setErrorTriggeringExamples(this.errorTriggeringExamples);
    }
    rule.setCategory(this.category);
    if (this.rulegroupAntiPatterns.length !== 0) {
      rule.setAntiPatterns(this.rulegroupAntiPatterns);
    }
    if (this.ruleAntiPatterns.length !== 0) {
      rule.setAntiPatterns(this.ruleAntiPatterns);
      this.ruleAntiPatterns.length = 0;
    }
    rule.addTags(this.ruleTags);
    rule.addTags(this.ruleGroupTags);
    rule.addTags(this.categoryTags);
    rule.addToneTags(this.ruleToneTags);
    rule.addToneTags(this.ruleGroupToneTags);
    rule.addToneTags(this.categoryToneTags);
    rule.setGoalSpecific(this.isGoalSpecific);
    if (this.inRuleGroup) {
      rule.setSubId(String(this.subId));
    } else {
      rule.setSubId('1');
    }
    this.caseSensitive = false;
    for (const m of this.suggestionMatches) {
      rule.addSuggestionMatch(m);
    }
    if (this.phrasePatternTokens.length <= 1) {
      this.suggestionMatches.length = 0;
    }
    for (const m of this.suggestionMatchesOutMsg) {
      rule.addSuggestionMatchOutMsg(m);
    }
    this.suggestionMatchesOutMsg.length = 0;
    if (this.category === null) {
      throw new RuntimeException('Cannot activate rule \'' + this.id + '\', it is outside of a <category>...</category>');
    }
    if (this.defaultOff) {
      rule.setDefaultOff();
    }
    if (this.defaultTempOff) {
      rule.setDefaultTempOff();
    }
    if (this.url !== null && this.url.length() > 0) {
      try {
        const s = this.url.toString();
        rule.setUrl(this.internUrl(s));
      } catch (e) {
        if (!(e instanceof MalformedURLException)) throw e;
        throw new RuntimeException('Could not parse URL for rule: ' + rule + ': \'' + this.url + '\'', e);
      }
    } else if (this.urlForRuleGroup !== null && this.urlForRuleGroup.length() > 0) {
      try {
        rule.setUrl(this.internUrl(this.urlForRuleGroup.toString()));
      } catch (e) {
        if (!(e instanceof MalformedURLException)) throw e;
        throw new RuntimeException('Could not parse URL for rule: ' + rule + ': \'' + this.urlForRuleGroup + '\'', e);
      }
    }
    // inheritance of values - if no type value is defined for a rule, take the rule group's value etc:
    if (this.ruleIssueType !== null) {
      rule.setLocQualityIssueType(ITSIssueType.getIssueType(this.ruleIssueType));
    } else if (this.ruleGroupIssueType !== null) {
      rule.setLocQualityIssueType(ITSIssueType.getIssueType(this.ruleGroupIssueType));
    } else if (this.categoryIssueType !== null) {
      rule.setLocQualityIssueType(ITSIssueType.getIssueType(this.categoryIssueType));
    }
    let prio = 0;
    if (this.prioCategoryAttribute !== 0) {
      prio = this.prioCategoryAttribute;
    }
    if (this.prioRuleGroupAttribute !== 0) {
      prio = this.prioRuleGroupAttribute;
    }
    if (this.prioRuleAttribute !== 0) {
      prio = this.prioRuleAttribute;
    }
    rule.setPriority(prio);
  }

  // Java: PatternRuleHandler#internUrl(String)
  internUrl(s) {
    let url = this.internedUrls.get(s);
    if (url === undefined) {
      url = new URL(s);
      this.internedUrls.set(s, url);
    }
    return url;
  }

  // Java: PatternRuleHandler#characters(char[],int,int); the scanner passes the text
  characters(s) {
    if (this.inException) {
      this.exceptions.append(s);
    } else if (this.inToken) {
      this.elements.append(s);
    } else if (this.inCorrectExample) {
      this.correctExample.append(s);
    } else if (this.inAntiPatternExample) {
      this.antiPatternExample.append(s);
    } else if (this.inAntiPatternForRuleGroupExample) {
      this.antiPatternForRuleGroupExample.append(s);
    } else if (this.inIncorrectExample) {
      this.incorrectExample.append(s);
    } else if (this.inErrorTriggerExample) {
      this.errorTriggerExample.append(s);
    } else if (this.inMatch) {
      this.match.append(s);
    } else if (this.inMessage) {
      this.message.append(s);
    } else if (this.inSuggestion) { // Suggestion outside message
      this.suggestionsOutMsg.append(s);
    } else if (this.inShortMessage) {
      this.shortMessage.append(s);
    } else if (this.inShortMessageForRuleGroup) {
      this.shortMessageForRuleGroup.append(s);
    } else if (this.inUrl) {
      this.url.append(s);
    } else if (this.inUrlForRuleGroup) {
      this.urlForRuleGroup.append(s);
    } else if (this.inRegex) {
      this.regex.append(s);
    }
  }
}
