// Ported from GermanTaggerTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { GermanTagger } from '../../../src/lang/de/tagging/GermanTagger.js';
import { javaMatches } from '../../../src/lib/java/regex/index.js';
import { testDictionary } from '../../support/TestTools.js';
import { ls, toSortedString } from '../../support/germanTaggerTools.js';

describe('GermanTaggerTest', () => {
  const tagger = new GermanTagger();

  // Java: GermanTaggerTest#testAdjectivesFromSpellingTxt()
  it('testAdjectivesFromSpellingTxt', () => {
    expect(toSortedString(tagger.lookup('abgemindert'))).toEqual('abgemindert[abgemindert/PA2:PRD:GRU:VER]');
    expect(toSortedString(tagger.lookup('abgemindertes'))).toEqual('abgemindertes[abgemindert/PA2:AKK:SIN:NEU:GRU:IND:VER, ' +
      'abgemindert/PA2:AKK:SIN:NEU:GRU:SOL:VER, abgemindert/PA2:NOM:SIN:NEU:GRU:IND:VER, ' +
      'abgemindert/PA2:NOM:SIN:NEU:GRU:SOL:VER]');
    expect(tagger.lookup('fünftjüngste')).toBeNull();  // skipped to avoid false tagging that misses comparative
    expect(toSortedString(tagger.lookup('meistgewünschtes'))).toEqual('meistgewünschtes[meistgewünscht/ADJ:AKK:SIN:NEU:GRU:IND, meistgewünscht/ADJ:AKK:SIN:NEU:GRU:SOL, ' +
      'meistgewünscht/ADJ:NOM:SIN:NEU:GRU:IND, meistgewünscht/ADJ:NOM:SIN:NEU:GRU:SOL]');
    expect(toSortedString(tagger.lookup('meistgewünschter'))).toEqual('meistgewünschter[meistgewünscht/ADJ:DAT:SIN:FEM:GRU:SOL, meistgewünscht/ADJ:GEN:PLU:FEM:GRU:SOL, ' +
      'meistgewünscht/ADJ:GEN:PLU:MAS:GRU:SOL, meistgewünscht/ADJ:GEN:PLU:NEU:GRU:SOL, ' +
      'meistgewünscht/ADJ:GEN:SIN:FEM:GRU:SOL, meistgewünscht/ADJ:NOM:SIN:MAS:GRU:IND, ' +
      'meistgewünscht/ADJ:NOM:SIN:MAS:GRU:SOL]');
    expect(toSortedString(tagger.lookup('meistgewünscht'))).toEqual('meistgewünscht[meistgewünscht/ADJ:PRD:GRU]');
  });

  // Java: GermanTaggerTest#testLemmaOfForDashCompounds()
  it('testLemmaOfForDashCompounds', () => {
    const aToken = tagger.lookup('Zahn-Arzt-Verband');
    const lemmas = [];
    for (const analyzedToken of aToken.getReadings()) {
      lemmas.push(analyzedToken.getLemma());
    }
    expect(lemmas.includes('Zahnarztverband')).toBe(true);
  });

  // Java: GermanTaggerTest#testGenderGap()
  it('testGenderGap', () => {
    // https://github.com/languagetool-org/languagetool/issues/2417
    expect(tagger.tag(['viele', 'Freund', '*', 'innen'])[1].hasPartialPosTag(':PLU:FEM')).toBe(true);
    expect(tagger.tag(['viele', 'Freund', '_', 'innen'])[1].hasPartialPosTag(':PLU:FEM')).toBe(true);
    expect(tagger.tag(['viele', 'Freund', ':', 'innen'])[1].hasPartialPosTag(':PLU:FEM')).toBe(true);
    expect(tagger.tag(['viele', 'Freund', '/', 'innen'])[1].hasPartialPosTag(':PLU:FEM')).toBe(true);
    expect(tagger.tag(['jede', '*', 'r', 'Mitarbeiter', '*', 'in'])[0].hasPartialPosTag('PRO:IND:NOM:SIN:FEM')).toBe(true);
    expect(tagger.tag(['jede', '*', 'r', 'Mitarbeiter', '*', 'in'])[0].hasPartialPosTag('PRO:IND:NOM:SIN:MAS')).toBe(true);
    expect(tagger.tag(['jede', '*', 'r', 'Mitarbeiter', '*', 'in'])[3].hasPartialPosTag('SUB:NOM:SIN:FEM')).toBe(true);
    expect(tagger.tag(['jede', '*', 'r', 'Mitarbeiter', '*', 'in'])[3].hasPartialPosTag('SUB:NOM:SIN:MAS')).toBe(true);
  });

  // Java: GermanTaggerTest#testIgnoreDomain()
  it('testIgnoreDomain', () => {
    const aToken = tagger.tag(['bundestag', '.', 'de']);
    expect(aToken[0].isTagged()).toBe(false);
  });

  // Java: GermanTaggerTest#testIgnoreImperative()
  it('testIgnoreImperative', () => {
    const aToken = tagger.tag(['zehnfach']);
    expect(aToken[0].isTagged()).toBe(false);
  });

  // Java: GermanTaggerTest#testTagger()
  it('testTagger', () => {
    const aToken = tagger.lookup('Haus');
    expect(toSortedString(aToken)).toEqual('Haus[Haus/SUB:AKK:SIN:NEU, Haus/SUB:DAT:SIN:NEU, Haus/SUB:NOM:SIN:NEU]');
    expect(aToken.getReadings()[0].getLemma()).toEqual('Haus');
    expect(aToken.getReadings()[1].getLemma()).toEqual('Haus');
    expect(aToken.getReadings()[2].getLemma()).toEqual('Haus');

    const aToken2 = tagger.lookup('Hauses');
    expect(toSortedString(aToken2)).toEqual('Hauses[Haus/SUB:GEN:SIN:NEU]');
    expect(aToken2.getReadings()[0].getLemma()).toEqual('Haus');

    expect(tagger.lookup('hauses')).toBeNull();
    expect(tagger.lookup('Groß')).toBeNull();

    expect(toSortedString(tagger.lookup('Lieblingsbuchstabe'))).toEqual('Lieblingsbuchstabe[Lieblingsbuchstabe/SUB:NOM:SIN:MAS]');

    const aToken3 = tagger.lookup('großer');
    expect(toSortedString(tagger.lookup('großer'))).toEqual('großer[groß/ADJ:DAT:SIN:FEM:GRU:SOL, groß/ADJ:GEN:PLU:FEM:GRU:SOL, groß/ADJ:GEN:PLU:MAS:GRU:SOL, ' +
            'groß/ADJ:GEN:PLU:NEU:GRU:SOL, groß/ADJ:GEN:SIN:FEM:GRU:SOL, groß/ADJ:NOM:SIN:MAS:GRU:IND, ' +
            'groß/ADJ:NOM:SIN:MAS:GRU:SOL]');
    expect(aToken3.getReadings()[0].getLemma()).toEqual('groß');

    // checks for github issue #635: Some German verbs on the beginning of a sentences are identified only as substantive
    expect(ls(tagger.tag(['Haben'], true)).includes('VER')).toBe(true);
    expect(ls(tagger.tag(['Können'], true)).includes('VER')).toBe(true);
    expect(ls(tagger.tag(['Gerade'], true)).includes('ADJ')).toBe(true);

    // from both german.dict and added.txt:
    const aToken4 = tagger.lookup('Interessen');
    expect(toSortedString(aToken4)).toEqual('Interessen[Interesse/SUB:AKK:PLU:NEU, Interesse/SUB:DAT:PLU:NEU, ' +
                    'Interesse/SUB:GEN:PLU:NEU, Interesse/SUB:NOM:PLU:NEU]');
    expect(aToken4.getReadings()[0].getLemma()).toEqual('Interesse');
    expect(aToken4.getReadings()[1].getLemma()).toEqual('Interesse');
    expect(aToken4.getReadings()[2].getLemma()).toEqual('Interesse');
    expect(aToken4.getReadings()[3].getLemma()).toEqual('Interesse');

    // words that are not in the dictionary but that are recognized thanks to noun splitting:
    const aToken5 = tagger.lookup('Donaudampfschiff');
    expect(toSortedString(aToken5)).toEqual('Donaudampfschiff[Donaudampfschiff/SUB:AKK:SIN:NEU, Donaudampfschiff/SUB:DAT:SIN:NEU, ' +
            'Donaudampfschiff/SUB:NOM:SIN:NEU]');
    expect(aToken5.getReadings()[0].getLemma()).toEqual('Donaudampfschiff');
    expect(aToken5.getReadings()[1].getLemma()).toEqual('Donaudampfschiff');

    const aToken6 = tagger.lookup('Häuserkämpfe');
    expect(toSortedString(aToken6)).toEqual('Häuserkämpfe[Häuserkampf/SUB:AKK:PLU:MAS, Häuserkampf/SUB:GEN:PLU:MAS, Häuserkampf/SUB:NOM:PLU:MAS]');
    expect(aToken6.getReadings()[0].getLemma()).toEqual('Häuserkampf');
    expect(aToken6.getReadings()[1].getLemma()).toEqual('Häuserkampf');
    expect(aToken6.getReadings()[2].getLemma()).toEqual('Häuserkampf');

    const aToken7 = tagger.lookup('Häuserkampfes');
    expect(toSortedString(aToken7)).toEqual('Häuserkampfes[Häuserkampf/SUB:GEN:SIN:MAS]');
    expect(aToken7.getReadings()[0].getLemma()).toEqual('Häuserkampf');

    const aToken8 = tagger.lookup('Häuserkampfs');
    expect(toSortedString(aToken8)).toEqual('Häuserkampfs[Häuserkampf/SUB:GEN:SIN:MAS]');
    expect(aToken8.getReadings()[0].getLemma()).toEqual('Häuserkampf');

    const aToken9 = tagger.lookup('Lieblingsfarben');
    expect(toSortedString(aToken9)).toEqual('Lieblingsfarben[Lieblingsfarbe/SUB:AKK:PLU:FEM, Lieblingsfarbe/SUB:DAT:PLU:FEM, ' +
            'Lieblingsfarbe/SUB:GEN:PLU:FEM, Lieblingsfarbe/SUB:NOM:PLU:FEM]');
    expect(aToken9.getReadings()[0].getLemma()).toEqual('Lieblingsfarbe');

    const aToken10 = tagger.lookup('Autolieblingsfarben');
    expect(toSortedString(aToken10)).toEqual('Autolieblingsfarben[Autolieblingsfarbe/SUB:AKK:PLU:FEM, Autolieblingsfarbe/SUB:DAT:PLU:FEM, ' +
            'Autolieblingsfarbe/SUB:GEN:PLU:FEM, Autolieblingsfarbe/SUB:NOM:PLU:FEM]');
    expect(aToken10.getReadings()[0].getLemma()).toEqual('Autolieblingsfarbe');

    const aToken11 = tagger.lookup('übrigbleibst');
    expect(toSortedString(aToken11)).toEqual('übrigbleibst[übrigbleiben/VER:2:SIN:PRÄ:NON:NEB]');
    expect(aToken11.getReadings()[0].getLemma()).toEqual('übrigbleiben');

    const aToken12 = tagger.lookup('IT-Dienstleistungsunternehmen');
    expect(javaMatches(aToken12.getReadings()[0].getPOSTag(), 'SUB.*')).toBe(true);
    expect(aToken12.getReadings()[0].getLemma()).toEqual('IT-Dienstleistungsunternehmen');

    const aToken13 = tagger.lookup('Entweder-oder');
    expect(javaMatches(aToken13.getReadings()[0].getPOSTag(), 'SUB.*')).toBe(true);
    expect(aToken13.getReadings()[0].getLemma()).toEqual('Entweder-oder');

    const aToken14 = tagger.lookup('Verletzter');
    expect(aToken14.getReadings()[0].getPOSTag() === 'SUB:NOM:SIN:MAS:ADJ').toBe(true);
    expect(aToken14.getReadings()[0].getLemma()).toEqual('Verletzter');
    expect(aToken14.getReadings()[1].getPOSTag() === 'SUB:GEN:PLU:MAS:ADJ').toBe(true);

    const aToken15 = tagger.lookup('erzkatholisch');
    expect(aToken15.getReadings()[0].getPOSTag() === 'ADJ:PRD:GRU').toBe(true);

    const aToken16 = tagger.lookup('unerbeten');
    expect(aToken16.getReadings()[0].getPOSTag() === 'PA2:PRD:GRU:VER').toBe(true);

    const aToken17 = tagger.lookup('under');
    expect(aToken17 == null).toBe(true);
    
    // tag old forms
    const aToken18 = tagger.lookup('Zuge');
    expect(toSortedString(aToken18)).toEqual('Zuge[Zug/SUB:DAT:SIN:MAS]');
    const aToken19 = tagger.lookup('Tische');
    expect(toSortedString(aToken19)).toEqual('Tische[Tisch/SUB:AKK:PLU:MAS, Tisch/SUB:DAT:SIN:MAS, Tisch/SUB:GEN:PLU:MAS, Tisch/SUB:NOM:PLU:MAS]');

    expect(tagger.lookup('vanillig-karamelligen')).toBeNull();

    const aToken20 = tagger.lookup('Polizeimitarbeitende');
    expect(toSortedString(aToken20)).toEqual('Polizeimitarbeitende[Polizeimitarbeitende/SUB:AKK:SIN:FEM:ADJ, Polizeimitarbeitende/SUB:AKK:SIN:NEU:ADJ, ' +
      'Polizeimitarbeitende/SUB:NOM:SIN:FEM:ADJ, Polizeimitarbeitende/SUB:NOM:SIN:MAS:ADJ, Polizeimitarbeitende/SUB:NOM:SIN:NEU:ADJ]');
    const aToken21 = tagger.lookup('Polizeimitarbeitenden');
    expect(toSortedString(aToken21)).toEqual('Polizeimitarbeitenden[Polizeimitarbeitende/SUB:AKK:PLU:FEM:ADJ, Polizeimitarbeitende/SUB:AKK:PLU:MAS:ADJ, ' +
      'Polizeimitarbeitende/SUB:AKK:PLU:NEU:ADJ, Polizeimitarbeitende/SUB:AKK:SIN:MAS:ADJ, Polizeimitarbeitende/SUB:DAT:PLU:FEM:ADJ, ' +
      'Polizeimitarbeitende/SUB:DAT:PLU:MAS:ADJ, Polizeimitarbeitende/SUB:DAT:PLU:NEU:ADJ, Polizeimitarbeitende/SUB:DAT:SIN:FEM:ADJ, ' +
      'Polizeimitarbeitende/SUB:DAT:SIN:MAS:ADJ, Polizeimitarbeitende/SUB:DAT:SIN:NEU:ADJ, Polizeimitarbeitende/SUB:GEN:PLU:FEM:ADJ, ' +
      'Polizeimitarbeitende/SUB:GEN:PLU:MAS:ADJ, Polizeimitarbeitende/SUB:GEN:PLU:NEU:ADJ, Polizeimitarbeitende/SUB:GEN:SIN:FEM:ADJ, ' +
      'Polizeimitarbeitende/SUB:GEN:SIN:MAS:ADJ, Polizeimitarbeitende/SUB:GEN:SIN:NEU:ADJ, Polizeimitarbeitende/SUB:NOM:PLU:FEM:ADJ, ' +
      'Polizeimitarbeitende/SUB:NOM:PLU:MAS:ADJ, Polizeimitarbeitende/SUB:NOM:PLU:NEU:ADJ]');
  });

  // Java: GermanTaggerTest#testExtendedTagger()
  it('testExtendedTagger', () => {
    expect(toSortedString(tagger.lookup('Kuß'))).toEqual('Kuß[Kuß/SUB:AKK:SIN:MAS, Kuß/SUB:DAT:SIN:MAS, Kuß/SUB:NOM:SIN:MAS]');
    expect(toSortedString(tagger.lookup('Kuss'))).toEqual('Kuss[Kuss/SUB:AKK:SIN:MAS, Kuss/SUB:DAT:SIN:MAS, Kuss/SUB:NOM:SIN:MAS]');

    expect(toSortedString(tagger.lookup('Haß'))).toEqual('Haß[Haß/SUB:AKK:SIN:MAS, Haß/SUB:DAT:SIN:MAS, Haß/SUB:NOM:SIN:MAS]');
    expect(toSortedString(tagger.lookup('Hass'))).toEqual('Hass[Hass/SUB:AKK:SIN:MAS, Hass/SUB:DAT:SIN:MAS, Hass/SUB:NOM:SIN:MAS]');
  });

  // Java: GermanTaggerTest#testAfterColon()
  it('testAfterColon', () => {
    // a colon doesn't start a new sentence in LT, but often it should, so we check the special case for that
    const tags = tagger.tag(['Er', 'sagte', ':', 'Als', 'Erstes', 'würde', 'ich']);
    expect(tags.length).toEqual(7);
    expect(tags[3].getToken()).toEqual('Als');
    expect(tags[3].getReadings().length).toEqual(4);
  });

  // Java: GermanTaggerTest#testTaggerBaseforms()
  it('testTaggerBaseforms', () => {
    const readings1 = tagger.lookup('übrigbleibst').getReadings();
    expect(readings1.length).toEqual(1);
    expect(readings1[0].getLemma()).toEqual('übrigbleiben');

    const readings2 = tagger.lookup('Haus').getReadings();
    expect(readings2.length).toEqual(3);
    expect(readings2[0].getLemma()).toEqual('Haus');
    expect(readings2[1].getLemma()).toEqual('Haus');
    expect(readings2[2].getLemma()).toEqual('Haus');

    const readings3 = tagger.lookup('Häuser').getReadings();
    expect(readings3.length).toEqual(3);
    expect(readings3[0].getLemma()).toEqual('Haus');
    expect(readings3[1].getLemma()).toEqual('Haus');
    expect(readings3[2].getLemma()).toEqual('Haus');
  });

  // Java: GermanTaggerTest#testTag()
  it('testTag', () => {
    const upperCaseWord = ['Das'];
    const readings = tagger.tag(upperCaseWord, false);
    expect(ls(readings)).toEqual('[Das[Das/null*]]');
    const readings2 = tagger.tag(upperCaseWord, true);
    expect(ls(readings2).startsWith('[Das[der/ART:')).toBe(true);
  });

  // Java: GermanTaggerTest#testTagWithManualDictExtension()
  it('testTagWithManualDictExtension', () => {
    // words not originally in Morphy but added in LT 1.8 (moved from added.txt to german.dict)
    const readings = tagger.tag(['Wichtigtuerinnen']);
    expect(ls(readings)).toEqual('[Wichtigtuerinnen[Wichtigtuerin/SUB:AKK:PLU:FEM*,' +
            'Wichtigtuerin/SUB:DAT:PLU:FEM*,Wichtigtuerin/SUB:GEN:PLU:FEM*,Wichtigtuerin/SUB:NOM:PLU:FEM*]]');
  });

  // Java: GermanTaggerTest#testDictionary()
  it('testDictionary', () => {
    // Java only prints warnings for words without a POS tag (no assertion)
    testDictionary(tagger);
  }, 120000);

  // Java: GermanTaggerTest#testIsWeiseException()
  it('testIsWeiseException', () => {
    expect(tagger.isWeiseException('überweise')).toBe(false);
    expect(tagger.isWeiseException('verweise')).toBe(false);
    expect(tagger.isWeiseException('eimerweise')).toBe(false);
    expect(tagger.isWeiseException('meterweise')).toBe(false);
    expect(tagger.isWeiseException('literweise')).toBe(false);
    expect(tagger.isWeiseException('blätterweise')).toBe(false);
    expect(tagger.isWeiseException('erweise')).toBe(false);

    expect(tagger.isWeiseException('lustigerweise')).toBe(true);
    expect(tagger.isWeiseException('idealerweise')).toBe(true);
  });

  // Java: GermanTaggerTest#testPrefixVerbsFromSpellingTxt()
  it('testPrefixVerbsFromSpellingTxt', () => {
    const result0 = tagger.tag(['herausfallen']);
    expect(result0.length).toEqual(1);
    expect(result0[0].getReadings().length).toEqual(5);
    const res0 = ls(result0);
    expect(res0.includes('herausfallen/VER:1:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res0.includes('herausfallen/VER:1:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res0.includes('herausfallen/VER:3:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res0.includes('herausfallen/VER:3:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res0.includes('herausfallen/VER:INF:NON*')).toBe(true);
    expect(res0.includes('ADJ:')).toBe(false);
    expect(res0.includes('PA1:')).toBe(false);
    expect(res0.includes('PA2:')).toBe(false);

    const result1 = tagger.tag(['herumgeben']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(5);
    const res1 = ls(result1);
    expect(res1.includes('herumgeben/VER:1:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res1.includes('herumgeben/VER:1:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res1.includes('herumgeben/VER:3:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res1.includes('herumgeben/VER:3:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res1.includes('herumgeben/VER:INF:NON*')).toBe(true);
    expect(res1.includes('ADJ:')).toBe(false);
    expect(res1.includes('PA1:')).toBe(false);
    expect(res1.includes('PA2:')).toBe(false);

    const result2 = tagger.tag(['herumgab']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(2);
    const res2 = ls(result2);
    expect(res2.includes('herumgeben/VER:1:SIN:PRT:NON:NEB*')).toBe(true);
    expect(res2.includes('herumgeben/VER:3:SIN:PRT:NON:NEB*')).toBe(true);
    expect(res2.includes('ADJ:')).toBe(false);

    const result3 = tagger.tag(['zurückgeschickt']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(2);
    const res3 = ls(result3);
    expect(res3.includes('zurückschicken/VER:PA2:SFT*')).toBe(true);
    expect(res3.includes('PA2:PRD:GRU:VER*')).toBe(true);
    expect(res3.includes('ADJ:')).toBe(false);

    const result4 = tagger.tag(['abzuschicken']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(1);
    const res4 = ls(result4);
    expect(res4.includes('abschicken/VER:EIZ:SFT')).toBe(true);
    expect(res4.includes('ADJ:')).toBe(false);

    const result4b = tagger.tag(['reinzunehmen']);
    expect(result4b.length).toEqual(1);
    expect(result4b[0].getReadings().length).toEqual(1);
    const res4b = ls(result4b);
    expect(res4b.includes('reinnehmen/VER:EIZ:NON')).toBe(true);
    expect(res4b.includes('ADJ:')).toBe(false);

    const result5 = tagger.tag(['Mitmanagen']);
    expect(result5.length).toEqual(1);
    expect(result5[0].getReadings().length).toEqual(3);
    const res5 = ls(result5);
    expect(res5.includes('Mitmanagen/SUB:NOM:SIN:NEU:INF')).toBe(true);
    expect(res5.includes('Mitmanagen/SUB:AKK:SIN:NEU:INF')).toBe(true);
    expect(res5.includes('Mitmanagen/SUB:DAT:SIN:NEU:INF')).toBe(true);
    expect(res5.includes('ADJ:')).toBe(false);

    const result6 = tagger.tag(['Mitmanagens']);
    expect(result6.length).toEqual(1);
    expect(result6[0].getReadings().length).toEqual(1);
    const res6 = ls(result6);
    expect(res6.includes('Mitmanagen/SUB:GEN:SIN:NEU:INF')).toBe(true);
    expect(res6.includes('ADJ:')).toBe(false);

    const result7 = tagger.tag(['Wegstrecken']);
    expect(result7.length).toEqual(1);
    expect(result7[0].getReadings().length).toEqual(7);
    const res7 = ls(result7);
    expect(res7.includes('Wegstrecken/SUB:GEN:SIN:NEU:INF')).toBe(false);
  });

  // Java: GermanTaggerTest#testPrefixVerbsSeparable()
  it('testPrefixVerbsSeparable', () => {
    const result1 = tagger.tag(['nachguckst']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(1);
    const res1 = ls(result1);
    expect(res1.includes('nachgucken/VER:2:SIN:PRÄ:SFT:NEB')).toBe(true);
    expect(res1.includes('ADJ:')).toBe(false);
    expect(res1.includes('PA1:')).toBe(false);
    expect(res1.includes('PA2:')).toBe(false);

    const result2 = tagger.tag(['nachgucke']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(4);
    const res2 = ls(result2);
    expect(res2.includes('nachgucken/VER:1:SIN:PRÄ:SFT:NEB*')).toBe(true);
    expect(res2.includes('nachgucken/VER:1:SIN:KJ1:SFT:NEB*')).toBe(true);
    expect(res2.includes('nachgucken/VER:3:SIN:KJ1:SFT:NEB*')).toBe(true);
    expect(res2.includes('nachgucken/VER:1:SIN:PRÄ:SFT*')).toBe(false);
    expect(res2.includes('nachgucken/VER:1:SIN:KJ1:SFT*')).toBe(false);
    expect(res2.includes('nachgucken/VER:3:SIN:KJ1:SFT*')).toBe(false);
    expect(res2.includes('nachgucken/VER:IMP:SIN:SFT*')).toBe(false);
    expect(res2.includes('nachgucken/VER:IMP:SIN:SFT:NEB*')).toBe(false);
    expect(res2.includes('ADJ:')).toBe(false);
    expect(res2.includes('PA1:')).toBe(false);
    expect(res2.includes('PA2:')).toBe(false);

    const result3 = tagger.tag(['nachzugucken']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(1);
    const res3 = ls(result3);
    expect(res3.includes('nachgucken/VER:EIZ:SFT*')).toBe(true);
    expect(res3.includes('nachgucken/VER:INF:SFT*')).toBe(false);
    expect(res3.includes('nachgucken/VER:INF:SFT*')).toBe(false);
    expect(res3.includes('nachzugucken/VER:1:PLU:PRÄ:SFT*')).toBe(false);
    expect(res3.includes('nachzugucken/VER:1:PLU:KJ1:SFT*')).toBe(false);
    expect(res3.includes('nachzugucken/VER:3:PLU:PRÄ:SFT*')).toBe(false);
    expect(res3.includes('nachzugucken/VER:3:PLU:KJ1:SFT*')).toBe(false);

    const result4 = tagger.tag(['nachguckend']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(2);
    const res4 = ls(result4);
    expect(res4.includes('nachgucken/VER:PA1:SFT*')).toBe(true);
    expect(res4.includes('nachguckend/PA1:PRD:GRU:VER*')).toBe(true);
    expect(res4.includes('nachgucken/VER:PA1:SFT:NEB*')).toBe(false);

    const result5 = tagger.tag(['nachgeguckt']);
    expect(result5.length).toEqual(1);
    expect(result5[0].getReadings().length).toEqual(2);
    const res5 = ls(result5);
    expect(res5.includes('nachgucken/VER:PA2:SFT*')).toBe(true);
    expect(res5.includes('nachgeguckt/PA2:PRD:GRU:VER*')).toBe(true);
    expect(res5.includes('nachgucken/VER:PA2:SFT:NEB*')).toBe(false);

    const result6 = tagger.tag(['Nachgucken']);
    expect(result6.length).toEqual(1);
    expect(result6[0].getReadings().length).toEqual(3);
    const res6 = ls(result6);
    expect(res6.includes('Nachgucken/SUB:NOM:SIN:NEU:INF*')).toBe(true);
    expect(res6.includes('Nachgucken/SUB:DAT:SIN:NEU:INF*')).toBe(true);
    expect(res6.includes('Nachgucken/SUB:AKK:SIN:NEU:INF*')).toBe(true);

    const result7 = tagger.tag(['Nachguckens']);
    expect(result7.length).toEqual(1);
    expect(result7[0].getReadings().length).toEqual(1);
    const res7 = ls(result7);
    expect(res7.includes('Nachgucken/SUB:GEN:SIN:NEU:INF*')).toBe(true);

    const result8 = tagger.tag(['Nachzudenken']);
    expect(result8.length).toEqual(1);
    expect(result8[0].getReadings().length).toEqual(1);
    const res8 = ls(result8);
    expect(res8.includes('nachdenken/VER:EIZ:NON*')).toBe(true);
    expect(res8.includes('Nachzudenken/SUB:NOM:SIN:NEU:INF*')).toBe(false);
    expect(res8.includes('Nachzudenken/SUB:DAT:SIN:NEU:INF*')).toBe(false);
    expect(res8.includes('Nachzudenken/SUB:AKK:SIN:NEU:INF*')).toBe(false);

    const result9 = tagger.tag(['entlangblicken']);
    expect(result9.length).toEqual(1);
    expect(result9[0].getReadings().length).toEqual(5);
    const res9 = ls(result9);
    expect(res9.includes('entlangblicken/VER:INF:SFT*')).toBe(true);
    expect(res9.includes('NEB*')).toBe(true);

    const result10 = tagger.tag(['wiederaufbauen']);
    expect(result10.length).toEqual(1);
    expect(result10[0].getReadings().length).toEqual(5);
    const res10 = ls(result10);
    expect(res10.includes('NEB')).toBe(true);
    expect(res10.includes('NEB:NEB')).toBe(false);
  });

  // Java: GermanTaggerTest#testPrefixVerbsNotMod()
  it('testPrefixVerbsNotMod', () => {
    const result1 = tagger.tag(['rauslassen']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(5);
    const res1 = ls(result1);
    expect(res1.includes('rauslassen/VER:1:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res1.includes('rauslassen/VER:1:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res1.includes('rauslassen/VER:3:PLU:PRÄ:NON:NEB*')).toBe(true);
    expect(res1.includes('rauslassen/VER:3:PLU:KJ1:NON:NEB*')).toBe(true);
    expect(res1.includes('rauslassen/VER:INF:NON*')).toBe(true);
    expect(res1.includes('rauslassen/VER:1:PLU:PRÄ:NON*')).toBe(false);
    expect(res1.includes('rauslassen/VER:1:PLU:KJ1:NON*')).toBe(false);
    expect(res1.includes('rauslassen/VER:3:PLU:PRÄ:NON*')).toBe(false);
    expect(res1.includes('rauslassen/VER:3:PLU:KJ1:NON*')).toBe(false);
    expect(res1.includes('rauslassen/VER:MOD:1:PLU:PRÄ*')).toBe(false);
    expect(res1.includes('rauslassen/VER:MOD:1:PLU:KJ1*')).toBe(false);
    expect(res1.includes('rauslassen/VER:MOD:3:PLU:PRÄ*')).toBe(false);
    expect(res1.includes('rauslassen/VER:MOD:3:PLU:KJ1*')).toBe(false);
    expect(res1.includes('rauslassen/VER:MOD:INF*')).toBe(false);

    const result2 = tagger.tag(['rauslass']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(2);
    const res2 = ls(result2);
    expect(res2.includes('rauslassen/VER:1:SIN:PRÄ:NON:NEB*')).toBe(true);
    expect(res2.includes('rauslassen/VER:IMP:SIN:NON*')).toBe(false);
    expect(res2.includes('rauslassen/VER:MOD:IMP:SIN')).toBe(false);
    expect(res2.includes('rauslassen/VER:IMP:SIN:NON:NEB*')).toBe(false);

    const result3 = tagger.tag(['rauszulassen']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(1);
    const res3 = ls(result3);
    expect(res3.includes('rauslassen/VER:EIZ:NON*')).toBe(true);

    const result4 = tagger.tag(['rausgelassen']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(2);
    const res4 = ls(result4);
    expect(res4.includes('rauslassen/VER:PA2:NON*')).toBe(true);
    expect(res4.includes('rausgelassen/PA2:PRD:GRU:VER*')).toBe(true);
    expect(res4.includes('rauslassen/VER:MOD:PA2')).toBe(false);
  });

  // Java: GermanTaggerTest#testPrefixVerbsNonSeparable()
  it('testPrefixVerbsNonSeparable', () => {
    const result1 = tagger.tag(['vergären']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(15);
    const res1 = ls(result1);
    expect(res1.includes('vergären/VER:1:PLU:PRÄ:NON*')).toBe(true);
    expect(res1.includes('vergären/VER:1:PLU:KJ1:NON*')).toBe(true);
    expect(res1.includes('vergären/VER:3:PLU:PRÄ:NON*')).toBe(true);
    expect(res1.includes('vergären/VER:3:PLU:KJ1:NON*')).toBe(true);
    expect(res1.includes('vergären/VER:INF:NON*')).toBe(true);
    expect(res1.includes('vergären/VER:1:PLU:PRÄ:SFT*')).toBe(true);
    expect(res1.includes('vergären/VER:1:PLU:KJ1:SFT*')).toBe(true);
    expect(res1.includes('vergären/VER:3:PLU:PRÄ:SFT*')).toBe(true);
    expect(res1.includes('vergären/VER:3:PLU:KJ1:SFT*')).toBe(true);
    expect(res1.includes('vergären/VER:INF:SFT*')).toBe(true);

    const result2 = tagger.tag(['Vergären']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(24);
    const res2 = ls(result2);
    expect(res2.includes('Vergären/SUB:NOM:SIN:NEU:INF')).toBe(true);
    expect(res2.includes('Vergären/SUB:DAT:SIN:NEU:INF')).toBe(true);
    expect(res2.includes('Vergären/SUB:AKK:SIN:NEU:INF')).toBe(true);
    expect(res2.includes('vergären/VER:1:PLU:PRÄ:NON*')).toBe(true);
    expect(res2.includes('vergären/VER:1:PLU:KJ1:NON*')).toBe(true);
    expect(res2.includes('vergären/VER:3:PLU:PRÄ:NON*')).toBe(true);
    expect(res2.includes('vergären/VER:3:PLU:KJ1:NON*')).toBe(true);
    expect(res2.includes('vergären/VER:INF:SFT*')).toBe(true);
    expect(res2.includes('vergären/VER:1:PLU:PRÄ:SFT*')).toBe(true);
    expect(res2.includes('vergären/VER:1:PLU:KJ1:SFT*')).toBe(true);
    expect(res2.includes('vergären/VER:3:PLU:PRÄ:SFT*')).toBe(true);
    expect(res2.includes('vergären/VER:3:PLU:KJ1:SFT*')).toBe(true);
    expect(res2.includes('vergären/VER:INF:SFT*')).toBe(true);

    const result3 = tagger.tag(['unbeglückt']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(2);
    const res3 = ls(result3);
    expect(res3.includes('PA2:PRD:GRU:VER')).toBe(true);
    expect(res3.includes('VER:')).toBe(false);

    const result4 = tagger.tag(['erstritten']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(6);
    const res4 = ls(result4);
    expect(res4.includes('erstreiten/VER:1:PLU:PRT:NON')).toBe(true);
    expect(res4.includes('erstreiten/VER:PA2:NON')).toBe(true);
    expect(res4.includes('erstritten/PA2:PRD:GRU:VER')).toBe(true);

    const result5 = tagger.tag(['bemessen']);
    expect(result5.length).toEqual(1);
    expect(result5[0].getReadings().length).toEqual(7);
    const res5 = ls(result5);
    expect(res5.includes('bemessen/VER:INF:NON')).toBe(true);
    expect(res5.includes('bemessen/VER:PA2:NON')).toBe(true);
    expect(res5.includes('bemessen/PA2:PRD:GRU:VER')).toBe(true);

    const result6 = tagger.tag(['bemisst']);
    expect(result6.length).toEqual(1);
    expect(result6[0].getReadings().length).toEqual(8);
    const res6 = ls(result6);
    expect(res6.includes('bemessen/PA2:PRD:GRU:VER')).toBe(false);

    const result7 = tagger.tag(['hinterlass']);
    expect(result7.length).toEqual(1);
    expect(result7[0].getReadings().length).toEqual(3);
    const res7 = ls(result7);
    expect(res7.includes('hinterlassen/VER:IMP:SIN:NON')).toBe(true);
    expect(res7.includes('hinterlassen/VER:1:SIN:PRÄ:NON')).toBe(true);
    expect(res7.includes('NEB')).toBe(false);
  });

  // Java: GermanTaggerTest#testNoVerb()
  it('testNoVerb', () => {
    const result1 = tagger.tag(['geschichte']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(1);
    const res1 = ls(result1);
    expect(res1.includes('VER')).toBe(false);

    const result2 = tagger.tag(['bereich']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(1);
    const res2 = ls(result2);
    expect(res2.includes('VER')).toBe(false);

    const result3 = tagger.tag(['beispiel']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(1);
    const res3 = ls(result3);
    expect(res3.includes('VER')).toBe(false);

    const result4 = tagger.tag(['keksdose']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(1);
    const res4 = ls(result4);
    expect(res4.includes('VER')).toBe(false);

    const result5 = tagger.tag(['aktienarten']);
    expect(result5.length).toEqual(1);
    expect(result5[0].getReadings().length).toEqual(1);
    const res5 = ls(result5);
    expect(res5.includes('VER')).toBe(false);

    const result6 = tagger.tag(['schwarzgrau']);
    expect(result6.length).toEqual(1);
    expect(result6[0].getReadings().length).toEqual(2);
    const res6 = ls(result6);
    expect(res6.includes('ADJ')).toBe(true);
    expect(res6.includes('VER')).toBe(true);

    const result7 = tagger.tag(['unmenge']);
    expect(result7.length).toEqual(1);
    expect(result7[0].getReadings().length).toEqual(1);
    const res7 = ls(result7);
    expect(res7.includes('VER')).toBe(false);

    const result8 = tagger.tag(['entlang']);
    expect(result8.length).toEqual(1);
    expect(result8[0].getReadings().length).toEqual(4);
    const res8 = ls(result8);
    expect(res8.includes('PRP')).toBe(true);
    expect(res8.includes('ZUS')).toBe(true);
    expect(res8.includes('VER')).toBe(false);
  });

  // Java: GermanTaggerTest#testVerbAndPa2()
  it('testVerbAndPa2', () => {
    const result1 = tagger.tag(['erstickt']);
    expect(result1.length).toEqual(1);
    expect(result1[0].getReadings().length).toEqual(5);
    const res1 = ls(result1);
    expect(res1.includes('ersticken/VER:2:PLU:PRÄ:SFT')).toBe(true);
    expect(res1.includes('ersticken/VER:3:SIN:PRÄ:SFT')).toBe(true);
    expect(res1.includes('ersticken/VER:IMP:PLU:SFT')).toBe(true);
    expect(res1.includes('ersticken/VER:PA2:SFT')).toBe(true);
    expect(res1.includes('erstickt/PA2:PRD:GRU:VER')).toBe(true);

    const result2 = tagger.tag(['erstickte']);
    expect(result2.length).toEqual(1);
    expect(result2[0].getReadings().length).toEqual(19);
    const res2 = ls(result2);
    expect(res2.includes('erstickt/PA2')).toBe(true);
    expect(res2.includes('ersticken/VER:1:SIN:KJ2:SFT')).toBe(true);
    expect(res2.includes('ersticken/VER:1:SIN:PRT:SFT')).toBe(true);
    expect(res2.includes('ersticken/VER:3:SIN:KJ2:SFT')).toBe(true);
    expect(res2.includes('ersticken/VER:3:SIN:PRT:SFT')).toBe(true);
    expect(res2.includes('NEB')).toBe(false);

    const result3 = tagger.tag(['erstickend']);
    expect(result3.length).toEqual(1);
    expect(result3[0].getReadings().length).toEqual(2);
    const res3 = ls(result3);
    expect(res3.includes('ersticken/VER:PA1:SFT')).toBe(true);
    expect(res3.includes('erstickend/PA1:PRD:GRU:VER')).toBe(true);

    const result4 = tagger.tag(['erstickender']);
    expect(result4.length).toEqual(1);
    expect(result4[0].getReadings().length).toEqual(7);
    const res4 = ls(result4);
    expect(res4.includes('erstickend/PA1:DAT:SIN:FEM:GRU:SOL:VER')).toBe(true);
  });

});
