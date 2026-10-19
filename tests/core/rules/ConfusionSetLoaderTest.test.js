// Ported from ConfusionSetLoaderTest (languagetool-core); /yy/confusion_sets.txt from the core test resources
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfusionSetLoader } from '../../../src/core/rules/ConfusionSetLoader.js';
import { DemoLanguage } from '../../support/DemoLanguage.js';

const YY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../resources/resource/yy/confusion_sets.txt');

// Java: ConfusionSetLoaderTest#getAsString(List)
function getAsString(confStrings) {
  let sb = '';
  for (const confusionString of confStrings) {
    sb += confusionString.getString() + ' - ';
    sb += confusionString.getDescription();
    sb += ' ';
  }
  return sb;
}

describe('ConfusionSetLoaderTest', () => {
  // Java: ConfusionSetLoaderTest#testLoadWithStrictLimits
  it('testLoadWithStrictLimits', () => {
    const loader = new ConfusionSetLoader(new DemoLanguage());
    const map = loader.loadConfusionPairs(readFileSync(YY));
    const terms = (l) => `[${l.getTerms().join(', ')}]`;
    expect(map.size).toBe(15);
    expect(map.get('there').length).toBe(2);
    expect(map.get('there')[0].getFactor()).toBe(10n);
    expect(map.get('their').length).toBe(2);
    expect(map.get('their')[0].getFactor()).toBe(10n);

    expect(map.get('foo').length).toBe(4);
    expect(map.get('foo')[0].getFactor()).toBe(5n);
    expect(map.get('foo')[1].getFactor()).toBe(5n);
    expect(map.get('foo')[2].getFactor()).toBe(8n);
    expect(map.get('foo')[3].getFactor()).toBe(8n);
    expect(map.get('goo').length).toBe(4);
    expect(map.get('goo')[0].getFactor()).toBe(11n);
    expect(map.get('goo')[1].getFactor()).toBe(11n);
    expect(map.get('goo')[2].getFactor()).toBe(12n);
    expect(map.get('goo')[3].getFactor()).toBe(12n);
    expect(map.get('lol').length).toBe(2);
    expect(map.get('something').length).toBe(2);
    expect(map.get('bar').length).toBe(2);
    expect(map.get('bar')[0].getFactor()).toBe(5n);
    expect(terms(map.get('bar')[0])).toBe('[bar, foo]');
    expect(map.get('bar')[1].getFactor()).toBe(5n);
    expect(terms(map.get('bar')[1])).toBe('[foo, bar]');
    expect(map.get('one').length).toBe(1);
    expect(map.get('one')[0].getFactor()).toBe(13n);
    expect(terms(map.get('one')[0])).toBe('[one, two]');
    expect(map.get('one')[0].getTerm1().toString()).toBe('one');
    expect(map.get('one')[0].getTerm2().toString()).toBe('two');
    expect(map.get('three').length).toBe(1);
    expect(map.get('three')[0].getFactor()).toBe(14n);
    expect(terms(map.get('three')[0])).toBe('[three, four]');
    expect(map.get('three')[0].getTerm1().toString()).toBe('three');
    expect(map.get('three')[0].getTerm2().toString()).toBe('four');
    expect(map.get('four').length).toBe(2);
    expect(map.get('four')[0].getFactor()).toBe(14n);
    expect(terms(map.get('four')[0])).toBe('[three, four]');
    expect(map.get('four')[0].getTerm1().toString()).toBe('three');
    expect(map.get('four')[0].getTerm2().toString()).toBe('four');
    expect(map.get('four')[1].getFactor()).toBe(15n);
    expect(terms(map.get('four')[1])).toBe('[four, five]');
    expect(map.get('four')[1].getTerm1().toString()).toBe('four');
    expect(map.get('four')[1].getTerm2().toString()).toBe('five');

    const there = map.get('there')[0].getTerms();
    expect(getAsString(there)).toContain('there - example 1');
    expect(getAsString(there)).toContain('their - example 2');
    const their = map.get('their')[0].getTerms();
    expect(getAsString(their)).toContain('there - example 1');
    expect(getAsString(their)).toContain('their - example 2');
    expect(getAsString(their)).not.toContain('comment');

    expect(`[${map.get('foo').join(', ')}]`).toBe('[bar -> foo, foo -> bar, baz -> foo, foo -> baz]');
  });
});
