// org.languagetool.rules.AbstractDashRule
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';
import { Categories } from './model/Category.js';
import { Tag } from './model/Tag.js';
import { AhoCorasickDoubleArrayTrie } from '../../lib/ahocorasick.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { javaMatches, javaReplace, javaReplaceAll } from '../../lib/java/strings.js';
import { JLanguageTool } from '../JLanguageTool.js';

// Java: AbstractDashRule (abstract: getDescription, getMessage, getCompoundsData)
export class AbstractDashRule extends Rule {
  static FQCN = 'org.languagetool.rules.AbstractDashRule';

  // Java: AbstractDashRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setCategory(Categories.TYPOGRAPHY.getCategory(messages));
    this.setTags([Tag.picky]);
  }

  // Java: AbstractDashRule#getId()
  getId() {
    return 'DASH_RULE';
  }

  // Java: AbstractDashRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return 2;
  }

  // Java: AbstractDashRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const text = sentence.getText();
    const hits = this.getCompoundsData().parseText(text);
    const startPositions = new Set();
    hits.reverse(); // work on longest matches first
    for (const hit of hits) {
      if (startPositions.has(hit.begin)) {
        continue; // avoid overlapping matches
      }
      if (hit.begin > 0 && !this.isBoundary(text.substring(hit.begin - 1, hit.begin))) {
        // prevent substring matches
        continue;
      }
      if (hit.end < text.length && !this.isBoundary(text.substring(hit.end, hit.end + 1))) {
        // prevent substring matches, e.g. "Foto" for "Photons"
        continue;
      }
      const match = new RuleMatch(this, sentence, hit.begin, hit.end, hit.begin, hit.end,
        this.getMessage(), null, false, '');
      const covered = text.substring(hit.begin, hit.end);
      match.setSuggestedReplacement(javaReplaceAll(covered, ' ?[–—] ?', '-'));
      matches.push(match);
      startPositions.add(hit.begin);
    }
    return matches;
  }

  // Java: AbstractDashRule#isBoundary(String)
  isBoundary(s) {
    return !javaMatches(s, '[a-zA-Z]');
  }

  // Java: AbstractDashRule#loadCompoundFile(String)
  static loadCompoundFile(path) {
    const words = [];
    const lines = JLanguageTool.getDataBroker().getFromResourceDirAsLines(path);
    for (let line of lines) {
      if (line.length === 0 || line.charAt(0) === '#') {
        continue; // ignore comments
      }
      if (line.endsWith('+') || line.endsWith('?')) {
        continue; // skip non-hyphenated suggestions
      } else if (line.endsWith('*') || line.endsWith('$')) {
        line = AbstractDashRule.removeLastCharacter(line);
      }
      words.push(line);
    }
    const map = new JavaHashMap();
    for (const word of words) {
      const variant1 = javaReplace(word, '-', '–');
      map.put(variant1, variant1);
      const variant2 = javaReplace(word, '-', '—');
      map.put(variant2, variant2);
      const variant3 = javaReplace(word, '-', ' – ');
      map.put(variant3, variant3);
      const variant4 = javaReplace(word, '-', ' — ');
      map.put(variant4, variant4);
    }
    const trie = new AhoCorasickDoubleArrayTrie();
    trie.build(map.entrySet());
    return trie;
  }

  // Java: AbstractDashRule#removeLastCharacter(String)
  static removeLastCharacter(str) {
    return str.substring(0, str.length - 1);
  }
}
