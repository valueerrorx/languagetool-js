// Java: org.languagetool.tagging.disambiguation.rules.DisambiguationRuleTest (loading part active, example replay skipped until F32)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { DisambiguationRuleLoader } from '../../../src/core/disambiguation/DisambiguationRuleLoader.js';
import { AnalyzedSentence } from '../../../src/core/AnalyzedSentence.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { getDataBroker } from '../../../src/core/resources/LtStatics.js';

// Java: DisambiguationRuleTest#sortForms(String)
function sortForms(wordForms) {
  if (wordForms === ',[,]') return wordForms;
  if (wordForms.length === 0) return wordForms;
  const word = wordForms.substring(0, wordForms.indexOf('[') + 1);
  const forms = wordForms.substring(wordForms.indexOf('[') + 1, wordForms.length - 1);
  const formToSort = forms.split(',');
  formToSort.sort();
  return `${word}${formToSort.join(',')}]`;
}

// Java: DisambiguationRuleTest#cleanXML(String)
function cleanXML(str) {
  return str.replace(/<.*?>/g, '');
}

// Java: DisambiguationRuleTest#disambiguateUntil(Language,List,String,AnalyzedSentence)
function disambiguateUntil(lang, rules, ruleID, sentence) {
  let disambiguated = sentence;
  disambiguated = lang.getDisambiguator().preDisambiguate(disambiguated);
  for (const rule of rules) {
    if (ruleID === rule.getId()) break;
    disambiguated = rule.replace(disambiguated);
  }
  return disambiguated;
}

// Java: DisambiguationRuleTest#testDisambiguationRulesFromXML(List,JLanguageTool,Language) examples part
function testDisambiguationRulesFromXMLExamples(rules, lt, lang) {
  for (const rule of rules) {
    const id = rule.getId();
    if (rule.getUntouchedExamples() !== null) {
      for (let goodSentence of rule.getUntouchedExamples()) {
        goodSentence = goodSentence.replace(/[\n\t]+/g, '');
        goodSentence = cleanXML(goodSentence);
        expect(goodSentence.trim().length > 0).toBe(true);
        const sent = disambiguateUntil(lang, rules, id, lt.getRawAnalyzedSentence(goodSentence));
        const sentToReplace = disambiguateUntil(lang, rules, id, lt.getRawAnalyzedSentence(goodSentence));
        expect(rule.replace(sentToReplace).toString(), `The untouched example (${goodSentence}) for ${lang.getName()} rule ${rule}] was touched!`).toBe(sent.toString());
      }
    }
    const examples = rule.getExamples();
    if (examples !== null) {
      for (const example of examples) {
        const outputForms = example.getDisambiguated();
        expect(outputForms !== null, `No output form found for: ${id}`).toBe(true);
        expect(outputForms.trim().length > 0, 'Output form must not be empty').toBe(true);
        const expectedMatchStart = example.getExample().indexOf('<marker>');
        const expectedMatchEnd = example.getExample().indexOf('</marker>') - '<marker>'.length;
        if (expectedMatchStart === -1 || expectedMatchEnd === -1) {
          throw new Error(`${lang}: No position markup ('<marker>...</marker>') in disambiguated example in rule ${rule}`);
        }
        const inputForms = example.getAmbiguous();
        expect(inputForms !== null, `No input form found for: ${id}`).toBe(true);
        expect(inputForms.trim().length > 0).toBe(true);
        expect(outputForms !== inputForms, `Input and output forms for rule ${id} are the same!`).toBe(true);
        const cleanInput = lt.getRawAnalyzedSentence(cleanXML(example.getExample()));
        const sent = disambiguateUntil(lang, rules, id, lt.getRawAnalyzedSentence(cleanXML(example.getExample())));
        const disambiguatedSent = rule.replace(disambiguateUntil(lang, rules, id, lt.getRawAnalyzedSentence(cleanXML(example.getExample()))));
        expect(!cleanInput.equals(disambiguatedSent), `Disambiguated sentence is equal to the non-disambiguated sentence for rule: ${id}. The sentence was: ${sent}`).toBe(true);
        expect(!sent.equals(disambiguatedSent), `Disambiguated sentence is equal to the input sentence for rule: ${id}. The sentence was: ${sent}`).toBe(true);
        let reading = '';
        let annotations = '';
        for (const readings of sent.getTokens()) {
          if (readings.isSentenceStart() && !inputForms.includes('<S>')) continue;
          if (readings.getStartPos() === expectedMatchStart) {
            reading = new AnalyzedSentence([readings]).toShortString(',');
            annotations = readings.getHistoricalAnnotations();
            const startPos = readings.getStartPos();
            const endPos = readings.getEndPos();
            expect(startPos === expectedMatchStart && endPos === expectedMatchEnd,
              `Wrong marker position in the example for the rule ${id}: got ${startPos}-${endPos}, expected ${expectedMatchStart}-${expectedMatchEnd}. Sentence: '${sent}'`).toBe(true);
            break;
          }
        }
        expect(sortForms(reading), `The input form for the rule ${id} in the example: ${example} is different than expected (expected ${inputForms} but got ${sortForms(reading)}). The token has been changed by the disambiguator: ${annotations}`).toBe(inputForms);
        for (const readings of disambiguatedSent.getTokens()) {
          if (readings.isSentenceStart() && !outputForms.includes('<S>')) continue;
          if (readings.getStartPos() === expectedMatchStart) {
            reading = new AnalyzedSentence([readings]).toShortString(',');
            expect(readings.getStartPos() === expectedMatchStart && readings.getEndPos() === expectedMatchEnd).toBe(true);
            break;
          }
        }
        expect(sortForms(reading), `The output form for the rule ${id} in the example: ${example} is different than expected (expected ${outputForms} but got ${sortForms(reading)}). The token has been changed by the disambiguator: ${annotations}`).toBe(outputForms);
      }
    }
  }
}

describe('DisambiguationRuleTest', () => {
  // Java: DisambiguationRuleTest#testDisambiguationRulesFromXML()
  it('testDisambiguationRulesFromXML', () => {
    for (const lang of Languages.getWithDemoLanguage()) {
      if (lang.isVariant()) continue;
      if (lang.getShortCode() !== 'xx') continue; // Java core module only sees the demo language; new JLanguageTool(real language) needs F17 (see next test for real files)
      const ruleLoader = new DisambiguationRuleLoader();
      const lt = new JLanguageTool(lang);
      if (lt.getLanguage().getDisambiguator().constructor.name !== 'DemoDisambiguator') {
        const nameWithLocale = `${lang.getShortCode()}/disambiguation.xml`;
        const nameInResourceDir = `${getDataBroker().getResourceDir()}/${nameWithLocale}`;
        // validateRuleFile: XSD validation is not ported (D-048)
        const rules = ruleLoader.getRules(getDataBroker().getAsStream(nameInResourceDir), lang, nameWithLocale);
        expect(rules.length).toBeGreaterThan(0);
        // PatternTestTools.warnIfRegexpSyntaxNotKosher is a test-jar helper that only logs (not ported)
      }
    }
  });

  // Java: DisambiguationRuleTest#testDisambiguationRulesFromXML(Set) loading part for the languages that ship disambiguation.xml
  it('loads the disambiguation.xml of every non-variant language that has one', () => {
    let loaded = 0;
    for (const lang of Languages.get()) {
      if (lang.isVariant()) continue;
      const nameWithLocale = `${lang.getShortCode()}/disambiguation.xml`;
      const stream = getDataBroker().getAsStream(`${getDataBroker().getResourceDir()}/${nameWithLocale}`);
      if (stream === null) continue;
      const rules = new DisambiguationRuleLoader().getRules(stream, lang, nameWithLocale);
      expect(rules.length).toBeGreaterThan(0);
      for (const rule of rules) {
        expect(rule.getId()).toBeTruthy();
        expect(rule.getPatternTokens().length).toBeGreaterThan(0);
      }
      loaded++;
    }
    expect(loaded).toBeGreaterThan(0);
  });

  // Java: DisambiguationRuleTest#testDisambiguationRulesFromXML(List,JLanguageTool,Language) example replay needs DisambiguationPatternRule#replace
  it.skip('F32: disambiguation examples replay', () => {
    for (const lang of Languages.get()) {
      if (lang.isVariant()) continue;
      const nameWithLocale = `${lang.getShortCode()}/disambiguation.xml`;
      const stream = getDataBroker().getAsStream(`${getDataBroker().getResourceDir()}/${nameWithLocale}`);
      if (stream === null) continue;
      const rules = new DisambiguationRuleLoader().getRules(stream, lang, nameWithLocale);
      testDisambiguationRulesFromXMLExamples(rules, new JLanguageTool(lang), lang);
    }
  });
});
