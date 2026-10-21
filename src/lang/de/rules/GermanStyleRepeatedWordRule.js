// org.languagetool.rules.de.GermanStyleRepeatedWordRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { ClassCastException, IllegalStateException, NullPointerException } from '../../../lib/java/errors.js';
import { endsWith, startsWith, substring } from '../../../lib/java/strings.js';
import { URL } from '../../../lib/java/URL.js';
import { AbstractStyleRepeatedWordRule } from '../../../core/rules/AbstractStyleRepeatedWordRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleOption } from '../../../core/rules/model/RuleOption.js';
import { getDictionaryWithCaching } from '../../../core/rules/spelling/morfologik/MorfologikSpeller.js';
import { Speller } from '../../../lib/fsa/Speller.js';
import { lowercaseFirstChar, uppercaseFirstChar } from '../../../core/text/StringTools.js';

const SYNONYMS_URL = 'https://www.openthesaurus.de/synonyme/';
const LETTERS = Pattern.compile('^[A-Za-zÄÖÜäöüß]+$');
const MAX_DISTANCE_OF_SENTENCES = 1;
const EXCLUDE_DIRECT_SPEECH = true;
const TEST_COMPOUND_WORDS = false;

// Java: GermanStyleRepeatedWordRule#isUnknownWord(AnalyzedTokenReadings)
function isUnknownWord(token) {
  return token.isPosTagUnknown() && token.getToken().length > 2 && LETTERS.matcher(token.getToken()).matches();
}

// Java: GermanStyleRepeatedWordRule
export class GermanStyleRepeatedWordRule extends AbstractStyleRepeatedWordRule {
  static FQCN = 'org.languagetool.rules.de.GermanStyleRepeatedWordRule';

  // Java: GermanStyleRepeatedWordRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig);
    this.speller = null;
    this.testCompoundWords = TEST_COMPOUND_WORDS;
    super.setCategory(Categories.STYLE.getCategory(messages));
    this.addExamplePair(Example.wrong('Ich gehe zum Supermarkt, danach <marker>gehe</marker> ich nach Hause.'),
      Example.fixed('Ich gehe zum Supermarkt, danach nach Hause.'));
    if (userConfig !== null && userConfig !== undefined) {
      const cf = userConfig.getConfigValueByID(this.getId());
      // DEV-022: a missing or non-Boolean third value keeps the default (Java: NPE/ClassCastException)
      if (cf !== null && cf.length > 2 && typeof cf[2] === 'boolean') {
        this.testCompoundWords = cf[2];
      }
    }
  }

  // Java: GermanStyleRepeatedWordRule#getId()
  getId() {
    return 'STYLE_REPEATED_WORD_RULE_DE';
  }

  // Java: GermanStyleRepeatedWordRule#getDescription()
  getDescription() {
    return 'Wiederholte Worte in aufeinanderfolgenden Sätzen';
  }

  // Java: GermanStyleRepeatedWordRule#messageSameSentence()
  messageSameSentence() {
    return 'Mögliches Stilproblem: Das Wort wird noch einmal im selben Satz verwendet.';
  }

  // Java: GermanStyleRepeatedWordRule#messageSentenceBefore()
  messageSentenceBefore() {
    return 'Mögliches Stilproblem: Das Wort wird bereits in einem vorhergehenden Satz verwendet.';
  }

  // Java: GermanStyleRepeatedWordRule#messageSentenceAfter()
  messageSentenceAfter() {
    return 'Mögliches Stilproblem: Das Wort wird auch in einem nachfolgenden Satz verwendet.';
  }

  // Java: GermanStyleRepeatedWordRule#getRuleOptions()
  getRuleOptions() {
    return [
      new RuleOption(MAX_DISTANCE_OF_SENTENCES, this.messages.getString('guiStyleRepeatedWordText'), 0, 5),
      new RuleOption(EXCLUDE_DIRECT_SPEECH, 'Direkte Rede und Zitate ausschließen'),
      new RuleOption(TEST_COMPOUND_WORDS, 'Auch zusammengesetzte Wörter prüfen'),
    ];
  }

  // Java: GermanStyleRepeatedWordRule#isCorrectSpell(String)
  isCorrectSpell(word) {
    word = uppercaseFirstChar(word);
    if (this.speller === null) {
      // speller can not initialized by constructor because of temporary initialization of LanguageTool in other rules,
      // which leads to problems in LO/OO extension
      this.speller = new Speller(getDictionaryWithCaching('/de/hunspell/de_DE.dict'));
    }
    if (this.speller !== null) {
      return !this.speller.isMisspelled(word);
    } else if (this.linguServices !== null) {
      return this.linguServices.isCorrectSpell(word, this.lang);
    }
    throw new IllegalStateException('LinguServices or Speller must be not null to check spelling in CompoundInfinitivRule');
  }

  // Java: GermanStyleRepeatedWordRule#isTokenToCheck(AnalyzedTokenReadings[],int)
  isTokenToCheck(tokens, n) {
    if (n > 0 && n < tokens.length - 1 &&
        (tokens[n + 1].hasPosTagStartingWith('EIG') || isUnknownWord(tokens[n + 1]))
        && (tokens[n].getToken() === 'Frau' || tokens[n].getToken() === 'Fräulein' || tokens[n].getToken() === 'Herr' ||
            tokens[n].getToken() === 'Herrn' || tokens[n].getToken() === 'Lady' || tokens[n].getToken() === 'Mister')
       ) {
      return false;
    }
    const token = tokens[n];
    return ((token.matchesPosTagRegex('(SUB|EIG|VER|ADJ):.*')
        && !token.matchesPosTagRegex('(PRO|A(RT|DV)|VER:(AUX|MOD)):.*')
        || isUnknownWord(token))
        && !['sicher', 'weit', 'Sie', 'Ich', 'Euch', 'Eure', 'Der', 'all'].includes(token.getToken()));
  }

  // Java: GermanStyleRepeatedWordRule#isTokenPair(AnalyzedTokenReadings[],int,boolean)
  isTokenPair(tokens, n, before) {
    if (before) {
      if (n > 2 && n < tokens.length &&
          (tokens[n - 2].hasPosTagStartingWith('SUB') && tokens[n - 1].hasPosTagStartingWith('PRP')
              && tokens[n].hasPosTagStartingWith('SUB'))
          || (tokens[n - 2].getToken() === 'hart' && tokens[n - 1].getToken() === 'auf' && tokens[n].getToken() === 'hart')
          || (tokens[n - 2].getToken() === 'dicht' && tokens[n - 1].getToken() === 'an' && tokens[n].getToken() === 'dicht')
          || (tokens[n - 2].getToken() === 'fressen' && tokens[n - 1].getToken() === 'und' && tokens[n].getToken() === 'gefressen')
         ) {
        return true;
      }
    } else {
      if (n > 0 && n < tokens.length - 2 &&
          (tokens[n].hasPosTagStartingWith('SUB') && tokens[n + 1].hasPosTagStartingWith('PRP')
              && tokens[n + 2].hasPosTagStartingWith('SUB'))
          || (tokens[n].getToken() === 'hart' && tokens[n + 1].getToken() === 'auf' && tokens[n + 2].getToken() === 'hart')
          || (tokens[n].getToken() === 'dicht' && tokens[n + 1].getToken() === 'an' && tokens[n + 2].getToken() === 'dicht')
          || (tokens[n].getToken() === 'fressen' && tokens[n + 1].getToken() === 'und' && tokens[n + 2].getToken() === 'gefressen')
         ) {
        return true;
      }
    }
    return false;
  }

  // Java: GermanStyleRepeatedWordRule#isSecondPartofWord(String,String)
  isSecondPartofWord(testTokenText, tokenText) {
    if (testTokenText.length - tokenText.length < 3) {
      return false;
    }
    const lowerTokenText = lowercaseFirstChar(tokenText);
    if (lowerTokenText === 'frei'
        || (lowerTokenText === 'alten' && endsWith(testTokenText, 'halten'))
        ) {
      return false;
    }
    if (startsWith(lowercaseFirstChar(testTokenText), lowerTokenText)) {
      let word = substring(testTokenText, tokenText.length);
      if (this.isCorrectSpell(word)) {
        return true;
      } else if (startsWith(word, 's')) {
        word = substring(word, 1);
        if (this.isCorrectSpell(word)) {
          return true;
        }
      }
      return false;
    } else if (endsWith(testTokenText, lowerTokenText)) {
      let word = substring(testTokenText, 0, testTokenText.length - tokenText.length);
      if (this.isCorrectSpell(word)) {
        return true;
      } else if (endsWith(word, 's')) {
        word = substring(word, word.length - 1);
        if (this.isCorrectSpell(word)) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  // Java: GermanStyleRepeatedWordRule#isPartOfWord(String,String)
  isPartOfWord(testTokenText, tokenText) {
    if (!this.testCompoundWords || testTokenText.length < 3 || tokenText.length < 3) {
      return false;
    }
    if (testTokenText.length > tokenText.length) {
      return this.isSecondPartofWord(testTokenText, tokenText);
    } else {
      return this.isSecondPartofWord(tokenText, testTokenText);
    }
  }

  // Java: GermanStyleRepeatedWordRule#isExceptionPair(AnalyzedTokenReadings,AnalyzedTokenReadings)
  isExceptionPair(token1, token2) {
    if ((token1.hasLemma('nah') && token1.hasLemma('nächst') && !token2.hasLemma('nächst')) ||
        (token2.hasLemma('nah') && token2.hasLemma('nächst') && !token1.hasLemma('nächst'))) {
      return true;
    } else {
      if (token1.hasLemma('gut') &&
          ((token1.getToken().startsWith('gut') && !token2.getToken().startsWith('gut')) ||
           (token2.getToken().startsWith('gut') && !token1.getToken().startsWith('gut')))) {
        return true;
      }
    }
    return false;
  }

  // Java: GermanStyleRepeatedWordRule#setURL(AnalyzedTokenReadings)
  setURL(token) {
    if (token !== null && token !== undefined) {
      const readings = token.getReadings();
      const lemmas = [];
      for (const reading of readings) {
        const lemma = reading.getLemma();
        if (lemma !== null && lemma !== undefined) {
          lemmas.push(lemma);
        }
      }
      if (lemmas.length === 1) {
        return new URL(SYNONYMS_URL + lemmas[0]);
      }
      return new URL(SYNONYMS_URL + token.getToken());
    }
    return null;
  }
}
