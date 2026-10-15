// JS twin of harness op "wordtok-static" (WordTokOps#wordtokStatic).
import '../../src/lang/register.js';
import { WordTokenizer } from '../../src/core/text/tokenizers/WordTokenizer.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { safe, str } from './_text-common.mjs';

// Java: WordTokOps#wordtokStatic(JsonNode)
export function run(a) {
  const fn = String(a.fn);
  const wt = new WordTokenizer();
  if (fn === 'getProtocols') return [...WordTokenizer.getProtocols()];
  return a.texts.map((t) => safe(() => {
    const s = str(t);
    switch (fn) {
      case 'isUrl': return WordTokenizer.isUrl(s);
      case 'isEMail': return WordTokenizer.isEMail(s);
      case 'isCurrencyExpression': return wt.isCurrencyExpression(s);
      case 'splitCurrencyExpression': return wt.splitCurrencyExpression(s);
      default: throw new IllegalArgumentException(`unknown fn: ${fn}`);
    }
  }));
}
