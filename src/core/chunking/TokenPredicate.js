// org.languagetool.chunking.TokenPredicate (predicate of one OpenRegex token expression, e.g. "pos=ADJ" or "regex=foo.*")
import { RuntimeException } from '../../lib/java/errors.js';
import { javaSplit, contains } from '../../lib/java/strings.js';
import { Pred } from '../../lib/openregex/logic/Expression.js';
import { StringMatcher } from '../patterns/StringMatcher.js';

// Java: TokenPredicate (package-private)
export class TokenPredicate extends Pred {
  static FQCN = 'org.languagetool.chunking.TokenPredicate';

  // Java: TokenPredicate#TokenPredicate(String,boolean)
  constructor(description, caseSensitive) {
    super(description);
    this.predicate = this.compile(description, caseSensitive);
  }

  // Java: TokenPredicate#compile(String,boolean)
  compile(description, caseSensitive) {
    const parts = javaSplit(description, '=');
    let exprType;
    let exprValue;
    if (parts.length === 1) {
      exprType = 'string';
      exprValue = TokenPredicate.unquote(parts[0]);
    } else if (parts.length === 2) {
      exprType = parts[0];
      exprValue = TokenPredicate.unquote(parts[1]);
    } else {
      throw new RuntimeException(`Could not parse expression: ${this.getDescription()}`);
    }

    switch (exprType) {
      case 'string':
      case 'regex':
      case 'regexCS': {
        const matcher = StringMatcher.create(exprValue, 'string' !== exprType, caseSensitive || 'regexCS' === exprType);
        return (analyzedToken) => matcher.matches(analyzedToken.getToken());
      }

      case 'chunk': {
        const chunkPattern = StringMatcher.regexp(exprValue);
        return (analyzedToken) => {
          for (const chunkTag of analyzedToken.getChunkTags()) {
            if (chunkPattern.matches(chunkTag.getChunkTag())) {
              return true;
            }
          }
          return false;
        };
      }

      case 'pos':
        return (analyzedToken) => {
          const readings = analyzedToken.getReadings();
          if (readings !== null && readings !== undefined) {
            for (const token of readings) {
              if (token.getPOSTag() !== null && contains(token.getPOSTag(), exprValue)) {
                return true;
              }
            }
          }
          return false;
        };

      case 'posre':
      case 'posregex': {
        const posPattern = StringMatcher.regexp(exprValue);
        return (analyzedToken) => {
          const readings = analyzedToken.getReadings();
          if (readings !== null && readings !== undefined) {
            for (const token of readings) {
              if (token.getPOSTag() !== null && posPattern.matches(token.getPOSTag())) {
                return true;
              }
            }
          }
          return false;
        };
      }

      default:
        throw new RuntimeException(`Expression type not supported: '${exprType}'`);
    }
  }

  // Java: TokenPredicate#unquote(String)
  static unquote(s) {
    return s.startsWith("'") && s.endsWith("'") ? s.substring(1, s.length - 1) : s;
  }

  // Java: TokenPredicate#apply(ChunkTaggedToken)
  apply(analyzedToken) {
    return this.predicate(analyzedToken);
  }
}
