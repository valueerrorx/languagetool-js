// Ported from CombiningTaggerTest, MorfologikTaggerTest (testTag), ManualTaggerTest (languagetool-core/standalone).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../src/lang/register.js';
import { CombiningTagger } from '../../src/core/tagging/CombiningTagger.js';
import { ManualTagger } from '../../src/core/tagging/ManualTagger.js';
import { MorfologikTagger } from '../../src/core/tagging/MorfologikTagger.js';
import { ResourceUrl } from '../../src/core/resources/ResourceDataBroker.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { assertThrowsJava } from '../support/javaAssert.js';

const SUPPORT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../support/tagging');
const res = (n) => readFileSync(path.join(SUPPORT, n));

// Java: CombiningTaggerTest#getCombiningTagger(boolean,String)
function getCombiningTagger(overwrite, removalFile) {
  const tagger1 = new ManualTagger(res('added1.txt'));
  const tagger2 = new ManualTagger(res('added2.txt'));
  const removalTagger = removalFile ? new ManualTagger(res(removalFile)) : null;
  return new CombiningTagger(tagger1, tagger2, removalTagger, overwrite);
}

// Java: CombiningTaggerTest#getAsString(List)
const getAsString = (result) => result.map((w) => `${w.getLemma()}/${w.getPosTag()}\n`).join('');

describe('CombiningTaggerTest', () => {
  // Java: CombiningTaggerTest#testTagNoOverwrite()
  it('testTagNoOverwrite', () => {
    const tagger = getCombiningTagger(false, null);
    expect(tagger.tag('nosuchword').length).toBe(0);
    const result = tagger.tag('fullform');
    expect(result.length).toBe(2);
    const s = getAsString(result);
    expect(s).toContain('baseform1/POSTAG1');
    expect(s).toContain('baseform2/POSTAG2');
  });

  // Java: CombiningTaggerTest#testTagOverwrite()
  it('testTagOverwrite', () => {
    const tagger = getCombiningTagger(true, null);
    expect(tagger.tag('nosuchword').length).toBe(0);
    const result = tagger.tag('fullform');
    expect(result.length).toBe(1);
    expect(getAsString(result)).toContain('baseform2/POSTAG2');
  });

  // Java: CombiningTaggerTest#testTagRemoval()
  it('testTagRemoval', () => {
    const tagger = getCombiningTagger(false, 'removed.txt');
    expect(tagger.tag('nosuchword').length).toBe(0);
    const s = getAsString(tagger.tag('fullform'));
    expect(s).not.toContain('baseform1/POSTAG1');
    expect(s).toContain('baseform2/POSTAG2');
  });

  // Java: CombiningTaggerTest#testInvalidFile()
  it('testInvalidFile', () => {
    assertThrowsJava(() => new ManualTagger(res('added-invalid.txt')), 'java.io.IOException');
  });
});

describe('MorfologikTaggerTest', () => {
  // Java: MorfologikTaggerTest#testTag()
  it('testTag', () => {
    const tagger = new MorfologikTagger(new ResourceUrl(path.join(SUPPORT, 'test.dict')));
    const result1 = tagger.tag('lowercase');
    expect(result1.length).toBe(2);
    expect(result1[0].getLemma()).toBe('lclemma');
    expect(result1[0].getPosTag()).toBe('POS1');
    expect(result1[1].getLemma()).toBe('lclemma2');
    expect(result1[1].getPosTag()).toBe('POS1a');
    expect(tagger.tag('Lowercase').length).toBe(0);
    const result3 = tagger.tag('schön');
    expect(result3.length).toBe(1);
    expect(result3[0].getLemma()).toBe('testlemma');
    expect(result3[0].getPosTag()).toBe('POSTEST');
    expect(tagger.tag('noSuchWord').length).toBe(0);
  });
});

describe('ManualTaggerTest', () => {
  // Java: ManualTaggerTest#testTag()
  it('testTag', () => {
    const tagger = new ManualTagger(getDataBroker().getFromResourceDirAsStream('/de/added.txt'));
    expect(tagger.tag('').length).toBe(0);
    expect(tagger.tag('gibtsnicht').length).toBe(0);
    expect(`[${tagger.tag('drunter').map((w) => w.toString()).join(', ')}]`).toBe('[drunter/ADV:LOK+PRO]');
    // lookup is case sensitive:
    expect(tagger.tag('Drunter').length).toBe(0);
  });
});
