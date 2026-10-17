// Extra tests (no Java original): DisambiguationRuleLoader/-Handler loading (F28, pulled forward from F32; DisambiguationRuleTest.test.js is the Java test port)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { DisambiguationRuleLoader } from '../../../src/core/disambiguation/DisambiguationRuleLoader.js';
import { DisambiguationPatternRule } from '../../../src/core/disambiguation/DisambiguationPatternRule.js';
import { Languages } from '../../../src/core/Languages.js';
import { getDataBroker } from '../../../src/core/resources/LtStatics.js';

const en = () => Languages.getLanguageForShortCode('en-US');
const load = (xml) => new DisambiguationRuleLoader().getRules(Buffer.from(xml, 'utf8'), en(), 'inline.xml');

describe('DisambiguationRuleLoader', () => {
  // Java: DisambiguationRuleLoader#getRules(InputStream,Language,String)
  it('loads the en disambiguation.xml', () => {
    const l = en();
    const name = `${l.getShortCode()}/disambiguation.xml`;
    const rules = new DisambiguationRuleLoader().getRules(getDataBroker().getAsStream(`${getDataBroker().getResourceDir()}/${name}`), l, name);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r instanceof DisambiguationPatternRule)).toBe(true);
  });

  // Java: DisambiguationRuleHandler#endElement (RULE, ANTIPATTERN, EXAMPLE)
  it('model of a small rule with antipattern and examples', () => {
    const rules = load('<rules lang="en"><rulegroup id="G" name="g"><antipattern><token>x</token></antipattern>'
      + '<rule><pattern><marker><token>a</token></marker><token>b</token></pattern><disambig action="remove"><wd pos="NN" lemma="a">a</wd></disambig>'
      + '<example type="ambiguous" inputform="a[a/NN]" outputform="a[a/VB]">This is <marker>a</marker> b.</example>'
      + '<example type="untouched">Foo</example></rule></rulegroup></rules>');
    // model values are fixture-backed by X-RULELOAD disamb-inline-* (parity); here only structure
    expect(rules.length).toBe(1);
    expect(rules[0].getAntiPatterns().length).toBe(1);
    expect(rules[0].getExamples().length).toBe(1);
    expect(rules[0].getUntouchedExamples()).toEqual(['Foo']);
  });
});
