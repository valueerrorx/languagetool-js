// org.languagetool.rules.spelling.ForeignLanguageChecker (detects foreign-language sentences, result goes to newLanguageMatches)
import { LanguageIdentifierService } from '../../language/identifier/LanguageIdentifierService.js';

const ERROR_THRESHOLD = Math.fround(0.45);
const MIN_SENTENCE_THRESHOLD = 3;
const MAX_SCORING_LANGUAGES = 5;
const NO_FOREIGN_LANG_DETECTED = 'NO_FOREIGN_LANG_DETECTED';

// Java: ForeignLanguageChecker
export class ForeignLanguageChecker {
  static FQCN = 'org.languagetool.rules.spelling.ForeignLanguageChecker';
  static NO_FOREIGN_LANG_DETECTED = NO_FOREIGN_LANG_DETECTED;

  // Java: ForeignLanguageChecker(String,String,Long,List)
  constructor(languageShortCode, sentence, sentenceLength, preferredLanguages) {
    this.languageShortCode = languageShortCode;
    this.sentence = sentence;
    this.sentenceLength = sentenceLength;
    this.preferredLanguages = Object.freeze([...preferredLanguages]);
  }

  // Java: ForeignLanguageChecker#check(int); returns Map<String,Float> (values are float-rounded)
  check(matchesSoFar) {
    const errorRatio = Math.fround(Math.fround(matchesSoFar) / Math.fround(this.sentenceLength));
    if (this.sentenceLength >= MIN_SENTENCE_THRESHOLD && errorRatio >= ERROR_THRESHOLD) {
      const langIdent = LanguageIdentifierService.INSTANCE.getInitialized();
      if (langIdent !== null) {
        // for now, we just use the result if also in preferredLanguages to prevent false positive
        const detectedLanguageScores = langIdent.getDetectedLanguageScores(this.sentence, [], this.preferredLanguages, true, MAX_SCORING_LANGUAGES);
        const results = new Map();
        if (detectedLanguageScores.length !== 0) {
          for (let i = 0; i < detectedLanguageScores.length; i++) {
            const detectedLanguage = detectedLanguageScores[i];
            const language = detectedLanguage.getDetectedLanguage();
            // The text main language still has the highest threshold
            if (i === 0 && language.getShortCode() === this.languageShortCode) {
              return new Map([[NO_FOREIGN_LANG_DETECTED, Math.fround(0.99)]]);
            }
            results.set(language.getShortCode(), detectedLanguage.getDetectionConfidence());
          }
          return results;
        }
        return new Map([[NO_FOREIGN_LANG_DETECTED, Math.fround(0.99)]]);
      }
    }
    return new Map();
  }
}
