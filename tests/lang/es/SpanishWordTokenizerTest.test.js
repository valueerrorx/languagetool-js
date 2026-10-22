// Ported from SpanishWordTokenizerTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { SpanishWordTokenizer } from '../../../src/lang/es/tokenizers/SpanishWordTokenizer.js';

const str = (l) => `[${l.join(', ')}]`;

describe('SpanishWordTokenizerTest', () => {
  // Java: SpanishWordTokenizerTest#testTokenize
  it('testTokenize', () => {
    const wordTokenizer = new SpanishWordTokenizer();
    let tokens = wordTokenizer.tokenize('*test+');
    expect(tokens.length).toBe(3);
    expect(str(tokens)).toBe('[*, test, +]');

    tokens = wordTokenizer.tokenize('best-seller Covid-19;sars-cov-2');
    expect(tokens.length).toBe(5);
    expect(str(tokens)).toBe('[best-seller,  , Covid-19, ;, sars-cov-2]');

    tokens = wordTokenizer.tokenize('e-mails');
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe('[e-mails]');

    tokens = wordTokenizer.tokenize('$100');
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe('[$100]');

    tokens = wordTokenizer.tokenize('$1.000');
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe('[$1.000]');

    tokens = wordTokenizer.tokenize('$1,400.50');
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe('[$1,400.50]');

    tokens = wordTokenizer.tokenize('1,400.50$');
    expect(tokens.length).toBe(1);
    expect(str(tokens)).toBe('[1,400.50$]');

    tokens = wordTokenizer.tokenize('Ven ‒dijo.'); // ‒
    expect(tokens.length).toBe(5);
    expect(str(tokens)).toBe('[Ven,  , ‒, dijo, .]');

    tokens = wordTokenizer.tokenize('1.º');
    expect(tokens.length).toBe(1);

    tokens = wordTokenizer.tokenize('Es la 21.ª y el 45.º');
    expect(tokens.length).toBe(11);

    tokens = wordTokenizer.tokenize('Es la 21.a y el 45.o');
    expect(tokens.length).toBe(11);

    tokens = wordTokenizer.tokenize('11.as Jornadas de Estudio');
    expect(tokens.length).toBe(7);
    expect(str(tokens)).toBe('[11.as,  , Jornadas,  , de,  , Estudio]');

    tokens = wordTokenizer.tokenize('al-Ándalus');
    expect(tokens.length).toBe(1);
  });
});
