// Ported from TestFrenchDisambiguator (fr module test class, test resource /disambiguator.xml); not used by any Java test
import { RuntimeException } from '../../../src/lib/java/errors.js';
import { readFileSync } from 'node:fs';
import { AbstractDisambiguator } from '../../../src/core/tagging/disambiguation/AbstractDisambiguator.js';
import { DisambiguationRuleLoader } from '../../../src/core/disambiguation/DisambiguationRuleLoader.js';
import { French } from '../../../src/lang/fr/language/French.js';

const DISAMBIGUATOR_XML = new URL('./resources/disambiguator.xml', import.meta.url);

// Java: TestFrenchDisambiguator
export class TestFrenchDisambiguator extends AbstractDisambiguator {
  // Java: TestFrenchDisambiguator#disambiguate(AnalyzedSentence)
  disambiguate(input) {
    let sentence = input;
    const filePath = '/disambiguator.xml';
    try {
      const inputStream = readFileSync(DISAMBIGUATOR_XML);
      const ruleLoader = new DisambiguationRuleLoader();
      const disambiguationRules = ruleLoader.getRules(inputStream, French.getInstance(), filePath);
      for (const patternRule of disambiguationRules) {
        sentence = patternRule.replace(sentence);
      }
    } catch (e) {
      throw new RuntimeException(`Problems with loading disambiguation file: ${filePath}`, e);
    }
    return sentence;
  }
}
