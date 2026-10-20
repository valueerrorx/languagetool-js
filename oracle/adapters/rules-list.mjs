// JS twin of harness op "rules-list" (ContentOps#rulesList).
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { lang } from './_content-common.mjs';

export { beginCase } from './_content-common.mjs';

// Java: ContentOps#rulesList(JsonNode)
export function run(a) {
  const lt = new JLanguageTool(lang(a.lang));
  const active = new Set(lt.getAllActiveRules());
  const rules = [];
  for (const r of lt.getAllRules()) {
    rules.push({
      id: r.getId(),
      subId: r.getSubId(),
      fullId: r.getFullId(),
      description: r.getDescription(),
      class: r.constructor.FQCN ?? `js:${r.constructor.name}`,
      categoryId: r.getCategory() === null ? null : r.getCategory().getId().toString(),
      categoryName: r.getCategory() === null ? null : r.getCategory().getName(),
      categoryDefaultOff: r.getCategory() !== null && r.getCategory().isDefaultOff(),
      defaultOff: r.isDefaultOff(),
      defaultTempOff: r.isDefaultTempOff(),
      activeByDefault: active.has(r),
      premium: r.isPremium(),
      priority: r.getPriority(),
      issueType: r.getLocQualityIssueType() === null ? null : r.getLocQualityIssueType().toString(),
      tags: r.getTags().map((t) => t.name()),
      toneTags: r.getToneTags().map((t) => t.name()),
      sourceFile: r.getSourceFile(),
      url: r.getUrl() === null ? null : r.getUrl().toString(),
      examples: [r.getCorrectExamples().length, r.getIncorrectExamples().length, r.getErrorTriggeringExamples().length],
    });
  }
  const categories = [];
  for (const c of lt.getCategories().values()) {
    categories.push({ id: c.getId().toString(), name: c.getName(), defaultOff: c.isDefaultOff(), location: c.getLocation().name() });
  }
  return { rules, categories };
}
