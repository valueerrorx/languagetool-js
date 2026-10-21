// Java: org.languagetool.language.identifier.DefaultLanguageIdentifier (optimaize fallback only; fastText/ngram: DEV-001)
import { readFileSync } from 'node:fs';
import { FileNotFoundException, RuntimeException, ZipException } from '../../../lib/java/errors.js';
import { JMath } from '../../../lib/java/numbers.js';
import { javaTrim } from '../../../lib/java/strings.js';
import { setResourceLoader } from '../../../lib/optimaize/classpath.js';
import { LanguageDetectorBuilder } from '../../../lib/optimaize/LanguageDetector.js';
import { NgramExtractors } from '../../../lib/optimaize/ngram.js';
import { LanguageProfileReader } from '../../../lib/optimaize/profiles.js';
import { RemoveMinorityScriptsTextFilter, TextObjectFactoryBuilder } from '../../../lib/optimaize/text.js';
import { getResourceAsStream } from '../../resources/ResourceDataBroker.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { DetectedLanguage } from '../../rules/model/DetectedLanguage.js';
import { NoopLanguage } from '../../noop/NoopLanguage.js';
import { getAll, getLanguageForShortCode, isLanguageSupported } from './DetectionLanguages.js';
import {
  LanguageIdentifier, REMOVE_EMAIL_SIGNATURE_FILTER, REMOVE_MENTION_FILTER, REMOVE_NON_BREAKING_SPACES_FILTER, REMOVE_URL_FILTER,
} from './LanguageIdentifier.js';
import { LanguageIdentifierService } from './LanguageIdentifierService.js';
import { LoggerFactory } from '../../../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.language.identifier.DefaultLanguageIdentifier');

const MINIMAL_CONFIDENCE = 0.9;
const SHORT_ALGO_THRESHOLD = 50;
// CONSIDER_ONLY_PREFERRED_THRESHOLD (50) is only read by the fastText/ngram branch (DEV-001)
// ast and gl often prevent the correct detection of Spanish, so we disable them for now:
const ignoreLangCodes = ['ast', 'gl'];
// languages that we offer profiles for as they are not yet supported by language-detector:
const externalLangCodes = ['eo', 'crh'];

// optimaize classpath = the extracted jar resources
setResourceLoader((name) => getResourceAsStream(`/${name}`));

let shared = null; // JS cache: detector and text factory are immutable and identical for every instance (D-042)

// Java: DefaultLanguageIdentifier#getLanguageCodes() (private static; exported for the oracle adapter)
export function getLanguageCodes() {
  const langCodes = [];
  for (const lang of getAll()) {
    const langCode = lang.getShortCode();
    const ignore = lang.isVariant() || ignoreLangCodes.includes(langCode) || externalLangCodes.includes(langCode);
    if (ignore) continue;
    if (langCode === 'zh') {
      langCodes.push('zh-CN');
      langCodes.push('zh-TW');
    } else if (!langCodes.includes(langCode)) {
      langCodes.push(langCode);
    }
  }
  return langCodes;
}

// Java: DefaultLanguageIdentifier#loadProfiles(List)
function loadProfiles(langCodes) {
  const profileReader = new LanguageProfileReader();
  const profiles = profileReader.read(langCodes);
  for (const externalLangCode of externalLangCodes) {
    const profilePath = `/${externalLangCode}/${externalLangCode}.profile`;
    if (getDataBroker().resourceExists(profilePath)) { // not all languages are always available
      profiles.push(new LanguageProfileReader().read(getDataBroker().getFromResourceDirAsStream(profilePath)));
    }
  }
  return profiles;
}

// Java: DefaultLanguageIdentifier#DefaultLanguageIdentifier(int) body (detector + text object factory)
function buildShared() {
  if (shared === null) {
    try {
      const profiles = loadProfiles(getLanguageCodes());
      const languageDetector = LanguageDetectorBuilder.create(NgramExtractors.standard())
        .minimalConfidence(MINIMAL_CONFIDENCE)
        .shortTextAlgorithm(SHORT_ALGO_THRESHOLD)
        .withProfiles(profiles)
        .build();
      const textObjectFactory = new TextObjectFactoryBuilder()
        .maxTextLength(10000)
        // note: keep these in sync with if(fasttextEnabled) in detectLanguage:
        .withTextFilter(REMOVE_URL_FILTER)
        .withTextFilter(RemoveMinorityScriptsTextFilter.forThreshold(0.3))
        .withTextFilter(REMOVE_EMAIL_SIGNATURE_FILTER)
        .withTextFilter(REMOVE_MENTION_FILTER)
        .withTextFilter(REMOVE_NON_BREAKING_SPACES_FILTER)
        .build();
      shared = { languageDetector, textObjectFactory };
    } catch (e) {
      if (e && e.javaClass === 'java.io.IOException') throw new RuntimeException('Could not set up language identifier', e);
      throw e;
    }
  }
  return shared;
}

// Java: new NGramDetector(File,int) -> new ZipFile(File): only the failures of opening the archive (loading the model: DEV-001)
function openZipFile(file) {
  let buf;
  try {
    buf = readFileSync(file.toString());
  } catch {
    throw new RuntimeException(`Could not load ngram data language identification from ${file}`, new FileNotFoundException(`${file} (No such file or directory)`));
  }
  if (buf.length === 0 || buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) < Math.max(0, buf.length - 65557)) {
    throw new RuntimeException(`Could not load ngram data language identification from ${file}`,
      new ZipException(buf.length === 0 ? 'zip file is empty' : 'zip END header not found'));
  }
}

// Java: org.languagetool.language.identifier.DefaultLanguageIdentifier
export class DefaultLanguageIdentifier extends LanguageIdentifier {
  static FQCN = 'org.languagetool.language.identifier.DefaultLanguageIdentifier';

  // Java: DefaultLanguageIdentifier#DefaultLanguageIdentifier() / (int)
  constructor(maxLength = 1000) {
    super(maxLength);
    const s = buildShared();
    this.languageDetector = s.languageDetector;
    this.textObjectFactory = s.textObjectFactory;
    this.fastTextDetector = null; // DEV-001: never set
    this.ngram = null; // DEV-001: never set
  }

  // Java: DefaultLanguageIdentifier#enableFasttext(File,File) (DEV-001: only the not-configured branch)
  enableFasttext(fasttextBinary, fasttextModel) {
    if (fasttextBinary !== null && fasttextBinary !== undefined && fasttextModel !== null && fasttextModel !== undefined) {
      // F66: server startup only; detection with fastText stays unported (SRV-0184, DEV-001): marker detector, detection throws
      this.fastTextDetector = { notPorted: true };
      return;
    }
    logger.warn('fastText not configured - language detection performance will be degraded. See https://dev.languagetool.org/http-server#starting-from-command-line for instructions.');
  }

  // Java: DefaultLanguageIdentifier#enableNgrams(File) (DEV-001)
  enableNgrams(ngramDir) {
    if (ngramDir !== null && ngramDir !== undefined) {
      openZipFile(ngramDir);
      throw Object.assign(new Error('not ported: ngram language identification (DEV-001)'), { notPorted: true });
    }
  }

  // Java: DefaultLanguageIdentifier#isFastTextEnabled()
  isFastTextEnabled() {
    return this.fastTextDetector !== null;
  }

  // Java: DefaultLanguageIdentifier#detectLanguage(String) / (String,List,List) / (String,List,List,boolean)
  detectLanguage(cleanText, noopLangsTmp, preferredLangsTmp, limitOnPreferredLangs = false) {
    if (noopLangsTmp === undefined) {
      const detectedLanguage = this.detectLanguage(cleanText, [], []);
      return detectedLanguage === null ? null : detectedLanguage.getDetectedLanguage();
    }
    const detectedLanguageScores = this.getDetectedLanguageScores(cleanText, noopLangsTmp, preferredLangsTmp, limitOnPreferredLangs, 1);
    return detectedLanguageScores.length > 0 ? detectedLanguageScores[0] : null;
  }

  // Java: DefaultLanguageIdentifier#getDetectedLanguageScores(String,List,List,boolean,int) (fallback branch; fastText/ngram: DEV-001)
  getDetectedLanguageScores(cleanText, noopLangsTmp, preferredLangsTmp, limitOnPreferredLangs, count) {
    let text = cleanText;
    const parsedLanguageLists = this.prepareDetectLanguage(text, noopLangsTmp, preferredLangsTmp);
    if (parsedLanguageLists === null) {
      return [new DetectedLanguage(null, new NoopLanguage())];
    }
    const additionalLangs = parsedLanguageLists.getAdditionalLangs();
    const preferredLangs = parsedLanguageLists.getPreferredLangs();
    let scores = null;
    let source = '';
    if (this.fastTextDetector !== null) throw Object.assign(new Error('not ported: fastText language identification (DEV-001)'), { notPorted: true });
    // fastTextDetector == null && ngram == null (DEV-001): always the optimaize fallback
    text = this.textObjectFactory.forText(text).toString();
    source += '+fallback';
    if (scores === null) scores = new Map(); // Java HashMap with at most one entry
    const localResult = this.detectLanguageCode(text, preferredLangs, limitOnPreferredLangs);
    if (localResult !== null) scores.set(localResult[0], localResult[1]);
    if (additionalLangs.length > 0) {
      logger.warn('Cannot consider noopLanguages because not in fastText mode: {}', `[${additionalLangs.join(', ')}]`);
    }
    const detectedLanguages = [];
    const service = LanguageIdentifierService.INSTANCE;
    if (count > 1) {
      const orderedScores = this.getOrderedScores(scores, count);
      for (const [key, value] of orderedScores) {
        if (key !== null && service.canLanguageBeDetected(key, additionalLangs)) {
          const rate = Math.fround(Number(JMath.round(value * 100.0)) / 100.0); // Convert to a non-scientific float and potentially round down
          detectedLanguages.push(new DetectedLanguage(null, getLanguageForShortCode(key, additionalLangs), rate, source));
        }
      }
    } else {
      const [key, value] = this.getHighestScoringResult(scores);
      if (key !== null && service.canLanguageBeDetected(key, additionalLangs)) {
        const newScore = Math.fround(value); // source never contains "fasttext" (DEV-001)
        detectedLanguages.push(new DetectedLanguage(null, getLanguageForShortCode(key, additionalLangs), newScore, source));
      }
    }
    if (detectedLanguages.length === 0 && preferredLangs.length > 0
      && preferredLangs[0] !== null
      && javaTrim(preferredLangs[0]).length !== 0
      && isLanguageSupported(preferredLangs[0])) {
      source += '+fallbackToPrefLang';
      detectedLanguages.push(new DetectedLanguage(null, getLanguageForShortCode(preferredLangs[0]), Math.fround(0.1), source));
    }
    return detectedLanguages;
  }

  // Java: DefaultLanguageIdentifier#detectLanguageCode(String,List,boolean) -> [code, prob] | null
  detectLanguageCode(text, preferredLangs, limitOnPreferredLangs) {
    let lang = this.languageDetector.getProbabilities(text);
    if (limitOnPreferredLangs && preferredLangs !== null && preferredLangs.length > 0) {
      const before = lang.length;
      lang = lang.filter((l) => preferredLangs.includes(l.getLocale().getLanguage()));
      if (lang.length < before && lang.length === 0) {
        logger.warn('No language detected for text after remove all not preferred languages from score.');
      }
    }
    if (lang.length > 0) {
      return [lang[0].getLocale().getLanguage(), lang[0].getProbability()];
    }
    return null;
  }
}
