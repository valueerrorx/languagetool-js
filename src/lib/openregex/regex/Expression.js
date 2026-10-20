// edu.washington.cs.knowitall.regex.Expression (openregex 1.1.1): regular expression tree nodes, each builds its automaton
import { IllegalArgumentException, UnsupportedOperationException } from '../../java/errors.js';
import { Automaton, State } from './FiniteAutomaton.js';

// Java: Expression<E> (interface: build(), minMatchingLength(), apply(E))
export class Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression';
}

// Java: Expression.BaseExpression<E>
export class BaseExpression extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$BaseExpression';

  // Java: Expression.BaseExpression#BaseExpression(String)
  constructor(source) {
    super();
    this.source = source;
  }

  // Java: Expression.BaseExpression#toString()
  toString() {
    return `<${this.source}>`;
  }

  // Java: Expression.BaseExpression#build()
  build() {
    const auto = new Automaton(this);
    auto.start.connect(auto.end, this);
    return auto;
  }

  // Java: Expression.BaseExpression#minMatchingLength()
  minMatchingLength() {
    return 1;
  }
}

// Java: Expression.MatchingGroup<E>
export class MatchingGroup extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$MatchingGroup';

  // Java: Expression.MatchingGroup#MatchingGroup(List)
  constructor(expressions) {
    super();
    this.expressions = expressions;
  }

  // Java: Expression.MatchingGroup#apply(E)
  apply() {
    throw new UnsupportedOperationException();
  }

  // Java: Expression.MatchingGroup#subexpString()
  subexpString() {
    return this.expressions.map((e) => e.toString()).join(' ');
  }

  // Java: Expression.MatchingGroup#toString()
  toString() {
    return `(${this.subexpString()})`;
  }

  // Java: Expression.MatchingGroup#build()
  build() {
    const auto = new Automaton(this);
    const iterator = this.expressions[Symbol.iterator]();
    let last = auto.start;
    let next = iterator.next();
    if (!next.done) {
      const subAuto = next.value.build();
      auto.start.connect(subAuto.start);
      last = subAuto.end;
    }
    for (next = iterator.next(); !next.done; next = iterator.next()) {
      const subAuto = next.value.build();
      const state = new State();
      last.connect(state);
      state.connect(subAuto.start);
      last = subAuto.end;
    }
    last.connect(auto.end);
    return auto;
  }

  // Java: Expression.MatchingGroup#minMatchingLength()
  minMatchingLength() {
    let length = 0;
    for (const expression of this.expressions) {
      length += expression.minMatchingLength();
    }
    return length;
  }
}

// Java: Expression.NamedGroup<E>
export class NamedGroup extends MatchingGroup {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$NamedGroup';

  // Java: Expression.NamedGroup#NamedGroup(String,List)
  constructor(name, expressions) {
    super(expressions);
    this.name = name;
  }

  // Java: Expression.NamedGroup#toString()
  toString() {
    return `(<${this.name}>:${this.subexpString()})`;
  }
}

// Java: Expression.NonMatchingGroup<E>
export class NonMatchingGroup extends MatchingGroup {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$NonMatchingGroup';

  // Java: Expression.NonMatchingGroup#NonMatchingGroup(List)
  constructor(expressions) {
    super(expressions);
  }

  // Java: Expression.NonMatchingGroup#toString()
  toString() {
    return `(?:${this.subexpString()})`;
  }
}

// Java: Expression.Or<E>
export class Or extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$Or';

  // Java: Expression.Or#Or(Expression,Expression)
  constructor(expr1, expr2) {
    super();
    this.expr1 = expr1;
    this.expr2 = expr2;
  }

  // Java: Expression.Or#apply(E)
  apply() {
    return true;
  }

  // Java: Expression.Or#toString()
  toString() {
    return `${this.expr1.toString()} | ${this.expr2.toString()}`;
  }

  // Java: Expression.Or#build()
  build() {
    const auto = new Automaton(this);
    const auto1 = this.expr1.build();
    const auto2 = this.expr2.build();
    auto.start.connect(auto1.start);
    auto.start.connect(auto2.start);
    auto1.end.connect(auto.end);
    auto2.end.connect(auto.end);
    return auto;
  }

  // Java: Expression.Or#minMatchingLength()
  minMatchingLength() {
    const length1 = this.expr1.minMatchingLength();
    const length2 = this.expr2.minMatchingLength();
    return length1 < length2 ? length1 : length2;
  }
}

// Java: Expression.Option<E>
export class Option extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$Option';

  // Java: Expression.Option#Option(Expression)
  constructor(expr) {
    super();
    this.expr = expr;
  }

  // Java: Expression.Option#apply(E)
  apply(argument) {
    return this.expr.apply(argument);
  }

  // Java: Expression.Option#toString()
  toString() {
    return `${this.expr.toString()}?`;
  }

  // Java: Expression.Option#build()
  build() {
    const auto = new Automaton(this);
    const subAuto = this.expr.build();
    auto.start.connect(subAuto.start);
    subAuto.end.connect(auto.end);
    auto.start.connect(auto.end);
    return auto;
  }

  // Java: Expression.Option#minMatchingLength()
  minMatchingLength() {
    return 0;
  }
}

// Java: Expression.Star<E>
export class Star extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$Star';

  // Java: Expression.Star#Star(Expression)
  constructor(expr) {
    super();
    this.expr = expr;
  }

  // Java: Expression.Star#apply(E)
  apply(argument) {
    return this.expr.apply(argument);
  }

  // Java: Expression.Star#toString()
  toString() {
    return `${this.expr.toString()}*`;
  }

  // Java: Expression.Star#build()
  build() {
    const auto = new Automaton(this);
    const subAuto = this.expr.build();
    subAuto.end.connect(subAuto.start);
    auto.start.connect(subAuto.start);
    subAuto.end.connect(auto.end);
    auto.start.connect(auto.end);
    return auto;
  }

  // Java: Expression.Star#minMatchingLength()
  minMatchingLength() {
    return 0;
  }
}

// Java: Expression.Plus<E>
export class Plus extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$Plus';

  // Java: Expression.Plus#Plus(Expression)
  constructor(expr) {
    super();
    this.expr = expr;
  }

  // Java: Expression.Plus#apply(E)
  apply(argument) {
    return this.expr.apply(argument);
  }

  // Java: Expression.Plus#toString()
  toString() {
    return `${this.expr.toString()}+`;
  }

  // Java: Expression.Plus#build()
  build() {
    const auto = new Automaton(this);
    const subAuto = this.expr.build();
    subAuto.end.connect(subAuto.start);
    auto.start.connect(subAuto.start);
    subAuto.end.connect(auto.end);
    return auto;
  }

  // Java: Expression.Plus#minMatchingLength()
  minMatchingLength() {
    return 1;
  }
}

// Java: Expression.MinMax<E>
export class MinMax extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$MinMax';

  // Java: Expression.MinMax#MinMax(Expression,int,int)
  constructor(expr, minOccurrences, maxOccurrences) {
    super();
    this.expr = expr;
    if (minOccurrences < 0 || maxOccurrences < 1) {
      throw new IllegalArgumentException(`minOccurrences must be >= 0 and maxOccurrences must be >= 1: ${minOccurrences}, ${maxOccurrences}`);
    }
    if (minOccurrences > maxOccurrences) {
      throw new IllegalArgumentException(`minOccurrences must be <= maxOccurrences: ${minOccurrences} > ${maxOccurrences}`);
    }
    this.minOccurrences = minOccurrences;
    this.maxOccurrences = maxOccurrences;
  }

  // Java: Expression.MinMax#apply(E)
  apply(argument) {
    return this.expr.apply(argument);
  }

  // Java: Expression.MinMax#toString()
  toString() {
    return `${this.expr.toString()}{${this.minOccurrences},${this.maxOccurrences}}`;
  }

  // Java: Expression.MinMax#build()
  build() {
    const auto = new Automaton(this);
    const autos = [];
    const max = this.maxOccurrences;
    for (let i = 0; i < max; i++) {
      autos.push(this.expr.build());
    }
    auto.start.connect(autos[0].start);
    for (let i = 0; i < autos.length; i++) {
      const subAuto = autos[i];
      if (i >= this.minOccurrences - 1) {
        subAuto.end.connect(auto.end);
      }
      if (i < autos.length - 1) {
        const next = autos[i + 1];
        subAuto.end.connect(next.start);
      }
    }
    if (this.minOccurrences === 0) {
      auto.start.connect(auto.end);
    }
    return auto;
  }

  // Java: Expression.MinMax#minMatchingLength()
  minMatchingLength() {
    return this.minOccurrences;
  }
}

// Java: Expression.AssertionExpression<E>
export class AssertionExpression extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$AssertionExpression';

  // Java: Expression.AssertionExpression#apply(E)
  apply() {
    return false;
  }

  // Java: Expression.AssertionExpression#build()
  build() {
    const auto = new Automaton(this);
    auto.start.connect(auto.end, this);
    return auto;
  }

  // Java: Expression.AssertionExpression#minMatchingLength()
  minMatchingLength() {
    return 0;
  }
}

// Java: Expression.StartAssertion<E>
export class StartAssertion extends AssertionExpression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$StartAssertion';

  // Java: Expression.StartAssertion#apply(boolean,List,int)
  applyAt(first, tokens, size) {
    return first && tokens.length === size;
  }

  // Java: Expression.StartAssertion#toString()
  toString() {
    return '^';
  }
}

// Java: Expression.EndAssertion<E>
export class EndAssertion extends AssertionExpression {
  static FQCN = 'edu.washington.cs.knowitall.regex.Expression$EndAssertion';

  // Java: Expression.EndAssertion#apply(boolean,List,int)
  applyAt(first, tokens) {
    return tokens.length === 0;
  }

  // Java: Expression.EndAssertion#toString()
  toString() {
    return '$';
  }
}
