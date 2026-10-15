// Java: org.languagetool.LanguageMaintainedState
import { JavaEnum } from '../lib/java/JavaEnum.js';

// Java: LanguageMaintainedState
export class LanguageMaintainedState extends JavaEnum {
  static FQCN = 'org.languagetool.LanguageMaintainedState';
}
LanguageMaintainedState.ActivelyMaintained = new LanguageMaintainedState('ActivelyMaintained', 0);
LanguageMaintainedState.LookingForNewMaintainer = new LanguageMaintainedState('LookingForNewMaintainer', 1);
