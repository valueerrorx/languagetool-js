// org.languagetool.DetectedLanguage
export class DetectedLanguage {
  static FQCN = 'org.languagetool.DetectedLanguage';

  // Java: DetectedLanguage#DetectedLanguage(Language,Language[,float,String])
  constructor(givenLanguage, detectedLanguage, detectionConfidence = 1.0, detectionSource = null) {
    this.givenLanguage = givenLanguage;
    this.detectedLanguage = detectedLanguage;
    this.detectionConfidence = Math.fround(detectionConfidence);
    this.detectionSource = detectionSource;
  }

  // Java: DetectedLanguage#getGivenLanguage()
  getGivenLanguage() {
    return this.givenLanguage;
  }

  // Java: DetectedLanguage#getDetectedLanguage()
  getDetectedLanguage() {
    return this.detectedLanguage;
  }

  // Java: DetectedLanguage#getDetectionConfidence()
  getDetectionConfidence() {
    return this.detectionConfidence;
  }

  // Java: DetectedLanguage#getDetectionSource()
  getDetectionSource() {
    return this.detectionSource;
  }

  // Java: DetectedLanguage#toString()
  toString() {
    return this.detectedLanguage.getShortCodeWithCountryAndVariant();
  }
}
