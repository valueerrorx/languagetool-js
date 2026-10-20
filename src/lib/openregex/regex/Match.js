// edu.washington.cs.knowitall.regex.Match (openregex 1.1.1): result of a regular expression match over a token list
import { BaseExpression, MatchingGroup, NamedGroup, NonMatchingGroup } from './Expression.js';

// Java: Match.Group.Token<E>
class Token {
  static FQCN = 'edu.washington.cs.knowitall.regex.Match$Group$Token';

  // Java: Match.Group.Token#Token(E,int)
  constructor(entity, index) {
    this.entity = entity;
    this.index = index;
  }

  // Java: Match.Group.Token#toString()
  toString() {
    return this.entity.toString();
  }
}

// Java: Match.Group<E>
export class Group {
  static FQCN = 'edu.washington.cs.knowitall.regex.Match$Group';

  // Java: Match.Group#Group(Expression,E,int) / Group(Expression,List) / Group(Expression)
  constructor(expr, entityOrTokens, index) {
    this.expr = expr;
    if (index !== undefined) {
      this.tokens_ = [new Token(entityOrTokens, index)];
    } else if (entityOrTokens !== undefined) {
      this.tokens_ = [...entityOrTokens];
    } else {
      this.tokens_ = [];
    }
  }

  // Java: Match.Group#addTokens(Group)
  addTokens(group) {
    this.tokens_.push(...group.tokens_);
  }

  // Java: Match.Group#tokens()
  tokens() {
    return this.tokens_.map((t) => t.entity);
  }

  // Java: Match.Group#startIndex()
  startIndex() {
    let startIndex = -1;
    for (const token of this.tokens_) {
      if (startIndex === -1 || token.index < startIndex) {
        startIndex = token.index;
      }
    }
    return startIndex;
  }

  // Java: Match.Group#endIndex()
  endIndex() {
    let endIndex = -1;
    for (const token of this.tokens_) {
      if (token.index === -1 || token.index > endIndex) {
        endIndex = token.index;
      }
    }
    return endIndex;
  }

  // Java: Match.Group#text()
  text() {
    return this.tokens().map((t) => t.toString()).join(' ');
  }

  // Java: Match.Group#tokenCount()
  tokenCount() {
    return this.tokens_.length;
  }

  // Java: Match.Group#toString()
  toString() {
    return `${this.expr.toString()}:'${this.tokens_.map((t) => t.toString()).join(' ')}'`;
  }
}

// Java: Match<E> (abstract)
export class Match {
  static FQCN = 'edu.washington.cs.knowitall.regex.Match';

  // Java: Match#Match() / Match(Match)
  constructor(match) {
    this.pairs_ = [];
    if (match !== undefined) {
      for (const pair of match.pairs_) {
        this.add(new Group(pair.expr, pair.tokens_.map((t) => t)));
      }
    }
  }

  // Java: Match#add(Group) / add(Expression,E,int)
  add(groupOrExpression, entity, index) {
    if (entity === undefined && index === undefined) {
      this.pairs_.push(groupOrExpression);
      return true;
    }
    return this.add(new Group(groupOrExpression, entity, index));
  }

  // Java: Match#addAll(Collection)
  addAll(groups) {
    let result = true;
    for (const group of groups) {
      const added = this.add(group);
      result = result && added;
    }
    return result;
  }

  // Java: Match#isEmpty()
  isEmpty() {
    return this.pairs_.length === 0;
  }

  // Java: Match#toString()
  toString() {
    return `[${this.pairs_.map((p) => p.toString()).join(', ')}]`;
  }

  // Java: Match#toMultilineString()
  toMultilineString() {
    return this.pairs_.map((p) => p.toString()).join('\n');
  }

  // Java: Match#pairs()
  pairs() {
    return [...this.pairs_];
  }

  // Java: Match#length()
  length() {
    return this.tokens().length;
  }

  // Java: Match#group(String)
  group(name) {
    for (const group of this.groups()) {
      if (group.expr instanceof NamedGroup) {
        if (group.expr.name === name) {
          return group;
        }
      }
    }
    return null;
  }
}

// Java: Match.IntermediateMatch<E>
export class IntermediateMatch extends Match {
  static FQCN = 'edu.washington.cs.knowitall.regex.Match$IntermediateMatch';

  // Java: Match.IntermediateMatch#tokens()
  tokens() {
    const tokens = [];
    for (const pair of this.pairs_) {
      if (pair.expr instanceof BaseExpression) {
        tokens.push(...pair.tokens());
      }
    }
    return tokens;
  }

  // Java: Match.IntermediateMatch#groups()
  groups() {
    const groups = [];
    for (const pair of this.pairs_) {
      if (pair.expr instanceof MatchingGroup && !(pair.expr instanceof NonMatchingGroup)) {
        groups.push(pair);
      }
    }
    return groups;
  }

  // Java: Match.IntermediateMatch#startIndex()
  startIndex() {
    for (const pair of this.pairs_) {
      if (pair.expr instanceof BaseExpression) {
        return pair.tokens_[0].index;
      }
    }
    return -1;
  }

  // Java: Match.IntermediateMatch#endIndex()
  endIndex() {
    for (let i = this.pairs_.length - 1; i >= 0; i--) {
      const pair = this.pairs_[i];
      if (pair.expr instanceof BaseExpression) {
        return pair.tokens_[0].index;
      }
    }
    return -1;
  }
}

// Java: Match.FinalMatch<E>
export class FinalMatch extends Match {
  static FQCN = 'edu.washington.cs.knowitall.regex.Match$FinalMatch';

  // Java: Match.FinalMatch#FinalMatch(Match)
  constructor(match) {
    super(match);
    this.startIndex_ = match.startIndex();
    this.tokens_ = Object.freeze([...match.tokens()]);
    this.groups_ = Object.freeze([...match.groups()]);
  }

  // Java: Match.FinalMatch#startIndex()
  startIndex() {
    return this.startIndex_;
  }

  // Java: Match.FinalMatch#endIndex()
  endIndex() {
    return this.startIndex() + this.tokens_.length;
  }

  // Java: Match.FinalMatch#tokens()
  tokens() {
    return this.tokens_;
  }

  // Java: Match.FinalMatch#groups()
  groups() {
    return this.groups_;
  }
}
