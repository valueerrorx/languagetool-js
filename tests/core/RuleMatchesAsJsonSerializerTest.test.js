// Ported from RuleMatchesAsJsonSerializerTest (languagetool-core); test language xx/xx-XX replaced by en-US (xx is not part of this distribution).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { newTool, withNoopAnalysis } from '../../oracle/adapters/_check-pipe-common.mjs';
import { Languages } from '../../src/core/Languages.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { ITSIssueType } from '../../src/core/rules/model/ITSIssueType.js';
import { DetectedLanguage } from '../../src/core/rules/model/DetectedLanguage.js';
import { Tag } from '../../src/core/rules/model/Tag.js';
import { getUrl } from '../../src/core/Tools.js';
import { VERSION } from '../../src/core/LtBuildInfo.js';
import { RuleMatchesAsJsonSerializer } from '../../src/core/RuleMatchesAsJsonSerializer.js';

class FakeRule extends Rule {
  constructor() {
    super();
    this.setLocQualityIssueType(ITSIssueType.Addition);
    this.setUrl(getUrl('http://foobar.org/blah'));
  }

  getId() { return 'FAKE_ID'; }

  getDescription() { return 'My rule description'; }

  match() { throw new Error('not implemented'); }
}

const en = Languages.getLanguageForShortCode('en-US');
// built-in rule lists are not ported yet: tool without built-ins and with no-op analysis (token text only is read)
const sentence = () => withNoopAnalysis(en, true, () => newTool(en).getAnalyzedSentence('This is an test sentence.'));
const makeMatches = (rule) => [new RuleMatch(rule, sentence(), 1, 3, 'My Message, use <suggestion>foo</suggestion> instead', 'short message')];
const serializer = new RuleMatchesAsJsonSerializer();
const lang = () => new DetectedLanguage(en, en);

describe('RuleMatchesAsJsonSerializerTest', () => {
  // Java: RuleMatchesAsJsonSerializerTest#testJson
  it('testJson', () => {
    const json = serializer.ruleMatchesToJson(makeMatches(new FakeRule()), 'This is an text.', 5, lang());
    for (const s of ['"LanguageTool"', VERSION, '"English (US)"', '"en-US"', '"My Message, use \\"foo\\" instead"', '"My rule description"',
      '"FAKE_ID"', '"This is ..."', '"http://foobar.org/blah"', '"addition"', '"short message"', '"sentence":"This is an test sentence."']) {
      expect(json).toContain(s);
    }
    expect(json).not.toContain('tags');
    expect(json).not.toContain('picky');
  });

  // Java: RuleMatchesAsJsonSerializerTest#testJsonWithTags
  it('testJsonWithTags', () => {
    const rule = new FakeRule();
    rule.setTags([Tag.picky]);
    const json = serializer.ruleMatchesToJson(makeMatches(rule), 'This is an text.', 5, lang());
    expect(json).toContain('"tags":["picky"]');
  });

  // Java: RuleMatchesAsJsonSerializerTest#testJsonWithUnixLinebreak
  it('testJsonWithUnixLinebreak', () => {
    const json = serializer.ruleMatchesToJson(makeMatches(new FakeRule()), 'This\nis an text.', 5, lang());
    expect(json).toContain('This is ...');
  });

  // Java: RuleMatchesAsJsonSerializerTest#testJsonWithWindowsLinebreak
  it('testJsonWithWindowsLinebreak', () => {
    const json = serializer.ruleMatchesToJson(makeMatches(new FakeRule()), 'This\ris an text.', 5, lang());
    expect(json).toContain('This\\ris ...');
  });
});
