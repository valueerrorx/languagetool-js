// Java: org.languagetool.LanguageWithModel (Lucene n-gram model is not available, DEV-001: behaves as if no index exists)
import { File } from '../lib/java/io/File.js';
import { Language } from './Language.js';

// Java: LanguageWithModel
export class LanguageWithModel extends Language {
  static FQCN = 'org.languagetool.LanguageWithModel';

  // Java: LanguageWithModel#LanguageWithModel()
  constructor() {
    super();
    this.noLmWarningPrinted = false;
    this.languageModel = null;
  }

  // Java: LanguageWithModel#getLanguageModel(File)
  getLanguageModel(indexDir) {
    if (this.languageModel !== null) {
      return this.languageModel;
    }
    this.languageModel = this.initLanguageModel(indexDir, this.languageModel);
    return this.languageModel;
  }

  // Java: LanguageWithModel#close()
  close() {
    if (this.languageModel !== null) {
      this.languageModel.close();
      this.languageModel = null;
    }
  }

  // Java: LanguageWithModel#initLanguageModel(File,LanguageModel)
  initLanguageModel(indexDir, languageModel) {
    if (languageModel === null) {
      const topIndexDir = new File(indexDir, this.getShortCode());
      if (topIndexDir.exists()) {
        // LuceneLanguageModel is not available (DEV-001)
        languageModel = null;
      } else if (!this.noLmWarningPrinted) {
        this.noLmWarningPrinted = true;
        process.stderr.write(`WARN: ngram index dir ${topIndexDir} not found for ${this.getName()}\n`);
      }
    }
    return languageModel;
  }
}
