// Java: org.languagetool.tagging.ru.RussianTagger
import { Locale } from '../../../lib/java/Locale.js';
import { javaReplace, toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';

// stress marks (acute U+0301, grave U+0300) after the vowel; Java source uses the same decomposed sequences
const ACUTE = ['о', 'а', 'е', 'у', 'и', 'ы', 'э', 'ю', 'я'].map((c) => `${c}́`);
const GRAVE = [['о̀', 'о'], ['а̀', 'а'], ['ѐ', 'е'], ['у̀', 'у'], ['ѝ', 'и'], ['ы̀', 'ы'], ['э̀', 'э'], ['ю̀', 'ю'], ['я̀', 'я']];

// Java: RussianTagger
export class RussianTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.ru.RussianTagger';

  // Java: RussianTagger#INSTANCE
  static get INSTANCE() {
    return sharedComponent(RussianTagger.FQCN);
  }

  // Java: RussianTagger#RussianTagger()
  constructor() {
    super('/ru/russian.dict', new Locale('ru'));
  }

  // Java: RussianTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (let word of sentenceTokens) {
      let mayMissingYo = false;
      if (word.length > 1) {
        if (!word.includes('ё') && !word.includes('Ё') && (word.includes('е') || word.includes('Е')) && !word.includes('е́') && !word.includes('о́') &&
          !word.includes('а́') && !word.includes('у́') && !word.includes('и́') && !word.includes('ю́') && !word.includes('ы́') && !word.includes('э́') &&
          !word.includes('я́')) {
          mayMissingYo = true;
        }
        for (const a of ACUTE) word = javaReplace(word, a, a[0]);
        for (const [from, to] of GRAVE) word = javaReplace(word, from, to);
        word = javaReplace(word, 'ʼ', 'ъ');
      }
      const l = this.getAnalyzedTokens(word);
      const atr = new AnalyzedTokenReadings(l, pos);
      if (mayMissingYo) {
        const wordLc = javaReplace(toLowerCase(word), 'е', 'ё');
        if (this.getWordTagger().tag(wordLc).length === 0) {
          mayMissingYo = false;
        }
      }
      if (mayMissingYo) {
        atr.setChunkTags([new ChunkTag('MayMissingYO')]);
      }
      tokenReadings.push(atr);
      pos += word.length;
    }
    return tokenReadings;
  }
}

registerComponent(RussianTagger.FQCN, () => new RussianTagger());
