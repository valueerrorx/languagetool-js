// org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRuleReplacer (applies one disambiguation rule to a sentence)
import { Objects } from '../../lib/java/Objects.js';
import { arrayGet, copyOfRange, listGet } from '../../lib/java/arrays.js';
import { Pattern, javaMatches } from '../../lib/java/regex/index.js';
import { AnalyzedSentence } from '../AnalyzedSentence.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { ChunkTag } from '../chunking/ChunkTag.js';
import { AbstractPatternRulePerformer } from '../patterns/AbstractPatternRulePerformer.js';
import { Match } from '../patterns/Match.js';
import { PatternRuleMatcher } from '../patterns/PatternRuleMatcher.js';
import { RuleFilterEvaluator } from '../patterns/RuleFilterEvaluator.js';
import { isEmpty } from '../text/StringTools.js';
import { DisambiguatorAction } from './DisambiguationPatternRule.js';

// Java: DisambiguationPatternRuleReplacer
export class DisambiguationPatternRuleReplacer extends AbstractPatternRulePerformer {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.DisambiguationPatternRuleReplacer';

  // Java: DisambiguationPatternRuleReplacer(DisambiguationPatternRule)
  constructor(rule) {
    // The disambiguation Unifier is always in the default language variant
    super(rule, rule.getLanguage().getDefaultLanguageVariant().getDisambiguationUnifier());
  }

  // Java: DisambiguationPatternRuleReplacer#replace(AnalyzedSentence)
  replace(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const preDisambigTokens = sentence.getTokens();
    const whTokens = [sentence.getTokens()];
    const changed = [false];

    this.doMatch(sentence, tokens, (tokenPositions, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken) => {
      // direct lookup instead of a scan over all tokens (which made each match O(n) on long sentences)
      const ruleMatchFromPos = firstMatchToken >= 0 && firstMatchToken < tokens.length ? tokens[firstMatchToken].getStartPos() : -1;
      const ruleMatchToPos = lastMatchToken >= 0 && lastMatchToken < tokens.length ? tokens[lastMatchToken].getEndPos() : -1;
      const matchingTokens = tokenPositions.filter((i) => i !== 0).length;
      if (this.keepDespiteFilter(tokens, tokenPositions, firstMatchToken, lastMatchToken)
          && this.keepByDisambig(sentence, ruleMatchFromPos, ruleMatchToPos, firstMatchToken, lastMatchToken)) {
        if (!changed[0]) {
          // copy-on-first-write: sentence.getTokens() must not be modified, but the copy can be reused for
          // all further matches of this rule (instead of cloning the whole array per match)
          whTokens[0] = whTokens[0].slice();
        }
        whTokens[0] = this.executeAction(sentence, whTokens[0], this.unifiedTokens, firstMatchToken, lastMarkerMatchToken, matchingTokens, tokenPositions);
        changed[0] = true;
      }
    });
    if (changed[0]) {
      const action = this.rule.getAction();
      // these actions only set flags on the tokens, they don't touch the readings:
      const readingsUnchanged = action === DisambiguatorAction.IMMUNIZE ||
                                action === DisambiguatorAction.IGNORE_SPELLING;
      // ADD modifies the shared token objects in place and may change their surface string
      // (AnalyzedTokenReadings.addReading), so the previous token index can't be trusted then:
      const previous = action === DisambiguatorAction.ADD ? null : sentence;
      return new AnalyzedSentence(whTokens[0], preDisambigTokens, previous, readingsUnchanged);
    }
    return sentence;
  }

  // Java: DisambiguationPatternRuleReplacer#keepByDisambig(AnalyzedSentence,int,int,int,int)
  keepByDisambig(sentence, ruleMatchFromPos, ruleMatchToPos, firstMatchToken, lastMatchToken) {
    const antiPatterns = this.rule.getAntiPatterns();
    // Computed lazily, at most once per call: rule.getLanguage() is invariant across the loop below
    let antiPatternUnifier = null;
    for (const antiPattern of antiPatterns) {
      if (!antiPattern.canBeIgnoredFor(sentence)) {
        if (antiPatternUnifier === null) {
          // antipatterns of disambiguation rules must use the disambiguation unifier (see constructor),
          // not the grammar unifier of the rule's language, which may not even be configured yet
          antiPatternUnifier = this.rule.getLanguage().getDefaultLanguageVariant().getDisambiguationUnifier();
        }
        // Restrict the search to the tokens that can overlap the rule's match
        const maxSpanTokens = antiPattern.getMaxSpanTokens();
        const minStartIndex = maxSpanTokens < 0 ? 0 : Math.max(0, firstMatchToken - maxSpanTokens);
        const maxStartIndex = lastMatchToken;
        const matches = new PatternRuleMatcher(antiPattern, false, antiPatternUnifier).match(sentence, minStartIndex, maxStartIndex);
        for (const disMatch of matches) {
          if ((disMatch.getFromPos() <= ruleMatchFromPos && disMatch.getToPos() >= ruleMatchFromPos) || // left overlap of rule match start
              (disMatch.getFromPos() <= ruleMatchToPos && disMatch.getToPos() >= ruleMatchToPos) || // right overlap of rule match end
              (disMatch.getFromPos() >= ruleMatchFromPos && disMatch.getToPos() <= ruleMatchToPos) // inside longer rule match
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Java: DisambiguationPatternRuleReplacer#keepDespiteFilter(AnalyzedTokenReadings[],int[],int,int)
  keepDespiteFilter(tokens, tokenPositions, firstMatchToken, lastMatchToken) {
    const filter = this.rule.getFilter();
    if (filter !== null) {
      const ruleFilterEval = new RuleFilterEvaluator(filter);
      const tokensPos = tokenPositions.slice();
      const resolvedArguments = ruleFilterEval.getResolvedArguments(this.rule.getFilterArguments(), tokens, firstMatchToken, tokensPos);
      const relevantTokens = copyOfRange(tokens, firstMatchToken, lastMatchToken + 1);
      return filter.matches(resolvedArguments, relevantTokens, firstMatchToken, tokensPos);
    }
    return true;
  }

  // Java: DisambiguationPatternRuleReplacer#executeAction(AnalyzedSentence,AnalyzedTokenReadings[],AnalyzedTokenReadings[],int,int,int,int[])
  executeAction(sentence, whiteTokens, unifiedTokens, firstMatchToken, lastMatchToken, matchingTokens, tokenPositions) {
    const whTokens = whiteTokens; // already a private copy, see replace()
    const rule = this.rule;

    let correctedStPos = 0;
    let startPositionCorrection = rule.getStartPositionCorrection();
    let endPositionCorrection = rule.getEndPositionCorrection();

    let matchingTokensWithCorrection = matchingTokens;

    if (startPositionCorrection > 0) {
      correctedStPos--; // token positions are shifted by 1

      for (let l = 0; l <= startPositionCorrection && l < tokenPositions.length; l++) {
        correctedStPos += tokenPositions[l];
      }

      const w = startPositionCorrection; // adjust to make sure the token count is fine as it's checked later
      for (let j = 0; j <= w; j++) {
        if (j < tokenPositions.length && tokenPositions[j] === 0) {
          startPositionCorrection--;
        }
      }
    }

    if (endPositionCorrection < 0) { // adjust the end position correction if one of the elements has not been matched
      for (let d = startPositionCorrection; d < tokenPositions.length; d++) {
        if (tokenPositions[d] === 0) {
          endPositionCorrection++;
        }
      }
    }

    if (lastMatchToken !== -1) {
      const maxPosCorrection = Math.max((lastMatchToken + 1 - (firstMatchToken + correctedStPos)) - matchingTokens, 0);
      matchingTokensWithCorrection += maxPosCorrection;
    }

    const fromPos = sentence.getOriginalPosition(firstMatchToken + correctedStPos);

    const disAction = rule.getAction();

    const newTokenReadings = rule.getNewTokenReadings();
    const matchElement = rule.getMatchElement();
    const disambiguatedPOS = rule.getDisambiguatedPOS();

    // Java: switch (disAction) with FILTER falling through into REPLACE/default
    let fallthrough = false;
    if (disAction === DisambiguatorAction.UNIFY) {
      if (unifiedTokens !== null &&
          unifiedTokens.length === matchingTokensWithCorrection - startPositionCorrection + endPositionCorrection) {
        // TODO (Java): unifiedTokens.length is larger > matchingTokensWithCorrection in cases where there are no markers...
        if (arrayGet(whTokens, sentence.getOriginalPosition(firstMatchToken
            + correctedStPos + unifiedTokens.length - 1)).isSentenceEnd()) {
          unifiedTokens[unifiedTokens.length - 1].setSentEnd();
        }
        for (let i = 0; i < unifiedTokens.length; i++) {
          const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
          whTokens[position] = new AnalyzedTokenReadings(arrayGet(whTokens, position), unifiedTokens[i].getReadings(), rule.getFullId());
        }
      }
    } else if (disAction === DisambiguatorAction.REMOVE) {
      if (newTokenReadings !== null && newTokenReadings.length > 0) {
        if (newTokenReadings.length === matchingTokensWithCorrection
            - startPositionCorrection + endPositionCorrection) {
          for (let i = 0; i < newTokenReadings.length; i++) {
            const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
            arrayGet(whTokens, position).removeReading(newTokenReadings[i], rule.getFullId());
          }
        }
      } else if (!isEmpty(disambiguatedPOS)) { // negative filtering
        const p = Pattern.compile(disambiguatedPOS);
        const tmp = new AnalyzedTokenReadings(arrayGet(whTokens, fromPos).getReadings(),
          whTokens[fromPos].getStartPos());
        for (const analyzedToken of tmp) {
          if (analyzedToken.getPOSTag() !== null && p.matcher(analyzedToken.getPOSTag()).matches()) {
            const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos);
            arrayGet(whTokens, position).removeReading(analyzedToken, rule.getFullId());
          }
        }
      }
    } else if (disAction === DisambiguatorAction.ADD) {
      if (newTokenReadings !== null && newTokenReadings.length === matchingTokensWithCorrection
            - startPositionCorrection + endPositionCorrection) {
        for (let i = 0; i < newTokenReadings.length; i++) {
          let token;
          const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
          if (newTokenReadings[i].getToken().length === 0) {
            token = arrayGet(whTokens, position).getToken();
          } else {
            token = newTokenReadings[i].getToken();
          }
          let lemma;
          if (newTokenReadings[i].getLemma() === null) {
            lemma = token;
          } else {
            lemma = newTokenReadings[i].getLemma();
          }
          const newTok = new AnalyzedToken(token,
            newTokenReadings[i].getPOSTag(), lemma);
          let exists = false;
          for (const existingToken of whTokens[position].getReadings()) {
            if (Objects.equals(existingToken.getToken(), newTok.getToken()) &&
                Objects.equals(existingToken.getPOSTag(), newTok.getPOSTag()) &&
                Objects.equals(existingToken.getLemma(), newTok.getLemma())) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            whTokens[position].addReading(newTok, rule.getFullId());
          }
        }
      }
    } else if (disAction === DisambiguatorAction.ADDCHUNK) {
      if (newTokenReadings !== null && newTokenReadings.length === matchingTokensWithCorrection
            - startPositionCorrection + endPositionCorrection) {
        for (let i = 0; i < newTokenReadings.length; i++) {
          const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
          const listChunkTag = [];
          listChunkTag.push(...arrayGet(whTokens, position).getChunkTags());
          // the POStag is added to the ChunkTag
          const newChunkTag = new ChunkTag(newTokenReadings[i].getPOSTag());
          if (!listChunkTag.some((c) => c.equals(newChunkTag))) {
            listChunkTag.push(newChunkTag);
          }
          whTokens[position].setChunkTags(listChunkTag);
        }
      }
    } else if (disAction === DisambiguatorAction.FILTERALL) {
      for (let i = 0; i < matchingTokensWithCorrection - startPositionCorrection + endPositionCorrection; i++) {
        const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
        let pToken;
        if (arrayGet(tokenPositions, i + startPositionCorrection) > 0) {
          pToken = listGet(rule.getPatternTokens(), i + startPositionCorrection);
        } else {
          let k = 1;
          while (i + startPositionCorrection + k < rule.getPatternTokens().length + endPositionCorrection &&
              arrayGet(tokenPositions, i + startPositionCorrection + k) === 0) {
            k++;
          }
          pToken = listGet(rule.getPatternTokens(), i + k + startPositionCorrection);
        }
        const tmpMatchToken = new Match(pToken.getPOStag(), null,
          true,
          pToken.getPOStag(),
          null, Match.CaseConversion.NONE, false, false,
          Match.IncludeRange.NONE);

        const matchState = tmpMatchToken.createState(rule.getLanguage().getSynthesizer(), arrayGet(whTokens, position));
        whTokens[position] = new AnalyzedTokenReadings(whTokens[position], matchState.filterReadings().getReadings(), rule.getFullId());
      }
    } else if (disAction === DisambiguatorAction.IMMUNIZE) {
      for (let i = 0; i < matchingTokensWithCorrection - startPositionCorrection + endPositionCorrection; i++) {
        arrayGet(whTokens, sentence.getOriginalPosition(firstMatchToken + correctedStPos + i)).immunize(rule.getXmlLineNumber());
      }
    } else if (disAction === DisambiguatorAction.IGNORE_SPELLING) {
      for (let i = 0; i < matchingTokensWithCorrection - startPositionCorrection + endPositionCorrection; i++) {
        arrayGet(whTokens, sentence.getOriginalPosition(firstMatchToken + correctedStPos + i)).ignoreSpelling();
      }
    } else if (disAction === DisambiguatorAction.FILTER) {
      if (matchElement === null) { // same as REPLACE if using <match>
        const tmpMatchToken = new Match(disambiguatedPOS, null,
          true, disambiguatedPOS, null,
          Match.CaseConversion.NONE, false, false,
          Match.IncludeRange.NONE);
        let newPOSmatches = false;

        // only apply filter rule when it matches previous tags:
        for (let i = 0; i < arrayGet(whTokens, fromPos).getReadingsLength(); i++) {
          if (!whTokens[fromPos].getAnalyzedToken(i).hasNoTag() &&
              whTokens[fromPos].getAnalyzedToken(i).getPOSTag() !== null &&
              javaMatches(whTokens[fromPos].getAnalyzedToken(i).getPOSTag(), disambiguatedPOS)) {
            newPOSmatches = true;
            break;
          }
        }
        if (newPOSmatches) {
          const matchState = tmpMatchToken.createState(rule.getLanguage().getSynthesizer(), whTokens[fromPos]);
          whTokens[fromPos] = new AnalyzedTokenReadings(whTokens[fromPos], matchState.filterReadings().getReadings(), rule.getFullId());
        }
      } else {
        fallthrough = true;
      }
    }
    if (fallthrough || disAction === DisambiguatorAction.REPLACE) { // Java: case REPLACE / default
      if (newTokenReadings !== null && newTokenReadings.length > 0) {
        if (newTokenReadings.length === matchingTokensWithCorrection - startPositionCorrection + endPositionCorrection) {
          for (let i = 0; i < newTokenReadings.length; i++) {
            let token;
            const position = sentence.getOriginalPosition(firstMatchToken + correctedStPos + i);
            if (newTokenReadings[i].getToken() === '') { // empty token
              token = arrayGet(whTokens, position).getToken();
            } else {
              token = newTokenReadings[i].getToken();
            }
            let lemma;
            if (newTokenReadings[i].getLemma() === null) { // empty lemma
              lemma = token;
            } else {
              lemma = newTokenReadings[i].getLemma();
            }
            const analyzedToken = new AnalyzedToken(token, newTokenReadings[i].getPOSTag(), lemma);
            const toReplace = new AnalyzedTokenReadings(
              analyzedToken,
              arrayGet(whTokens, fromPos).getStartPos());
            whTokens[position] = new AnalyzedTokenReadings(whTokens[position], toReplace.getReadings(), rule.getFullId());
          }
        }
      } else if (matchElement === null) {
        let lemma = '';
        for (const analyzedToken of arrayGet(whTokens, fromPos)) {
          if (analyzedToken.getPOSTag() !== null
              && analyzedToken.getPOSTag() === disambiguatedPOS && analyzedToken.getLemma() !== null) {
            lemma = analyzedToken.getLemma();
          }
        }
        if (isEmpty(lemma)) {
          lemma = whTokens[fromPos].getAnalyzedToken(0).getLemma();
        }

        const analyzedToken = new AnalyzedToken(whTokens[fromPos].getToken(), disambiguatedPOS, lemma);
        const toReplace = new AnalyzedTokenReadings(
          analyzedToken, whTokens[fromPos].getStartPos());
        whTokens[fromPos] = new AnalyzedTokenReadings(whTokens[fromPos], toReplace.getReadings(), rule.getFullId());
      } else {
        // using the match element
        const matchElementState = matchElement.createState(rule.getLanguage().getSynthesizer(), arrayGet(whTokens, fromPos));
        whTokens[fromPos] = new AnalyzedTokenReadings(whTokens[fromPos], matchElementState.filterReadings().getReadings(), rule.getFullId());
        matchElementState.filterReadings();
      }
    }

    return whTokens;
  }
}
