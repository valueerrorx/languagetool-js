// org.languagetool.rules.DictionaryMatchFilter
import { substring } from '../../lib/java/strings.js';

export class DictionaryMatchFilter {
  static FQCN = 'org.languagetool.rules.DictionaryMatchFilter';

  // Java: DictionaryMatchFilter#DictionaryMatchFilter(UserConfig)
  constructor(userConfig) {
    this.userConfig = userConfig;
  }

  // Java: DictionaryMatchFilter#filter(List,AnnotatedText)
  filter(ruleMatches, text) {
    const dictionary = new Set(this.userConfig.getAcceptedWords());
    return ruleMatches.filter((match) => {
      // offsets already point to the text with markup
      const covered = substring(text.getTextWithMarkup(), match.getFromPos(), match.getToPos());
      return !dictionary.has(covered);
    });
  }
}
