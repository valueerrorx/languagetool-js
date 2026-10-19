// Ported from GlobalSpellingTest (core)
import { describe, it } from 'vitest';
import '../../src/lang/register.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { GLOBAL_SPELLING_FILE } from '../../src/core/rules/spelling/SpellingCheckRule.js';
import { IllegalStateException } from '../../src/lib/java/errors.js';
import { javaSplit, javaTrim } from '../../src/lib/java/strings.js';

describe('GlobalSpellingTest', () => {
  const prohibitedExpressions = ['Dnipro', 'Dnepr'];
  const prohibitedTokens = ['Tolstoi', 'Tolstoy', 'Dostoevsky'];

  // Java: GlobalSpellingTest#avoidSomeWords
  it('avoidSomeWords', () => {
    const lines = getDataBroker().getFromResourceDirAsLines(GLOBAL_SPELLING_FILE);
    for (const line of lines) {
      const parts = javaSplit(line, '#');
      if (parts.length === 0) {
        continue;
      }
      const entry = javaTrim(parts[0]);
      if (prohibitedExpressions.includes(entry)) {
        throw new IllegalStateException(`Do not use '${entry}' in global_spelling.txt. It is not a valid spelling for all languages.`);
      }
      const tokens = javaSplit(entry, ' ');
      for (const token of tokens) {
        if (prohibitedTokens.includes(token)) {
          throw new IllegalStateException(`Do not use '${token}' in global_spelling.txt. It is not a valid spelling for all languages.`);
        }
      }
    }
  });
});
