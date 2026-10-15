// org.languagetool.Tag and org.languagetool.ToneTag
import { JavaEnum } from '../../../lib/java/JavaEnum.js';

// Java: org.languagetool.Tag
export class Tag extends JavaEnum {
  static FQCN = 'org.languagetool.Tag';
}
['picky', 'academic', 'clarity', 'professional', 'creative', 'customer', 'jobapp', 'objective', 'elegant']
  .forEach((n, i) => { Tag[n] = new Tag(n, i); });

// Java: org.languagetool.ToneTag
export class ToneTag extends JavaEnum {
  static FQCN = 'org.languagetool.ToneTag';
}
['clarity', 'formal', 'professional', 'confident', 'academic', 'povrem', 'scientific', 'objective', 'persuasive', 'informal',
  'povadd', 'positive', 'general', 'NO_TONE_RULE', 'ALL_TONE_RULES', 'ALL_WITHOUT_GOAL_SPECIFIC']
  .forEach((n, i) => { ToneTag[n] = new ToneTag(n, i); });

// Java: ToneTag#REAL_TONE_TAGS
ToneTag.REAL_TONE_TAGS = ToneTag.values().filter((t) => t !== ToneTag.NO_TONE_RULE && t !== ToneTag.ALL_TONE_RULES && t !== ToneTag.ALL_WITHOUT_GOAL_SPECIFIC);
