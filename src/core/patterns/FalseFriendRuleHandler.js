// org.languagetool.rules.patterns.FalseFriendRuleHandler (SAX handler for false-friends.xml)
import { NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { StringBuilder } from '../../lib/java/strings.js';
import { Languages } from '../Languages.js';
import { isUnportedJavaLanguage } from '../language/javaLanguages.js';
import { UnifierConfiguration } from './UnifierConfiguration.js';
import { getMessageBundleForLanguage } from '../resources/ResourceBundleTools.js';
import { Categories } from '../rules/model/Category.js';
import { CorrectExample, IncorrectExample } from '../rules/model/Examples.js';
import { FalseFriendPatternRule } from './FalseFriendPatternRule.js';
import { XMLRuleHandler } from './XMLRuleHandler.js';

const { RULE, PATTERN, TOKEN, EXAMPLE, TYPE, MESSAGE, RULEGROUP, DEFAULT } = XMLRuleHandler;
const TRANSLATION = 'translation';

// Languages of Java modules outside the port (DEV-006) as placeholders that never equal a ported language (false-friends.xml names pl, ru, ...); one object per code
const outOfScopeLanguages = new Map();
// Java: Languages#getLanguageForShortCode(String) for a language of a module that is not ported (placeholder)
function outOfScopeLanguage(code) {
  if (!outOfScopeLanguages.has(code)) {
    outOfScopeLanguages.set(code, {
      equalsConsiderVariantsIfSpecified: () => false,
      getUnifierConfiguration: () => new UnifierConfiguration(),
      toString: () => code,
    });
  }
  return outOfScopeLanguages.get(code);
}
// Java: Languages#isLanguageSupported(String) combined with getLanguageForShortCode; null if unknown
function languageOrNull(code) {
  if (isUnportedJavaLanguage(code)) return outOfScopeLanguage(code);
  return Languages.isLanguageSupported(code) ? Languages.getLanguageForShortCode(code) : null;
}

// Java: FalseFriendRuleHandler
export class FalseFriendRuleHandler extends XMLRuleHandler {
  static FQCN = 'org.languagetool.rules.patterns.FalseFriendRuleHandler';

  // Java: FalseFriendRuleHandler#FalseFriendRuleHandler(Language,Language,String[,boolean])
  constructor(textLanguage, motherTongue, falseFriendHint, inTestMode = false) {
    super();
    this.suggestionMap = new Map(); // rule ID -> list of translations
    this.suggestions = [];
    this.translations = [];
    this.defaultOff = false;
    this.translationLanguage = null;
    this.currentTranslationLanguage = null;
    this.translation = new StringBuilder();
    this.inTranslation = false;
    this.englishMessages = getMessageBundleForLanguage(Languages.getLanguageForShortCode('en-US'));
    this.messages = getMessageBundleForLanguage(motherTongue);
    this.formatter = new MessageFormat('');
    this.textLanguage = textLanguage;
    this.motherTongue = motherTongue;
    this.falseFriendHint = falseFriendHint;
    this.inTestMode = inTestMode;
  }

  // Java: FalseFriendRuleHandler#getSuggestionMap()
  getSuggestionMap() {
    return this.suggestionMap;
  }

  // ===========================================================
  // SAX DocumentHandler methods
  // ===========================================================

  // Java: FalseFriendRuleHandler#startElement(String,String,String,Attributes)
  startElement(qName, attrs) {
    if (qName === RULE) {
      this.translations.length = 0;
      this.id = attrs.getValue('id');
      if (!(this.inRuleGroup && this.defaultOff)) {
        this.defaultOff = attrs.getValue('default') === 'off';
      }
      if (this.inRuleGroup && this.id === null) {
        this.id = this.ruleGroupId;
      }
      this.correctExamples = [];
      this.incorrectExamples = [];
    } else if (qName === PATTERN) {
      this.inPattern = true;
      const languageStr = attrs.getValue('lang');
      const patternLanguage = languageOrNull(languageStr);
      if (patternLanguage !== null) {
        this.language = patternLanguage;
      }
    } else if (qName === TOKEN) {
      this.setToken(attrs);
    } else if (qName === TRANSLATION) {
      this.inTranslation = true;
      const languageStr = attrs.getValue('lang');
      const tmpLang = languageOrNull(languageStr);
      if (tmpLang !== null) {
        this.currentTranslationLanguage = tmpLang;
        if (this.inTestMode && this.currentTranslationLanguage === this.language) {
          throw new RuntimeException('Translation language (' + this.currentTranslationLanguage + ') must not be the same as pattern language (' + this.language + ') for rule ' + this.id);
        }
        if (tmpLang.equalsConsiderVariantsIfSpecified(this.motherTongue)) {
          this.translationLanguage = tmpLang;
        }
      }
    } else if (qName === EXAMPLE) {
      this.correctExample = new StringBuilder();
      this.incorrectExample = new StringBuilder();
      // Java: attrs.getValue(TYPE).equals(...) throws NPE when the type attribute is missing
      if (attrs.getValue(TYPE) === null || attrs.getValue(TYPE) === undefined) {
        throw new NullPointerException('Cannot invoke "String.equals(Object)" because the return value of "org.xml.sax.Attributes.getValue(String)" is null');
      }
      if (attrs.getValue(TYPE) === 'incorrect') {
        this.inIncorrectExample = true;
      } else if (attrs.getValue(TYPE) === 'correct') {
        this.inCorrectExample = true;
      } else if (attrs.getValue(TYPE) === 'triggers_error') {
        throw new RuntimeException("'triggers_error' is not supported for false friend XML");
      }
    } else if (qName === MESSAGE) {
      this.inMessage = true;
      this.message = new StringBuilder();
    } else if (qName === RULEGROUP) {
      this.ruleGroupId = attrs.getValue('id');
      this.inRuleGroup = true;
      this.defaultOff = attrs.getValue(DEFAULT) === 'off';
    }
  }

  // Java: FalseFriendRuleHandler#endElement(String,String,String)
  endElement(qName) {
    switch (qName) {
      case RULE:
        if (this.language === null) throw new NullPointerException('Cannot invoke "org.languagetool.Language.equalsConsiderVariantsIfSpecified(org.languagetool.Language)" because "this.language" is null');
        if (this.language.equalsConsiderVariantsIfSpecified(this.textLanguage) && this.translationLanguage !== null
            && this.translationLanguage.equalsConsiderVariantsIfSpecified(this.motherTongue) && this.language !== this.motherTongue
            && this.translations.length !== 0) {
          this.formatter.applyPattern(this.falseFriendHint);
          const tokensAsString = this.patternTokens.map((t) => t.toString()).join(' ').split('|').join('/');
          const messageArguments = [tokensAsString,
            this.englishMessages.getString(this.textLanguage.getShortCode()),
            this.formatTranslations(this.translations),
            this.englishMessages.getString(this.motherTongue.getShortCode())];
          const description = this.formatter.format(messageArguments);
          const rule = new FalseFriendPatternRule(this.id, this.language, this.patternTokens,
            this.messages.getString('false_friend_desc') + ' '
            + tokensAsString, description, this.messages.getString('false_friend'));
          rule.setCorrectExamples(this.correctExamples);
          rule.setIncorrectExamples(this.incorrectExamples);
          rule.setCategory(Categories.FALSE_FRIENDS.getCategory(this.messages));
          if (this.defaultOff) {
            rule.setDefaultOff();
          }
          this.rules.push(rule);
        }
        if (this.patternTokens !== null) {
          this.patternTokens.length = 0;
        }
        break;
      case TOKEN:
        if (this.language === null) throw new NullPointerException('Cannot invoke "org.languagetool.Language.getUnifierConfiguration()" because "this.language" is null');
        this.finalizeTokens(this.language.getUnifierConfiguration());
        break;
      case PATTERN:
        this.inPattern = false;
        break;
      case TRANSLATION:
        if (this.currentTranslationLanguage !== null && this.currentTranslationLanguage.equalsConsiderVariantsIfSpecified(this.motherTongue)) {
          // currentTranslationLanguage can be null if the language is not supported
          this.translations.push(this.translation);
        }
        if (this.currentTranslationLanguage !== null && this.currentTranslationLanguage.equalsConsiderVariantsIfSpecified(this.textLanguage)
            && this.language.equalsConsiderVariantsIfSpecified(this.motherTongue) && !this.suggestions.includes(this.translation.toString())) {
          this.suggestions.push(this.translation.toString());
        }
        this.translation = new StringBuilder();
        this.inTranslation = false;
        this.currentTranslationLanguage = null;
        break;
      case EXAMPLE:
        if (this.inCorrectExample) {
          this.correctExamples.push(new CorrectExample(this.correctExample.toString()));
        } else if (this.inIncorrectExample) {
          this.incorrectExamples.push(new IncorrectExample(this.incorrectExample.toString()));
        }
        this.inCorrectExample = false;
        this.inIncorrectExample = false;
        this.correctExample = new StringBuilder();
        this.incorrectExample = new StringBuilder();
        break;
      case MESSAGE:
        this.inMessage = false;
        break;
      case RULEGROUP:
        if (this.suggestions.length !== 0) {
          const l = this.suggestions.slice();
          this.suggestionMap.set(this.id, l);
          this.suggestions.length = 0;
        }
        this.inRuleGroup = false;
        break;
      default:
        break;
    }
  }

  // Java: FalseFriendRuleHandler#formatTranslations(List)
  formatTranslations(translations) {
    return translations.map((o) => '"' + o + '"').join(', ');
  }

  // Java: FalseFriendRuleHandler#characters(char[],int,int); the scanner passes the text
  characters(s) {
    if (this.inToken && this.inPattern) {
      this.elements.append(s);
    } else if (this.inCorrectExample) {
      this.correctExample.append(s);
    } else if (this.inIncorrectExample) {
      this.incorrectExample.append(s);
    } else if (this.inTranslation) {
      this.translation.append(s);
    }
  }
}
