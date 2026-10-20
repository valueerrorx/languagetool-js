// edu.washington.cs.knowitall.logic.LogicException and subclasses (openregex 1.1.1)
import { RuntimeException } from '../../java/errors.js';

// Java: LogicException (LogicException(String) / LogicException(String,Exception))
export class LogicException extends RuntimeException {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicException';
}

// Java: LogicException.TokenizeLogicException
export class TokenizeLogicException extends LogicException {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicException$TokenizeLogicException';
}

// Java: LogicException.CompileLogicException
export class CompileLogicException extends LogicException {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicException$CompileLogicException';
}

// Java: LogicException.ApplyLogicException
export class ApplyLogicException extends LogicException {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicException$ApplyLogicException';
}
