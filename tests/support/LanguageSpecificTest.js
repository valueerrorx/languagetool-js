// Java: org.languagetool.LanguageSpecificTest (core test class; en rule list and word lists, DisambiguationRuleTest part is covered by DisambiguationRuleTest.test.js)
import { AssertionError, RuntimeException } from '../../src/lib/java/errors.js';
import { Pattern } from '../../src/lib/java/regex/index.js';
import { javaReplace } from '../../src/lib/java/strings.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { Languages } from '../../src/core/Languages.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { LanguageMaintainedState } from '../../src/core/LanguageMaintainedState.js';
import { ExampleSentence } from '../../src/core/rules/model/Examples.js';
import { Tag } from '../../src/core/rules/model/Tag.js';
import { AbstractSimpleReplaceRule2 } from '../../src/core/rules/AbstractSimpleReplaceRule2.js';
import { AbstractSimpleReplaceRule } from '../../src/core/rules/AbstractSimpleReplaceRule.js';
import { AbstractCheckCaseRule } from '../../src/core/rules/AbstractCheckCaseRule.js';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { PatternRuleLoader } from '../../src/core/patterns/PatternRuleLoader.js';
import { ConfusionSetLoader } from '../../src/core/rules/ConfusionSetLoader.js';
import { WordCoherencyDataLoader } from '../../src/core/rules/WordCoherencyDataLoader.js';
import { getMessageBundle } from '../../src/core/resources/ResourceBundleTools.js';
import { getDemoLanguage } from './DemoLanguage.js';
import { disableAllRulesExcept } from './TestTools.js';
import { WordListValidatorTest } from './WordListValidatorTest.js';

const idToExpectedMatches = new Map([ // Java: LanguageSpecificTest#idToExpectedMatches
  ['EN_CONSISTENT_APOS', 2],
  ['STYLE_REPEATED_WORD_RULE_DE', 2],
  ['STYLE_REPEATED_SHORT_SENTENCES', 3],
  ['STYLE_REPEATED_SENTENCE_BEGINNING', 3],
]);

// Java: LanguageSpecificTest
export class LanguageSpecificTest {
  // Java: LanguageSpecificTest#runTests(Language[,String[,String]]) / (Language,Language,String,String)
  runTests(lang, ...rest) {
    if (rest.length === 0) return this.runTests4(lang, lang, null, '');
    if (rest.length === 1) return this.runTests4(lang, lang, rest[0], '');
    if (rest.length === 2) return this.runTests4(lang, lang, rest[0], rest[1]);
    return this.runTests4(lang, rest[0], rest[1], rest[2]);
  }

  // Java: LanguageSpecificTest#runTests(Language,Language,String,String)
  runTests4(lang, langVariantForReplaceTests, onlyRunCode, additionalValidationChars) {
    new WordListValidatorTest(additionalValidationChars).testWordListValidity(lang);
    this.testNoLineBreaksEtcInMessage(lang);
    this.testNoQuotesAroundSuggestion(lang);
    this.testJavaRules(onlyRunCode);
    // testExampleAvailable(onlyRunCode) is commented out in Java
    this.testConfusionSetLoading();
    this.countTempOffRules(lang);
    this.testCoherencyBaseformIsOtherForm(lang);
    this.testReplaceRuleReplacements(langVariantForReplaceTests);
    // new DisambiguationRuleTest().testDisambiguationRulesFromXML(): tests/core/disambiguation/DisambiguationRuleTest.test.js (en replay)
  }

  // Java: LanguageSpecificTest#testReplaceRuleReplacements(Language)
  testReplaceRuleReplacements(lang) {
    const lt = new JLanguageTool(lang);
    let spellRule = lang.getDefaultSpellingRule();
    if (/^(nl|km)$/.test(lang.getShortCode())) {
      // too many alarms, should be cleaned up first
      console.log(`Skipping ${lang} for replace.txt check`);
      return;
    }
    if (spellRule !== null) {
      for (const rule of lt.getAllActiveRules()) {
        if (rule instanceof AbstractSimpleReplaceRule2) {
          const replRule = rule;
          const wrongWords = replRule.getWrongWords();
          for (const entry of wrongWords) {
            for (const s of entry.keys()) {
              const repl = entry.get(s).getSuggestion();
              const matches = spellRule.match(lt.getAnalyzedSentence(repl));
              if (matches.length > 0) {
                console.error(`*** WARNING: replacement '${repl}' for '${s}' from one of [${replRule.getFileNames().join(', ')}] isn't known to spell checker of ${lang}: [${matches.join(', ')}]`);
              }
              if (replRule.checkKeyWordsAreKnownToSpeller()) {
                const matches2 = spellRule.match(lt.getAnalyzedSentence(s));
                if (matches2.length > 0) {
                  console.error(`*** WARNING: key word '${s}' from one of [${replRule.getFileNames().join(', ')}] isn't known to spell checker of ${lang}: [${matches2.join(', ')}]`);
                }
              }
              if (replRule.checkKeyWordsAreUnknownToSpeller()) {
                const matches2 = spellRule.match(lt.getAnalyzedSentence(s));
                if (matches2.length === 0) {
                  console.error(`*** WARNING: key word '${s}' from one of [${replRule.getFileNames().join(', ')}] is known to spell checker of ${lang}: [${matches2.join(', ')}]`);
                }
              }
              if (replRule.separateKeyWordsBySpeller()) {
                const matches2 = spellRule.match(lt.getAnalyzedSentence(s));
                if (matches2.length > 0) {
                  console.error(`SPELLER_WRONG: ${s}=${repl}`);
                } else {
                  console.error(`SPELLER_OK: ${s}=${repl}`);
                }
              }
            }
          }
        }
        if (rule instanceof AbstractSimpleReplaceRule) {
          if (lang.getShortCode() === 'ca') {
            if (rule.getId() === 'CA_SIMPLE_REPLACE_DNV_SECONDARY') {
              spellRule = Languages.getLanguageForShortCode('ca-ES-valencia').getDefaultSpellingRule();
            } else {
              spellRule = lang.getDefaultSpellingRule();
            }
          }
          if (lang.getShortCode() === 'de' && rule.getId() === 'DE_DUPLICATED_CHAR') {
            // too many warnings and DE_DUPLICATED_CHAR has low impact, so ignore for now (even though the warnings are correct):
            continue;
          }
          const wrongWords = rule.getWrongWords();
          for (const key of wrongWords.keys()) {
            const repl = `[${wrongWords.get(key).join(', ')}]`;
            const matches = spellRule.match(lt.getAnalyzedSentence(repl));
            if (matches.length > 0) {
              console.error(`*** WARNING: replacement '${repl}' for '${key}' from rule ${rule.getId()}, files: ["replace.txt", "replace_custom.txt"] isn't known to spell checker of ${lang}: [${matches.join(', ')}]`);
            }
          }
        }
      }
    } else {
      console.log(`No speller found for ${lang}`);
    }
  }

  // Java: LanguageSpecificTest#testNoLineBreaksEtcInMessage(Language)
  testNoLineBreaksEtcInMessage(lang) {
    if (lang.getMaintainedState() === LanguageMaintainedState.LookingForNewMaintainer) {
      // avoid printing too many warnings that nobody takes care of
      console.error(`Skipping message tests for unmaintained language ${lang}`);
      return;
    }
    console.log('Testing messages for line breaks...');
    const lt = new JLanguageTool(lang);
    for (const rule of lt.getAllRules()) {
      if (rule instanceof AbstractPatternRule) {
        const pRule = rule;
        const message = pRule.getMessage();
        const prefix = `*** WARNING: ${lang.getShortCode()}: ${rule.getFullId()} from ${pRule.getSourceFile()}`;
        if (message.includes('\n') || message.includes('\r')) {
          console.error(`${prefix} contains line break (\\n or \\r): ${javaReplace(javaReplace(message, '\n', '\\n'), '\r', '\\r')}`);
        }
        if (message.includes('\t')) {
          console.error(`${prefix} contains tab (\\t): ${javaReplace(message, '\t', '\\t')}`);
        }
        if (message.includes('  ')) {
          console.error(`${prefix} contains two consecutive spaces in message: ${message}`);
        }
        if (rule.getDescription().includes('  ')) {
          console.error(`${prefix} contains two consecutive spaces in description: ${rule.getDescription()}`);
        }
      }
    }
  }

  // Java: LanguageSpecificTest#testCoherencyBaseformIsOtherForm(Language)
  testCoherencyBaseformIsOtherForm(lang) {
    if (lang.getShortCode() === 'km') {
      // "coherency.txt" is for a different rule for Khmer
      return;
    }
    const lt = new JLanguageTool(lang);
    disableAllRulesExcept(lt, 'EN_WORD_COHERENCY');
    const loader = new WordCoherencyDataLoader();
    const path = `/${lang.getShortCode()}/coherency.txt`;
    if (!JLanguageTool.getDataBroker().ruleFileExists(path)) {
      console.log(`File not found (okay for many languages): ${path}`);
      return;
    }
    console.log('Testing coherency.txt...');
    console.log(`Checking ${path}...`);
    const map = loader.loadWords(path);
    const invalid = new Set();
    const synthesizer = lang.getSynthesizer();
    for (const key of map.keys()) {
      if (synthesizer !== null) {
        const forms = synthesizer.synthesize(new AnalyzedToken(key, 'fake', key), '.*', true);
        for (const form of forms) {
          const matches = lt.check(form);
          if (matches.length > 0) {
            invalid.add(`${form} (a form of ${key})`);
          }
        }
      }
    }
    if (invalid.size > 0) {
      throw new AssertionError(`${lang}: These words trigger the rule because their base form is one of the forms in coherency.txt, `
        + `giving false alarms:\n  ${[...invalid].join('\n  ')}`);
    }
  }

  // Java: LanguageSpecificTest#testJavaRules(String)
  testJavaRules(onlyRunCode) {
    const idsToClassName = new Map();
    const ruleClasses = new Set();
    const printLimitSeconds = 0.2;
    for (const language of Languages.getWithDemoLanguage()) {
      if (language.getShortCode() !== 'en' && language.getShortCode() !== 'xx') continue; // the en module's classpath holds only English and the core demo language
      if (onlyRunCode !== null && language.getShortCodeWithCountryAndVariant() !== onlyRunCode) {
        console.log(`Skipping ${language}`); // speed up for languages that are sub classes (e.g. simple German)
        continue;
      }
      console.log(`Running for ${language}, printing only tests that take > ${printLimitSeconds} seconds:`);
      const lt = new JLanguageTool(language);
      const allRules = lt.getAllRules();
      for (const rule of allRules) {
        this.assertIdAndDescriptionValidity(language, rule);
        if (!(rule instanceof AbstractPatternRule)) {
          const startTime = Date.now();
          this.assertIdUniqueness(idsToClassName, ruleClasses, language, rule);
          this.assertIdValidity(language, rule);
          if (!rule.supportsLanguage(language)) throw new AssertionError();
          rule.setTags(rule.getTags().filter((k) => k !== Tag.picky)); // make sure "picky" rules also run
          this.testExamples(rule, lt);
          const endTime = Date.now();
          const runTimeSeconds = (endTime - startTime) / 1000;
          if (runTimeSeconds > printLimitSeconds) {
            console.log(`Tested Java rule ${rule.getFullId()} ... ${runTimeSeconds.toFixed(2)}s`);
          }
        }
      }
    }
  }

  // Java: LanguageSpecificTest#testConfusionSetLoading()
  testConfusionSetLoading() {
    for (const language of Languages.get()) {
      if (language.getShortCode() !== 'en') continue; // only English is under test here (the de/fr language-model rule lists are ported with their steps)
      try {
        let hasRules;
        try {
          hasRules = language.getRelevantLanguageModelRules(getMessageBundle(), {}, null).length > 0;
        } catch (e) {
          if (e && e.notPorted === true) hasRules = true; // the n-gram rules are not available (DEV-001): Java's English list has 3 rules
          else throw e;
        }
        if (hasRules) {
          const path = `/${language.getShortCode()}/confusion_sets.txt`;
          const confusionSetStream = JLanguageTool.getDataBroker().getFromResourceDirAsStream(path);
          const confusionSetLoader = new ConfusionSetLoader(getDemoLanguage());
          confusionSetLoader.loadConfusionPairs(confusionSetStream); // would throw Exception if there's a problem
        }
      } catch (e) {
        throw new RuntimeException(`Could not load confusion pairs for ${language.getName()}`, e);
      }
    }
  }

  // Java: LanguageSpecificTest#testNoQuotesAroundSuggestion(Language); no quotes needed around <suggestion>...</suggestion> in XML
  testNoQuotesAroundSuggestion(lang) {
    if (lang.getShortCode() === 'fa' || lang.getShortCode() === 'zh') {
      // ignore languages not maintained anyway
      console.log(`Skipping testNoQuotesAroundSuggestion for ${lang.getName()}`);
      return;
    }
    console.log('Testing that there are no quotes around <suggestion>s...');
    const before = Pattern.compile(".*['\"«»“”’]<suggestion.*");
    const after = Pattern.compile(".*</suggestion>['\"«»“”’].*");
    for (const ruleFileName of lang.getRuleFileNames()) {
      if (ruleFileName.includes('-test-')) {
        continue;
      }
      const is = JLanguageTool.getDataBroker().getAsStream(ruleFileName);
      const rules = new PatternRuleLoader().getRules(is, ruleFileName, lang);
      for (const rule of rules) {
        const message = rule.getMessage();
        if (before.matcher(message).matches() && after.matcher(message).matches()) {
          throw new AssertionError(`${lang.getName()} rule ${rule.getFullId()} uses quotes around <suggestion>...<suggestion> in its <message>, this should be avoided: '${message}'`);
        }
      }
    }
  }

  // Java: LanguageSpecificTest#testDemoText(Language,String,List)
  testDemoText(lang, text, expectedMatchIds) {
    const lt = new JLanguageTool(lang);
    const matches = lt.check(text);
    let i = 0;
    const actualRuleIds = [];
    for (const match of matches) {
      actualRuleIds.push(match.getSpecificRuleId());
    }
    if (expectedMatchIds.length !== actualRuleIds.length) {
      this.failTest(lang, text, expectedMatchIds, actualRuleIds);
    }
    for (const actualRuleId of actualRuleIds) {
      if (expectedMatchIds[i] !== actualRuleId) {
        this.failTest(lang, text, expectedMatchIds, actualRuleIds);
      }
      i++;
    }
  }

  // Java: LanguageSpecificTest#failTest(Language,String,List,List)
  failTest(lang, text, expectedMatchIds, actualRuleIds) {
    throw new AssertionError(`The website demo text matches for ${lang} have changed. Demo text:\n${text}`
      + `\nExpected rule matches:\n[${expectedMatchIds.join(', ')}]\nActual rule matches:\n[${actualRuleIds.join(', ')}]`);
  }

  // Java: LanguageSpecificTest#assertIdUniqueness(Map,Set,Language,Rule)
  assertIdUniqueness(ids, ruleClasses, language, rule) {
    const ruleId = rule.getId();
    if (ids.has(ruleId) && !ruleClasses.has(rule.constructor)) {
      throw new RuntimeException(`Rule id occurs more than once: '${ruleId}', one of them class ${rule.constructor.FQCN}, the other one ${ids.get(ruleId)}, language: ${language}`);
    }
    ids.set(ruleId, rule.constructor.FQCN);
    ruleClasses.add(rule.constructor);
  }

  // Java: LanguageSpecificTest#assertIdValidity(Language,Rule)
  assertIdValidity(lang, rule) {
    const ruleId = rule.getId();
    if (!Pattern.compile('^[A-Z_][A-Z0-9_]+$').matcher(ruleId).matches()) {
      throw new RuntimeException(`Invalid character in rule id: '${ruleId}', language: ${lang}, only [A-Z0-9_] are allowed and the first character must be in [A-Z_]`);
    }
  }

  // Java: LanguageSpecificTest#assertIdAndDescriptionValidity(Language,Rule)
  assertIdAndDescriptionValidity(lang, rule) {
    const ruleId = rule.getId();
    if (rule.getId() === rule.getDescription()) {
      console.error(`*** WARNING: ${lang.getShortCodeWithCountryAndVariant()}: ${rule.getFullId()}: 'id' and 'name' are identical for this rule`);
    }
    if (rule.getId().trim().length === 0) {
      throw new RuntimeException(`Empty rule id: '${ruleId}', language: ${lang.getShortCodeWithCountryAndVariant()}`);
    }
    if (rule.getDescription().trim().length === 0) {
      throw new RuntimeException(`Empty rule description for rule: '${ruleId}', language: ${lang.getShortCodeWithCountryAndVariant()}`);
    }
  }

  // Java: LanguageSpecificTest#testExamples(Rule,JLanguageTool)
  testExamples(rule, lt) {
    this.testCorrectExamples(rule, lt);
    this.testIncorrectExamples(rule, lt);
  }

  // Java: LanguageSpecificTest#testCorrectExamples(Rule,JLanguageTool)
  testCorrectExamples(rule, lt) {
    for (const correctExample of rule.getCorrectExamples()) {
      const input = ExampleSentence.cleanMarkersInExample(correctExample.getExample());
      this.enableOnlyOneRule(lt, rule);
      const ruleMatches = lt.check(input);
      if (ruleMatches.length !== 0) {
        throw new AssertionError(`Got unexpected rule match for correct example sentence:\nText: ${input}\nRule: ${rule.getId()}\nMatches: [${ruleMatches.join(', ')}]`);
      }
    }
  }

  // Java: LanguageSpecificTest#testIncorrectExamples(Rule,JLanguageTool)
  testIncorrectExamples(rule, lt) {
    for (const incorrectExample of rule.getIncorrectExamples()) {
      const input = ExampleSentence.cleanMarkersInExample(incorrectExample.getExample());
      this.enableOnlyOneRule(lt, rule);
      const ruleMatches = lt.check(input);
      const expected = idToExpectedMatches.has(rule.getId()) ? idToExpectedMatches.get(rule.getId()) : 1;
      if (ruleMatches.length !== expected) {
        throw new AssertionError(`Did not get the expected rule match for the incorrect example sentence:\nText: ${input}\nRule: ${rule.getId()}\nMatches: [${ruleMatches.join(', ')}]`);
      }
    }
  }

  // Java: LanguageSpecificTest#enableOnlyOneRule(JLanguageTool,Rule)
  enableOnlyOneRule(lt, ruleToActivate) {
    for (const rule of lt.getAllRules()) {
      lt.disableRule(rule.getId());
    }
    lt.enableRule(ruleToActivate.getId());
  }

  // Java: LanguageSpecificTest#countTempOffRules(Language)
  countTempOffRules(lang) {
    const lt = new JLanguageTool(lang);
    let count = 0;
    const fileToCount = new Map();
    for (const rule of lt.getAllRules()) {
      if (rule.isDefaultTempOff()) {
        count++;
        if (rule instanceof AbstractPatternRule) {
          const sourceFile = rule.getSourceFile();
          fileToCount.set(sourceFile, (fileToCount.get(sourceFile) ?? 0) + 1);
        }
      }
    }
    console.log(`Number of default='temp_off' rules for ${lang}: ${count}`);
    const limit = 20;
    if (count > limit) {
      console.error(`WARNING: ${count} default='temp_off' rules for ${lang}, please make sure to turn on these rules after they have been tested (or use default='off' to turn them off permanently)`);
    }
  }
}
