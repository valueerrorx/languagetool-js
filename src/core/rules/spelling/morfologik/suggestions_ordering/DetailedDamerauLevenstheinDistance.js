// Java: org.languagetool.rules.spelling.morfologik.suggestions_ordering.DetailedDamerauLevenstheinDistance
import { IllegalArgumentException, NullPointerException } from '../../../../../lib/java/errors.js';
import { Objects } from '../../../../../lib/java/Objects.js';
import { Random } from '../../../../../lib/java/Random.js';

const PKG = 'org.languagetool.rules.spelling.morfologik.suggestions_ordering.DetailedDamerauLevenstheinDistance';

// Java: new Random() (seed not reproducible by design)
function newRandom() {
  return new Random(BigInt(Math.floor(Math.random() * 2 ** 48)));
}

// Java: DetailedDamerauLevenstheinDistance$EditOperation (abstract)
export class EditOperation {
  static FQCN = `${PKG}$EditOperation`;

  // Java: EditOperation#EditOperation() / EditOperation(long)
  constructor(seed) {
    this.random = seed === undefined ? newRandom() : new Random(seed);
  }
}

// Java: DetailedDamerauLevenstheinDistance$Delete
export class Delete extends EditOperation {
  static FQCN = `${PKG}$Delete`;

  // Java: Delete#apply(String)
  apply(s) {
    if (s.length <= 1) {
      return null;
    }
    const i = this.random.nextInt(s.length);
    if (i === 0) {
      return s.substring(1);
    } else if (i === s.length - 1) {
      return s.substring(0, i);
    }
    return s.substring(0, i) + s.substring(i + 1);
  }
}

// Java: DetailedDamerauLevenstheinDistance$Transpose
export class Transpose extends EditOperation {
  static FQCN = `${PKG}$Transpose`;

  // Java: Transpose#apply(String)
  apply(s) {
    if (s.length <= 1) {
      return null;
    }
    const i = this.random.nextInt(s.length - 1);
    const transposed = '' + s.charAt(i + 1) + s.charAt(i);
    if (i === 0) {
      return transposed + s.substring(2);
    } else if (i === s.length - 1) {
      return s.substring(0, i) + transposed;
    }
    return s.substring(0, i) + transposed + s.substring(i + 2);
  }
}

// Java: DetailedDamerauLevenstheinDistance#randomChar(Random)
function randomChar(random) {
  return String.fromCharCode(97 + random.nextInt(26));
}

// Java: DetailedDamerauLevenstheinDistance$Insert
export class Insert extends EditOperation {
  static FQCN = `${PKG}$Insert`;

  // Java: Insert#apply(String)
  apply(s) {
    const i = this.random.nextInt(s.length + 1);
    const c = randomChar(this.random);
    if (i === 0) {
      return '' + c + s;
    } else if (i === s.length) {
      return s + c;
    }
    return s.substring(0, i) + c + s.substring(i);
  }
}

// Java: DetailedDamerauLevenstheinDistance$Replace
export class Replace extends EditOperation {
  static FQCN = `${PKG}$Replace`;

  // Java: Replace#apply(String)
  apply(s) {
    if (s.length === 0) {
      return null;
    }
    const i = this.random.nextInt(s.length);
    const c = randomChar(this.random);
    if (i === 0) {
      return '' + c + s.substring(1);
    } else if (i === s.length - 1) {
      return s.substring(0, i) + c;
    }
    return s.substring(0, i) + c + s.substring(i + 1);
  }
}

// Java: DetailedDamerauLevenstheinDistance#editOperations
export const editOperations = [new Insert(), new Replace(), new Transpose(), new Delete()];
const random = newRandom(); // Java: DetailedDamerauLevenstheinDistance#random

// Java: DetailedDamerauLevenstheinDistance#randomEdit()
export function randomEdit() {
  return editOperations[random.nextInt(editOperations.length)];
}

// Java: DetailedDamerauLevenstheinDistance$Distance
export class Distance {
  static FQCN = `${PKG}$Distance`;

  // Java: Distance#Distance() / Distance(int,int,int,int)
  constructor(inserts = 0, deletes = 0, replaces = 0, transposes = 0) {
    this.inserts = inserts;
    this.deletes = deletes;
    this.replaces = replaces;
    this.transposes = transposes;
  }

  // Java: Distance#insert()
  insert() {
    return new Distance(this.inserts + 1, this.deletes, this.replaces, this.transposes);
  }

  // Java: Distance#delete()
  delete() {
    return new Distance(this.inserts, this.deletes + 1, this.replaces, this.transposes);
  }

  // Java: Distance#replace()
  replace() {
    return new Distance(this.inserts, this.deletes, this.replaces + 1, this.transposes);
  }

  // Java: Distance#transpose()
  transpose() {
    return new Distance(this.inserts, this.deletes, this.replaces, this.transposes + 1);
  }

  // Java: Distance#track(EditOperation)
  track(operation) {
    if (operation instanceof Insert) {
      return this.insert();
    } else if (operation instanceof Delete) {
      return this.delete();
    } else if (operation instanceof Replace) {
      return this.replace();
    } else if (operation instanceof Transpose) {
      return this.transpose();
    }
    throw new IllegalArgumentException(`Unknown operation: ${operation}`);
  }

  // Java: Distance#value()
  value() {
    return this.inserts + this.deletes + this.replaces + this.transposes;
  }

  // Java: Distance#equals(Object)
  equals(o) {
    if (o === this) { return true; }
    if (o === null || o === undefined) { return false; }
    if (o.constructor !== this.constructor) { return false; }
    return this.inserts === o.inserts && this.deletes === o.deletes && this.replaces === o.replaces && this.transposes === o.transposes;
  }

  // Java: Distance#toString() (ToStringBuilder default style: class name, identity hash, fields)
  toString() {
    const hash = (Objects.hashCode(this) >>> 0).toString(16);
    return `${Distance.FQCN}@${hash}[value=${this.value()},inserts=${this.inserts},deletes=${this.deletes},replaces=${this.replaces},transposes=${this.transposes}]`;
  }
}

// Java: DetailedDamerauLevenstheinDistance#compare(String,String)
export function compare(s1, s2) {
  if (s1 === null || s1 === undefined) {
    throw new NullPointerException('s1 must not be null');
  }
  if (s2 === null || s2 === undefined) {
    throw new NullPointerException('s2 must not be null');
  }
  if (s1 === s2) {
    return new Distance();
  }
  // INFinite distance is the max possible distance
  const inf = s1.length + s2.length;
  // Create and initialize the character array indices
  const da = new Map();
  for (let d = 0; d < s1.length; d++) {
    da.set(s1.charCodeAt(d), 0);
  }
  for (let d = 0; d < s2.length; d++) {
    da.set(s2.charCodeAt(d), 0);
  }
  // Create the distance matrix H[0 .. s1.length+1][0 .. s2.length+1]
  const h = [];
  // fill with empty values
  for (let i = 0; i < s1.length + 2; i++) {
    const row = [];
    for (let j = 0; j < s2.length + 2; j++) {
      row.push(new Distance());
    }
    h.push(row);
  }
  // initialize the left and top edges of H
  for (let i = 0; i <= s1.length; i++) {
    h[i + 1][0] = new Distance(inf, 0, 0, 0);
    h[i + 1][1] = new Distance(i, 0, 0, 0);
  }
  for (let j = 0; j <= s2.length; j++) {
    h[0][j + 1] = new Distance(inf, 0, 0, 0);
    h[1][j + 1] = new Distance(j, 0, 0, 0);
  }
  // fill in the distance matrix H
  // look at each character in s1
  for (let i = 1; i <= s1.length; i++) {
    let db = 0;
    // look at each character in b
    for (let j = 1; j <= s2.length; j++) {
      const i1 = da.get(s2.charCodeAt(j - 1));
      const j1 = db;
      let cost = 1;
      if (s1.charCodeAt(i - 1) === s2.charCodeAt(j - 1)) {
        cost = 0;
        db = j;
      }
      const substitution = h[i][j].value() + cost;
      const insertion = h[i + 1][j].value() + 1;
      const deletion = h[i][j + 1].value() + 1;
      const transpose = h[i1][j1].value() + (i - i1 - 1) + 1 + (j - j1 - 1);
      const min = Math.min(substitution, insertion, deletion, transpose);
      if (min === substitution) {
        if (cost === 1) {
          h[i + 1][j + 1] = h[i][j].replace();
        } else {
          h[i + 1][j + 1] = h[i][j];
        }
      } else if (min === insertion) {
        h[i + 1][j + 1] = h[i + 1][j].insert();
      } else if (min === deletion) {
        h[i + 1][j + 1] = h[i][j + 1].delete();
      } else if (min === transpose) {
        const transposeCost = (i - i1 - 1) + 1 + (j - j1 - 1);
        let value = h[i1][j1];
        for (let k = 0; k < transposeCost; k++) {
          value = value.transpose();
        }
        h[i + 1][j + 1] = value;
      }
    }
    da.set(s1.charCodeAt(i - 1), i);
  }
  return h[s1.length + 1][s2.length + 1];
}

// Java: DetailedDamerauLevenstheinDistance (static holder with the nested classes)
export const DetailedDamerauLevenstheinDistance = {
  EditOperation, Delete, Transpose, Insert, Replace, Distance, editOperations, randomEdit, compare,
};
