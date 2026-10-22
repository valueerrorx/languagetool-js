// Ported from RussianSRXSentenceTokenizerTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Russian } from '../../../src/lang/ru/language/Russian.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';

describe('RussianSRXSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(Russian.getInstance());
  const testSplit = (...sentences) => expect(stokenizer.tokenize(sentences.join(''))).toEqual(sentences);

  // Java: RussianSRXSentenceTokenizerTest#testTokenize
  it('testTokenize', () => {
    testSplit('Отток капитала из России составил 7 млрд. долларов, сообщил министр финансов Алексей Кудрин.');
    testSplit('Журнал издаётся с 1967 г., пользуется большой популярностью в мире.');
    testSplit('С 2007 г. периодичность выхода газеты – 120 раз в год.');
    testSplit('Редакция журнала находится в здании по адресу: г. Москва, 110000, улица Мира, д. 1.');
    testSplit('Все эти вопросы заставляют нас искать ответы в нашей истории 60-80-х гг. прошлого столетия.');
    testSplit('Более 300 тыс. документов и справочников.');
    testSplit('Скидки до 50000 руб. на автомобили.');
    testSplit('Изготовление визиток любыми тиражами (от 20 шт. до 10 тысяч) в минимальные сроки (от 20 минут).');
    testSplit('Временно не работает, т.к. не поддерживается.');
  });
});
