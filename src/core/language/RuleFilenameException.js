// Java: org.languagetool.language.RuleFilenameException
import { RuntimeException } from '../../lib/java/errors.js';

// Java: RuleFilenameException
export class RuleFilenameException extends RuntimeException {
  static FQCN = 'org.languagetool.language.RuleFilenameException';

  // Java: RuleFilenameException#RuleFilenameException(File)
  constructor(file) {
    super('Rule file must be named rules-<xx>-<lang>.xml (<xx> = language code, '
      + '<lang> = language name),\n'
      + 'for example: rules-en-English.xml\n'
      + `Current name: ${file.getName()}`);
  }
}
