// org.languagetool.markup.TextPart
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Objects } from '../../lib/java/Objects.js';

// Java: TextPart.Type
export class Type extends JavaEnum {
  static FQCN = 'org.languagetool.markup.TextPart.Type';
}
Type.TEXT = new Type('TEXT', 0);
Type.MARKUP = new Type('MARKUP', 1);
Type.FAKE_CONTENT = new Type('FAKE_CONTENT', 2);

export class TextPart {
  static FQCN = 'org.languagetool.markup.TextPart';
  static Type = Type;

  // Java: TextPart#TextPart(String,Type) (package-private)
  constructor(part, typ) {
    this.part = Objects.requireNonNull(part);
    this.typ = Objects.requireNonNull(typ);
  }

  // Java: TextPart#getPart()
  getPart() {
    return this.part;
  }

  // Java: TextPart#getType()
  getType() {
    return this.typ;
  }

  // Java: TextPart#toString()
  toString() {
    return this.part;
  }
}
