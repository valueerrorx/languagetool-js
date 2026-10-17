// Ported from PatternRuleXmlCreatorTest (languagetool-core); Demo language replaced by tests/support/DemoLanguage.js
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { PatternRuleId } from '../../../src/core/patterns/PatternRuleId.js';
import { PatternRuleXmlCreator } from '../../../src/core/patterns/PatternRuleXmlCreator.js';
import { DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('PatternRuleXmlCreatorTest', () => {
  useXxTestResources();
  const demo = () => new DemoLanguage();

  // Java: PatternRuleXmlCreatorTest#testToXML
  it('testToXML', () => {
    const xml = new PatternRuleXmlCreator().toXML(new PatternRuleId('DEMO_RULE'), demo());
    expect(xml).toBe(
      '<rule id="DEMO_RULE" name="Find \'foo bar\'"><!-- a trivial demo rule that matches "foo" followed by "bar" -->\n' +
      '  <pattern case_sensitive="no">\n' +
      '    <token>foo</token>\n' +
      '    <token>bar</token>\n' +
      '  </pattern>\n' +
      '  <message>Did you mean <suggestion><match no="1"/> fuu bah</suggestion>?</message>\n' +
      '  <url>http://fake-server.org/foo-bar-error-explained</url>\n' +
      '  <example>This is <marker>fuu bah</marker>.</example>\n' +
      '  <example correction="foo fuu bah">This is <marker>foo bar</marker>.</example>\n' +
      '</rule>');
  });

  // Java: PatternRuleXmlCreatorTest#testToXMLWithRuleGroup
  it('testToXMLWithRuleGroup', () => {
    const xml = new PatternRuleXmlCreator().toXML(new PatternRuleId('test_spacebefore'), demo());
    expect(xml).toContain('<rulegroup id="test_spacebefore"');
    expect(xml).toContain('</rulegroup>');
    expect(xml).toContain('<rule>');
    expect(xml).toContain('<rule type="duplication">');
    expect(xml).toContain('<token>blah</token>');
  });

  // Java: PatternRuleXmlCreatorTest#testToXMLWithRuleGroupAndSubId1
  it('testToXMLWithRuleGroupAndSubId1', () => {
    const xml = new PatternRuleXmlCreator().toXML(new PatternRuleId('test_spacebefore', '1'), demo());
    expect(xml).not.toContain('<rulegroup');
    expect(xml).not.toContain('</rulegroup>');
    expect(xml).toContain('<message>This is a dummy message 1.</message>');
  });

  // Java: PatternRuleXmlCreatorTest#testToXMLWithRuleGroupAndSubId2
  it('testToXMLWithRuleGroupAndSubId2', () => {
    const xml = new PatternRuleXmlCreator().toXML(new PatternRuleId('test_spacebefore', '2'), demo());
    expect(xml).not.toContain('<rulegroup id="test_spacebefore"');
    expect(xml).not.toContain('</rulegroup>');
    expect(xml).toContain('<message>This is a dummy message 2.</message>');
  });

  // Java: PatternRuleXmlCreatorTest#testToXMLWithAntiPattern
  it('testToXMLWithAntiPattern', () => {
    const xml = new PatternRuleXmlCreator().toXML(new PatternRuleId('DEMO_RULE_ANTIPATTERN'), demo());
    expect(xml).toContain('  <antipattern>\n    <token>bar</token>\n    <token>,</token>\n  </antipattern>\n');
  });

  // Java: PatternRuleXmlCreatorTest#testToXMLInvalidRuleId
  it('testToXMLInvalidRuleId', () => {
    expect(() => new PatternRuleXmlCreator().toXML(new PatternRuleId('FAKE_ID'), demo())).toThrow();
  });
});
