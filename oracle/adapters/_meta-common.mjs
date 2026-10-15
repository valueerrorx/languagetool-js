// Shared code of the X-LANG-META adapters: JS twin of MetaOps (docs/review/F17-oracle.md).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { Category, CategoryId, Location } from '../../src/core/rules/model/Category.js';
import { ITSIssueType } from '../../src/core/rules/model/ITSIssueType.js';
import { Tag } from '../../src/core/rules/model/Tag.js';
import { safe } from './_text-common.mjs';

export { safe };

const s = (n, k) => (n[k] !== undefined && n[k] !== null ? String(n[k]) : null);

// Java: MetaOps#lang(JsonNode)
export const lang = (a) => Languages.getLanguageForShortCode(String(a.lang));

// Java: MetaOps.MetaRule
export class MetaRule extends Rule {
  constructor(spec) {
    super();
    this.id = s(spec, 'ruleId') !== null ? s(spec, 'ruleId') : s(spec, 'id');
    this.subId = s(spec, 'subId');
    if (spec.category !== undefined && spec.category !== null) {
      const c = spec.category;
      this.setCategory(new Category(new CategoryId(String(c.id)), c.name !== undefined ? String(c.name) : `Meta ${c.id}`, Location.INTERNAL, true));
    }
    if (spec.issueType !== undefined && spec.issueType !== null) this.setLocQualityIssueType(ITSIssueType.valueOf(String(spec.issueType)));
    if (spec.tags !== undefined) this.setTags(spec.tags.map((t) => Tag.valueOf(String(t))));
    if (spec.priority !== undefined) this.setPriority(spec.priority);
  }

  getId() { return this.id; }

  getSubId() { return this.subId; }

  getDescription() { return `Meta ${this.id}`; }

  match() { return []; }
}

// Java: MetaOps#ruleState(Rule)
export function ruleState(r) {
  return {
    id: r.getId(),
    subId: r.getSubId(),
    issueType: r.getLocQualityIssueType() === null ? null : r.getLocQualityIssueType().name(),
    categoryId: r.getCategory() === null ? null : r.getCategory().getId().toString(),
    categoryName: r.getCategory() === null ? null : r.getCategory().getName(),
    tags: r.getTags().map((t) => t.name()),
    priority: r.getPriority(),
  };
}
