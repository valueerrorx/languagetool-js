// Ported from PolishTaggerTest (pl module)
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../src/lang/register.js';
import { Pattern } from '../../../src/lib/java/regex/index.js';
import { javaSplit } from '../../../src/lib/java/strings.js';
import { PolishTagger } from '../../../src/lang/pl/tagging/PolishTagger.js';
import { WordTokenizer } from '../../../src/core/text/tokenizers/WordTokenizer.js';
import { myAssert, testDictionary } from '../../support/TestTools.js';

const KNOWN_MASKED = new Set(['niegodniej', 'nieintratniej', 'nieprzydatniej', 'nieskładniej', 'nieżywotniej']);

describe('PolishTaggerTest', () => {
  let tagger;
  let tokenizer;
  beforeEach(() => {
    tagger = new PolishTagger();
    tokenizer = new WordTokenizer();
  });

  // Java: PolishTaggerTest#testDictionary
  it('testDictionary', () => {
    testDictionary(tagger);
  });

  // Java: PolishTaggerTest#testTagger
  it('testTagger', () => {
    myAssert('To jest duży dom.',
      'To/[ten]adj:sg:acc:n1.n2:pos|To/[ten]adj:sg:nom.voc:n1.n2:pos|To/[to]conj|To/[to]qub|To/[to]subst:sg:acc:n2|To/[to]subst:sg:nom:n2 -- jest/[być]verb:fin:sg:ter:imperf:nonrefl -- duży/[duży]adj:sg:acc:m3:pos|duży/[duży]adj:sg:nom.voc:m1.m2.m3:pos -- dom/[dom]subst:sg:acc:m3|dom/[dom]subst:sg:nom:m3', tokenizer, tagger);
    myAssert('Krowa pasie się na pastwisku.',
      'Krowa/[krowa]subst:sg:nom:f -- pasie/[pas]subst:sg:loc:m3|pasie/[pas]subst:sg:voc:m3|pasie/[paść]verb:fin:sg:ter:imperf:refl.nonrefl -- się/[się]qub|się/[się]siebie:acc:nakc|się/[się]siebie:gen:nakc -- na/[na]interj|na/[na]prep:acc|na/[na]prep:loc -- pastwisku/[pastwisko]subst:sg:dat:n2|pastwisku/[pastwisko]subst:sg:loc:n2', tokenizer, tagger);
    myAssert('blablabla', 'blablabla/[null]null', tokenizer, tagger);
  });

  // Java: PolishTaggerTest#testJoinedNegation
  it('testJoinedNegation', () => {
    myAssert('nielepiej', 'nielepiej/[niedobrze]adv:com', tokenizer, tagger);
    myAssert('nienajlepiej', 'nienajlepiej/[niedobrze]adv:sup', tokenizer, tagger);
    myAssert('nieszybciej', 'nieszybciej/[nieszybko]adv:com', tokenizer, tagger);
    myAssert('nietańszy', 'nietańszy/[nietani]adj:sg:acc:m3:com|nietańszy/[nietani]adj:sg:nom.voc:m1.m2.m3:com', tokenizer, tagger);
    myAssert('nielepsza', 'nielepsza/[niedobry]adj:sg:nom.voc:f:com', tokenizer, tagger);
    myAssert('nienajlepszy', 'nienajlepszy/[niedobry]adj:sg:acc:m3:sup|nienajlepszy/[niedobry]adj:sg:nom.voc:m1.m2.m3:sup', tokenizer, tagger);
    myAssert('Nielepiej', 'Nielepiej/[niedobrze]adv:com', tokenizer, tagger);
    myAssert('NIELEPIEJ', 'NIELEPIEJ/[niedobrze]adv:com', tokenizer, tagger);
    myAssert('niemdlej', 'niemdlej/[null]null', tokenizer, tagger);
    myAssert('niełysiej', 'niełysiej/[null]null', tokenizer, tagger);
    myAssert('niegorzej', 'niegorzej/[nieźle]adv:com', tokenizer, tagger);
    myAssert('niebardziej', 'niebardziej/[null]null', tokenizer, tagger);
    myAssert('nienajbardziej', 'nienajbardziej/[null]null', tokenizer, tagger);
    myAssert('nienielepiej', 'nienielepiej/[null]null', tokenizer, tagger);
    myAssert('niemniej', 'niemniej/[niemniej]qub', tokenizer, tagger);
    myAssert('niedaleko', 'niedaleko/[niedaleko]adv:pos', tokenizer, tagger);
  });

  // Java: PolishTaggerTest#testJoinedNegationAgainstDictionaryVerdicts
  it('testJoinedNegationAgainstDictionaryVerdicts', () => {
    const comparSuperl = Pattern.compile('(adv|adj:.+):(com|sup)');
    const isTagged = (w) => tagger.tag([w]).some((r) => r.isTagged());
    const hasReading = (word, requireNegatedLemma) => {
      for (const reading of tagger.tag([word])) {
        for (const token of reading.getReadings()) {
          if (token.getPOSTag() === null || !comparSuperl.matcher(token.getPOSTag()).matches()) continue;
          if (!requireNegatedLemma || (token.getLemma() !== null && token.getLemma().startsWith('nie'))) return true;
        }
      }
      return false;
    };
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const rows = [];
    let headerSeen = false;
    for (const line of readFileSync(path.join(dir, 'resources/nie_verdicts.tsv'), 'utf8').split('\n')) {
      if (line === '' || line.startsWith('#')) continue;
      if (!headerSeen) { headerSeen = true; continue; }
      rows.push(javaSplit(line, '\t', -1));
    }
    expect(rows.length).toBeGreaterThan(0);
    const missing = [];
    const masked = [];
    const unexpected = [];
    let checked = 0;
    for (const row of rows) {
      const joinedForm = row[0];
      const stem = row[1];
      const banned = row[4] === 'Y';
      const verdict = row[5];
      if (stem.startsWith('nie')) continue;
      if (!hasReading(stem, false)) continue;
      checked++;
      const tagged = hasReading(joinedForm, true);
      if (verdict === 'admissible') {
        if (tagged) continue;
        (isTagged(joinedForm) ? masked : missing).push(joinedForm);
      } else if (banned || verdict === 'exclude-typo') {
        if (tagged) unexpected.push(joinedForm);
      }
    }
    expect(checked, `fixture did not yield enough testable rows: ${checked}`).toBeGreaterThan(2000);
    expect(missing, 'admissible joined forms left without any analysis').toEqual([]);
    expect(unexpected, 'joined forms tagged although the dictionary build rejected them').toEqual([]);
    expect(masked.every((w) => KNOWN_MASKED.has(w)), `masked: ${masked}`).toBe(true);
  }, 600000);
});
