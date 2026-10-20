// Ported from InflectorTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { Inflector } from '../../../../../src/lang/en/rules/translation/Inflector.js';
import { abstractCollectionToString } from '../../../../../src/lib/java/toString.js';

const s = (l) => abstractCollectionToString(l);

describe('InflectorTest', () => {
  // Java: InflectorTest#inflect
  it('inflect', () => {
    const inflector = new Inflector();
    expect(s(inflector.inflect('pump', 'SUB:AKK:PLU:FEM'))).toBe('[pumps]'); // "Pumpen"
    expect(s(inflector.inflect('child', 'SUB:NOM:PLU:NEU'))).toBe('[children]'); // "Kinder"
    expect(s(inflector.inflect('walk', 'VER:3:SIN:PRÄ:NON'))).toBe('[walks]'); // "er geht"
    expect(s(inflector.inflect('walk', 'VER:3:SIN:PRT:NON'))).toBe('[walked]'); // "ging" (-> gehen)
    expect(s(inflector.inflect('walk', 'PA1:PRD:GRU:VER'))).toBe('[walking]'); // "gehend"
    expect(s(inflector.inflect('walk', 'PA2:PRD:GRU:VER'))).toBe('[walked]'); // "gegangen"
    expect(s(inflector.inflect('large', 'ADJ:PRD:KOM'))).toBe('[larger]'); // "größer"
    expect(s(inflector.inflect('large', 'ADJ:AKK:SIN:FEM:SUP:DEF'))).toBe('[largest]'); // "größte"
    expect(s(inflector.inflect('walk', 'VER:1:SIN:PRÄ:NON'))).toBe('[walk]');
    expect(s(inflector.inflect('walk', 'VER:2:SIN:PRÄ:NON'))).toBe('[walk]');
    expect(s(inflector.inflect('walk', 'VER:1:PLU:PRÄ:NON'))).toBe('[walk]');
    expect(s(inflector.inflect('walk', 'VER:2:PLU:PRÄ:NON'))).toBe('[walk]');
    expect(s(inflector.inflect('walk', 'VER:3:PLU:PRÄ:NON'))).toBe('[walk]');
    expect(s(inflector.inflect('walk', null))).toBe('[walk]');
    expect(s(inflector.inflect('walk', ''))).toBe('[walk]');
    expect(s(inflector.inflect('walk', 'FAKE-TAG'))).toBe('[walk]');
  });

  // Java: InflectorTest#inflectMultiWord
  it('inflectMultiWord', () => {
    const inflector = new Inflector();
    expect(s(inflector.inflect('tire pump', 'SUB:AKK:PLU:FEM'))).toBe('[tire pumps]'); // "Pumpen"
    expect(s(inflector.inflect('fake tire pump', 'SUB:AKK:PLU:FEM'))).toBe('[fake tire pumps]');
  });
});
