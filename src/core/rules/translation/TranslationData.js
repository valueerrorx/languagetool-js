// Java: org.languagetool.rules.translation.TranslationData
// Java: TranslationData
export class TranslationData {
  static FQCN = 'org.languagetool.rules.translation.TranslationData';

  // Java: TranslationData#TranslationData(List,DataSource)
  constructor(translations, dataSource) {
    this.translations = translations;
    this.dataSource = dataSource;
  }

  // Java: TranslationData#getTranslations()
  getTranslations() {
    return this.translations;
  }
}
