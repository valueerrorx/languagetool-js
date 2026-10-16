// Java: org.languagetool.tokenizers.de.GermanCompoundTokenizer (split German nouns using jwordsplitter)
import { GermanWordSplitter } from '../../../lib/wordsplitter/GermanWordSplitter.js';
import { getWords } from '../../../lib/wordsplitter/EmbeddedGermanDictionary.js';
import { InputTooLongException } from '../../../lib/wordsplitter/InputTooLongException.js';

// Add compound parts here so we don't need to update JWordSplitter for every missing word we find.
const EXTENDED_WORDS = [
  'influencer',
  'katheterisierung',
  'rücklass',
  'abdichtung',
  'laptop',
  'verschattung',
  'paradeiser',
  'einreichung',
  'bestatter',
  'divergenz',
  'schrumpf',
  'degustation',
  'schaft',
  'abstreifer',
  'aufputz',
  'glühwürmchen',
  'aufwertung',
  'einhausung',
  'lackier',
  'zarge',
  'pluralisierung',
  'schanzen',
  'abscheide',
  'rangier',
  'temporal',
  'kartonage',
  'kartonagen',
  'rebellion',
  'binokular',
  'umverlegung',
  'umhausung',
  'überholung',
  'chloroplasten',
  'nachrangigkeit',
  'spital',
  'turnus',
  'teilnehmenden',
  'pensionisten',
  'graduierten',
  'beladung',
  'controller',
  'resilienz',
  'mitführ',
  'trauma',
  'abtau',
  'normung',
  'mikroskopie',
  'bitumen',
  'erfolglosigkeit',
  'pneumatik',
  'anlasser',
  'allozierung',
  'alphabetisierung',
  'aktuator',
  'akademisierung',
  'allergiker',
  'queer',
  'filament',
  'querung',
  'curling',
  'opioid',
  'booster',
  'schmuse',
  'thrombozyten',
  'dysfunktion',
  'storchen',
  'nasch',
  'esperanto',
  'passivierung',
  'radikalisierung',
  'erleuchtung',
  'verwalter',
  'verbiss',
  'ausleih',
  'rutsch',
  'kufen',
  'entferner',
  'debitoren',
  'terrakotta',
  'graffiti',
  'auffahr',
  'anmutung',
  'kritzel',
  'salami',
  'eukalyptus',
  'kreativ',
  'hochvolt',
  'trading',
  'extraktion',
  'verstetigung',
  'diagonal',
  'margen',
  'synonym',
  'aufbringung',
  'robustheit',
  'nachuntersuchung',
  'erstkommunion',
  'hauptstadt',
  'neustart',
  'polarisierung',
  'vollstreckbarkeit',
  'vollziehung',
  'kasko',
  'blitzableiter',
  'abschattungen',
  'kuscheltier',
  'gastro',
  'hortensien',
];

// add exceptions here so we don't need to update JWordSplitter for every exception we find (word, parts):
const EXCEPTIONS = [
  ['Absolventen', ['Absolventen']],
  ['Acetat', ['Acetat']],
  ['Alkoholabstinenz', ['Alkohol', 'abstinenz']],
  ['Androgen', ['Androgen']],
  ['Auberginen', ['Auberginen']],
  ['Auckland', ['Auckland']],
  ['Boston', ['Boston']],
  ['Brandenburg', ['Brandenburg']],
  ['Broadcast', ['Broadcast']],
  ['Buchsbaum', ['Buchsbaum']],
  ['Chiemsee', ['Chiemsee']],
  ['Coffein', ['Coffein']],
  ['Drohnen', ['Drohnen']],
  ['Eiben', ['Eiben']],
  ['Eingroschen', ['Eingroschen']],
  ['Einkomponenten', ['Einkomponenten']],
  ['Elster', ['Elster']],
  ['Engineering', ['Engineering']],
  ['Factoring', ['Factoring']],
  ['Flexodruck', ['Flexo', 'druck']],
  ['Graviton', ['Graviton']],
  ['Göttinnen', ['Göttinnen']],
  ['Hallesche', ['Hallesche']],
  ['Hinspiel', ['Hinspiel']],
  ['Homogen', ['Homogen']],
  ['Kolleggen', ['Kolleggen']],
  ['Karstadt', ['Karstadt']],
  ['Kartier', ['Kartier']],
  ['Kaukasus', ['Kaukasus']],
  ['Knoblauch', ['Knoblauch']],
  ['Kollagen', ['Kollagen']],
  ['Kommerz', ['Kommerz']],
  ['Mentoring', ['Mentoring']],
  ['Monarchen', ['Monarchen']],
  ['Oligarchen', ['Oligarchen']],
  ['Optimal', ['Optimal']],
  ['Saunieren', ['Saunieren']],
  ['Schiessen', ['Schiessen']],
  ['Spielgeleier', ['Spielgeleier']],
  ['Halleschen', ['Halleschen']],
  ['Reinigungstab', ['Reinigungs', 'tab']],
  ['Reinigungstabs', ['Reinigungs', 'tabs']],
  ['Tauschwerte', ['Tausch', 'werte']],
  ['Tauschwertes', ['Tausch', 'wertes']],
  ['Kinderspielen', ['Kinder', 'spielen']],
  ['Buchhaltungstrick', ['Buchhaltungs', 'trick']],
  ['Buchhaltungstricks', ['Buchhaltungs', 'tricks']],
  ['Haushaltstrick', ['Haushalts', 'trick']],
  ['Haushaltstricks', ['Haushalts', 'tricks']],
  ['Verkaufstrick', ['Verkaufs', 'trick']],
  ['Verkaufstricks', ['Verkaufs', 'tricks']],
  ['Ablenkungstrick', ['Ablenkungs', 'trick']],
  ['Ablenkungstricks', ['Ablenkungs', 'tricks']],
  ['Manipulationstrick', ['Manipulations', 'trick']],
  ['Manipulationstricks', ['Manipulations', 'tricks']],
  ['Erziehungstrick', ['Erziehungs', 'trick']],
  ['Erziehungstricks', ['Erziehungs', 'tricks']],
  ['Messetage', ['Messe', 'tage']],
  ['Messetagen', ['Messe', 'tagen']],
  ['karamelligen', ['karamelligen']], // != Karamel+Ligen
  ['Häkelnadel', ['Häkel', 'nadel']],
  ['Häkelnadeln', ['Häkel', 'nadeln']],
  ['Freiberg', ['Freiberg']],
  ['Abtestat', ['Abtestat']],
  ['Abtestaten', ['Abtestaten']],
  ['Freibergs', ['Freibergs']],
  ['Kreuzberg', ['Kreuzberg']],
  ['Kreuzbergs', ['Kreuzbergs']],
  ['Digitalisierung', ['Digitalisierung']],
  ['Abtrocknung', ['Abtrocknung']],
  ['Erlösung', ['Erlösung']],
  ['Feuerung', ['Feuerung']],
  ['Aktivierung', ['Aktivierung']],
  ['Protokollierung', ['Protokollierung']],
  ['Budgetierung', ['Budgetierung']],
  ['Faltung', ['Faltung']],
  ['Anhäufung', ['Anhäufung']],
  ['Aufkohlung', ['Aufkohlung']],
  ['Festigung', ['Festigung']],
  ['Allerheiligen', ['Allerheiligen']],
  ['Druckerpressen', ['Drucker', 'pressen']],
  ['Habitat', ['Habitat']],
  ['Augarten', ['Augarten']],
  ['Auszeit', ['Auszeit']],
  ['Bewegtbild', ['Bewegt', 'bild']],
  ['Bigband', ['Bigband']],
  ['Bisexuelle', ['Bisexuelle']],
  ['Bisexuellen', ['Bisexuellen']],
  ['Bunsenbrenner', ['Bunsenbrenner']], // avoid "Bunsenweisheit"
  ['Carbon', ['Carbon']],
  ['Carsharing', ['Carsharing']],
  ['Castor', ['Castor']],
  ['Catering', ['Catering']],
  ['Cholesterin', ['Cholesterin']],
  ['Damast', ['Damast']],
  ['Dispositiv', ['Dispositiv']],
  ['Emittent', ['Emittent']],
  ['Emittenten', ['Emittenten']],
  ['Express', ['Express']],
  ['Fairness', ['Fairness']],
  ['Fiberglas', ['Fiberglas']], // avoid "Fiberthermometer"
  ['Globus', ['Globus']],
  ['Göttinnen', ['Göttinnen']],
  ['Illustration', ['Illustration']],
  ['Muttertag', ['Muttertag']], // "Muttertag" needs infix s
  ['Muttertags', ['Muttertags']], // "Muttertag" needs infix s
  ['Patriarchen', ['Patriarchen']],
  ['Phosgen', ['Phosgen']],
  ['Vatertag', ['Vatertag']], // "Vatertag" needs infix s
  ['Vatertags', ['Vatertags']], // "Vatertag" needs infix s
  ['Vaterland', ['Vaterland']],
  ['Vaterlands', ['Vaterlands']],
  ['Wehrmacht', ['Wehrmacht']],
  ['Wehrmachts', ['Wehrmachts']],
];

// Java: GermanCompoundTokenizer.ExtendedGermanWordSplitter
class ExtendedGermanWordSplitter extends GermanWordSplitter {
  // Java: ExtendedGermanWordSplitter#ExtendedGermanWordSplitter(boolean)
  constructor(hideInterfixCharacters) {
    super(hideInterfixCharacters, ExtendedGermanWordSplitter.extendedList());
  }

  // Java: ExtendedGermanWordSplitter#extendedList() (a copy; the embedded set stays unchanged)
  static extendedList() {
    const words = new Set(getWords());
    for (const w of EXTENDED_WORDS) words.add(w);
    return words;
  }
}

let strictInstance = null;
let nonStrictInstance = null;

// Java: GermanCompoundTokenizer (implements Tokenizer)
export class GermanCompoundTokenizer {
  static FQCN = 'org.languagetool.tokenizers.de.GermanCompoundTokenizer';

  // Java: GermanCompoundTokenizer#GermanCompoundTokenizer() / (boolean)
  constructor(strictMode = true) {
    this.wordSplitter = new ExtendedGermanWordSplitter(false);
    this.wordSplitter.setStrictMode(strictMode);
    this.wordSplitter.setMinimumWordLength(3);
    for (const [word, parts] of EXCEPTIONS) {
      this.wordSplitter.addException(word, parts);
    }
  }

  // Java: GermanCompoundTokenizer#tokenize(String)
  tokenize(word) {
    try {
      return this.wordSplitter.splitWord(word);
    } catch (e) {
      if (e instanceof InputTooLongException) return [word];
      throw e;
    }
  }

  // Java: GermanCompoundTokenizer#getStrictInstance()
  static getStrictInstance() {
    if (strictInstance === null) strictInstance = new GermanCompoundTokenizer(true);
    return strictInstance;
  }

  // Java: GermanCompoundTokenizer#getNonStrictInstance()
  static getNonStrictInstance() {
    if (nonStrictInstance === null) nonStrictInstance = new GermanCompoundTokenizer(false);
    return nonStrictInstance;
  }
}
