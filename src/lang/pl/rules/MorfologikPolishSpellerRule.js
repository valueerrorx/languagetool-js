// Java: org.languagetool.rules.pl.MorfologikPolishSpellerRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaSplit, toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent } from '../../../core/language/components.js';
import { MorfologikSpellerRule } from '../../../core/rules/spelling/morfologik/MorfologikSpellerRule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';

const RESOURCE_FILENAME = '/pl/hunspell/pl_PL.dict';
const POLISH_TOKENIZING_CHARS = Pattern.compile('(?:[Qq]uasi|[Nn]iby)-');

// The set of prefixes that are not allowed to be split in the suggestions.
const prefixes = new Set([
  'arcy', 'neo', 'pre', 'anty', 'eks', 'bez', 'beze', 'ekstra', 'hiper', 'infra', 'kontr', 'maksi', 'midi', 'między',
  'mini', 'nad', 'nade', 'około', 'ponad', 'post', 'pro', 'przeciw', 'pseudo', 'super', 'śród', 'ultra', 'wice', 'wokół', 'wokoło',
]);

// non-word suffixes that should not be suggested (only morphological endings, never after a space)
const bannedSuffixes = new Set(['ami', 'ach', 'e', 'ego', 'em', 'emu', 'ie', 'im', 'm', 'om', 'owie', 'owi', 'ze']);

// Java: MorfologikPolishSpellerRule
export class MorfologikPolishSpellerRule extends MorfologikSpellerRule {
  static FQCN = 'org.languagetool.rules.pl.MorfologikPolishSpellerRule';

  // Java: MorfologikPolishSpellerRule(ResourceBundle,Language,UserConfig,List)
  constructor(messages, language, userConfig, altLanguages) {
    super(messages, language, userConfig, altLanguages);
    this.setCategory(Categories.TYPOS.getCategory(messages));
    this.addExamplePair(Example.wrong('To jest zdanie z <marker>bledem</marker>'),
      Example.fixed('To jest zdanie z <marker>błędem</marker>.'));
    this.userConfig = userConfig;
  }

  // Java: MorfologikPolishSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikPolishSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_PL_PL';
  }

  // Java: MorfologikPolishSpellerRule#tokenizingPattern()
  tokenizingPattern() {
    return POLISH_TOKENIZING_CHARS;
  }

  // Java: MorfologikPolishSpellerRule#getRuleMatches(String,int,AnalyzedSentence,List,int,AnalyzedTokenReadings[])
  getRuleMatches(word, startPos, sentence, ruleMatchesSoFar) {
    const speller1 = this.speller1;
    const ruleMatches = [];
    if ((this.isMisspelled(speller1, word) && this.isNotCompound(word)) || this.isProhibited(word)) {
      const ruleMatch = new RuleMatch(this, sentence, startPos, startPos
        + word.length, this.messages.getString('spelling'),
      this.messages.getString('desc_spelling_short'));
      if (this.userConfig !== null && !this.userConfig.isSuggestionsEnabled()) {
        ruleMatches.push(ruleMatch);
        return ruleMatches;
      }
      // If lower case word is not a misspelled word, return it as the only suggestion
      const createSuggestions = this.userConfig === null || this.userConfig.getMaxSpellingSuggestions() === 0
        || ruleMatchesSoFar.length <= this.userConfig.getMaxSpellingSuggestions();
      if (!this.isMisspelled(speller1, toLowerCase(word, this.conversionLocale))) {
        if (createSuggestions) {
          ruleMatch.setSuggestedReplacements([toLowerCase(word, this.conversionLocale)]);
        } else {
          // limited to save CPU
          ruleMatch.setSuggestedReplacement(this.messages.getString('too_many_errors'));
        }
        ruleMatches.push(ruleMatch);
        return ruleMatches;
      }
      if (createSuggestions) {
        const suggestions = SuggestedReplacement.convert(speller1.getSuggestions(word));
        suggestions.splice(0, 0, ...this.getAdditionalTopSuggestions(suggestions, word));
        suggestions.push(...this.getAdditionalSuggestions(suggestions, word));
        if (suggestions.length > 0) {
          ruleMatch.setSuggestedReplacementObjects(this.pruneSuggestions(this.orderSuggestions(suggestions, word)));
        }
      } else {
        // limited to save CPU
        ruleMatch.setSuggestedReplacement(this.messages.getString('too_many_errors'));
      }
      ruleMatches.push(ruleMatch);
    }
    return ruleMatches;
  }

  // Java: MorfologikPolishSpellerRule#isNotCompound(String)
  isNotCompound(word) {
    const probablyCorrectWords = [];
    for (let i = 2; i < word.length; i++) {
      // chop from left to right
      const first = word.substring(0, i);
      const second = word.substring(i);
      if (prefixes.has(toLowerCase(first, this.conversionLocale))
        && !this.isMisspelled(this.speller1, second)
        && second.length > first.length) { // but not for short words such as "premoc"
        // ignore this match, it's fine
        probablyCorrectWords.push(word); // FIXME: some strange words are being accepted, like prekupa
      } else {
        const testedTokens = [first, second];
        const taggedToks = this.language.getTagger().tag(testedTokens);
        if (taggedToks.length === 2
          // "białozielony", trzynastobitowy
          && (taggedToks[0].hasPosTag('adja')
          || (taggedToks[0].hasPosTag('num:comp')
          && !taggedToks[0].hasPosTag('adv')))
          && taggedToks[1].hasPartialPosTag('adj:')) {
          probablyCorrectWords.push(word);
        }
      }
    }
    if (probablyCorrectWords.length > 0) {
      this.addIgnoreTokens(probablyCorrectWords);
      return false;
    }
    return true;
  }

  // Java: MorfologikPolishSpellerRule#pruneSuggestions(List)
  pruneSuggestions(suggestions) {
    const prunedSuggestions = [];
    for (const suggestion of suggestions) {
      if (suggestion.getReplacement().indexOf(' ') === -1) {
        prunedSuggestions.push(suggestion);
      } else {
        const complexSug = javaSplit(suggestion.getReplacement(), ' ');
        if (complexSug.length > 1 && !bannedSuffixes.has(complexSug[1])) {
          prunedSuggestions.push(suggestion);
        }
      }
    }
    return prunedSuggestions;
  }
}

registerComponent(MorfologikPolishSpellerRule.FQCN, (...args) => new MorfologikPolishSpellerRule(...args));
