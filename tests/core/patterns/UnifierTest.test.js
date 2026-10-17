// Ported from UnifierTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { UnifierConfiguration } from '../../../src/core/patterns/UnifierConfiguration.js';

const PosToken = PatternToken.PosToken;

// Java: Arrays.toString(Object[])
const arrToString = (a) => (a === null ? 'null' : `[${a.map((x) => x.toString()).join(', ')}]`);

describe('UnifierTest', () => {
  // Java: UnifierTest#preparePOSElement(String)
  const preparePOSElement = (posString) => {
    const pToken = new PatternToken('', false, false, false);
    pToken.setPosToken(new PosToken(posString, true, false));
    return pToken;
  };


  // trivial unification = test if the character case is the same
    it('testUnificationCase', () => {
    const unifierConfig = new UnifierConfiguration();
    const elLower = new PatternToken("\\p{Ll}+", true, true, false);
    const elUpper = new PatternToken("\\p{Lu}\\p{Ll}+", true, true, false);
    const elAllUpper = new PatternToken("\\p{Lu}+$", true, true, false);
    unifierConfig.setEquivalence("case-sensitivity", "lowercase", elLower);
    unifierConfig.setEquivalence("case-sensitivity", "uppercase", elUpper);
    unifierConfig.setEquivalence("case-sensitivity", "alluppercase", elAllUpper);
    const lower1 = new AnalyzedToken("lower", "JJR", "lower");
    const lower2 = new AnalyzedToken("lowercase", "JJ", "lowercase");
    const upper1 = new AnalyzedToken("Uppercase", "JJ", "Uppercase");
    const upper2 = new AnalyzedToken("John", "NNP", "John");
    const upperAll1 = new AnalyzedToken("JOHN", "NNP", "John");
    const upperAll2 = new AnalyzedToken("JAMES", "NNP", "James");

    const uni = unifierConfig.createUnifier();

    const equiv = new JavaHashMap();
    const list1 = [];
    list1.push("lowercase");
    equiv.put("case-sensitivity", list1);
    let satisfied = uni.isSatisfied(lower1, equiv);
    satisfied = uni.isSatisfied(lower2, equiv) && satisfied;
    uni.startUnify();
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    satisfied = uni.isSatisfied(upper2, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(lower2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();

    satisfied = uni.isSatisfied(upper1, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(lower1, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();

    satisfied = uni.isSatisfied(upper2, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(upper1, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();
    equiv.clear();
    list1.length = 0;

    list1.push("uppercase");
    equiv.put("case-sensitivity", list1);
    satisfied = uni.isSatisfied(upper2, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(upper1, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();
    equiv.clear();
    list1.length = 0;

    list1.push("alluppercase");
    equiv.put("case-sensitivity", list1);
    satisfied = uni.isSatisfied(upper2, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(upper1, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();

    satisfied = uni.isSatisfied(upperAll2, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(upperAll1, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
  });

  // slightly non-trivial unification = test if the grammatical number is the same
    it('testUnificationNumber', () => {
    const unifierConfig = new UnifierConfiguration();
    unifierConfig.setEquivalence("number", "singular",
        preparePOSElement(".*[\\.:]sg:.*"));
    unifierConfig.setEquivalence("number", "plural",
        preparePOSElement(".*[\\.:]pl:.*"));

    const uni = unifierConfig.createUnifier();

    const sing1 = new AnalyzedToken("mały", "adj:sg:blahblah", "mały");
    const sing2 = new AnalyzedToken("człowiek", "subst:sg:blahblah", "człowiek");

    const equiv = new JavaHashMap();
    const list1 = [];
    list1.push("singular");
    equiv.put("number", list1);

    let satisfied = uni.isSatisfied(sing1, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    //for multiple readings - OR for interpretations, AND for tokens
    let sing1a = new AnalyzedToken("mały", "adj:pl:blahblah", "mały");
    satisfied = uni.isSatisfied(sing1, equiv);
    satisfied = uni.isSatisfied(sing1a, equiv) || satisfied;
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    //check if any of the equivalences is there
    list1.push("plural");
    equiv.clear();
    equiv.put("number", list1);
    sing1a = new AnalyzedToken("mały", "adj:pl:blahblah", "mały");
    satisfied = uni.isSatisfied(sing1, equiv);
    satisfied = uni.isSatisfied(sing1a, equiv) || satisfied;
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    //now test all possible feature equivalences by leaving type blank
    sing1a = new AnalyzedToken("mały", "adj:pl:blahblah", "mały");
    equiv.clear();
    equiv.put("number", null);
    satisfied = uni.isSatisfied(sing1, equiv);
    satisfied = uni.isSatisfied(sing1a, equiv) || satisfied;
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    //test non-agreeing tokens with blank types
    satisfied = uni.isSatisfied(sing1a, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();
  });

  //slightly non-trivial unification = test if the grammatical number & gender is the same
    it('testUnificationNumberGender', () => {
    const unifierConfig = new UnifierConfiguration();

    const sgPatternToken = new PatternToken("", false, false, false);
    sgPatternToken.setPosToken(new PosToken(".*[\\.:]sg:.*", true, false));
    unifierConfig.setEquivalence("number", "singular", sgPatternToken);
    const plPatternToken = new PatternToken("", false, false, false);
    plPatternToken.setPosToken(new PosToken(".*[\\.:]pl:.*", true, false));
    unifierConfig.setEquivalence("number", "plural", plPatternToken);

    const femPatternToken = new PatternToken("", false, false, false);
    femPatternToken.setPosToken(new PosToken(".*[\\.:]f", true, false));
    unifierConfig.setEquivalence("gender", "feminine", femPatternToken);

    const mascPatternToken = new PatternToken("", false, false, false);
    mascPatternToken.setPosToken(new PosToken(".*[\\.:]m", true, false));
    unifierConfig.setEquivalence("gender", "masculine", mascPatternToken);

    const uni = unifierConfig.createUnifier();

    const sing1 = new AnalyzedToken("mały", "adj:sg:blahblah:m", "mały");
    const sing1a = new AnalyzedToken("mała", "adj:sg:blahblah:f", "mały");
    const sing1b = new AnalyzedToken("małe", "adj:pl:blahblah:m", "mały");
    const sing2 = new AnalyzedToken("człowiek", "subst:sg:blahblah:m", "człowiek");

    const equiv = new JavaHashMap();
    equiv.put("number", null);
    equiv.put("gender", null);

    let satisfied = uni.isSatisfied(sing1, equiv);
    satisfied = uni.isSatisfied(sing1a, equiv) || satisfied;
    satisfied = uni.isSatisfied(sing1b, equiv) || satisfied;
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    expect(arrToString(uni.getUnifiedTokens())).toBe("[mały[mały/adj:sg:blahblah:m*], człowiek[człowiek/subst:sg:blahblah:m*]]");
    uni.reset();
  });

  // checks if all tokens share the same set of features to be unified
    it('testMultipleFeats', () => {
    const unifierConfig = new UnifierConfiguration();
    unifierConfig.setEquivalence("number", "singular",
        preparePOSElement(".*[\\.:]sg:.*"));
    unifierConfig.setEquivalence("number", "plural",
        preparePOSElement(".*[\\.:]pl:.*"));
    unifierConfig.setEquivalence("gender", "feminine",
        preparePOSElement(".*[\\.:]f([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*[\\.:]m([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "neutral",
        preparePOSElement(".*[\\.:]n([\\.:].*)?"));

    const uni = unifierConfig.createUnifier();

    const sing1 = new AnalyzedToken("mały", "adj:sg:blahblah:m", "mały");
    let sing1a = new AnalyzedToken("mały", "adj:pl:blahblah:f", "mały");
    let sing1b = new AnalyzedToken("mały", "adj:pl:blahblah:f", "mały");
    let sing2 = new AnalyzedToken("zgarbiony", "adj:pl:blahblah:f", "zgarbiony");
    const sing3 = new AnalyzedToken("człowiek", "subst:sg:blahblah:m", "człowiek");

    const equiv = new JavaHashMap();
    equiv.put("number", null);
    equiv.put("gender", null);

    let satisfied = uni.isSatisfied(sing1, equiv);
    satisfied = uni.isSatisfied(sing1a, equiv) || satisfied;
    satisfied = uni.isSatisfied(sing1b, equiv) || satisfied;
    uni.startUnify();
    satisfied = uni.isSatisfied(sing2, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.isSatisfied(sing3, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(false);
    uni.reset();

    //now test the simplified interface
    uni.isUnified(sing1, equiv, false);
    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1b, equiv, true);
    uni.isUnified(sing2, equiv, true);
    expect(uni.isUnified(sing3, equiv, true)).toBe(false);
    uni.reset();

    sing1a = new AnalyzedToken("osobiste", "adj:pl:nom.acc.voc:f.n.m2.m3:pos:aff", "osobisty");
    sing1b = new AnalyzedToken("osobiste", "adj:sg:nom.acc.voc:n:pos:aff", "osobisty");
    sing2 = new AnalyzedToken("godło", "subst:sg:nom.acc.voc:n", "godło");

    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1b, equiv, true);
    expect(uni.isUnified(sing2, equiv, true)).toBe(true);
    expect(arrToString(uni.getFinalUnified())).toBe("[osobiste[osobisty/adj:sg:nom.acc.voc:n:pos:aff*], godło[godło/subst:sg:nom.acc.voc:n*]]");
    uni.reset();

    //now test a case when the last reading doesn't match at all

    sing1a = new AnalyzedToken("osobiste", "adj:pl:nom.acc.voc:f.n.m2.m3:pos:aff", "osobisty");
    sing1b = new AnalyzedToken("osobiste", "adj:sg:nom.acc.voc:n:pos:aff", "osobisty");
    const sing2a = new AnalyzedToken("godło", "subst:sg:nom.acc.voc:n", "godło");
    const sing2b = new AnalyzedToken("godło", "indecl", "godło");

    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1b, equiv, true);
    uni.isUnified(sing2a, equiv, false);
    expect(uni.isUnified(sing2b, equiv, true)).toBe(true);
    expect(arrToString(uni.getFinalUnified())).toBe("[osobiste[osobisty/adj:sg:nom.acc.voc:n:pos:aff*], godło[godło/subst:sg:nom.acc.voc:n*]]");
    uni.reset();

    //check if two features are left out correctly (both match)
    const plur1 = new AnalyzedToken("zgarbieni", "adj:pl:foobar:m", "zgarbiony");
    const plur2 = new AnalyzedToken("zgarbieni", "adj:pl:blabla:m", "zgarbiony");

    const plur3 = new AnalyzedToken("ludzie", "subst:pl:blabla:m", "człowiek");
    const plur4 = new AnalyzedToken("ludzie", "subst:pl:pampam:m", "człowiek");

    uni.isUnified(plur1, equiv, false);
    uni.isUnified(plur2, equiv, true);
    uni.isUnified(plur3, equiv, false);
    expect(uni.isUnified(plur4, equiv, true)).toBe(true);
    expect(arrToString(uni.getFinalUnified())).toBe("[zgarbieni[zgarbiony/adj:pl:foobar:m*,zgarbiony/adj:pl:blabla:m*], " +
        "ludzie[człowiek/subst:pl:blabla:m*,człowiek/subst:pl:pampam:m*]]");

    //check with a sequence of many tokens

    uni.reset();

    const case1a = new AnalyzedToken("xx", "abc:sg:f", "xx");
    const case1b = new AnalyzedToken("xx", "cde:pl:f", "xx");

    const case2a = new AnalyzedToken("yy", "abc:pl:f", "yy");
    const case2b = new AnalyzedToken("yy", "cde:as:f", "yy");
    const case2c = new AnalyzedToken("yy", "cde:pl:c", "yy");
    const case2d = new AnalyzedToken("yy", "abc:sg:f", "yy");
    const case2e = new AnalyzedToken("yy", "efg:aa:e", "yy");

    uni.isUnified(case1a, equiv, false);
    uni.isUnified(case1b, equiv, true);

    uni.isUnified(case2a, equiv, false);
    uni.isUnified(case2b, equiv, false);
    uni.isUnified(case2c, equiv, false);
    uni.isUnified(case2d, equiv, false);
    expect(uni.isUnified(case2e, equiv, true)).toBe(true);
    expect(arrToString(uni.getFinalUnified())).toBe("[xx[xx/abc:sg:f*,xx/cde:pl:f*], yy[yy/abc:pl:f*,yy/abc:sg:f*]]");

    uni.reset();

    const tokenComplex1_1 = new AnalyzedToken("xx", "abc:sg:f", "xx1");
    const tokenComplex1_2 = new AnalyzedToken("xx", "cde:pl:f", "xx2");

    const tokenComplex2_1 = new AnalyzedToken("yy", "abc:sg:f", "yy1");
    const tokenComplex2_2 = new AnalyzedToken("yy", "cde:pl:f", "yy2");

    const tokenComplex3 = new AnalyzedToken("zz", "cde:sg:f", "zz");

    uni.isUnified(tokenComplex1_1, equiv, false);
    uni.isUnified(tokenComplex1_2, equiv, true);

    uni.isUnified(tokenComplex2_1, equiv, false);
    uni.isUnified(tokenComplex2_2, equiv, true);

    //both readings of tokenComplex1 and tokenComplex2 should be here:
    expect(arrToString(uni.getFinalUnified())).toBe("[xx[xx1/abc:sg:f*,xx2/cde:pl:f*], yy[yy1/abc:sg:f*,yy2/cde:pl:f*]]");

    expect(uni.isUnified(tokenComplex3, equiv, true)).toBe(true);

    //only one reading of tokenComplex1 and tokenComplex2 - as only one agrees with tokenComplex3
    expect(arrToString(uni.getFinalUnified())).toBe("[xx[xx1/abc:sg:f*], yy[yy1/abc:sg:f*], zz[zz/cde:sg:f*]]");

  });

    it('testMultipleFeatsWithMultipleTypes', () => {
    const unifierConfig = new UnifierConfiguration();
    unifierConfig.setEquivalence("number", "singular",
        preparePOSElement(".*[\\.:]sg:.*"));
    unifierConfig.setEquivalence("number", "plural",
        preparePOSElement(".*[\\.:]pl:.*"));

    unifierConfig.setEquivalence("gender", "feminine",
        preparePOSElement(".*[\\.:]f([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*[\\.:]m1([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*[\\.:]m2([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*[\\.:]m3([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "neutral1",
        preparePOSElement(".*[\\.:]n1(?:[\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "neutral2",
        preparePOSElement(".*[\\.:]n2(?:[\\.:].*)?"));

    unifierConfig.setEquivalence("case", "nominativus",
        preparePOSElement(".*[\\.:]nom[\\.:]?.*"));
    unifierConfig.setEquivalence("case", "accusativus",
        preparePOSElement(".*[\\.:]acc[\\.:]?.*"));
    unifierConfig.setEquivalence("case", "dativus",
        preparePOSElement(".*[\\.:]dat[\\.:]?.*"));
    unifierConfig.setEquivalence("case", "vocativus",
        preparePOSElement(".*[\\.:]voc[\\.:]?.*"));

    const uni = unifierConfig.createUnifier();

    const sing1 = new AnalyzedToken("niezgorsze", "adj:sg:acc:n1.n2:pos", "niezgorszy");
    const sing1a = new AnalyzedToken("niezgorsze", "adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos", "niezgorszy");
    const sing1b = new AnalyzedToken("niezgorsze", "adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos", "niezgorszy");
    const sing1c = new AnalyzedToken("niezgorsze", "adj:sg:nom.voc:n1.n2:pos", "niezgorszy");
    const sing2 = new AnalyzedToken("lekarstwo", "subst:sg:acc:n2", "lekarstwo");
    const sing2b = new AnalyzedToken("lekarstwo", "subst:sg:nom:n2", "lekarstwo");
    const sing2c = new AnalyzedToken("lekarstwo", "subst:sg:voc:n2", "lekarstwo");

    const equiv = new JavaHashMap();
    equiv.put("number", null);
    equiv.put("gender", null);
    equiv.put("case", null);

    //now test the simplified interface
    uni.isUnified(sing1, equiv, false);
    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1b, equiv, false);
    uni.isUnified(sing1c, equiv, true);
    uni.isUnified(sing2, equiv, false);
    uni.isUnified(sing2b, equiv, false);
    expect(uni.isUnified(sing2c, equiv, true)).toBe(true);
    expect(arrToString(uni.getUnifiedTokens())).toBe("[niezgorsze[niezgorszy/adj:sg:acc:n1.n2:pos*,niezgorszy/adj:sg:nom.voc:n1.n2:pos*], " +
        "lekarstwo[lekarstwo/subst:sg:acc:n2*,lekarstwo/subst:sg:nom:n2*,lekarstwo/subst:sg:voc:n2*]]");
    uni.reset();

    //test in a different order
    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1, equiv, false);
    uni.isUnified(sing1c, equiv, false);
    uni.isUnified(sing1b, equiv, true);
    uni.isUnified(sing2b, equiv, false);
    uni.isUnified(sing2c, equiv, false);
    expect(uni.isUnified(sing2, equiv, true)).toBe(true);
    expect(arrToString(uni.getUnifiedTokens())).toBe("[niezgorsze[niezgorszy/adj:sg:acc:n1.n2:pos*,niezgorszy/adj:sg:nom.voc:n1.n2:pos*], " +
        "lekarstwo[lekarstwo/subst:sg:nom:n2*,lekarstwo/subst:sg:voc:n2*,lekarstwo/subst:sg:acc:n2*]]");
    uni.reset();
  });



    it('testNegation', () => {
    const unifierConfig = new UnifierConfiguration();
    unifierConfig.setEquivalence("number", "singular",
        preparePOSElement(".*[\\.:]sg:.*"));
    unifierConfig.setEquivalence("number", "plural",
        preparePOSElement(".*[\\.:]pl:.*"));
    unifierConfig.setEquivalence("gender", "feminine",
        preparePOSElement(".*:f"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*:m"));

    const uni = unifierConfig.createUnifier();

    //Latin adjectives
    const sing_masc = new AnalyzedToken("parvus", "adj:sg:blahblah:m", "parvus");
    const plur_masc = new AnalyzedToken("parvi", "adj:sg:blahblah:m", "parvus");
    const plur_fem = new AnalyzedToken("parvae", "adj:pl:blahblah:f", "parvus");
    const sing_fem = new AnalyzedToken("parva", "adj:sg:blahblah:f", "parvus");

    //Let's pretend Latin has determiners
    const det_sing_fem = new AnalyzedToken("una", "det:sg:blahblah:f", "unus");
    const det_plur_fem = new AnalyzedToken("unae", "det:pl:blahblah:f", "unus");
    const det_sing_masc = new AnalyzedToken("unus", "det:sg:blahblah:m", "unus");
    const det_plur_masc = new AnalyzedToken("uni", "det:sg:blahblah:m", "unus");

    //and nouns
    const subst_sing_fem = new AnalyzedToken("discrepatio", "subst:sg:blahblah:f", "discrepatio");
    const subst_plur_fem = new AnalyzedToken("discrepationes", "subst:sg:blahblah:f", "discrepatio");
    const subst_sing_masc = new AnalyzedToken("homo", "sg:sg:blahblah:m", "homo");
    const subst_plur_masc = new AnalyzedToken("homines", "sg:sg:blahblah:m", "homo");

    //now we should have 4x4x4 combinations...

    const equiv = new JavaHashMap();
    equiv.put("number", null);
    equiv.put("gender", null);

    let satisfied = uni.isSatisfied(det_sing_masc, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(sing_masc, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.isSatisfied(subst_sing_masc, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(satisfied).toBe(true);
    uni.reset();

    //now test the simplified interface
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(sing_masc, equiv, true);
    expect(uni.isUnified(subst_sing_masc, equiv, true)).toBe(true);
    uni.reset();

    //now let's negate this

    //traditional way
    satisfied = uni.isSatisfied(det_sing_masc, equiv);
    uni.startUnify();
    satisfied = uni.isSatisfied(sing_masc, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.isSatisfied(subst_sing_masc, equiv) && satisfied;
    uni.startNextToken();
    satisfied = uni.getFinalUnificationValue(equiv) && satisfied;
    expect(!satisfied).toBe(false);
    uni.reset();

    //now test the simplified interface
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(sing_masc, equiv, true);
    expect(!uni.isUnified(subst_sing_masc, equiv, true)).toBe(false);
    uni.reset();

    //OK, so let's test it with something that is not correct
    uni.isUnified(det_sing_fem, equiv, true);
    uni.isUnified(sing_masc, equiv, true);
    expect(!uni.isUnified(subst_sing_masc, equiv, true)).toBe(true);
    uni.reset();

    //OK, so let's test it with something that is not correct
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(sing_fem, equiv, true);
    expect(!uni.isUnified(subst_sing_masc, equiv, true)).toBe(true);
    uni.reset();

    //OK, second token does not match
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(sing_masc, equiv, true);
    expect(!uni.isUnified(subst_sing_fem, equiv, true)).toBe(true);
    uni.reset();

    //OK, second token does not match
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(plur_masc, equiv, true);
    expect(!uni.isUnified(subst_sing_fem, equiv, true)).toBe(true);
    uni.reset();

    //OK, second token does not match
    uni.isUnified(det_sing_masc, equiv, true);
    uni.isUnified(plur_fem, equiv, true);
    expect(!uni.isUnified(subst_sing_fem, equiv, true)).toBe(true);
    uni.reset();

    //and another one
    uni.isUnified(det_plur_fem, equiv, true);
    uni.isUnified(plur_fem, equiv, true);
    expect(!uni.isUnified(subst_sing_fem, equiv, true)).toBe(true);
    uni.reset();

    //and another one
    uni.isUnified(det_sing_fem, equiv, true);
    uni.isUnified(plur_fem, equiv, true);
    expect(!uni.isUnified(subst_plur_fem, equiv, true)).toBe(true);
    uni.reset();

    //and another one
    uni.isUnified(det_sing_fem, equiv, true);
    uni.isUnified(plur_fem, equiv, true);
    expect(!uni.isUnified(subst_plur_masc, equiv, true)).toBe(true);
    uni.reset();

    //and another one
    uni.isUnified(det_plur_masc, equiv, true);
    uni.isUnified(plur_fem, equiv, true);
    expect(!uni.isUnified(subst_plur_masc, equiv, true)).toBe(true);
    uni.reset();
  });

    it('testAddNeutralElement', () => {
    const unifierConfig = new UnifierConfiguration();
    unifierConfig.setEquivalence("number", "singular",
        preparePOSElement(".*[\\.:]sg:.*"));
    unifierConfig.setEquivalence("number", "plural",
        preparePOSElement(".*[\\.:]pl:.*"));
    unifierConfig.setEquivalence("gender", "feminine",
        preparePOSElement(".*[\\.:]f([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "masculine",
        preparePOSElement(".*[\\.:]m([\\.:].*)?"));
    unifierConfig.setEquivalence("gender", "neutral",
        preparePOSElement(".*[\\.:]n([\\.:].*)?"));

    const uni = unifierConfig.createUnifier();

    const equiv = new JavaHashMap();
    equiv.put("number", null);
    equiv.put("gender", null);

    const sing1a = new AnalyzedToken("osobiste", "adj:pl:nom.acc.voc:f.n.m2.m3:pos:aff", "osobisty");
    const sing1b = new AnalyzedToken("osobiste", "adj:sg:nom.acc.voc:n:pos:aff", "osobisty");
    const sing2 = new AnalyzedToken("godło", "subst:sg:nom.acc.voc:n", "godło");

    const comma = new AnalyzedToken(",", "comma", ",");

    uni.isUnified(sing1a, equiv, false);
    uni.isUnified(sing1b, equiv, true);
    uni.addNeutralElement(new AnalyzedTokenReadings(comma, 0));
    expect(uni.isUnified(sing2, equiv, true)).toBe(true);
    expect(arrToString(uni.getFinalUnified())).toBe("[osobiste[osobisty/adj:sg:nom.acc.voc:n:pos:aff*], ,[,/comma*], godło[godło/subst:sg:nom.acc.voc:n*]]");
    uni.reset();
  });
});
