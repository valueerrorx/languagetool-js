// org.languagetool.chunking.TokenExpressionFactory (OpenRegex token expression factory for the chunkers)
import { LogicExpression } from '../../lib/openregex/logic/LogicExpression.js';
import { BaseExpression } from '../../lib/openregex/regex/Expression.js';
import { ExpressionFactory } from '../../lib/openregex/regex/ExpressionFactory.js';
import { TokenPredicate } from './TokenPredicate.js';

// Java: TokenExpressionFactory
export class TokenExpressionFactory extends ExpressionFactory {
  static FQCN = 'org.languagetool.chunking.TokenExpressionFactory';

  // Java: TokenExpressionFactory#TokenExpressionFactory(boolean)
  constructor(caseSensitive) {
    super();
    this.caseSensitive = caseSensitive;
  }

  // Java: TokenExpressionFactory#create(String)
  create(expr) {
    const logicExpression = LogicExpression.compile(expr, (input) => new TokenPredicate(input, this.caseSensitive));
    return new (class extends BaseExpression {
      // Java: TokenExpressionFactory$1#apply(ChunkTaggedToken)
      apply(token) {
        return logicExpression.apply(token);
      }
    })(expr);
  }
}
