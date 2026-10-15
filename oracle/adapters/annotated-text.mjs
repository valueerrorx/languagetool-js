// JS twin of harness op "annotated-text" (TextOps#annotatedText).
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { MetaDataKey } from '../../src/core/text/AnnotatedText.js';
import { TextPart, Type } from '../../src/core/text/TextPart.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { safe, str, InvocationTargetException } from './_text-common.mjs';

const sortedObject = (entries) => Object.fromEntries(entries.sort((a, b) => javaCompare(a[0], b[0])));

// Java: TextOps#annotatedText(JsonNode)
export function run(a) {
  const b = new AnnotatedTextBuilder();
  for (const p of a.parts) {
    const t = p.t;
    switch (t) {
      case 'text': b.addText(str(p.v)); break;
      case 'markup':
        if ('interpretAs' in p) b.addMarkup(str(p.v), str(p.interpretAs)); else b.addMarkup(str(p.v));
        break;
      case 'meta': { // like ApiV2: known enum key else custom key
        const key = p.key;
        let k;
        try {
          k = MetaDataKey.valueOf(key);
        } catch (e) {
          if (e.javaClass !== 'java.lang.IllegalArgumentException') throw e;
        }
        if (k) b.addGlobalMetaData(k, str(p.value)); else b.addGlobalMetaData(key, str(p.value));
        break;
      }
      case 'customMeta': b.addGlobalMetaData(p.key, str(p.value)); break;
      case 'add': {
        const type = Type.valueOf(p.type);
        try {
          b.add(new TextPart(str(p.v), type));
        } catch (e) {
          throw new InvocationTargetException(null, e);
        }
        break;
      }
      default: throw new IllegalArgumentException(`bad part ${t}`);
    }
  }
  const at = b.build();
  const o = {};
  const plain = at.getPlainText();
  o.plainText = plain;
  o.textWithMarkup = at.getTextWithMarkup();
  o.originalText = at.getOriginalText();
  o.toString = at.toString();
  o.parts = at.getParts().map((p) => [p.getType().name(), p.getPart()]);
  const positions = [];
  if (a.positions) {
    for (const n of a.positions) positions.push(n);
  } else {
    positions.push(-1);
    for (let i = 0; i <= plain.length + 1; i++) positions.push(i);
  }
  o.positions = positions.map((i) => [i, safe(() => at.getOriginalTextPositionFor(i, false)), safe(() => at.getOriginalTextPositionFor(i, true))]);
  const meta = {};
  for (const k of MetaDataKey.values()) meta[k.name()] = at.getGlobalMetaData(k, '<default>');
  o.metaData = meta;
  const cm = {};
  if (a.customKeys) for (const k of a.customKeys) cm[k] = at.getGlobalMetaData(k, '<default>');
  o.customMetaData = cm;
  o.globalMetaDataMap = sortedObject([...at.getGlobalMetaData().entries()].map(([k, v]) => [k.name(), v]));
  o.customMetaDataMap = sortedObject([...at.getCustomMetaData().entries()]);
  return o;
}
