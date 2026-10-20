// edu.washington.cs.knowitall.regex.RegexException (openregex 1.1.1)
import { RuntimeException } from '../../java/errors.js';

// Java: RegexException (RegexException(String) / RegexException(String,Exception))
export class RegexException extends RuntimeException {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegexException';
}

// Java: RegexException.TokenizationRegexException
export class TokenizationRegexException extends RegexException {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException';
}
