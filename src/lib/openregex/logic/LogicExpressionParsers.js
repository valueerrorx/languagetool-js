// edu.washington.cs.knowitall.logic.LogicExpressionParsers (openregex 1.1.1): demo parsers
import { Pred } from './Expression.js';
import { LogicExpressionParser } from './LogicExpressionParser.js';

// Java: LogicExpressionParsers.trivial
const trivial = new (class extends LogicExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParsers$1';

  // Java: LogicExpressionParsers$1#factory(String)
  factory(string) {
    return new (class extends Pred {
      static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParsers$1$1';

      // Java: LogicExpressionParsers$1$1#apply(String)
      apply() {
        return 'true' === string;
      }
    })(string);
  }
})();

// Java: LogicExpressionParsers.stringMatch
const stringMatch = new (class extends LogicExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParsers$2';

  // Java: LogicExpressionParsers$2#factory(String)
  factory(token) {
    return new (class extends Pred {
      static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParsers$2$1';

      constructor(t) {
        super(t);
        this.string = t.substring(1, t.length - 1);
      }

      // Java: LogicExpressionParsers$2$1#apply(String)
      apply(s) {
        return s === this.string;
      }
    })(token);
  }
})();

// Java: LogicExpressionParsers
export class LogicExpressionParsers {
  static FQCN = 'edu.washington.cs.knowitall.logic.LogicExpressionParsers';

  static trivial = trivial;
  static stringMatch = stringMatch;
}
