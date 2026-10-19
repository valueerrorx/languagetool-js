// JS twin of harness op "tools-rules" (ToolsOps#rules, docs/review/F40-oracle.md).
import { DemoRule } from '../../src/core/rules/DemoRule.js';
import { FakeRule } from '../../src/core/rules/FakeRule.js';
import { SpecificIdRule } from '../../src/core/rules/SpecificIdRule.js';
import { Category, CategoryId } from '../../src/core/rules/model/Category.js';
import { ITSIssueType } from '../../src/core/rules/model/ITSIssueType.js';
import { Tag } from '../../src/core/rules/model/Tag.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { errorOf, langFor, lt, matchDump, ruleInfo, s } from './_bitext-common.mjs';
import { newTool, withNoopAnalysis } from './_check-pipe-common.mjs';

const strs = (n) => (n === undefined || n === null ? [] : n.map(String));

// Java: ToolsOps#rules(JsonNode)
export function run(a) {
  const res = {};
  try {
    switch (a.what) {
      case 'demo': {
        const l = lt(a.lang, null);
        const rule = new DemoRule();
        res.info = ruleInfo(rule);
        const out = [];
        for (const t of a.texts) {
          const r = {};
          const realWrite = process.stdout.write;
          let captured = '';
          process.stdout.write = (chunk) => { captured += String(chunk); return true; };
          try {
            r.matches = rule.match(l.getAnalyzedSentence(t)).map(matchDump);
          } catch (e) {
            r.error = errorOf(e);
          } finally {
            process.stdout.write = realWrite;
          }
          r.text = t;
          r.stdout = captured;
          out.push(r);
        }
        res.texts = out;
        break;
      }
      case 'fake': {
        const out = [];
        for (const id of a.ids) {
          const r = id === null ? new FakeRule() : a.tag !== undefined ? new FakeRule(String(id), Tag.valueOf(a.tag)) : new FakeRule(String(id));
          const m = ruleInfo(r);
          m.tags = r.getTags().map((t) => t.name());
          m.matchLength = withNoopAnalysis(langFor('en'), true, () => r.match(newTool(langFor('en')).getAnalyzedSentence('Test.'))).length;
          out.push(m);
        }
        res.rules = out;
        break;
      }
      case 'specific': {
        const out = [];
        for (const c of a.specs) {
          let m = {};
          try {
            const tags = strs(c.tags).map((t) => Tag.valueOf(t));
            const cat = c.category !== undefined ? new Category(new CategoryId(c.category), c.categoryName) : null;
            const it = c.issueType !== undefined ? ITSIssueType.getIssueType(c.issueType) : null;
            const r = new SpecificIdRule(s(c, 'id'), s(c, 'desc'), c.premium === true, cat, it, tags);
            m = ruleInfo(r);
            m.premium = r.isPremium();
            m.tags = r.getTags().map((t) => t.name());
          } catch (t) {
            m.error = errorOf(t);
          }
          out.push(m);
        }
        res.rules = out;
        break;
      }
      default: throw new IllegalArgumentException('what');
    }
  } catch (t) {
    res.error = errorOf(t);
  }
  return res;
}
