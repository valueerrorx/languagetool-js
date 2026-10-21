// org.languagetool.tools.grpc.RuleData (lightweight Rule restored from a cached/remote match; only the CachedRule constructor is used)
import { Rule } from '../../rules/model/Rule.js';
import { Category, CategoryId } from '../../rules/model/Category.js';
import { ITSIssueType } from '../../rules/model/ITSIssueType.js';
import { Tag } from '../../rules/model/Tag.js';
import { UnsupportedOperationException } from '../../../lib/java/errors.js';
import { emptyAsNull } from './ProtoHelper.js';

export class RuleData extends Rule {
  static FQCN = 'org.languagetool.tools.grpc.RuleData';

  // Java: RuleData#RuleData(ProtoResultCache.CachedRule); rule: plain CachedRule object (proto defaults: '' strings, false booleans, 0 ints)
  constructor(rule) {
    super();
    this.id = rule.id;
    this.subId = rule.subId;
    this.description = rule.description;
    this.estimateContext = rule.estimateContextForSureMatch;
    this.sourceFile = rule.sourceFile;
    if (rule.issueType !== '') {
      this.setLocQualityIssueType(ITSIssueType.valueOf(rule.issueType));
    }
    if (rule.tempOff) {
      this.setDefaultTempOff();
    }
    if (rule.category !== null && rule.category !== undefined) {
      const c = new Category(new CategoryId(rule.category.id), rule.category.name);
      this.setCategory(c);
    }
    this.setPremium(rule.isPremium);
    this.setTags(rule.tags.map((t) => Tag.valueOf(t)));
  }

  // Java: RuleData#getSourceFile()
  getSourceFile() {
    return emptyAsNull(this.sourceFile);
  }

  // Java: RuleData#getId()
  getId() {
    return this.id;
  }

  // Java: RuleData#getSubId()
  getSubId() {
    return emptyAsNull(this.subId);
  }

  // Java: RuleData#getDescription()
  getDescription() {
    return this.description;
  }

  // Java: RuleData#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    // 0 is okay as default value
    return this.estimateContext;
  }

  // Java: RuleData#match(AnalyzedSentence)
  match() {
    throw new UnsupportedOperationException('Not implemented; internal class used for returning match information from remote endpoint');
  }
}
