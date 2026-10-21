// JS twin of harness op "check-rules" (CheckPipeOps#checkRules, docs/review/F16-oracle.md).
import { runCase } from './check2.mjs';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { languageFor } from './_check-pipe-common.mjs';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { selectRules } from '../../src/core/Tools.js';
import { CommaWhitespaceRule } from '../../src/core/rules/CommaWhitespaceRule.js';
import { DoublePunctuationRule } from '../../src/core/rules/DoublePunctuationRule.js';
import { GenericUnpairedBracketsRule } from '../../src/core/rules/GenericUnpairedBracketsRule.js';
import { GenericUnpairedQuotesRule } from '../../src/core/rules/GenericUnpairedQuotesRule.js';
import { UppercaseSentenceStartRule } from '../../src/core/rules/UppercaseSentenceStartRule.js';
import { WordRepeatRule } from '../../src/core/rules/WordRepeatRule.js';
import { MultipleWhitespaceRule } from '../../src/core/rules/MultipleWhitespaceRule.js';
import { SentenceWhitespaceRule } from '../../src/core/rules/SentenceWhitespaceRule.js';
import { WhitespaceBeforePunctuationRule } from '../../src/core/rules/WhitespaceBeforePunctuationRule.js';
import { EnglishUnpairedBracketsRule } from '../../src/lang/en/rules/EnglishUnpairedBracketsRule.js';
import { EnglishUnpairedQuotesRule } from '../../src/lang/en/rules/EnglishUnpairedQuotesRule.js';
import { EnglishWordRepeatRule } from '../../src/lang/en/rules/EnglishWordRepeatRule.js';

const CORE = [CommaWhitespaceRule, DoublePunctuationRule, GenericUnpairedBracketsRule, GenericUnpairedQuotesRule, UppercaseSentenceStartRule,
  WordRepeatRule, MultipleWhitespaceRule, SentenceWhitespaceRule, WhitespaceBeforePunctuationRule];
// core classes that have a (ResourceBundle, Language) constructor
const WITH_LANGUAGE = new Set([UppercaseSentenceStartRule, WordRepeatRule, MultipleWhitespaceRule]);

// Java: CheckPipeOps#checkRules(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const cls = (a.classes ?? []).map((n) => {
    const c = [...CORE, EnglishUnpairedBracketsRule, EnglishUnpairedQuotesRule, EnglishWordRepeatRule].find((k) => k.FQCN === n);
    if (c === undefined) throw Object.assign(new Error(`check-rules: class ${n} not ported`), { notPorted: true });
    return c;
  });
  {
    const messages = getMessageBundleForLanguage(l);
    const lt = new JLanguageTool(l, null); // Java: new HarnessLT(l, (Language) null)
    lt.setCleanOverlappingMatches(a.cleanOverlapping === true);
    const enabled = new Set(a.ruleIds ?? []);
    const selected = [];
    for (const r of lt.getAllRules()) {
      let m = enabled.has(r.getId());
      for (const c of cls) if (r instanceof c) m = true;
      if (m) {
        enabled.add(r.getId());
        selected.push(`${r.getFullId()}|${r.constructor.name}`);
      }
    }
    if (enabled.size === 0) {
      // no language instance: instantiate the core class itself (messages bundle of the language)
      for (const r of lt.getAllRules()) lt.disableRule(r.getFullId());
      for (const c of cls) {
        const r = WITH_LANGUAGE.has(c) ? new c(messages, l) : new c(messages);
        lt.addRule(r);
        enabled.add(r.getId());
        selected.push(`${r.getFullId()}|${r.constructor.name}|instantiated`);
      }
    }
    if (enabled.size > 0) selectRules(lt, [], [], new Set(), enabled, true, false);
    const active = lt.getAllActiveRules().map((r) => r.getFullId());
    return { selected, active, cases: a.cases.map((c) => runCase(lt, c)) };
  }
}
