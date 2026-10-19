// org.languagetool.rules.spelling.symspell.implementation.SuggestionStage (MIT, Hampus Londogard)
import { ChunkArray } from './ChunkArray.js';

// Java: SuggestionStage.Node
export class Node {
  // Java: SuggestionStage.Node(String,int)
  constructor(suggestion, next) {
    this.suggestion = suggestion;
    this.next = next;
  }
}

// Java: SuggestionStage.Entry
export class Entry {
  // Java: SuggestionStage.Entry(int,int)
  constructor(count, first) {
    this.count = count;
    this.first = first;
  }
}

// Java: SuggestionStage
export class SuggestionStage {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.SuggestionStage';
  static Node = Node;
  static Entry = Entry;

  // Java: SuggestionStage(int)
  constructor(initialCapacity) {
    this.deletes = new Map(); // Java: HashMap<Integer,Entry>
    this.nodes = new ChunkArray(initialCapacity * 2);
  }

  // Java: SuggestionStage#deleteCount()
  deleteCount() {
    return this.deletes.size;
  }

  // Java: SuggestionStage#nodeCount()
  nodeCount() {
    return this.nodes.count;
  }

  // Java: SuggestionStage#clear()
  clear() {
    this.deletes.clear();
    this.nodes.clear();
  }

  // Java: SuggestionStage#add(int,String)
  add(deleteHash, suggestion) {
    const entry = this.deletes.has(deleteHash) ? this.deletes.get(deleteHash) : new Entry(0, -1);
    const next = entry.first;
    entry.count++;
    entry.first = this.nodes.count;
    this.deletes.set(deleteHash, entry);
    this.nodes.add(new Node(suggestion, next));
  }

  // Java: SuggestionStage#commitTo(Map)
  commitTo(permanentDeletes) {
    this.deletes.forEach((value, key) => {
      let i;
      let suggestions;
      if (permanentDeletes.has(key)) {
        suggestions = permanentDeletes.get(key);
        i = suggestions.length;
        const newSuggestion = suggestions.slice(0, i); // Arrays.copyOf(suggestions, i + count) pads with null
        for (let k = 0; k < value.count; k++) newSuggestion.push(null);
        permanentDeletes.set(key, newSuggestion);
        suggestions = newSuggestion;
      } else {
        i = 0;
        suggestions = new Array(value.count).fill(null);
        permanentDeletes.set(key, suggestions);
      }
      let next = value.first;
      while (next >= 0) {
        const node = this.nodes.getValues(next);
        suggestions[i] = node.suggestion;
        next = node.next;
        i++;
      }
    });
  }
}
