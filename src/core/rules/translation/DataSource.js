// Java: org.languagetool.rules.translation.DataSource
export class DataSource {
  static FQCN = 'org.languagetool.rules.translation.DataSource';

  // Java: DataSource#DataSource(String,String,String)
  constructor(licenseUrl, sourceName, sourceUrl) {
    this.licenseUrl = licenseUrl;
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
  }
}
