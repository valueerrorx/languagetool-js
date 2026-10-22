// Ported from JLanguageToolTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule();

const LONG = 3600000;
const ANNOTATIONS = "Disambiguator log: \n\nprep_verb[2]: Z[z/prep:acc:nwok*,z/prep:gen:nwok*,z/prep:inst:nwok*] -> Z[z/prep:gen:nwok*]\nPREP_SUBST[1]: Z[z/prep:gen:nwok*] -> Z[z/prep:gen:nwok*]\nPREP_SUBST_2[1]: Z[z/prep:gen:nwok*] -> Z[z/prep:gen:nwok*]\nMULTIWORD_CHUNKER: Z[z/prep:gen:nwok*] -> Z[z/prep:gen:nwok*,Z powodu/<PREP:GEN>*]\n\nprep_verb[2]: powodu[powód/subst:sg:gen:m3] -> powodu[powód/subst:sg:gen:m3]\nPREP_SUBST[1]: powodu[powód/subst:sg:gen:m3] -> powodu[powód/subst:sg:gen:m3]\nPREP_SUBST_2[1]: powodu[powód/subst:sg:gen:m3] -> powodu[powód/subst:sg:gen:m3]\nMULTIWORD_CHUNKER: powodu[powód/subst:sg:gen:m3] -> powodu[powód/subst:sg:gen:m3,Z powodu/</PREP:GEN>]\n\nPREP_SUBST[17]: pogody[pogoda/subst:pl:acc:f,pogoda/subst:pl:nom:f,pogoda/subst:pl:voc:f,pogoda/subst:sg:gen:f] -> pogody[pogoda/subst:sg:gen:f]\n\ndobry_adj[1]: dobre[dobre/subst:pl:acc:n2,dobre/subst:pl:nom:n2,dobre/subst:pl:voc:n2,dobre/subst:sg:acc:n2,dobre/subst:sg:nom:n2,dobre/subst:sg:voc:n2,dobry/adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos,dobry/adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos,dobry/adj:sg:acc:n1.n2:pos,dobry/adj:sg:nom.voc:n1.n2:pos,dobry/depr:pl:nom:m2,dobry/depr:pl:voc:m2,dobry/subst:pl:acc:m3,dobry/subst:pl:nom:m3,dobry/subst:pl:voc:m3] -> dobre[dobry/adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos,dobry/adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos]\nunify_adj_subst[2]: dobre[dobry/adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos,dobry/adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos] -> dobre[dobry/adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos]\n\ndobry_adj[1]: buty[but/subst:pl:acc:m2,but/subst:pl:acc:m3,but/subst:pl:nom:m2,but/subst:pl:nom:m3,but/subst:pl:voc:m2,but/subst:pl:voc:m3,buta/subst:pl:acc:f,buta/subst:pl:nom:f,buta/subst:pl:voc:f,buta/subst:sg:gen:f] -> buty[but/subst:pl:acc:m2,but/subst:pl:acc:m3,but/subst:pl:nom:m2,but/subst:pl:nom:m3,but/subst:pl:voc:m2,but/subst:pl:voc:m3,buta/subst:pl:acc:f,buta/subst:pl:nom:f,buta/subst:pl:voc:f]\nbuty[1]: buty[but/subst:pl:acc:m2,but/subst:pl:acc:m3,but/subst:pl:nom:m2,but/subst:pl:nom:m3,but/subst:pl:voc:m2,but/subst:pl:voc:m3,buta/subst:pl:acc:f,buta/subst:pl:nom:f,buta/subst:pl:voc:f] -> buty[but/subst:pl:acc:m2,but/subst:pl:acc:m3,but/subst:pl:nom:m2,but/subst:pl:nom:m3,but/subst:pl:voc:m2,but/subst:pl:voc:m3]\nnom_sa_nom[1]: buty[but/subst:pl:acc:m2,but/subst:pl:acc:m3,but/subst:pl:nom:m2,but/subst:pl:nom:m3,but/subst:pl:voc:m2,but/subst:pl:voc:m3] -> buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3]\nunify_adj_subst[2]: buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3] -> buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3]\nPPRON3_NOM_VERB_ADJ[1]: buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3] -> buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3]\nSUBST_NOM_VOC_VERB[6]: buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3] -> buty[but/subst:pl:nom:m2,but/subst:pl:nom:m3]\n\nppas_jest[1]: są[być/verb:fin:pl:ter:imperf:nonrefl] -> są[być/verb:fin:pl:ter:imperf:nonrefl]\nnom_sa_nom[1]: są[być/verb:fin:pl:ter:imperf:nonrefl] -> są[być/verb:fin:pl:ter:imperf:nonrefl]\nPPRON3_NOM_VERB_ADJ[1]: są[być/verb:fin:pl:ter:imperf:nonrefl] -> są[być/verb:fin:pl:ter:imperf:nonrefl]\nSUBST_NOM_VOC_VERB[6]: są[być/verb:fin:pl:ter:imperf:nonrefl] -> są[być/verb:fin:pl:ter:imperf:nonrefl]\nBYC_ADJ_ACC_NOM[1]: są[być/verb:fin:pl:ter:imperf:nonrefl] -> są[być/verb:fin:pl:ter:imperf:nonrefl]\n\nppas_jest[1]: wskazane[wskazany/adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos,wskazany/adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos,wskazany/adj:sg:acc:n1.n2:pos,wskazany/adj:sg:nom.voc:n1.n2:pos,wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff,wskazać/ppas:sg:nom.acc.voc:n1.n2:perf:aff] -> wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff]\nnom_sa_nom[1]: wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff] -> wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff]\nPPRON3_NOM_VERB_ADJ[1]: wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff] -> wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff]\nBYC_ADJ_ACC_NOM[1]: wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff] -> wskazane[wskazać/ppas:pl:nom.acc.voc:m2.m3.f.n1.n2.p2.p3:perf:aff]\n";

describe('JLanguageToolTest (pl)', () => {
  // Java: JLanguageToolTest#testPolish
  it('testPolish', () => {
    class NoXmlRulesPolish extends Polish {
      getPatternRules() {
        return [];
      }
    }
    const noXmlRulesPolish = new NoXmlRulesPolish();
    const polish = new Polish();
    let tool = new JLanguageTool(new Polish());
    tool.setOutput({ println() {} }); // Java: System.out (sets the global verbose flag that enables the disambiguator log)
    const noRulesTool = new JLanguageTool(noXmlRulesPolish);
    expect(polish.getCountries()).toEqual(['PL']);
    let matches = noRulesTool.check('To jest całkowicie prawidłowe zdanie.');
    expect(matches.length).toBe(0);
    matches = noRulesTool.check('To jest jest problem.');
    expect(matches.length).toBe(1);
    // no error thanks to disambiguation
    expect(noRulesTool.check('Mają one niemałe znaczenie.').length).toBe(0);
    expect(noRulesTool.check('Często wystarczy obrócić na wspak wyroki świata, aby trafnie osądzić jakąś osobę.').length).toBe(0);
    // with immunization
    expect(noRulesTool.check('A teraz każcie mi dać jaki bądź posiłek.').length).toBe(0);
    expect(noRulesTool.check('Kiedym wóz zobaczył, byłbym przysiągł, że wielka przygoda mnie czeka.').length).toBe(0);
    // with antipatterns
    expect(noRulesTool.check('Jurek wygląda wypisz wymaluj babcia.').length).toBe(0);
    expect(noRulesTool.check('Jurek wygląda wypisz wypisz wymaluj babcia.').length).toBe(1);
    expect(noRulesTool.check('Jurek wygląda wypisz wymaluj wymaluj babcia.').length).toBe(1);
    // check for a weird unification bug:
    expect(noRulesTool.check('Zawarł w niej, oprócz swojej twórczości, wybrane epigramaty czterdziestu ośmiu innych greckich poetów i poetek.').length).toBe(0);
    // checking on pattern rules now...
    expect(tool.check('Nudne brednie tak zamąciły głowę chłopu, że klął na czym ziemia stoi, zmuszonym będąc słuchać tego wszystkiego.').length).toBe(0);
    expect(tool.check('Chcąc, nie chcąc zjadłem pstrąga.').length).toBe(1);
    // this rule is by default off
    matches = tool.check('Był on bowiem pięknym strzelcem bowiem.');
    expect(matches.length).toBe(0);
    tool.enableRule('PL_WORD_REPEAT');
    matches = tool.check('Był on bowiem pięknym strzelcem bowiem.');
    expect(matches.length).toBe(1);
    matches = tool.check('Premier drapie się w ucho co i rusz.');
    expect(matches.length).toBe(1);
    // Polish rule has no effect with English error but will get spelling activated:
    matches = tool.check('I can give you more a detailed description');
    expect(matches.length).toBe(6);
    tool.setListUnknownWords(true);
    matches = tool.check('This is not a Polish text.');
    expect(matches.length).toBe(3);
    expect(`[${tool.getUnknownWords().join(', ')}]`).toBe('[., Polish, This, is, text]');
    // check positions relative to sentence ends
    matches = tool.check('To jest tekst.\nTest 1. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(17);
    matches = tool.check('To jest tekst. \nTest 1. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(16);
    matches = tool.check('To jest tekst. Test 1. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(32);
    // recheck with the -b mode...
    polish.getSentenceTokenizer().setSingleLineBreaksMarksParagraph(true);
    tool = new JLanguageTool(polish);
    matches = tool.check('To jest tekst.\nTest 1. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(17);
    matches = tool.check('To jest tekst. \nTest 1. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(17);
    matches = tool.check('To jest tekst. To jest linia w której nie ma przecinka.');
    expect(matches[0].getColumn()).toBe(24);
    // and let's test other feats
    const sent = tool.getAnalyzedSentence('Z powodu pogody dobre buty są wskazane.');
    expect(sent.getAnnotations()).toBe(ANNOTATIONS);
  }, LONG);
});
