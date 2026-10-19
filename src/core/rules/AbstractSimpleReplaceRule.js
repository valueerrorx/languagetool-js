// org.languagetool.rules.AbstractSimpleReplaceRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { SpecificIdRule } from './SpecificIdRule.js';
import { SimpleReplaceDataLoader } from './SimpleReplaceDataLoader.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { SENTENCE_START_TAGNAME } from '../JLanguageToolConstants.js';
import { Locale } from '../../lib/java/Locale.js';
import { javaReplace, toLowerCase, toUpperCase } from '../../lib/java/strings.js';
import { isAllUppercase, startsWithUppercase, uppercaseFirstChar, toId } from '../text/StringTools.js';

// Java: AbstractSimpleReplaceRule (abstract: getWrongWords)
export class AbstractSimpleReplaceRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractSimpleReplaceRule';

  // Java: AbstractSimpleReplaceRule#loadFromPath(String) / loadFromPath(String...) (overload by argument count)
  static loadFromPath(...paths) {
    const loader = new SimpleReplaceDataLoader();
    if (paths.length === 1) {
      return loader.loadWords(paths[0]);
    }
    const map = new Map();
    for (const path of paths) {
      for (const [k, v] of loader.loadWords(path)) map.set(k, v);
    }
    return map;
  }

  // Java: AbstractSimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages);
    this.ignoreTaggedWords = false;
    this.subRuleSpecificIds = false;
    this.checkLemmas = true;
    this.language = language;
    super.setCategory(Categories.MISC.getCategory(messages));
  }

  // Java: AbstractSimpleReplaceRule#isCaseSensitive()
  isCaseSensitive() {
    return true;
  }

  // Java: AbstractSimpleReplaceRule#getLocale()
  getLocale() {
    return Locale.getDefault();
  }

  // Java: AbstractSimpleReplaceRule#setIgnoreTaggedWords()
  setIgnoreTaggedWords() {
    this.ignoreTaggedWords = true;
  }

  // Java: AbstractSimpleReplaceRule#getId()
  getId() {
    return 'SIMPLE_REPLACE';
  }

  // Java: AbstractSimpleReplaceRule#getDescription()
  getDescription() {
    return 'Checks for wrong words/phrases';
  }

  // Java: AbstractSimpleReplaceRule#getMessage(String,List)
  getMessage(tokenStr, replacements) {
    return tokenStr + ' is not valid. Use: ' + replacements.join(', ') + '.';
  }

  // Java: AbstractSimpleReplaceRule#getShort()
  getShort() {
    return 'Wrong word';
  }

  // Java: AbstractSimpleReplaceRule#cleanup(String)
  cleanup(word) {
    return this.isCaseSensitive() ? word : toLowerCase(word, this.getLocale());
  }

  // Java: AbstractSimpleReplaceRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = sentence.getTokensWithoutWhitespace();
    for (const tokenReadings of tokens) {
      // short for SENT_START
      if (SENTENCE_START_TAGNAME === tokenReadings.getAnalyzedToken(0).getPOSTag() ||
          tokenReadings.isImmunized() || // this rule is used mostly for spelling, so ignore both immunized
          tokenReadings.isIgnoredBySpeller() || // and speller-ignorable rules
          this.isTokenException(tokenReadings) ||
          (this.ignoreTaggedWords && this.isTagged(tokenReadings))
      ) {
        continue;
      }
      const matchesForToken = this.findMatches(tokenReadings, sentence);
      ruleMatches.push(...matchesForToken);
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: AbstractSimpleReplaceRule#findMatches(AnalyzedTokenReadings,AnalyzedSentence)
  findMatches(tokenReadings, sentence) {
    const ruleMatches = [];

    const originalTokenStr = tokenReadings.getToken();
    const tokenString = this.cleanup(originalTokenStr);
    const allUppercase = isAllUppercase(originalTokenStr);

    // try first with the original word, then with the all lower-case version
    let possibleReplacements = this.getWrongWords().get(originalTokenStr);
    if (possibleReplacements === undefined) {
      possibleReplacements = this.getWrongWords().get(tokenString);
    }

    if (possibleReplacements === undefined && this.checkLemmas) {
      possibleReplacements = [];

      const lemmas = [];
      for (const analyzedToken of tokenReadings.getReadings()) {
        const lemma = analyzedToken.getLemma();
        if (lemma !== null && this.getWrongWords().has(lemma) && !lemmas.includes(lemma)) {
          lemmas.push(this.cleanup(lemma));
        }
      }

      for (const lemma of lemmas) {
        const replacements = this.getWrongWords().get(lemma);
        if (replacements !== undefined) {
          const synth = this.getSynthesizer();
          if (synth !== null) {
            for (const replacementLemma of replacements) {
              for (const at of tokenReadings.getReadings()) {
                // Java logs a warning when at.getLemma() == null (CORE-0270 WARN); logging is not compared
                const newAt = new AnalyzedToken(at.getLemma(), at.getPOSTag(), replacementLemma);
                const s = synth.synthesize(newAt, at.getPOSTag());
                possibleReplacements.push(...s);
              }
            }
          } else {
            possibleReplacements.push(...replacements);
          }
        }
      }
      possibleReplacements = [...new Set(possibleReplacements)];
    }

    if (possibleReplacements !== undefined && possibleReplacements.length > 0) {
      let replacements = [];
      if (allUppercase) {
        for (const s of possibleReplacements) {
          replacements.push(toUpperCase(s));
        }
      } else {
        replacements = [...possibleReplacements];
      }
      const idx = replacements.indexOf(originalTokenStr);
      if (idx >= 0) replacements.splice(idx, 1);
      if (replacements.length > 0) {
        const potentialRuleMatch = this.createRuleMatch(tokenReadings, replacements, sentence, originalTokenStr);
        ruleMatches.push(potentialRuleMatch);
      }
    }

    return ruleMatches;
  }

  // Java: AbstractSimpleReplaceRule#isTagged(AnalyzedTokenReadings)
  isTagged(tokenReadings) {
    return tokenReadings.isTagged();
  }

  // Java: AbstractSimpleReplaceRule#createRuleMatch(AnalyzedTokenReadings,List,AnalyzedSentence,String)
  createRuleMatch(tokenReadings, replacements, sentence, originalTokenStr) {
    const tokenString = tokenReadings.getToken();
    const pos = tokenReadings.getStartPos();

    let potentialRuleMatch = null;

    if (this.subRuleSpecificIds) {
      const id = toId(this.getId() + '_' + originalTokenStr, this.language);
      const desc = javaReplace(this.getDescription(), '$match', originalTokenStr);
      const specificIdRule = new SpecificIdRule(id, desc, this.isPremium(), this.getCategory(), this.getLocQualityIssueType(), this.getTags());
      potentialRuleMatch = new RuleMatch(specificIdRule, sentence, pos, pos + tokenString.length,
        this.getMessage(tokenString, replacements), this.getShort());
    } else {
      potentialRuleMatch = new RuleMatch(this, sentence, pos, pos + tokenString.length,
        this.getMessage(tokenString, replacements), this.getShort());
    }
    if (!this.isCaseSensitive() && startsWithUppercase(tokenString)) {
      for (let i = 0; i < replacements.length; i++) {
        replacements[i] = uppercaseFirstChar(replacements[i]);
      }
    }

    potentialRuleMatch.setSuggestedReplacements(replacements);

    return potentialRuleMatch;
  }

  // Java: AbstractSimpleReplaceRule#isCheckLemmas()
  isCheckLemmas() {
    return this.checkLemmas;
  }

  // Java: AbstractSimpleReplaceRule#setCheckLemmas(boolean)
  setCheckLemmas(checkLemmas) {
    this.checkLemmas = checkLemmas;
  }

  // Java: AbstractSimpleReplaceRule#getSynthesizer()
  getSynthesizer() {
    return null;
  }

  // Java: AbstractSimpleReplaceRule#isTokenException(AnalyzedTokenReadings)
  isTokenException() {
    return false;
  }

  // Java: AbstractSimpleReplaceRule#useSubRuleSpecificIds()
  useSubRuleSpecificIds() {
    this.subRuleSpecificIds = true;
  }

  // Java: AbstractSimpleReplaceRule#getLanguage()
  getLanguage() {
    return this.language;
  }
}
