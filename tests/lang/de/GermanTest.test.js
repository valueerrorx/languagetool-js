// Ported from GermanTest (de module); the DisambiguationRuleTest part of runTests is the X-DISAMB ex-de replay
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Languages } from '../../../src/core/Languages.js';
import { German } from '../../../src/lang/de/language/German.js';
import { AbstractPatternRule } from '../../../src/core/patterns/AbstractPatternRule.js';
import { RegexPatternRule } from '../../../src/core/patterns/RegexPatternRule.js';
import { PatternRuleLoader } from '../../../src/core/patterns/PatternRuleLoader.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { FakeRule } from '../../../src/core/rules/FakeRule.js';
import { javaSplit, javaReplaceAll, toLowerCase } from '../../../src/lib/java/strings.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

const LONG = 3600000;

// Java: GermanTest#cleanSyntax(String)
function cleanSyntax(part) {
  return javaReplaceAll(part, '[()]', '');
}

// Java: GermanTest#containsSwitzerlandSpelling(String); only works for e.g.: foo|baß|bla
function containsSwitzerlandSpelling(pattern) {
  const parts = javaSplit(pattern, '[|()]');
  for (const part of parts) {
    if (part.includes('ß')) {
      if (!cleanSyntax(pattern).includes(cleanSyntax(part).replaceAll('ß', 'ss'))) {
        return false;
      }
    }
  }
  return true;
}

// Java: GermanTest#allInBrackets(char,String)
function allInBrackets(searchChar, pattern) {
  let inBrackets = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern.charAt(i);
    if (c === '[') {
      inBrackets = true;
    } else if (c === ']') {
      inBrackets = false;
    } else if (c === searchChar && !inBrackets) {
      return false;
    }
  }
  return true;
}

// Java: GermanTest#lacksSwitzerlandSpelling(String)
function lacksSwitzerlandSpelling(pattern) {
  return pattern !== null && pattern.includes('ß')
    && !pattern.includes('(ß|ss)')
    && !pattern.includes('(ss|ß)')
    && !containsSwitzerlandSpelling(pattern)
    && !allInBrackets('ß', pattern);
}

describe('GermanTest', () => {
  const base = new LanguageSpecificTest('de');

  // Java: GermanTest#testLanguage
  it('testLanguage', async () => {
    // NOTE: this text needs to be kept in sync with config.ts -> DEMO_TEXTS:
    const s = 'Schreiben Sie in diesem Textfeld oder fügen Sie einen Text ein. Ihr Text wird kontinuierlich über prüft und Fehler werden farbig unterstrichen. Rechtshcreibfehler werden rot markirt, Grammatikfehler werden gelb hervor gehoben und Stilfehler werden, anders wie die anderen Fehler, blau unterstrichen. wussten Sie dass Synonyme per Doppelklick auf ein Wort aufgerufen werden können? Nutzen sie LanguageTool in allen Lebenslagen, etwa wenn Sie am Donnerstag, dem 13. Mai 2022, einen Basketballkorb in 10 Fuß Höhe montieren möchten.';
    const lang = Languages.getLanguageForShortCode('de-DE');
    base.testDemoText(lang, s,
      ['ZUSAMMENSCHREIBUNG_UEBER', 'GERMAN_SPELLER_RULE', 'GERMAN_SPELLER_RULE', 'ZUSAMMENSCHREIBUNG_HER', 'KOMP_WIE', 'UPPERCASE_SENTENCE_START', 'KOMMA_ZWISCHEN_HAUPT_UND_NEBENSATZ_2', 'AUFFORDERUNG_SIE', 'DE_DATE_WEEKDAY', 'EINHEITEN_METRISCH']);
    await base.runTests(lang, null, '_');
  }, LONG);

  // Java: GermanTest#testMessageCoherency
  it('testMessageCoherency', () => {
    const lang = Languages.getLanguageForShortCode('de-DE');
    const lt = new JLanguageTool(lang);
    for (const rule of lt.getAllRules()) {
      if (rule instanceof AbstractPatternRule) {
        const patternRule = rule;
        const message = patternRule.getMessage();
        let origWord = null;
        let suggWord = null;
        if (message.includes('Kommata')) {
          origWord = 'Kommata';
          suggWord = 'Kommas';
        }
        if (message.includes('Präfix')) {
          origWord = 'Präfix';
          suggWord = 'Vorsilbe';
        }
        if (message.includes('Suffix')) {
          origWord = 'Suffix';
          suggWord = 'Nachsilbe';
        }
        if (message.includes('Substantiv')) {
          origWord = 'Substantiv';
          suggWord = 'Nomen';
        }
        if (toLowerCase(message).includes('substantiviert')) {
          origWord = 'substantiviert';
          suggWord = 'nominalisiert';
        }
        if (toLowerCase(message).includes('substantivisch')) {
          origWord = 'substantivisch';
          suggWord = 'nominalisiert';
        }
        if (message.includes('Genetiv')) {
          origWord = 'Genetiv';
          suggWord = 'Genitiv';
        }
        if (message.includes('Partizip 1')) {
          origWord = 'Partizip 1';
          suggWord = 'Partizip I';
        }
        if (message.includes('Partizip 2')) {
          origWord = 'Partizip 2';
          suggWord = 'Partizip II';
        }
        if (message.includes(' fordert ')) {
          origWord = 'fordert';
          suggWord = 'erfordert';
        }
        if (message.includes('auseinandergeschrieben')) {
          origWord = 'auseinandergeschrieben';
          suggWord = 'auseinander geschrieben';
        }
        if (message.includes('getrenntgeschrieben')) {
          origWord = 'getrenntgeschrieben';
          suggWord = 'getrennt geschrieben';
        }
        if (message.includes('Meinten sie')) {
          origWord = 'Meinten sie';
          suggWord = 'Meinten Sie';
        }
        if (message.includes('meinten sie')) {
          origWord = 'meinten sie';
          suggWord = 'meinten Sie';
        }
        if (toLowerCase(message).includes('wollen sie')) {
          origWord = 'Wollen Sie';
          suggWord = 'Möchten Sie';
        }
        if (origWord !== null) {
          console.error(`WARNING: Aus Gründen der Einheitlichkeit bitte '${suggWord}' nutzen statt '${origWord}' in der Regel ${patternRule.getFullId()}, message: '${message}'`);
        }
      }
    }
  }, LONG);

  // Java: GermanTest#testGenderCharsAgainstAllRules
  it('testGenderCharsAgainstAllRules', () => {
    const lang = Languages.getLanguageForShortCode('de-DE');
    const lt = new JLanguageTool(lang);
    expect(lt.check('Die Jurist_innenausbildung ist schwer.').length).toBe(0);
    expect(lt.check('Die Jurist*innenausbildung ist schwer.').length).toBe(0);
    expect(lt.check('Die Jurist:innenausbildung ist schwer.').length).toBe(0);
    expect(lt.check('Die Datei heißt Juriest_innenausbieldung.mfgjg und ist leer.').length).toBe(0);
    expect(lt.check('Alles richtig_stimmt.').length).toBe(0); // not treated by GermanSpellerRule.removeGenderCompoundMatches
    expect(lt.check('Das ist flasch_nittrichtig.').length).toBe(2); // not treated by GermanSpellerRule.removeGenderCompoundMatches
  }, LONG);

  // Java: GermanTest#testMergingOfGrammarCorrections
  it('testMergingOfGrammarCorrections', () => {
    const lang = new German();
    const lt = new JLanguageTool(lang);
    const analyzedSentence = lt.getAnalyzedSentence('Diese Mail ist z Hd Frau Müllers.');

    // Mocking two adjacent grammar issues
    const ruleMatch1 = new RuleMatch(new FakeRule('AI_DE_GGEC_TEST'), analyzedSentence, 16, 24, 'Adjektivfehler');
    ruleMatch1.setSuggestedReplacement('absolute');
    const ruleMatch2 = new RuleMatch(new FakeRule('AI_DE_GGEC_TEST2'), analyzedSentence, 25, 28, 'Adjektivfehler');
    ruleMatch2.setSuggestedReplacement('sich');

    const ruleMatches = [ruleMatch1, ruleMatch2];

    // Process the rule matches
    const processedMatches = lang.filterRuleMatches(ruleMatches, null, null);

    // Asserts
    expect(processedMatches[0].getSuggestedReplacements()[0]).toBe('absolute sich');
    expect(processedMatches[0].getSpecificRuleId()).toBe('AI_DE_MERGED_MATCH');
  }, LONG);

  // Java: GermanTest#testSwissSpellingVariants; test that patterns with 'ß' also contain that pattern with 'ss' so the rule can match for de-CH users
  it('testSwissSpellingVariants', () => {
    const lang = Languages.getLanguageForShortCode('de-DE');
    const dirBase = `${JLanguageTool.getDataBroker().getRulesDir()}/${lang.getShortCode()}/`;
    const ignoreIds = ['SCHARFES_SZ', 'APOSTROPH_S', 'EMPFOHLENE_ZUSAMMENSCHREIBUNG'];
    const warnings = [];
    for (const ruleFileName of lang.getRuleFileNames()) {
      let i = 0;
      const is = JLanguageTool.getDataBroker().getAsStream(ruleFileName); // Java: this.getClass().getResourceAsStream(ruleFileName)
      const rules = new PatternRuleLoader().getRules(is, `${dirBase}/${ruleFileName}`, lang);
      for (const rule of rules) {
        if (ignoreIds.includes(rule.getId())) {
          continue;
        }
        for (const antiPattern of rule.getAntiPatterns()) {
          for (const patternToken of antiPattern.getPatternTokens()) {
            const pattern = patternToken.getString();
            if (lacksSwitzerlandSpelling(pattern)) {
              warnings.push(`${rule.getFullId()}: ${pattern} [antipattern]`);
              i++;
            }
          }
        }
        if (rule instanceof RegexPatternRule) {
          const pattern = rule.getPattern().toString();
          if (lacksSwitzerlandSpelling(pattern)) {
            warnings.push(`${rule.getFullId()}: ${pattern}`);
            i++;
          }
        } else {
          const patternTokens = rule.getPatternTokens();
          if (patternTokens !== null) {
            for (const patternToken of patternTokens) {
              const pattern = patternToken.getString();
              if (lacksSwitzerlandSpelling(pattern)) {
                warnings.push(`${rule.getFullId()}: ${pattern}`);
                i++;
              }
            }
          }
        }
      }
      if (warnings.length > 0) {
        console.error(`*** WARNING: ${ruleFileName}: ${i} <token>s with 'ß' but not 'ss' - these will not match for users of German (Switzerland):`);
        for (const warning of warnings) {
          console.error(`  ${warning}`);
        }
      }
    }
  }, LONG);
});
