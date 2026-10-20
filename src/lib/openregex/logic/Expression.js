// edu.washington.cs.knowitall.logic.Expression (openregex 1.1.1): logic expression tree nodes

// Java: Expression<E>
export class Expression {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression';
}

// Java: Expression.Apply<E>
export class Apply extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Apply';
}

// Java: Expression.Arg<E>
export class Arg extends Apply {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Arg';
}

// Java: Expression.Arg.Pred<E>
export class Pred extends Arg {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Arg$Pred';

  // Java: Expression.Arg.Pred#Pred(String)
  constructor(description) {
    super();
    this.description = description;
  }

  // Java: Expression.Arg.Pred#getDescription()
  getDescription() {
    return this.description;
  }

  // Java: Expression.Arg.Pred#toString()
  toString() {
    return this.getDescription();
  }
}

// Java: Expression.Arg.Value<E>
export class Value extends Arg {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Arg$Value';

  // Java: Expression.Arg.Value#Value(boolean)
  constructor(value) {
    super();
    this.value = value;
  }

  // Java: Expression.Arg.Value#apply(E) / apply()
  apply() {
    return this.value;
  }

  // Java: Expression.Arg.Value#toString()
  toString() {
    return this.value ? 'true' : 'false';
  }
}

// Java: Expression.Op<E>
export class Op extends Apply {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op';

  // Java: Expression.Op#preceeds(Op)
  preceeds(other) {
    return this.precedence() < other.precedence();
  }
}

// Java: Expression.Op.Bin<E>
export class Bin extends Op {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op$Bin';

  constructor() {
    super();
    this.left = null;
    this.right = null;
  }

  // Java: Expression.Op.Bin#toString(String)
  toStringOp(op) {
    if (this.left === null || this.right === null) {
      return op;
    }
    return `(${this.left.toString()} ${op} ${this.right.toString()})`;
  }
}

// Java: Expression.Op.Bin.And<E>
export class And extends Bin {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op$Bin$And';

  // Java: Expression.Op.Bin.And#toString()
  toString() {
    return this.toStringOp('&');
  }

  // Java: Expression.Op.Bin.And#apply(E)
  apply(e) {
    return this.left.apply(e) && this.right.apply(e);
  }

  // Java: Expression.Op.Bin.And#precedence()
  precedence() {
    return 1;
  }
}

// Java: Expression.Op.Bin.Or<E>
export class Or extends Bin {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op$Bin$Or';

  // Java: Expression.Op.Bin.Or#toString()
  toString() {
    return this.toStringOp('|');
  }

  // Java: Expression.Op.Bin.Or#apply(E)
  apply(e) {
    return this.left.apply(e) || this.right.apply(e);
  }

  // Java: Expression.Op.Bin.Or#precedence()
  precedence() {
    return 2;
  }
}

// Java: Expression.Op.Mon<E>
export class Mon extends Op {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op$Mon';

  constructor() {
    super();
    this.sub = null;
  }

  // Java: Expression.Op.Mon#toString(String)
  toStringOp(op) {
    if (this.sub === null) {
      return op;
    }
    return `${op}(${this.sub.toString()})`;
  }
}

// Java: Expression.Op.Mon.Not<E>
export class Not extends Mon {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Op$Mon$Not';

  // Java: Expression.Op.Mon.Not#toString()
  toString() {
    return this.toStringOp('!');
  }

  // Java: Expression.Op.Mon.Not#apply(E)
  apply(e) {
    return !this.sub.apply(e);
  }

  // Java: Expression.Op.Mon.Not#precedence()
  precedence() {
    return 0;
  }
}

// Java: Expression.Paren<E>
export class Paren extends Expression {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Paren';
}

// Java: Expression.Paren.L<E>
export class ParenL extends Paren {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Paren$L';
}

// Java: Expression.Paren.R<E>
export class ParenR extends Paren {
  static FQCN = 'edu.washington.cs.knowitall.logic.Expression$Paren$R';
}
