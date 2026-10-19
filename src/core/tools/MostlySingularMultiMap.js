// Java: org.languagetool.tools.MostlySingularMultiMap (contents: JS Map key -> array; fastutil map is lookup-only)
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';

// Java: MostlySingularMultiMap
export class MostlySingularMultiMap {
  static FQCN = 'org.languagetool.tools.MostlySingularMultiMap';

  // Java: MostlySingularMultiMap#MostlySingularMultiMap(Map)
  constructor(contents) {
    this.map = new JavaHashMap();
    for (const [key, value] of contents) {
      this.map.put(key, value.length === 1 ? value[0] : [...value]);
    }
  }

  // Java: MostlySingularMultiMap#getList(Object)
  getList(key) {
    const o = this.map.get(key);
    return o === null || o === undefined ? null : Array.isArray(o) ? o : [o];
  }
}
