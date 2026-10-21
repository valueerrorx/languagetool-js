// Ported from PatternRuleTest + AbstractPatternRuleTest (languagetool-core test); XSD validation reduced to well-formedness (D-048), thread pool replaced by a sequential loop
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { AssertionError, Exception, RuntimeException } from '../../src/lib/java/errors.js';
import { Pattern } from '../../src/lib/java/regex/index.js';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';
import { equalsIgnoreCase, javaMatches, javaReplace, javaReplaceAll, javaTrim, toLowerCase, substring } from '../../src/lib/java/strings.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { MultiThreadedJLanguageTool } from '../../src/core/MultiThreadedJLanguageTool.js';
import { Languages } from '../../src/core/Languages.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { parseXml, parserOptions } from '../../src/core/resources/xml.js';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { RegexPatternRule } from '../../src/core/patterns/RegexPatternRule.js';
import { TestHackHelper } from '../../src/core/rules/TestHackHelper.js';
import { ExampleSentence } from '../../src/core/rules/model/Examples.js';
import { fail, warnIfRegexpSyntaxNotKosher } from './PatternTestTools.js';
import { RuleIdValidator } from './RuleIdValidator.js';

// A test sentence should only be a single sentence - if that's not the case it can happen that rules are checked as being correct that in reality will never match.
const CHECK_WITH_SENTENCE_SPLITTING = false;
// Java: PatternRuleTest#MATCH_COMPARATOR (Comparator.comparingInt(Match::getTokenRef))
const MATCH_COMPARATOR = (a, b) => a.getTokenRef() - b.getTokenRef();

const isNull = (x) => x === null || x === undefined;
// Java: List#toString()
const listToString = (list) => `[${list.map((x) => String(x)).join(', ')}]`;
const listEquals = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Java: PatternRuleTest.PatternRuleTestFailure
export class PatternRuleTestFailure extends Exception {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleTest$PatternRuleTestFailure';

  // Java: PatternRuleTestFailure(AbstractPatternRule,String)
  constructor(rule, message) {
    super();
    this.rule = rule;
    this.msg = message;
  }

  // Java: PatternRuleTestFailure#getMessage()
  getMessage() {
    return `Test failure for rule ${this.rule.getFullId()} in file ${this.rule.getSourceFile()} (line ${this.rule.getXmlLineNumber()}): ${this.msg}`;
  }
}

// Java: PatternRuleTest.PatternRuleErrorCollector (org.junit.rules.ErrorCollector)
export class PatternRuleErrorCollector {
  // Java: PatternRuleErrorCollector() / PatternRuleErrorCollector(boolean)
  constructor(expectToFail = false) {
    this.expectToFail = expectToFail;
    this.errors = [];
  }

  // Java: ErrorCollector#addError(Throwable)
  addError(error) {
    this.errors.push(error);
  }

  // Java: PatternRuleErrorCollector#check()
  check() {
    this.verify();
  }

  // Java: PatternRuleErrorCollector#verify()
  verify() {
    if (this.expectToFail) {
      let throwable = null;
      try {
        this.verifySuper();
      } catch (e) {
        throwable = e;
      }
      if (throwable === null) {
        throw new AssertionError('Expected exception: java.lang.Throwable');
      }
      console.log('PatternRuleErrorCollector verify fails as expected.');
      console.error(throwable.getMessage());
    } else {
      this.verifySuper();
    }
  }

  // Java: ErrorCollector#verify() (MultipleFailureException.assertEmpty)
  verifySuper() {
    if (this.errors.length === 0) return;
    if (this.errors.length === 1) throw this.errors[0];
    let sb = `There were ${this.errors.length} errors:`;
    for (const e of this.errors) {
      sb += `\n  ${e.constructor.FQCN}(${e.getMessage()})`;
    }
    throw new RuntimeException(sb);
  }
}

// Java: PatternRuleTest (extends AbstractPatternRuleTest)
export class PatternRuleTest {
  // Java: PatternRuleTest() (field initializer ruleErrors = createPatternRuleErrorCollector())
  constructor() {
    this.ruleErrors = this.createPatternRuleErrorCollector();
  }

  // Java: PatternRuleTest#createPatternRuleErrorCollector()
  createPatternRuleErrorCollector() {
    return new PatternRuleErrorCollector();
  }

  // Java: AbstractPatternRuleTest#shortMessageIsLongerThanErrorMessage()
  shortMessageIsLongerThanErrorMessage() {
    for (const lang of Languages.get()) {
      if (this.skipCountryVariant(lang)) {
        // Skipping because there are no specific rules for this variant
        return;
      }
      const languageTool = new JLanguageTool(lang);
      for (const rule of this.getAllPatternRules(lang, languageTool)) {
        this.warnIfShortMessageLongerThanErrorMessage(rule);
      }
    }
  }

  // Java: AbstractPatternRuleTest#warnIfShortMessageLongerThanErrorMessage(AbstractPatternRule)
  warnIfShortMessageLongerThanErrorMessage(rule) {
    const shortMessage = rule.getShortMessage();
    const sizeOfShortMessage = shortMessage.length;
    const sizeOfErrorMessage = rule.getMessage().length;
    if (sizeOfShortMessage >= sizeOfErrorMessage) {
      if (shortMessage === rule.getMessage()) {
        console.error('Warning: The content of <short> and <message> are identical. No need for <short> tag in that case. '
          + `<message>. Language: ${rule.language.getName()}. Rule: ${rule.getFullId()}:\n`
          + `  <short>:   ${shortMessage}\n`
          + `  <message>: ${rule.getMessage()}`);
      } else {
        console.error('Warning: The content of <short> should be shorter than the content of '
          + `<message>. Language: ${rule.language.getName()}. Rule: ${rule.getFullId()}:\n`
          + `  <short>:   ${shortMessage}\n`
          + `  <message>: ${rule.getMessage()}`);
      }
    }
  }

  // Java: AbstractPatternRuleTest#getAllPatternRules(Language,JLanguageTool)
  getAllPatternRules(language, languageTool) {
    const rules = [];
    for (const patternRuleFileName of language.getRuleFileNames()) {
      rules.push(...languageTool.loadPatternRules(patternRuleFileName));
    }
    return rules;
  }

  // Java: AbstractPatternRuleTest#skipCountryVariant(Language)
  skipCountryVariant(lang) {
    if (Languages.get().length === 0 || Languages.get()[0].equals(lang)) { // test always the first one
      return false;
    }
    const dataBroker = getDataBroker();
    let hasGrammarFiles = false;
    for (const grammarFile of this.getGrammarFileNames(lang)) {
      if (dataBroker.ruleFileExists(grammarFile)) {
        hasGrammarFiles = true;
      }
    }
    return !hasGrammarFiles && Languages.get().length > 1;
  }

  // Java: AbstractPatternRuleTest#getGrammarFileNames(Language)
  getGrammarFileNames(lang) {
    const shortNameWithVariant = lang.getShortCodeWithCountryAndVariant();
    const fileNames = [];
    for (const ruleFile of lang.getRuleFileNames()) {
      const nameOnly = path.posix.basename(ruleFile);
      let fileName;
      if (shortNameWithVariant.includes('-x-')) {
        fileName = `${lang.getShortCode()}/${nameOnly}`;
      } else if (shortNameWithVariant.includes('-') && shortNameWithVariant !== 'xx-XX'
        && !shortNameWithVariant.endsWith('-ANY') && Languages.get().length > 1
        && shortNameWithVariant !== 'de-DE'
        && shortNameWithVariant !== 'ca-ES') { // TODO: change Catalan language definitions?
        fileName = `${lang.getShortCode()}/${shortNameWithVariant}/${nameOnly}`;
      } else {
        fileName = `${lang.getShortCode()}/${nameOnly}`;
      }
      if (!fileNames.includes(fileName)) {
        fileNames.push(fileName);
      }
    }
    return fileNames;
  }

  /**
   * To be called from language modules. Languages.get() knows only the languages that's in the classpath.
   * @param ignoredLanguage ignore this language - useful to speed up tests from languages that have another language as a dependency
   */
  // Java: PatternRuleTest#runGrammarRulesFromXmlTest(Language)
  async runGrammarRulesFromXmlTestIgnoring(ignoredLanguage) {
    let count = 0;
    for (const lang of Languages.get()) {
      if (ignoredLanguage.getShortCodeWithCountryAndVariant() === lang.getShortCodeWithCountryAndVariant()) {
        continue;
      }
      await this.runGrammarRuleForLanguage(lang);
      count++;
    }
    if (count === 0) {
      console.error('Warning: no languages found in classpath - cannot run any grammar rule tests');
    }
  }

  // Java: PatternRuleTest#runGrammarRulesFromXmlTest()
  async runGrammarRulesFromXmlTest() {
    for (const lang of Languages.get()) {
      await this.runGrammarRuleForLanguage(lang);
    }
    if (Languages.get().length === 0) {
      console.error('Warning: no languages found in classpath - cannot run any grammar rule tests');
    }
  }

  // Java: PatternRuleTest#runGrammarRuleForLanguage(Language)
  async runGrammarRuleForLanguage(lang) {
    if (lang.getShortCode() === 'de') {
      if (lang.getShortCodeWithCountryAndVariant() === 'de-DE') {
        await this.runTestForLanguage(lang); // tests de-DE-AT/grammar.xml
        await this.runTestForLanguage(Languages.getLanguageForShortCode('de')); // tests de/grammar.xml
      } else if (lang.getShortCodeWithCountryAndVariant() === 'de-CH') {
        await this.runTestForLanguage(lang);
      } else {
        console.log(`Skipping ${lang} because only de-DE and de-CH gets tested for German (assuming there are no de-AT specific rules)`);
      }
    } else {
      if (this.skipCountryVariant(lang)) {
        console.log(`Skipping ${lang} because there are no specific rules for that variant`);
        return;
      }
      await this.runTestForLanguage(lang);
    }
  }

  // Java: PatternRuleTest#runGrammarRulesFromXmlTestIgnoringLanguages(Set)
  async runGrammarRulesFromXmlTestIgnoringLanguages(ignoredLanguages) {
    console.log(`Known languages: ${listToString(Languages.getWithDemoLanguage())}`);
    for (const lang of Languages.getWithDemoLanguage()) {
      if (!isNull(ignoredLanguages) && ignoredLanguages.includes(lang)) {
        continue;
      }
      await this.runTestForLanguage(lang);
    }
  }

  // Java: PatternRuleTest#runTestForLanguage(Language) (TestHackHelper.isJUnitTest() is true inside PatternRuleTest)
  async runTestForLanguage(lang) {
    TestHackHelper.setJUnitTest(true);
    try {
      await this.runTestForLanguageImpl(lang);
    } finally {
      TestHackHelper.setJUnitTest(false);
    }
  }

  // Java: PatternRuleTest#runTestForLanguage(Language) (body)
  async runTestForLanguageImpl(lang) {
    this.validatePatternFile(lang);
    this.validateRemoteRulesFile(lang);
    console.log(`Running pattern rule tests for ${lang.getName()} (${lang.constructor.FQCN})... `);
    const lt = PatternRuleTest.createToolForTesting(lang);
    const allRulesLt = new MultiThreadedJLanguageTool(lang);
    this.validateRuleIds(lang, allRulesLt);
    this.validateSentenceStartNotInMarker(allRulesLt);
    this.validateUnifyIgnoreAtTheStartOfUnify(allRulesLt);
    // validateRegexpInSynthesisMatches(allRulesLt);
    this.validateParenthesisInSynthesisMatches(allRulesLt);
    const rules = this.getAllPatternRules(lang, lt);
    this.testRegexSyntax(lang, rules);
    this.testMessages(lang, rules);
    await this.testGrammarRulesFromXML(rules, allRulesLt, lang);
    console.log(`${rules.length} rules tested.`);
    allRulesLt.shutdown();
    lt.shutdown();
  }

  // Java: PatternRuleTest#createToolForTesting(Language)
  static createToolForTesting(lang) {
    const lt = new MultiThreadedJLanguageTool(lang);
    if (CHECK_WITH_SENTENCE_SPLITTING) {
      PatternRuleTest.disableSpellingRules();
    }
    return lt;
  }

  // Java: PatternRuleTest#validatePatternFile(Language)
  validatePatternFile(lang) {
    this.validatePatternFileNames(this.getGrammarFileNames(lang));
  }

  // Java: PatternRuleTest#validatePatternFile(List); XSD validation (D-048) = well-formedness only
  validatePatternFileNames(grammarFiles) {
    for (const grammarFile of grammarFiles) {
      console.log(`Running XML validation for ${grammarFile}...`);
      const rulesDir = getDataBroker().getRulesDir();
      const ruleFilePath = `${rulesDir}/${grammarFile}`;
      const xmlStream = getDataBroker().getAsStream(ruleFilePath);
      if (xmlStream === null) {
        if (ruleFilePath !== '/org/languagetool/rules/en/en-US/grammar-l2-de.xml'
          && ruleFilePath !== '/org/languagetool/rules/en/en-US/grammar-l2-fr.xml'
          && ruleFilePath !== '/org/languagetool/rules/de/de-DE/grammar.xml') {
          console.log(`No rule file found at ${ruleFilePath} in classpath. THIS SHOULD BE FIXED!`);
        }
        continue;
      }
      PatternRuleTest.checkWellFormed(xmlStream);
    }
  }

  // Java: XMLValidator#validateWithXmlSchema(String,String) reduced to a well-formedness parse (D-048)
  static checkWellFormed(xmlStream) {
    parseXml(Buffer.from(xmlStream), { startElement() {}, endElement() {}, characters() {} }, parserOptions('pattern'));
  }

  // Java: PatternRuleTest#validateRemoteRulesFile(Language)
  validateRemoteRulesFile(lang) {
    const rulesDir = getDataBroker().getRulesDir();
    const remoteRulesFile = `${rulesDir}/${lang.getShortCode()}/remote-rule-filters.xml`;
    const xmlStream = getDataBroker().getAsStream(remoteRulesFile);
    if (xmlStream !== null) {
      console.log(`Running XML validation for ${remoteRulesFile}...`);
      PatternRuleTest.checkWellFormed(xmlStream);
    }
  }

  // Java: PatternRuleTest#validateRuleIds(Language,JLanguageTool)
  validateRuleIds(lang, lt) {
    const allRules = lt.getAllRules();
    const categoryIds = new Set();
    new RuleIdValidator(lang).validateUniqueness();
    for (const rule of allRules) {
      if (equalsIgnoreCase(rule.getId(), 'ID')) {
        console.error(`WARNING: ${lang.getShortCodeWithCountryAndVariant()} has a rule with id 'ID', this should probably be changed`);
      }
      if (rule.getId().startsWith('DB_')) {
        fail(`Rule ID must not start with 'DB_', this prefix is reserved for internal use: ${rule.getId()}`);
      }
      if (rule.getId().includes('[') || rule.getId().includes(']')) {
        fail(`Rule ID must not contain '[...]': ${rule.getId()}`);
      }
      if (rule.getId().includes(' ')) {
        fail(`Rule ID must not contain a space: '${rule.getId()}'`);
      }
      if (rule.getId().length > 79) { // limit needed so the Grafana import script works
        fail(`Rule ID too long, keep it <= 79 chars: ${rule.getId()}`);
      }
      const category = rule.getCategory();
      const catId = category.getId().toString();
      if (!javaMatches(catId, '[A-Z0-9_-]+') && !categoryIds.has(catId)) {
        console.error(`WARNING: category id '${catId}' doesn't match expected regexp [A-Z0-9_-]+`);
        categoryIds.add(catId);
      }
    }
  }

  /*
   * A <marker> that covers the SENT_START can lead to obscure offset issues, so warn about that.
   */
  // Java: PatternRuleTest#validateSentenceStartNotInMarker(JLanguageTool)
  validateSentenceStartNotInMarker(lt) {
    console.log('Check that sentence start tag is not included in <marker>....');
    const rules = lt.getAllRules();
    for (const rule of rules) {
      if (rule instanceof AbstractPatternRule) {
        const patternTokens = rule.getPatternTokens();
        if (!isNull(patternTokens)) {
          const hasExplicitMarker = patternTokens.some((t) => t.isInsideMarker());
          for (const patternToken of patternTokens) {
            if ((patternToken.isInsideMarker() || !hasExplicitMarker) && patternToken.isSentenceStart()) {
              console.error(`WARNING: Sentence start in <marker>: ${rule.getFullId()}`
                + ` (hasExplicitMarker: ${hasExplicitMarker}) - please move the <marker> so the SENT_START is not covered`);
            }
          }
        }
      }
    }
  }

  /*
   * Check <unify-ignore> at the start of <unify>
   */
  // Java: PatternRuleTest#validateUnifyIgnoreAtTheStartOfUnify(JLanguageTool)
  validateUnifyIgnoreAtTheStartOfUnify(lt) {
    console.log('Check that <unify-ignore> is not at the start of <unify>....');
    const rules = lt.getAllRules();
    for (const rule of rules) {
      if (rule instanceof AbstractPatternRule) {
        const patternTokens = rule.getPatternTokens();
        if (!isNull(patternTokens)) {
          const hasUnify = patternTokens.some((t) => t.isUnified());
          if (hasUnify) {
            for (const patternToken of patternTokens) {
              if (patternToken.isUnified()) {
                if (patternToken.isUnificationNeutral()) {
                  const failure = '<ignore-unify> at the start of <unify> - please move the token outside of <unify>';
                  this.addError(rule, failure);
                }
                break;
              }
            }
          }
        }
      }
    }
  }

  // Java: PatternRuleTest#validateParenthesisInSynthesisMatches(JLanguageTool)
  validateParenthesisInSynthesisMatches(lt) {
    console.log('Check parenthesis and back references in synthesis matches...');
    const rules = lt.getAllRules();
    for (const rule of rules) {
      if (rule instanceof AbstractPatternRule) {
        const apRule = rule;
        const suggestionMatches = [];
        if (!isNull(apRule.getSuggestionMatches())) {
          suggestionMatches.push(...apRule.getSuggestionMatches());
        }
        if (!isNull(apRule.getSuggestionMatchesOutMsg())) {
          suggestionMatches.push(...apRule.getSuggestionMatchesOutMsg());
        }
        for (const suggestionMatch of suggestionMatches) {
          if (!isNull(suggestionMatch.getPosTag()) && !isNull(suggestionMatch.getPosTagReplace())) {
            const openingNum = [...suggestionMatch.getPosTag()].filter((ch) => ch === '(').length;
            const maxBackReference = this.getMaxBackReferenceNo(suggestionMatch.getPosTagReplace());
            if (openingNum < maxBackReference) {
              const failure = `Back reference number (${maxBackReference}`
                + ') is greater than existing number of parenthesis.';
              this.addError(rule, failure);
            }
          }
        }
      }
    }
  }

  // Java: PatternRuleTest#getMaxBackReferenceNo(String)
  getMaxBackReferenceNo(message) {
    // back references are no greater than 9, i.e. $10 means $1
    const pattern = Pattern.compile('\\$[0-9]');
    const matcher = pattern.matcher(message);
    let maxNo = -1;
    while (matcher.find()) {
      const no = parseInt(javaReplace(matcher.group(), '$', ''), 10);
      if (no > maxNo) {
        maxNo = no;
      }
    }
    return maxNo;
  }

  // Java: PatternRuleTest#validateRegexpInSynthesisMatches(JLanguageTool)
  validateRegexpInSynthesisMatches(lt) {
    console.log('Check that synthesis matches with POS tag regexp have POS tag regexp in the pattern...');
    const rules = lt.getAllRules();
    for (const rule of rules) {
      if (rule instanceof AbstractPatternRule) {
        const apRule = rule;
        const patternTokens = apRule.getPatternTokens();
        const suggestionMatches = [];
        if (!isNull(apRule.getSuggestionMatches())) {
          suggestionMatches.push(...apRule.getSuggestionMatches());
        }
        if (!isNull(apRule.getSuggestionMatchesOutMsg())) {
          suggestionMatches.push(...apRule.getSuggestionMatchesOutMsg());
        }
        const matchNos = this.getMatchNos(rule.getMessage() + rule.getSuggestionsOutMsg());
        let i = 0;
        for (const suggestionMatch of suggestionMatches) {
          if (suggestionMatch.isPostagRegexp()) {
            const no = matchNos[i];
            if (!isNull(patternTokens) && no > patternTokens.length) {
              console.error(`Warning: Rule ${rule.getFullId()} refers to token \\${no} but has only `
                + `${patternTokens.length} tokens.`);
            } else if (patternTokens[no - 1].getPOStag() === null) {
              console.error(`Warning: Rule ${rule.getFullId()} refers to token \\${no}`
                + ' with a postag regular expression, but the token in the pattern has no postag.');
            }
          }
          i++;
        }
      }
    }
  }

  // Java: PatternRuleTest#getMatchNos(String)
  getMatchNos(message) {
    const pattern = Pattern.compile('\\\\[0-9]+');
    const matcher = pattern.matcher(message);
    const noList = [];
    while (matcher.find()) {
      noList.push(parseInt(javaReplace(matcher.group(), '\\', ''), 10));
    }
    return noList;
  }

  // Java: PatternRuleTest#disableSpellingRules(JLanguageTool); only reachable with CHECK_WITH_SENTENCE_SPLITTING (false), SpellingCheckRule is not ported yet
  static disableSpellingRules() {
    throw Object.assign(new Error('not ported: SpellingCheckRule'), { notPorted: true });
  }

  // Java: PatternRuleTest#testRegexSyntax(Language,List)
  testRegexSyntax(lang, rules) {
    console.log(`Checking regexp syntax of ${rules.length} rules for ${lang}...`);
    for (const rule of rules) {
      // Test the rule pattern.
      warnIfRegexpSyntaxNotKosher(rule.getPatternTokens(), rule.getId(), rule.getSubId(), lang);

      // Test the rule antipatterns.
      const antiPatterns = rule.getAntiPatterns();
      for (const antiPattern of antiPatterns) {
        warnIfRegexpSyntaxNotKosher(antiPattern.getPatternTokens(), antiPattern.getId(), antiPattern.getSubId(), lang);
      }
    }
  }

  // Java: PatternRuleTest#testMessages(Language,List)
  testMessages(lang, rules) {
    console.log(`Checking messages for 'TBD' etc of ${rules.length} rules for ${lang}...`);
    for (const rule of rules) {
      const msg = javaTrim(rule.getMessage());
      if (javaTrim(msg).length === 0) {
        fail(`Empty message of rule ${rule.getFullId()}`);
      }
      if (rule.isDefaultTempOff() || rule.isDefaultOff()) {
        continue;
      }
      if (equalsIgnoreCase(msg, 'todo') || equalsIgnoreCase(msg, 'lorem ipsum')) {
        fail(`Unfinished message ('todo' or 'lorem ipsum') of rule ${rule.getFullId()}: '${msg}'`);
      }
      if (!javaMatches(lang.getShortCode(), 'xx|en|km') && toLowerCase(msg).includes('did you mean')) {
        console.error(`*** WARNING: Non-English message with 'did you mean' for rule ${rule.getFullId()}: '${msg}'`);
      }
      if (toLowerCase(msg).includes('tbd')) {
        fail(`Unfinished message (contains 'tbd') of rule ${rule.getFullId()}: '${msg}'`);
      }
      if (msg.startsWith('>')) {
        console.error(`*** WARNING: Message of rule ${rule.getFullId()} starts with '>', is this a typo?: '${rule.getMessage()}'`);
      }
      if (javaMatches(lang.getShortCode(), 'de|en|fr|es|nl')) { // not yet 'pt' due to many matches there
        if (javaTrim(msg) !== rule.getMessage()) {
          console.error(`*** WARNING: Message of rule ${rule.getFullId()} starts or ends with spaces: '${rule.getMessage()}'`);
        }
      }
      if (lang.getShortCode() === 'de' && msg !== 'Failing for testing purposes') {
        if (javaTrim(msg).endsWith('!')) {
          fail(`Message ends in '!' for rule ${rule.getFullId()}: '${msg}'`);
        }
        if (!javaMatches(javaTrim(msg), '.*[.?)\'"]$')) {
          fail(`Message doesn't end with [.?)'"] for rule ${rule.getFullId()}: '${msg}'`);
        }
      }
    }
  }

  // Java: PatternRuleTest#addError(AbstractPatternRule,String)
  addError(rule, failure) {
    this.ruleErrors.addError(new PatternRuleTestFailure(rule, failure));
  }

  // Java: PatternRuleTest#testGrammarRulesFromXML(List,JLanguageTool,Language)
  async testGrammarRulesFromXML(rules, allRulesLt, lang) {
    if (process.env.skipRules !== undefined) { // Java: System.getProperty("skipRules")
      console.log(`SKIPPING: Checking example sentences of ${rules.length} rules for ${lang}...`);
      return;
    }
    console.log(`Checking example sentences of ${rules.length} rules for ${lang}...`);

    const lt = PatternRuleTest.createToolForTesting(lang); // Java: one tool per worker thread (ThreadLocal)

    const complexRules = new JavaHashMap();
    let skipCount = 0;
    let i = 0;
    let lastYield = Date.now();
    for (const rule of rules) {
      const sourceFile = rule.getSourceFile();
      if (lang.isVariant() && !isNull(sourceFile)
        && javaMatches(sourceFile, `/org/languagetool/rules/${lang.getShortCode()}/grammar.*\\.xml`)
        && !sourceFile.includes('-l2-') && lang.getShortCodeWithCountryAndVariant() !== 'de-DE-x-simple-language'
        && !lang.constructor.FQCN.includes('PremiumOnly')) {
        skipCount++;
        continue;
      }

      if (Date.now() - lastYield > 2000) { // lets the vitest worker answer its RPC calls during long runs
        await new Promise((resolve) => setImmediate(resolve));
        lastYield = Date.now();
      }
      this.testCorrectSentences(lt, allRulesLt, rule);
      this.testBadSentences(lt, allRulesLt, lang, complexRules, rule);
      this.testErrorTriggeringSentences(lt, rule);
      i++;
      if (i % 100 === 0) {
        console.log(`Testing rule ${i}...`);
      }
    }
    console.log(`Skipped ${skipCount} rules for variant language to avoid checking rules more than once`);

    if (complexRules.size() !== 0) {
      const set = complexRules.keySet();
      const badRules = [];
      for (const aSet of set) {
        const badRule = complexRules.get(aSet);
        if (badRule instanceof PatternRule) {
          badRule.notComplexPhrase();
          badRule.setMessage(`The rule contains a phrase that never matched any incorrect example.\n${badRule.toPatternString()}`);
          badRules.push(badRule);
        }
      }
      if (badRules.length !== 0) {
        await this.testGrammarRulesFromXML(badRules, allRulesLt, lang);
      }
    }
  }

  // Java: PatternRuleTest#testBadSentences(JLanguageTool,JLanguageTool,Language,Map,AbstractPatternRule)
  testBadSentences(lt, allRulesLt, lang, complexRules, rule) {
    const badSentences = rule.getIncorrectExamples();
    if (badSentences.length === 0) {
      this.addError(rule, 'No incorrect examples found.');
      return;
    }
    // necessary for XML Pattern rules containing <or>
    const rules = allRulesLt.getPatternRulesByIdAndSubId(rule.getId(), rule.getSubId());
    for (const origBadExample of badSentences) {
      // enable indentation use
      const origBadSentence = javaReplaceAll(origBadExample.getExample(), '[\\n\\t]+', '');
      const expectedCorrections = origBadExample.getCorrections();
      const expectedMatchStart = origBadSentence.indexOf('<marker>');
      const expectedMatchEnd = origBadSentence.indexOf('</marker>') - '<marker>'.length;
      if (expectedMatchStart === -1 || expectedMatchEnd === -1) {
        this.addError(rule, 'No error position markup (\'<marker>...</marker>\') in bad example.');
        continue;
      }
      const badSentence = ExampleSentence.cleanMarkersInExample(origBadSentence);
      if (!(javaTrim(badSentence).length > 0)) {
        this.addError(rule, 'Empty incorrect example sentence after cleaning/trimming.');
        continue;
      }
      if (origBadSentence.startsWith('>') && badSentence.length > 1) {
        console.error(`*** WARNING: example of rule ${rule.getFullId()} starts with '>', is this a typo?: '${origBadSentence}'`);
      }

      const marker = substring(origBadSentence, expectedMatchStart + '<marker>'.length,
        origBadSentence.indexOf('</marker>'));
      if (marker.startsWith(', ') && origBadExample.getCorrections()
        .some((k) => !k.startsWith(' ') && !k.startsWith(',') && !k.startsWith('?') && !k.startsWith('.')
          && !k.startsWith(':') && !k.startsWith(';') && !k.startsWith('…') && !k.startsWith('-') && !k.startsWith('–'))) {
        console.error(`*** WARNING: ${lang.getName()} rule ${rule.getFullId()} removes ', ' but `
          + 'doesn\'t have a space, comma, colon, semicolon, hyphen or dot at the start of the suggestion: ' + origBadSentence
          + ` => ${listToString(origBadExample.getCorrections())}`);
      }

      // necessary for XML Pattern rules containing <or>
      let matches = [];
      for (const auxRule of rules) {
        if (javaMatches(lang.getShortCode(), 'gl|eo|br|ca|zh')) {
          // this is less strict, getMatchesForText() should be used. Language maintainers should make sure their tests work even when in the strict mode:
          matches.push(...this.getMatchesForSingleSentence(auxRule, badSentence, lt));
        } else {
          matches.push(...this.getMatchesForText(auxRule, badSentence, lt));
        }
      }

      if (rule instanceof RegexPatternRule || (rule instanceof PatternRule && !rule.isWithComplexPhrase())) {
        if (matches.length !== 1) {
          const analyzedSentence = lt.getAnalyzedSentence(badSentence);
          let sb = 'Analyzed token readings:';
          for (const atr of analyzedSentence.getTokens()) {
            sb += ` ${atr}`;
          }
          let info = '';
          if (rule instanceof RegexPatternRule) {
            info = `\nRegexp: ${rule.getPattern()}`;
          }
          const failure = `"${badSentence}"\n`
            + 'Errors expected: 1\n'
            + `Errors found   : ${matches.length}\n`
            + `Message: ${rule.getMessage()}\n${sb}\nMatches: ${listToString(matches)}${info}`;
          this.addError(rule, failure);
          continue;
        }

        let maxReference = 0;
        if (!isNull(rule.getSuggestionMatches())) {
          const sm = rule.getSuggestionMatches();
          // Stream#max(Comparator): last of equal maxima is kept by reduce((a, b) -> compare(a, b) >= 0 ? a : b)
          let opt = null;
          for (const m of sm) {
            opt = opt === null ? m : (MATCH_COMPARATOR(opt, m) >= 0 ? opt : m);
          }
          maxReference = opt !== null ? opt.getTokenRef() : 0;
        }
        maxReference = Math.max(!isNull(rule.getMessage()) ? this.findLargestReference(rule.getMessage()) : 0, maxReference);
        if (!isNull(rule.getPatternTokens()) && maxReference > rule.getPatternTokens().length) {
          console.error(`Warning: Rule ${rule.getFullId()} refers to token \\${maxReference} but has only ${rule.getPatternTokens().length} tokens.`);
        }

        if (expectedMatchStart !== matches[0].getFromPos() || expectedMatchEnd !== matches[0].getToPos()) {
          const matchPositions = `(expected match position: ${expectedMatchStart} - ${expectedMatchEnd}, actual: ${matches[0].getFromPos()} - ${matches[0].getToPos()})`;
          this.addError(rule, `Incorrect match position markup ${matchPositions} in sentence: ${badSentence}`);
        } else {
          // make sure suggestion is what we expect it to be
          this.assertSuggestions(badSentence, expectedCorrections, rule, matches);
          // make sure the suggested correction doesn't produce an error:
          if (matches[0].getSuggestedReplacements().length > 0) {
            const fromPos = matches[0].getFromPos();
            const toPos = matches[0].getToPos();
            for (const replacement of [...matches[0].getSuggestedReplacements()]) {
              const fixedSentence = substring(badSentence, 0, fromPos)
                + replacement + substring(badSentence, toPos);
              matches = this.getMatchesForText(rule, fixedSentence, lt);
              if (matches.length > 0) {
                this.addError(rule, 'Incorrect input:\n'
                  + `  ${badSentence}`
                  + '\nCorrected sentence:\n'
                  + `  ${fixedSentence}`
                  + '\nThe correction triggered an error itself:\n'
                  + `  ${matches[0]}\n`);
              }
            }
          }
        }
      } else { // for multiple rules created with complex phrases
        matches = this.getMatchesForText(rule, badSentence, lt);
        if (matches.length === 0
          && !complexRules.containsKey(rule.getId() + badSentence)) {
          complexRules.put(rule.getId() + badSentence, rule);
        }

        if (matches.length !== 0) {
          complexRules.put(rule.getId() + badSentence, null);
          if (matches.length !== 1) {
            this.addError(rule, `Did expect one error in: "${badSentence}`
              + `" , got ${matches.length}`);
          } else if (expectedMatchStart !== matches[0].getFromPos() || expectedMatchEnd !== matches[0].getToPos()) {
            const matchPositions = `(expected match position: ${expectedMatchStart} - ${expectedMatchEnd}, actual: ${matches[0].getFromPos()} - ${matches[0].getToPos()})`;
            this.addError(rule, `Incorrect match position markup ${matchPositions}in sentence: ${badSentence}`);
          } else {
            this.assertSuggestions(badSentence, expectedCorrections, rule, matches);
            this.assertSuggestionsDoNotCreateErrors(badSentence, lt, rule, matches);
          }
        }
      }
    }
  }

  // Java: PatternRuleTest#findLargestReference(String)
  findLargestReference(message) {
    const pattern = Pattern.compile('\\\\[0-9]+');
    const matcher = pattern.matcher(message);
    let max = 0;
    while (matcher.find()) {
      max = Math.max(max, parseInt(javaReplace(matcher.group(), '\\', ''), 10));
    }
    return max;
  }

  // Java: PatternRuleTest#testErrorTriggeringSentences(JLanguageTool,AbstractPatternRule)
  testErrorTriggeringSentences(lt, rule) {
    for (const example of rule.getErrorTriggeringExamples()) {
      const sentence = this.cleanXML(example.getExample());
      const matches = this.getMatchesForText(rule, sentence, lt);
      if (matches.length === 0) {
        this.addError(rule,
          `Example sentence marked with 'triggers_error' didn't actually trigger an error: '${sentence}'`);
      }
    }
  }

  /**
   * returns true if [a, b] has at least one number in common with [x, y]
   */
  // Java: PatternRuleTest#rangeIsOverlapping(int,int,int,int)
  rangeIsOverlapping(a, b, x, y) {
    if (a < x) {
      return x <= b;
    }
    return a <= y;
  }

  // Java: PatternRuleTest#assertSuggestions(String,List,AbstractPatternRule,List)
  assertSuggestions(sentence, expectedCorrections, rule, matches) {
    if (expectedCorrections.length !== 0) {
      const expectedNonEmptyCorrection = expectedCorrections[0].length > 0;
      if (expectedNonEmptyCorrection) {
        if (!(rule.getMessage().includes('<suggestion>') || rule.getSuggestionsOutMsg().includes('<suggestion>'))
          && isNull(rule.getFilter())) {
          this.addError(rule,
            `You specified a correction, but your message has no suggestions. rule.getMessage(): ${rule.getMessage()}`
            + `, rule.getSuggestionsOutMsg(): ${rule.getSuggestionsOutMsg()}, rule.getFullId():${rule.getFullId()}`);
        }
      }
      const realSuggestions = matches[0].getSuggestedReplacements();
      if (realSuggestions.length === 0) {
        const expectedEmptyCorrection = expectedCorrections.length === 1 && expectedCorrections[0].length === 0;
        if (!expectedEmptyCorrection) {
          this.addError(rule, `Incorrect suggestions: Expected '${listToString(expectedCorrections)}', got  `
            + ` <no suggestion> on input: '${sentence}'`);
        }
      } else if (!listEquals(expectedCorrections, realSuggestions)) {
        this.addError(rule, `Incorrect suggestions: Expected '${expectedCorrections.join('|')}', got: '${realSuggestions.join('|')}' on input: '${sentence}'`);
      }
    }
  }

  // Java: PatternRuleTest#assertSuggestionsDoNotCreateErrors(String,JLanguageTool,AbstractPatternRule,List)
  assertSuggestionsDoNotCreateErrors(badSentence, lt, rule, matches) {
    if (matches[0].getSuggestedReplacements().length > 0) {
      const fromPos = matches[0].getFromPos();
      const toPos = matches[0].getToPos();
      for (const replacement of matches[0].getSuggestedReplacements()) {
        const fixedSentence = substring(badSentence, 0, fromPos)
          + replacement + substring(badSentence, toPos);
        const tempMatches = this.getMatchesForText(rule, fixedSentence, lt);
        if (tempMatches.length !== 0) {
          this.addError(rule,
            `Corrected sentence for rule ${rule.getFullId()} triggered error: ${fixedSentence}`);
        }
      }
    }
  }

  // Java: PatternRuleTest#testCorrectSentences(JLanguageTool,JLanguageTool,AbstractPatternRule)
  testCorrectSentences(lt, allRulesLt, rule) {
    const goodSentences = rule.getCorrectExamples();
    // necessary for XML Pattern rules containing <or>
    const rules = allRulesLt.getPatternRulesByIdAndSubId(rule.getId(), rule.getSubId());
    for (const goodSentenceObj of goodSentences) {
      // enable indentation use
      let goodSentence = javaReplaceAll(goodSentenceObj.getExample(), '[\\n\\t]+', '');
      goodSentence = this.cleanXML(goodSentence);
      if (!(javaTrim(goodSentence).length > 0)) {
        this.addError(rule, 'Empty correct example.');
        continue;
      }
      if (goodSentence.startsWith('>') && goodSentence.length > 1) {
        console.error(`*** WARNING: example of rule ${rule.getFullId()} starts with '>', is this a typo?: '${goodSentence}'`);
      }
      let isMatched = false;
      // necessary for XML Pattern rules containing <or>
      for (const auxRule of rules) {
        isMatched = isMatched || this.match(auxRule, goodSentence, lt);
      }
      if (isMatched) {
        const analyzedSentence = lt.getAnalyzedSentence(goodSentence);
        let sb = 'Analyzed token readings:';
        for (const atr of analyzedSentence.getTokens()) {
          sb += ` ${atr}`;
        }
        const failure = 'Did not expect error in:\n'
          + `  ${goodSentence}\n`
          + `  ${sb}\n`;
        this.addError(rule, failure);
      }
    }
  }

  // Java: PatternRuleTest#cleanXML(String)
  cleanXML(str) {
    return javaReplaceAll(str, '<([^<].*?)>', '');
  }

  // Java: PatternRuleTest#match(Rule,String,JLanguageTool)
  match(rule, sentence, lt) {
    const analyzedSentences = lt.analyzeText(sentence);
    let matchCount = 0;
    for (const analyzedSentence of analyzedSentences) {
      const matches = rule.match(analyzedSentence);
      matchCount += matches.length;
    }
    return matchCount > 0;
  }

  // Unlike getMatchesForSingleSentence() this splits the text at sentence boundaries
  // Java: PatternRuleTest#getMatchesForText(Rule,String,JLanguageTool)
  getMatchesForText(rule, sentence, lt) {
    const analyzedSentences = lt.analyzeText(sentence);
    const matches = [];
    let matchOffset = 0;
    // fix offset calculation for testCorrectSentences / testBadSentences (e.g. position of marker)
    for (const analyzedSentence of analyzedSentences) {
      const sentenceMatches = [...rule.match(analyzedSentence)];
      for (const match of sentenceMatches) {
        match.setOffsetPosition(match.getFromPos() + matchOffset, match.getToPos() + matchOffset);
      }
      matches.push(...sentenceMatches);
      matchOffset += analyzedSentence.getText().length;
    }
    return matches;
  }

  // Java: PatternRuleTest#getMatchesForSingleSentence(Rule,String,JLanguageTool)
  getMatchesForSingleSentence(rule, sentence, lt) {
    const analyzedSentence = lt.getAnalyzedSentence(sentence);
    const matches = rule.match(analyzedSentence);
    if (CHECK_WITH_SENTENCE_SPLITTING) {
      // "real check" with sentence splitting:
      for (const r of lt.getAllActiveRules()) {
        lt.disableRule(r.getId());
      }
      lt.enableRule(rule.getId());
      const realMatches = lt.check(sentence);
      const realMatchRuleIds = [];
      for (const realMatch of realMatches) {
        realMatchRuleIds.push(realMatch.getRule().getId());
      }
      for (const match of matches) {
        const ruleId = match.getRule().getId();
        if (!match.getRule().isDefaultOff() && !realMatchRuleIds.includes(ruleId)) {
          console.error(`WARNING: ${lt.getLanguage().getName()}`
            + `: missing rule match ${ruleId} when splitting sentences for test sentence '${sentence}'`);
        }
      }
    }
    return [...matches];
  }
}
