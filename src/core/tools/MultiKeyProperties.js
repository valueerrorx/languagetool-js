// Java: org.languagetool.tools.MultiKeyProperties
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { javaSplit, javaTrim } from '../../lib/java/strings.js';
import { decodeUtf8, scannerLines } from '../../lib/java/io.js';

// Java: MultiKeyProperties
export class MultiKeyProperties {
  // Java: MultiKeyProperties#MultiKeyProperties(InputStream)
  constructor(inStream) {
    this.properties = new JavaHashMap();
    for (const raw of scannerLines(decodeUtf8(inStream))) {
      const line = javaTrim(raw);
      if (line.startsWith('#') || line.length === 0) {
        continue;
      }
      const parts = javaSplit(line, '\\s*=\\s*');
      if (parts.length !== 2) {
        continue;
      }
      const key = parts[0];
      const value = parts[1];
      let list = this.properties.get(key);
      if (list === null) {
        list = [];
      }
      list.push(value);
      this.properties.put(key, list);
    }
  }

  // Java: MultiKeyProperties#getProperty(String)
  getProperty(key) {
    return this.properties.get(key);
  }
}
