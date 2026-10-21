// Ported from FrenchTest (rules.fr package, fr module); the DisambiguationRuleTest part of runTests is the X-DISAMB ex-fr replay
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { French } from '../../../../src/lang/fr/language/French.js';
import { LanguageSpecificTest } from '../../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java fr module tests run without the en module on the classpath

const LONG = 3600000;

describe('FrenchTest (rules)', () => {
  const base = new LanguageSpecificTest('fr');

  // Java: FrenchTest#testLanguage
  it('testLanguage', async () => {
    // NOTE: this text needs to be kept in sync with config.ts -> DEMO_TEXTS:
    const s = "Écrivez ou collez votre texte ici pour le faire vérifier en continue. Les erreurs seront soulignés de différentes couleurs : les erreurs d'orthografe en rouge et les erreurs grammaticaux en jaune. Les problèmes de style, comme par exemple ceci, seront marqués en bleu dans vos textes. Le saviez vous ? LanguageTool vous propose des synonymes lorsque vous double-cliquez sur un mot .  Découvrez la multitude de ses fonctions, parfoi inattendues, tel que ça vérification des date. Par exemple, le mercredi 28 août 2020 était en fait un vendredi !";
    const lang = French.getInstance();
    base.testDemoText(lang, s,
      ['EN_GENERALE', 'ETRE_VPPA_OU_ADJ', 'FR_SPELLING_RULE', 'AGREEMENT_POSTPONED_ADJ', 'COMME_PAR_EXEMPLE', 'TRAIT_UNION_INVERSION', 'COMMA_PARENTHESIS_WHITESPACE', 'WHITESPACE_RULE', 'FR_SPELLING_RULE', 'CA_SA', 'D_N', 'FR_DATE_WEEKDAY']);
    await base.runTests(lang);
  }, LONG);
});
