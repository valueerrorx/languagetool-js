// org.languagetool.markup.AnnotatedTextBuilder
import { StringTokenizer } from '../../lib/java/StringTokenizer.js';
import { AnnotatedText, MetaDataKey } from './AnnotatedText.js';
import { MappingValue } from './MappingValue.js';
import { TextPart, Type } from './TextPart.js';

const hiddenChars = '­‭‬';

export class AnnotatedTextBuilder {
  static FQCN = 'org.languagetool.markup.AnnotatedTextBuilder';

  // Java: AnnotatedTextBuilder#AnnotatedTextBuilder()
  constructor() {
    this.parts = [];
    this.metaData = new Map();
    this.customMetaData = new Map();
  }

  // Java: AnnotatedTextBuilder#addGlobalMetaData(MetaDataKey,String) / (String,String)
  addGlobalMetaData(key, value) {
    if (key instanceof MetaDataKey) this.metaData.set(key, value);
    else this.customMetaData.set(key, value);
    return this;
  }

  // Java: AnnotatedTextBuilder#addText(String)
  addText(text) {
    const st = new StringTokenizer(text, hiddenChars, true);
    while (st.hasMoreElements()) {
      const token = st.nextElement();
      if (!hiddenChars.includes(token)) {
        this.parts.push(new TextPart(token, Type.TEXT));
      } else {
        this.parts.push(new TextPart(token, Type.MARKUP));
      }
    }
    return this;
  }

  // Java: AnnotatedTextBuilder#addMarkup(String) / (String,String)
  addMarkup(markup, interpretAs) {
    this.parts.push(new TextPart(markup, Type.MARKUP));
    if (interpretAs !== undefined) this.parts.push(new TextPart(interpretAs, Type.FAKE_CONTENT));
    return this;
  }

  // Java: AnnotatedTextBuilder#add(TextPart)
  add(part) {
    this.parts.push(part);
  }

  // Java: AnnotatedTextBuilder#build()
  build() {
    let plainTextPosition = 0;
    let totalPosition = 0;
    const mapping = new Map();
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      if (part.getType() === Type.TEXT) {
        plainTextPosition += part.getPart().length;
        totalPosition += part.getPart().length;
        const mappingValue = new MappingValue(totalPosition);
        mapping.set(plainTextPosition, mappingValue);
      } else if (part.getType() === Type.MARKUP) {
        totalPosition += part.getPart().length;
        if (this.hasFakeContent(i, this.parts)) {
          plainTextPosition += this.parts[i + 1].getPart().length;
          i++;
          if (!mapping.has(plainTextPosition)) {
            const mappingValue = new MappingValue(totalPosition, part.getPart().length);
            mapping.set(plainTextPosition, mappingValue);
          }
        }
      }
    }
    return new AnnotatedText(this.parts, mapping, this.metaData, this.customMetaData);
  }

  // Java: AnnotatedTextBuilder#hasFakeContent(int,List)
  hasFakeContent(i, parts) {
    const nextPartIndex = i + 1;
    if (nextPartIndex < parts.length) {
      if (parts[nextPartIndex].getType() === Type.FAKE_CONTENT) return true;
    }
    return false;
  }
}
