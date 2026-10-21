// Java: org.languagetool.language.identifier.SimpleLanguageIdentifier (speller based, local API mode)
import { JavaHashMap } from '../../../lib/java/collections/JavaHashMap.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { javaSplit } from '../../../lib/java/strings.js';
import { Languages } from '../../Languages.js';
import { NoopLanguage } from '../../noop/NoopLanguage.js';
import { DetectedLanguage } from '../../rules/model/DetectedLanguage.js';
import {
  CONSIDER_ONLY_PREFERRED_THRESHOLD, LanguageIdentifier, NON_LATIN_CHARS_LANGUAGES, SCORE_THRESHOLD, UNICODE_BASED_LANG_IDENTIFIER, getCommonWordsLangIdentifier,
} from './LanguageIdentifier.js';
import { LanguageIdentifierService } from './LanguageIdentifierService.js';

// Java: SimpleLanguageIdentifier
export class SimpleLanguageIdentifier extends LanguageIdentifier {
  static FQCN = 'org.languagetool.language.identifier.SimpleLanguageIdentifier';

  // Java: SimpleLanguageIdentifier#SimpleLanguageIdentifier() / (List)
  constructor(preferredLangCodes) {
    super(1000);
    this.spellingCheckRules = new JavaHashMap();
    if (preferredLangCodes === undefined) {
      const languages = Languages.get();
      for (const language of languages) {
        if (language.isVariant() || language.getShortCode() === 'zz') {
          continue;
        }
        const hasVariant = language.hasVariant();
        let spellingRuleLanguage = null;
        if (hasVariant) {
          spellingRuleLanguage = language.getDefaultLanguageVariant();
        }
        if (spellingRuleLanguage === null || spellingRuleLanguage === undefined) {
          spellingRuleLanguage = language;
        }
        const defaultSpellingCheckRule = spellingRuleLanguage.getDefaultSpellingRule();
        if (defaultSpellingCheckRule !== null) {
          this.spellingCheckRules.put(language.getShortCode(), defaultSpellingCheckRule);
        } // else log.warn("Could not find default speller rule for {}") (logging: F71)
      }
    } else {
      // log.info("Init SimpleLanguageIdentifier with {}") (logging: F71)
      preferredLangCodes.forEach((langCode) => {
        const language = Languages.getLanguageForShortCode(langCode);
        const defaultSpellingRule = language.getDefaultSpellingRule();
        if (defaultSpellingRule !== null) {
          this.spellingCheckRules.put(language.getShortCode(), defaultSpellingRule);
        }
      });
    }
  }

  // Java: SimpleLanguageIdentifier#detectLanguage(String,List,List) / (String,List,List,boolean) / (String)
  detectLanguage(cleanText, noopLangsTmp, preferredLangsTmp) {
    if (noopLangsTmp === undefined) return null;
    const parsedLanguageLists = this.prepareDetectLanguage(cleanText, noopLangsTmp, preferredLangsTmp);
    if (parsedLanguageLists === null) {
      return new DetectedLanguage(null, new NoopLanguage());
    }
    const additionalLangs = parsedLanguageLists.getAdditionalLangs();
    const preferredLangs = parsedLanguageLists.getPreferredLangs();

    const words = javaSplit(cleanText, '\\s+');
    const dominantLangCodes = UNICODE_BASED_LANG_IDENTIFIER.getDominantLangCodes(cleanText);
    const scores = new JavaHashMap();
    let detectionSource = 'spellchecker';
    for (const [key, rule] of this.spellingCheckRules.entrySet()) {
      if (dominantLangCodes.includes(key) !== (dominantLangCodes.length === 0 && !NON_LATIN_CHARS_LANGUAGES.includes(key))) {
        let errors = 0;
        for (const word of words) {
          errors += rule.isMisspelled(word) ? 1 : 0;
        }
        const errorRate = errors / words.length;
        // log.info("Found {} errors for {} words with {} spellchecker ...") (logging: F71)
        scores.put(key, 1.0 - errorRate);
      }
    }
    if (scores.size() === 0) {
      scores.put('zz', 1.0);
    }
    // Check if languages have the same highest score
    let maxValue = 0;
    let countFullScore = 0;
    for (const [, value] of scores.entrySet()) {
      if (value > maxValue) {
        countFullScore = 1;
        maxValue = value;
      } else if (value === maxValue) {
        countFullScore++;
      }
    }
    let highestScoringResult = this.getHighestScoringResult(scores.entrySet());
    if (highestScoringResult[1] < SCORE_THRESHOLD || highestScoringResult[0] === 'zz' || countFullScore > 1) {
      const lang2Count = getCommonWordsLangIdentifier().getKnownWordsPerLanguage(cleanText);
      const baseLangAlreadyHandled = new JavaHashSet();
      for (const [lang, count] of lang2Count) {
        const langCode = lang.getShortCode();
        if (baseLangAlreadyHandled.contains(langCode)) {
          continue;
        }
        baseLangAlreadyHandled.add(langCode);
        if (scores.containsKey(langCode)) {
          // this looks arbitrary, but gave best scores with evaluation (LanguageDetectionMinLengthEval):
          scores.put(langCode, scores.get(langCode) + count);
        } else {
          scores.put(langCode, count);
        }
      }
      detectionSource += '+commonwords';
      highestScoringResult = this.getHighestScoringResult(scores.entrySet());
    }
    if (preferredLangs.includes('no') && !preferredLangs.includes('da')) {
      // Special case, as Norwegian easily gets detected as Danish (https://github.com/languagetool-org/languagetool/issues/5520).
      scores.remove('da');
      highestScoringResult = this.getHighestScoringResult(scores.entrySet());
    }
    if (cleanText.length < CONSIDER_ONLY_PREFERRED_THRESHOLD && preferredLangs.length > 0) {
      for (const k of scores.keySet()) {
        if (!preferredLangs.includes(k)) scores.remove(k);
      }
      highestScoringResult = this.getHighestScoringResult(scores.entrySet());
      detectionSource += '+prefLang';
    }
    if (highestScoringResult[0] !== null && LanguageIdentifierService.INSTANCE.canLanguageBeDetected(highestScoringResult[0], additionalLangs)) {
      return new DetectedLanguage(null,
        Languages.getLanguageForShortCode(highestScoringResult[0], additionalLangs),
        Math.fround(highestScoringResult[1]), detectionSource);
    }
    return null;
  }

  // Java: SimpleLanguageIdentifier#getDetectedLanguageScores(String,List,List,boolean,int)
  getDetectedLanguageScores(cleanText, noopLangsTmp, preferredLangsTmp) {
    return [this.detectLanguage(cleanText, noopLangsTmp, preferredLangsTmp)];
  }
}
