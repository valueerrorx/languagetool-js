// org.languagetool.rules.patterns.bitext.BitextPatternRuleHandler (SAX handler for bitext.xml)
import { NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { StringBuilder, javaSplit } from '../../lib/java/strings.js';
import { getLanguageForShortCodeGuarded } from '../language/javaLanguages.js';
import { IncorrectExample } from '../rules/model/Examples.js';
import { PatternRule } from '../patterns/PatternRule.js';
import { PatternRuleHandler } from '../patterns/PatternRuleHandler.js';
import { XMLRuleHandler } from '../patterns/XMLRuleHandler.js';
import { IncorrectBitextExample } from './IncorrectBitextExample.js';
import { BitextPatternRule } from './BitextPatternRule.js';
import { StringPair } from './StringPair.js';

const { RULES, RULE, EXAMPLE } = XMLRuleHandler;
const SOURCE = 'source';
const TARGET = 'target';
const SRC_EXAMPLE = 'srcExample';
const TRG_EXAMPLE = 'trgExample';

// Java: BitextPatternRuleHandler
export class BitextPatternRuleHandler extends PatternRuleHandler {
  static FQCN = 'org.languagetool.rules.patterns.bitext.BitextPatternRuleHandler';

  // Java: BitextPatternRuleHandler() (field initializers)
  constructor() {
    super();
    this.bitextRules = [];
    this.srcRule = null;
    this.trgRule = null;
    this.trgExample = null;
    this.srcExample = null;
    this.srcLang = null;
    this.correctExamples = [];
    this.incorrectExamples = [];
  }

  // Java: BitextPatternRuleHandler#getBitextRules()
  getBitextRules() {
    return this.bitextRules;
  }

  // ===========================================================
  // SAX DocumentHandler methods
  // ===========================================================

  // Java: BitextPatternRuleHandler#startElement(String,String,String,Attributes)
  startElement(qName, attrs) {
    switch (qName) {
      case RULES: {
        const languageStr = attrs.getValue('targetLang');
        this.language = getLanguageForShortCodeGuarded(languageStr);
        break;
      }
      case RULE:
        super.startElement(qName, attrs);
        this.correctExamples = [];
        this.incorrectExamples = [];
        break;
      case TARGET:
        this.startPattern(attrs);
        break;
      case SOURCE:
        this.srcLang = getLanguageForShortCodeGuarded(attrs.getValue('lang'));
        break;
      default:
        super.startElement(qName, attrs);
        break;
    }
  }

  // Java: BitextPatternRuleHandler#endElement(String,String,String)
  endElement(qName) {
    switch (qName) {
      case RULE: {
        if (this.trgRule === null) throw new NullPointerException('Cannot invoke "org.languagetool.rules.patterns.PatternRule.setMessage(String)" because "this.trgRule" is null');
        this.trgRule.setMessage(this.message.toString());
        for (const m of this.suggestionMatches) {
          this.trgRule.addSuggestionMatch(m);
        }
        if (this.phrasePatternTokens.length <= 1) {
          this.suggestionMatches.length = 0;
        }
        const bRule = new BitextPatternRule(this.srcRule, this.trgRule);
        bRule.setCorrectBitextExamples(this.correctExamples);
        bRule.setIncorrectBitextExamples(this.incorrectExamples);
        bRule.setSourceLanguage(this.srcLang);
        this.bitextRules.push(bRule);
        break;
      }
      case SRC_EXAMPLE:
        this.srcExample = this.setExample();
        break;
      case TRG_EXAMPLE:
        this.trgExample = this.setExample();
        break;
      case SOURCE:
        this.srcRule = this.finalizeRule();
        break;
      case TARGET:
        this.trgRule = this.finalizeRule();
        break;
      case EXAMPLE:
        if (this.inCorrectExample) {
          this.correctExamples.push(new StringPair(this.srcExample.getExample(), this.trgExample.getExample()));
        } else if (this.inIncorrectExample) {
          const examplePair = new StringPair(this.srcExample.getExample(), this.trgExample.getExample());
          if (this.trgExample.getCorrections().length === 0) {
            this.incorrectExamples.push(new IncorrectBitextExample(examplePair));
          } else {
            const corrections = this.trgExample.getCorrections();
            this.incorrectExamples.push(new IncorrectBitextExample(examplePair, corrections));
          }
        }
        this.inCorrectExample = false;
        this.inIncorrectExample = false;
        this.inErrorTriggerExample = false;
        break;
      default:
        super.endElement(qName);
        break;
    }
  }

  // Java: BitextPatternRuleHandler#setExample()
  setExample() {
    let example = null;
    if (this.inCorrectExample) {
      example = new IncorrectExample(this.correctExample.toString());
    } else if (this.inIncorrectExample) {
      if (this.exampleCorrection !== null) {
        const corrections = [...javaSplit(this.exampleCorrection.toString(), '\\|')];
        if (this.exampleCorrection.toString().endsWith('|')) { // suggestions plus an empty suggestion (split() will ignore trailing empty items)
          corrections.push('');
        }
        example = new IncorrectExample(this.incorrectExample.toString(), corrections);
      } else {
        example = new IncorrectExample(this.incorrectExample.toString());
      }
    } else if (this.inErrorTriggerExample) {
      throw new RuntimeException("'triggers_error' is not supported for bitext XML");
    }
    this.correctExample = new StringBuilder();
    this.incorrectExample = new StringBuilder();
    this.exampleCorrection = null;
    return example;
  }

  // Java: BitextPatternRuleHandler#finalizeRule()
  finalizeRule() {
    let rule = null;
    if (this.phrasePatternTokens.length === 0) {
      rule = new PatternRule(this.id, this.language, this.patternTokens,
        this.name, '', this.shortMessage.toString());
      this.prepareRule(rule);
    } else {
      if (this.patternTokens.length !== 0) {
        for (const ph of this.phrasePatternTokens) {
          ph.push(...this.patternTokens);
        }
      }
      for (const phrasePatternToken of this.phrasePatternTokens) {
        this.processElement(phrasePatternToken);
        rule = new PatternRule(this.id, this.language, phrasePatternToken,
          this.name, this.message.toString(), this.shortMessage.toString(), '',
          this.phrasePatternTokens.length > 1);
        this.prepareRule(rule);
      }
    }
    this.patternTokens.length = 0;
    if (this.phrasePatternTokens !== null) {
      this.phrasePatternTokens.length = 0;
    }
    this.startPositionCorrection = 0;
    this.endPositionCorrection = 0;
    return rule;
  }
}
