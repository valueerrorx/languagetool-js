// Java: de.danielnaber.jwordsplitter.GermanInterfixDisambiguator (jwordsplitter 4.7)
import { toLowerCase } from '../java/strings.js';

const wordsRequiringInterfixS = new Set(['Verhalten']);

// Java: GermanInterfixDisambiguator
export class GermanInterfixDisambiguator {
  // Java: GermanInterfixDisambiguator#GermanInterfixDisambiguator(Set)
  constructor(dictionary) {
    this.dictionary = dictionary;
  }

  // Java: GermanInterfixDisambiguator#disambiguate(List)
  disambiguate(parts) {
    const newParts = [...parts];
    const lastPartIdx = parts.length - 1;
    if (parts.length > 1) {
      const lastPart = parts[lastPartIdx];
      if (lastPart === 'samt' || lastPart === 'samts' || lastPart === 'samtes') {
        // Verkehr+s+amt = Verkehrs+amt
        newParts[lastPartIdx - 1] = `${parts[lastPartIdx - 1]}s`;
        newParts[lastPartIdx] = lastPart.startsWith('s') ? lastPart.substring(1) : lastPart; // Java: replaceFirst("^s", "")
        return newParts;
      }
    }
    for (let i = newParts.length - 1; i >= 2; i--) {
      const part = newParts[i];
      const prevPart = newParts[i - 1];
      const prevPrevPart = newParts[i - 2];
      if (prevPart === 's') {
        const partIsWord = this.isWord(`s${part}`);
        if (!partIsWord || wordsRequiringInterfixS.has(prevPrevPart)) {
          // Schönheit+s+tempel = Schönheits-tempel
          newParts[i - 2] = `${prevPrevPart}s`;
          newParts.splice(i - 1, 1); // remove interfix
        }
      }
    }
    return newParts;
  }

  // Java: GermanInterfixDisambiguator#isWord(String)
  isWord(word) {
    return this.dictionary.has(toLowerCase(word));
  }
}
