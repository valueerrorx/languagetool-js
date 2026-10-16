// org.languagetool.rules.patterns.AbstractTokenBasedRule (base class of PatternToken-based rules, with matching hints)
import { Objects } from '../../lib/java/Objects.js';
import { arraysHashCode } from '../../lib/java/hash.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { toLowerCase } from '../../lib/java/strings.js';
import { AbstractPatternRule } from './AbstractPatternRule.js';
import { RuleSet } from './RuleSet.js';

// Java: AbstractTokenBasedRule.TokenHint; possible values of a PatternToken's lemma or text
export class TokenHint {
  // Java: TokenHint(boolean,Set,int)
  constructor(inflected, possibleValues, tokenIndex) {
    this.inflected = inflected;
    this.tokenIndex = tokenIndex;
    const seen = new Set();
    for (const s of possibleValues) seen.add(toLowerCase(s)); // map(toLowerCase).distinct(): first occurrence order
    this.lowerCaseValues = [...seen];
    this.lowerCaseValueSet = new Set(this.lowerCaseValues);
  }

  // Java: TokenHint#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (!(o instanceof TokenHint)) return false;
    return this.inflected === o.inflected
      && this.tokenIndex === o.tokenIndex
      && this.lowerCaseValues.length === o.lowerCaseValues.length
      && this.lowerCaseValues.every((v, i) => v === o.lowerCaseValues[i]);
  }

  // Java: TokenHint#hashCode()
  hashCode() {
    return Objects.hash(this.inflected, this.tokenIndex, arraysHashCode(this.lowerCaseValues));
  }

  // Java: TokenHint#getPossibleIndices(AnalyzedSentence)
  getPossibleIndices(sentence) {
    const sentenceValues = this.inflected ? sentence.getLemmaSet() : sentence.getTokenSet();
    let needMerge = false;
    let result = null;
    // iterate over the smaller of the two sets
    if (this.lowerCaseValueSet.size <= sentenceValues.size) {
      for (const hint of this.lowerCaseValues) {
        const hintIndices = this.getHintIndices(sentence, hint);
        if (hintIndices !== null) {
          if (result === null) {
            result = hintIndices;
          } else {
            if (!needMerge) {
              result = result.slice();
              needMerge = true;
            }
            result.push(...hintIndices);
          }
        }
      }
    } else {
      for (const value of sentenceValues) {
        if (this.lowerCaseValueSet.has(value)) {
          const hintIndices = this.getHintIndices(sentence, value);
          if (hintIndices !== null) {
            if (result === null) {
              result = hintIndices;
            } else {
              if (!needMerge) {
                result = result.slice();
                needMerge = true;
              }
              result.push(...hintIndices);
            }
          }
        }
      }
    }
    if (result === null) return [];
    return needMerge ? [...new Set(result)].sort((a, b) => a - b) : result;
  }

  // Java: TokenHint#canBeIgnoredFor(AnalyzedSentence)
  canBeIgnoredFor(sentence) {
    const sentenceValues = this.inflected ? sentence.getLemmaSet() : sentence.getTokenSet();
    if (this.lowerCaseValueSet.size <= sentenceValues.size) {
      for (const hint of this.lowerCaseValues) {
        if (this.getHintIndices(sentence, hint) !== null) {
          return false;
        }
      }
    } else {
      for (const value of sentenceValues) {
        if (this.lowerCaseValueSet.has(value)) {
          return false;
        }
      }
    }
    return true;
  }

  // Java: TokenHint#getHintIndices(AnalyzedSentence,String)
  getHintIndices(sentence, hint) {
    return this.inflected ? sentence.getLemmaOffsets(hint) : sentence.getTokenOffsets(hint);
  }
}

// Java: AbstractTokenBasedRule#canMatchSentenceStart(PatternToken)
function canMatchSentenceStart(token) {
  return token.isSentenceStart() || token.getNegation() || !token.hasStringThatMustMatch();
}

// Java: AbstractTokenBasedRule
export class AbstractTokenBasedRule extends AbstractPatternRule {
  static FQCN = 'org.languagetool.rules.patterns.AbstractTokenBasedRule';
  static TokenHint = TokenHint;

  // Java: AbstractTokenBasedRule(String,String,Language,List,boolean)
  constructor(id, description, language, patternTokens, getUnified) {
    super(id, description, language, patternTokens, getUnified);

    const tokenHintSet = new JavaHashSet();
    let anchorHint = null;
    const collectedPosHints = [];

    let fixedOffset = true;
    let minTokenCount = patternTokens.length === 0 || canMatchSentenceStart(patternTokens[0]) ? 0 : 1;
    let maxSpanTokens = 0;
    let maxSpanBounded = true;
    for (let i = 0; i < patternTokens.length; i++) {
      const token = patternTokens[i];
      if (token.getMinOccurrence() > 0) {
        minTokenCount++;
      }

      const posHints = token.calcPosHints();
      if (posHints !== null) {
        collectedPosHints.push(posHints);
      }

      if (maxSpanBounded) {
        const maxOccurrence = token.getMaxOccurrence();
        if (token.getSkipNext() !== 0 || maxOccurrence < 0) {
          maxSpanBounded = false;
        } else {
          maxSpanTokens += Math.max(1, maxOccurrence);
        }
      }

      let inflected = false;
      let hints = token.calcFormHints();
      if (hints === null) {
        inflected = true;
        hints = token.calcLemmaHints();
      }
      if (hints !== null) {
        const hint = new TokenHint(inflected, hints, i);
        tokenHintSet.add(hint);
        if (fixedOffset && anchorHint === null) {
          anchorHint = hint;
        }
      }

      if (fixedOffset && (token.getMinOccurrence() !== 1 || token.getSkipNext() !== 0 || token.getMaxOccurrence() !== 1)) {
        fixedOffset = false;
      }
    }

    const minLen = (th) => th.lowerCaseValues.reduce((m, s) => Math.min(m, s.length), 2147483647);
    this.tokenHints = tokenHintSet.isEmpty() ? null : [...tokenHintSet].sort((a, b) => {
      if (a.lowerCaseValues.length !== b.lowerCaseValues.length) return a.lowerCaseValues.length < b.lowerCaseValues.length ? -1 : 1;
      const ka = -(a.lowerCaseValues.length === 0 ? 0 : minLen(a));
      const kb = -(b.lowerCaseValues.length === 0 ? 0 : minLen(b));
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    this.anchorHint = anchorHint;
    this.posHints = collectedPosHints.length === 0 ? null : collectedPosHints;
    this.maxSpanTokens = maxSpanBounded ? maxSpanTokens : -1;
    this.minTokenCount = Math.min(minTokenCount, 127); // (byte)
  }

  // Java: AbstractTokenBasedRule#canBeIgnoredFor(AnalyzedSentence)
  canBeIgnoredFor(sentence) {
    if (sentence.getNonWhitespaceTokenCount() < this.minTokenCount) return true;
    if (this.tokenHints !== null) {
      for (const th of this.tokenHints) {
        if (th.canBeIgnoredFor(sentence)) {
          return true;
        }
      }
    }
    if (this.posHints !== null && !this.isInterpretPosTagsPreDisambiguation()) {
      const sentencePosTags = sentence.getPosTagSet();
      for (const posHint of this.posHints) {
        let found = false;
        for (const posTag of posHint) {
          if (sentencePosTags.has(posTag)) {
            found = true;
            break;
          }
        }
        if (!found) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: AbstractTokenBasedRule#getMaxSpanTokens()
  getMaxSpanTokens() {
    return this.maxSpanTokens;
  }

  // Java: AbstractTokenBasedRule#isInterpretPosTagsPreDisambiguation(): this instanceof PatternRule && ((PatternRule) this).isInterpretPosTagsPreDisambiguation(); PatternRule overrides
  isInterpretPosTagsPreDisambiguation() {
    return false;
  }
}

// RuleSet.hinted() uses `instanceof AbstractTokenBasedRule` and the tokenHints field
RuleSet.abstractTokenBasedRuleClass = AbstractTokenBasedRule;
