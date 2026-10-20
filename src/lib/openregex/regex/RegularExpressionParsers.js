// edu.washington.cs.knowitall.regex.RegularExpressionParsers (openregex 1.1.1): demo parsers over words and characters
import { BaseExpression } from './Expression.js';
import { RegularExpressionParser } from './RegularExpressionParser.js';

// Java: RegularExpressionParsers.word
const word = new (class extends RegularExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParsers$1';

  // Java: RegularExpressionParsers$1#factory(String)
  factory(string) {
    return new (class extends BaseExpression {
      static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParsers$1$1';

      // Java: RegularExpressionParsers$1$1#apply(String)
      apply(token) {
        return string === token;
      }
    })(string);
  }
})();

// Java: RegularExpressionParsers.character
const character = new (class extends RegularExpressionParser {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParsers$2';

  // Java: RegularExpressionParsers$2#factory(String)
  factory(string) {
    return new (class extends BaseExpression {
      static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParsers$2$1';

      // Java: RegularExpressionParsers$2$1#apply(Character)
      apply(token) {
        return string === token;
      }
    })(string);
  }
})();

// Java: RegularExpressionParsers
export class RegularExpressionParsers {
  static FQCN = 'edu.washington.cs.knowitall.regex.RegularExpressionParsers';

  static word = word;
  static character = character;
}
