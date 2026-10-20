// Java: org.languagetool.rules.WordListValidatorTest (core test class, used by LanguageSpecificTest)
import { AssertionError } from '../../src/lib/java/errors.js';
import { Pattern } from '../../src/lib/java/regex/index.js';
import { javaReplace, javaTrim } from '../../src/lib/java/strings.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { SpellingCheckRule } from '../../src/core/rules/spelling/SpellingCheckRule.js';
import { CachingWordListLoader } from '../../src/core/rules/spelling/CachingWordListLoader.js';

const VALID_CHARS =
          "[ 0-9a-zA-ZöäüÖÄÜßëçèéáàóòŁÈÉÁÀÓÒÍãñíîŞş&*_:\\\\" +
          "___INSERT___" +
          "Œ€ūαΑβΒγɣΓδΔεΕζΖηΗθΘιΙκΚλΛμΜνΝξΞοΟπΠρΡσΣτΤυΥφΦχΧψΨωΩάΆέΈίΊήΉύΎϊϋΰΐœţłńÿ" +
          "ČŚśŌōżúïÎôêâû" +
          "ÇÃÕÚÊÂÔ" +
          "ă" +
          "å" +
          "ħ" +
          "ø" +
          "ĉĝĥĵŝŭĈĜĤĴŜŬ" +
          "'’" +
          "./%-]+" +
          "|[khmcdµ]?m[²³]|°[CFR]|C?O₂-?.*|mc²";

// Words that are valid but with special characters so that we don't want to allow them in general:
const VALID_WORDS = new Set([
          "Oświęcim",
          "Brașov",
          "Iași",
          "Częstochowa",
          "Ceaușescu",
          "Timișoara",
          "Guðnadóttir",
          "Andrić",
          "Andrićgrad",
          "Višegrad",
          "Onești",
          "Karadžić",
          "Mladić",
          "Vučić",
          "Milošević",
          "Prešov",
          "Martinů",
          "Şanlıurfa",
          "Žižek",
          "Háček",
          "Varaždin/S",
          "Będzin",
          "Aydın",
          "Pavlović",
          "Poreč",
          "Čeferin",
          "Čeferin/S",
          "Perišić",
          "Perišić/S",
          "Modrić",
          "Modrić/S",
          "Miłosz",
          "Arnautović/S",
          "Dàoxuān",
          "Sigara böreği",
          "Sigara böreği/S",
          "Bhagavad-gītā",
          "Sønderjylland/S",
          "Utøya/S",
          "Božena/S",
          "Brăila/S",
          "Timișoara/S",
          "Tromsø/S",
          "Solidarność",
          "Salihamidžić/S",
          "Porošenko",
          "Porošenko/S",
          "Darʿā",  // de
          "veni, vidi, vici", // en
          "Food+Tech Connect", // en
          "comme ci, comme ça", // en
          "Robinson + Yu",
          "herõon", // en
          "herõons", // en
          "Võro",  // en
          "Łukasz",
          "Čakavian",
          "Erdoğan",
          "Rădulescu",
          "Štokavian",
          "Veliko Tărnovo",
          "Brāhmaṇa",
          "Forlì-Cesena",
          "Hárbarðsljóð",
          "Hassānīya",
          "Hyndluljóð",
          "Kazanlǎk",
          "Kesäranta",
          "Krišjānis",
          "Kŭrdzhali",
          "Malko Tŭrnovo",
          "Rígsþula",
          "Savitṛ",
          "Vafþrúðnismál",
          "Völundarkviða",
          "Kṛṣṇa",
          "art.º",
          "Klaipėda",
          "Mondelēz",
          "chef-d’œuvre",
          "chefs-d’œuvre",
          "Brač",
          "Forlì",
          "Qur’an",
          "Kariņš",
          "Djuveč",
          "Djuvečreis",
          "Çavuşoğlu",
          "Çavuşoğlu/S",
          "Hidschāb/S",
          "Dvořák/S",
          "Constanța",
          "Constanța/S",
          "Paul Erdős",
          "Erdoğan/S",
          "Sørensen/S",
          "Sørensen",
          "Søren/S",
          "Søren",
          "Radosław",
          "Radosław/S",
          "Jarosław",
          "Jarosław/S",
          "Władysław/S",
          "Şahin/S",
          "Uğur/S",
          "Jørgensen/S",
          "Jørgensen",
          "Ångström",
          "ångström",
          "ångströms",
          "'Ndrangheta",
          "Hồ Chí Minh",
          "McDonald's",
          "Bahrām",
          "Kęstutis",
          "µm",
          "µg",
          "µl",
          "CD&V",
          "C&A",
          "P&O",
          "S&P",
          "ČSSR",
          "V&D",
          "Loïc/S",
          "İlkay",
          "Gündoğan",
          "Tuğrul",
          "Kīlauea",
          "Māori",
          "Chișinău",
          "Chișinău/S",
          "Křetínský/S",
          "Terzić",
          "Jūjutsu/S",
          "Ñuñoa",
          "Stevanović",
          "Børge",
          "Børge/S",
          "Bjørn Gulden/S",
          "Snæfellsjökull/S",
          "Višegrad/S",
          "Clément/S",
          "Snæfellsjökull",
          "Grudziądz",
          "Skåneland",
          "Øresund",
          "Jokić",
          "Ibišević",
          "Fríður",
          "Łódź",
          "Ørsted",
          "Samsø/S",
          "Kılıçdaroğlu/S",
          "Vlahović/S",
          "Sønderborg/S",
          "Sønderborg",
          "Mirotić",
          "Subotić",
          "Pÿur",
          "Subašić",
          "Wałęsa",
          "Çalhanoğlu",
          "Çalhanoğlu/S",
          "İmamoğlu",
          "İmamoğlu/S",
          "Szczęsny",
          "celebrytę", // for PL
          "antybiotykoterapię", // for PL
          "elektromobilność", // for PL
          "kryptowalutę", // for PL
          "fotowoltaikę", // for PL
          "insulinooporność", // for PL
          "infografikę", // for PL
          "dtª",  // for PT
          "dtº",  // for PT
          "ª",  // for PT
          "º",  // for PT
          "ĉi",  // for PT
          "R$",  // for PT
          // Greek letters / Mathematics and physics variables
          "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω", 
          "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"          

]);

// Java: WordListValidatorTest
export class WordListValidatorTest {
  // Java: WordListValidatorTest() / WordListValidatorTest(String)
  constructor(additionalValidationChars = '') {
    this.additionalValidationChars = additionalValidationChars;
  }

  // Java: WordListValidatorTest#testWordListValidity(Language)
  testWordListValidity(lang) {
    if (lang.getShortCode() === 'ru') {
      return; // skipping, Cyrillic chars not part of the validation yet
    }
    const checked = new Set();
    const lt = new JLanguageTool(lang);
    const rules = lt.getAllActiveRules();
    for (const rule of rules) {
      if (rule instanceof SpellingCheckRule) {
        const file = rule.getSpellingFileName();
        if (JLanguageTool.getDataBroker().resourceExists(file) && !checked.has(file)) {
          console.log(`Checking validity of word list file ${file}`);
          const loader = new CachingWordListLoader();
          const words = loader.loadWords(file);
          this.validateWords(words, file);
          checked.add(file);
        }
      }
    }
  }

  // Java: WordListValidatorTest#validateWords(List,String)
  validateWords(words, spellingFileName) {
    const failures = [];
    const validChars = javaReplace(VALID_CHARS, '___INSERT___', this.additionalValidationChars);
    const validPattern = Pattern.compile(validChars);
    for (const word of words) {
      if (VALID_WORDS.has(word) || VALID_WORDS.has(javaTrim(word))) {
        // okay
      } else if (!validPattern.matcher(word).matches()) {
        failures.push(`Word '${word}' from ${spellingFileName} doesn't match regex: ${validChars}`
          + ' - please fix the word or add the character to the language\'s org.languagetool.rules.WordListValidatorTest if it\'s valid');
      }
    }
    if (failures.length > 0) {
      throw new AssertionError(failures.join('\n\n'));
    }
  }
}
