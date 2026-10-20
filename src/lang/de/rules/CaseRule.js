// org.languagetool.rules.de.CaseRule (adjectives and verbs must not be capitalized, substantivated verbs must be)
import { Pattern } from '../../../lib/java/regex/index.js';
import * as Character from '../../../lib/java/Character.js';
import { IOException, RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase, javaMatches, javaReplace } from '../../../lib/java/strings.js';
import { equalsAny, equalsAnyIgnoreCase, isNumeric, removeEnd } from '../../../lib/java/StringUtils.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { SENTENCE_START_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { getUrl } from '../../../core/Tools.js';
import { startsWithUppercase, uppercaseFirstChar, lowercaseFirstChar, isAllUppercase } from '../../../core/text/StringTools.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { POSType } from '../tagging/GermanToken.js';
import { hasReadingOfType } from './GermanHelper.js';
import { LanguageNames } from './LanguageNames.js';
import { ANTI_PATTERNS } from './CaseRuleAntiPatterns.js';
import { getExceptionPatterns } from './CaseRuleExceptions.js';

const NUMERALS_EN = Pattern.compile('[a-z]|[0-9]+|(m{0,4}(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3}))$');
const TWO_UPPERCASE_CHARS = Pattern.compile('[A-ZÖÄÜ][A-ZÖÄÜ][a-zöäüß-]+');

// wenn hinter diesen Wörtern ein Verb steht, ist es wohl ein substantiviertes Verb,
// muss also groß geschrieben werden:
const nounIndicators = new Set(); // Java: CaseRule#nounIndicators

const UPPERCASE_MESSAGE = 'Außer am Satzanfang werden nur Nomen und Eigennamen großgeschrieben.';
const LOWERCASE_MESSAGE = 'Falls es sich um ein substantiviertes Verb handelt, wird es großgeschrieben.';
const COLON_MESSAGE = 'Folgt dem Doppelpunkt weder ein Substantiv noch eine wörtliche Rede oder ein vollständiger Hauptsatz, schreibt man klein weiter.';
const VERHALTEN = Pattern.compile('.+verhalten');
const IRGEND_ETC = Pattern.compile('irgendwelche|irgendwas|irgendein|weniger?|einiger?|mehr|aufs');
const VER_MOD_AUX = Pattern.compile('VER:(MOD|AUX):[1-3]:.*');

nounIndicators.add('das');
nounIndicators.add('sein');
//nounIndicators.add("ihr");    // would cause false alarm e.g. "Auf ihr stehen die Ruinen...", "Ich dachte, dass ihr kommen würdet.", "Ich verdanke ihr meinen Erfolg."
nounIndicators.add('mein');
nounIndicators.add('dein');
nounIndicators.add('euer');
nounIndicators.add('unser');

const SENTENCE_START_EXCEPTIONS = ['(', '"', "'", '‘', '„', '«', '»', '‚', '.', '!', '?'];

const UNDEFINED_QUANTIFIERS = ['viel', 'nichts', 'nix', 'wenig', 'allerlei'];

// Used for subordinate clause detection after verbs (e.g. "Überlegen, wie man...")
const INTERROGATIVE_PARTICLES = ['was', 'wodurch', 'wofür', 'womit', 'woran', 'worauf', 'woraus', 'wovon', 'wie'];

const POSSESSIVE_INDICATORS = ['einer', 'eines', 'der', 'des', 'dieser', 'dieses'];

const DAS_VERB_EXCEPTIONS = ['nur', 'sogar', 'auch', 'die', 'alle', 'viele', 'zu'];

// Used for short question fragments after a colon (e.g. "Ich frage mich: Warum?")
// Intentionally different from INTERROGATIVE_PARTICLES, which targets subordinate clauses.
const COLON_QUESTION_WORDS = ['warum', 'wieso', 'weshalb', 'wer', 'was', 'wann', 'wo', 'wie', 'wozu'];

const COLON_QUESTION_CONJUNCTIONS = ['und', 'oder', 'aber', 'denn'];

/*
 * These are words that Morphy only knows as non-nouns (or not at all).
 * The proper solution is to add all those to our Morphy data, but as a simple
 * workaround to avoid false alarms, these words can be added here.
 */
// Java: CaseRule#exceptions
const exceptions = [
    "Bedienstete",
    "Bediensteter",
    "Feierwütiger",
    "Feierwütige",
    "Feierwütigen",
    "Dritten",
    "Berufstätige",
    "Berufstätigen",
    "Erwerbstätige",
    "Erwerbstätigen",
    "Tatverdächtige",
    "Tatverdächtigen",
    "Konsumierende",
    "Konsumierenden",
    "Verliebter",
    "Verliebte",
    "Beängstigendes",
    "Oppositioneller",
    "Oppositionelle",
    "Verantwortlicher",
    "Verantwortliche",
    "Verantwortlichen",
    "Beschuldigte",
    "Beschuldigten",
    "Beklagte",
    "Beklagten",
    "Befragte",
    "Befragten",
    "Hingerichtete",
    "Lehrende",
    "Lehrender",
    "Vertrauter",
    "Out", // eng
    "Packet", // misspelling of "Paket" (caught by spell checker)
    "Adult", // eng
    "Apart", // eng
    "Universal", // eng
    "Multinational", // eng
    "Additional", // eng
    "Smart", // eng
    "Adverse", // eng
    "Different", // eng
    "Light", // eng
    "Legal", // eng
    "Computational", // eng
    "Holder", // eng
    "Just", // eng
    "Lost", // eng
    "Fundamental", // eng
    "Quick", // eng
    "Infernal", // eng
    "Fit", // eng
    "Fair", // eng
    "Viral", // eng
    "Tough", // eng
    "Indoor", // eng
    "Superb", // eng und Automodell
    "Resilient", // eng
    "Hexagonal", // eng
    "Responsive", // eng
    "Anno", // Name
    "Mo",
    "Di",
    "Mi",
    "Do",   // "Di. und Do. um 18 Uhr"
    "Fr",   // "Fr. Dr. Müller"
    "Sa",   // Sa. 12 - 16 Uhr
    "Gr",   // "Gr. 12" (Größe)
    "Mag",   // "Mag. Helke Müller"
    "Nov",
    "Diss",
    "Invalide",
    "Invalider",
    "Invaliden",
    "Sehende",
    "Sehender",
    "Sehenden",
    "Schutzheilige",
    "Schutzheiliger",
    "Schutzheiligen",
    "Lila",
    "Langzeitarbeitslose",
    "Langzeitarbeitslosen",
    "Langzeitarbeitsloser",
    "Linksintellektuelle",
    "Linksintellektueller",
    "Linksintellektuellen",
    "Beschuldigte",
    "Beschuldigten",
    "Drogenabhängige",
    "Drogenabhängiger",
    "Drogenabhängiger",
    "Drogenabhängigen",
    "Asylsuchender",
    "Asylsuchende",
    "Asylsuchenden",
    "Landtagsabgeordnete",
    "Landtagsabgeordneter",
    "Landtagsabgeordneten",
    "Stadtverordnete",
    "Stadtverordneter",
    "Stadtverordneten",
    "Veränderliche",
    "Veränderlicher",
    "Veränderlichen",
    "Werbetreibende",
    "Werbetreibender",
    "Werbetreibenden",
    "Verletzter",
    "Verletzten",
    "Werktätige",
    "Werktätiger",
    "Werktätigen",
    "Getestete", // temporary fix
    "Getesteten", // temporary fix
    "Genesene", // temporary fix
    "Genesenen", // temporary fix
    "Geimpfte", // temporary fix
    "Geboosterte", // temporary fix
    "Ungeimpfte", // temporary fix
    "Geimpften", // temporary fix
    "Geboosterten", // temporary fix
    "Ungeimpften", // temporary fix
    "Geflüchtete", // temporary fix
    "Geflüchteten", // temporary fix
    "Projektbeteiligte", // temporary fix
    "Projektbeteiligten", // temporary fix
    "Heranwachsende", // temporary fix
    "Heranwachsenden", // temporary fix
    "Interessierte", // temporary fix
    "Interessierten", // temporary fix
    "Infizierte", // temporary fix
    "Infizierten", // temporary fix
    "Gehörlose", // temporary fix
    "Gehörlosen", // temporary fix
    "Drücke",
    "Klecks",
    "Quatsch",
    "Speis",
    "Flash",
    "Suhl",
    "Müh",
    "Bims",
    "Wisch",
    "Außenputz",
    "Rinderhack",
    "Hack",
    "Schlitz",
    "Frevler",
    "Zementputz",
    "Hurst",  // Name
    "Bombardier",  // Name
    "Kraus",  // Nachname
    "Strunz",  // Nachname
    "Bell",  // Nachname
    "Melk",  // Nachname
    "Klopp",  // Nachname
    "Walz",  // Nachname
    "Schiel",  // Nachname
    "Dusch",  // Nachname
    "Penn",  // Nachname
    "Dörr",  // Nachname
    "Kies",
    "Koks",
    "Dell",  // Name
    "Wall",
    "Beige",
    "Zoom",
    "Perl",
    "Parallele",
    "Parallelen",
    "Rutsch",
    "Spar",
    "Merz",
    "Gefahren",
    "Minderjährige",
    "Minderjähriger",
    "Minderjährigen",
    "Scheinselbstständige",
    "Bundestagsabgeordneter",
    "Bundestagsabgeordneten",
    "Bundestagsabgeordnete",
    "Reichstagsabgeordneter",
    "Reichstagsabgeordneten",
    "Reichstagsabgeordnete",
    "Medienschaffende",
    "Medienschaffenden",
    "Medienschaffender",
    "Lehrende",
    "Lehrenden",
    "Vertretene",
    "Vertretenen",
    "Vorstandsvorsitzender",
    "Vorstandsvorsitzenden",
    "Vorstandsvorsitzende",
    "Demonstrierende",
    "Demonstrierenden",
    "Marketingtreibende",
    "Marketingtreibender",
    "Marketingtreibenden",
    "Strafgefangenen",
    "Strafgefangener",
    "Strafgefangene",
    "Pädophile",
    "Pädophiler",
    "Pädophilen",
    "Lehrbeauftragte",
    "Lehrbeauftragter",
    "Lehrbeauftragten",
    "Erkrankte",
    "Erkrankter",
    "Erkrankten",
    "Eigner",
    "Polizeibeamten",
    "Polizeibeamter",
    "Polizeibeamte",
    "Kriegsversehrte",
    "Kriegsversehrter",
    "Kriegsversehrten",
    "Demenzkranke",
    "Demenzkranker",
    "Demenzkranken",
    "Parteivorsitzende",
    "Parteivorsitzender",
    "Parteivorsitzenden",
    "Kriegsgefangene",
    "Kriegsgefangener",
    "Kriegsgefangenen",
    "Ehrenvorsitzende",
    "Ehrenvorsitzender",
    "Ehrenvorsitzenden",
    "Oberkommandierende",
    "Oberkommandierender",
    "Oberkommandierenden",
    "Werbungtreibende",
    "Werbungtreibenden",
    "Mitangeklagte",
    "Schuhfilz",
    "Mix",
    "Rahm",
    "Flansch",
    "WhatsApp",
    "Verschleiß",
    "Schutzsuchende", // gendered form
    "Schutzsuchenden", // gendered form
    "Versicherte",
    "Versicherten", // gendered form
    "Cyberkriminelle",
    "Cyberkriminellen",
    "Kriminelle",
    "Kriminellen",
    "Auszubildenden",
    "Auszubildende",
    "Auszubildender",
    "Lernende", // gendered form
    "Lernender", // gendered form
    "Lernenden", // gendered form
    "Teilnehmende", // gendered form
    "Teilnehmenden", // gendered form
    "Radfahrende", // gendered form
    "Radfahrenden", // gendered form
    "Autofahrende", // gendered form
    "Autofahrenden", // gendered form
    "Auszubildene", // gendered form
    "Auszubildenen", // gendered form
    "Absolvierende", // gendered form
    "Absolvierenden", // gendered form
    "Einheimische",
    "Einheimischen",
    "Einheimischer",
    "Wehrbeauftragter",
    "Wehrbeauftragte",
    "Wehrbeauftragten",
    "Wehrbeauftragtem",
    "Prozessbevollmächtigter",
    "Prozessbevollmächtigte",
    "Prozessbevollmächtigten",
    "Prozessbevollmächtigtem",
    "Bundesbeamte",
    "Bundesbeamter",
    "Bundesbeamten",
    "Bundesbeamtem",
    "Datenschutzbeauftragter",
    "Datenschutzbeauftragte",
    "Datenschutzbeauftragten",
    "Datenschutzbeauftragtem",
    "Steuerbevollmächtigte",
    "Steuerbevollmächtigter",
    "Steuerbevollmächtigten",
    "Steuerbevollmächtigtem",
    "Suchtkranken",
    "Suchtkranke",
    "Suchtkranker",
    "Filmschaffende",
    "Filmschaffender",
    "Filmschaffenden",
    "Filmschaffendem",
    "Arbeitssuchende",
    "Arbeitssuchender",
    "Arbeitssuchenden",
    "Arbeitssuchendem",
    "Bausachverständige",
    "Bausachverständiger",
    "Bausachverständigen",
    "Bausachverständigem",
    "Heurige",
    "Ratsuchende",
    "Ratsuchender",
    "Ratsuchenden",
    "Verwundete",
    "Verwundeter",
    "Verwundeten",
    "Vollzugsbeamte",
    "Vollzugsbeamter",
    "Vollzugsbeamten",
    "Schutzbefohlene",
    "Schutzbefohlener",
    "Schutzbefohlenen",
    "Verfahrensbeteiligte",
    "Verfahrensbeteiligter",
    "Verfahrensbeteiligten",
    "Kolonialbeamte",
    "Kolonialbeamter",
    "Kolonialbeamten",
    "Verwaltungsbeamte",
    "Verwaltungsbeamter",
    "Verwaltungsbeamten",
    "Verdächtige",
    "Verdächtiger",
    "Verdächtigen",
    "Leichtverletzte",
    "Leichtverletzten",
    "Leichtverletzte",
    "Dozierende",
    "Dozierenden",
    "Studierende",
    "Studierender",
    "Studierenden",
    "Suchbegriffen",
    "Plattdeutsch",
    "Wallet",
    "Str",
    "Priest",
    "Simple",
    "Legend",
    "Golden",
    "Forward",
    "Unverzagt", // österreichisches Adelsgeschlecht
    "Auszubildende",
    "Auszubildender",
    "Gelehrte",
    "Gelehrter",
    "Gelehrten",
    "Vorstehende",
    "Vorstehender",
    "Mitwirkende",
    "Mitwirkender",
    "Mitwirkenden",
    "Tabellenletzte",
    "Tabellenletzter",
    "Familienangehörige",
    "Familienangehöriger",
    "Zeitreisende",
    "Zeitreisender",
    "Zeitreisenden",
    "Erwerbstätige",
    "Erwerbstätigen",
    "Erwerbstätiger",
    "Selbstständige",
    "Selbstständigen",
    "Selbstständiger",
    "Selbständige",
    "Selbständigen",
    "Selbständiger",
    "Genaueres",
    "Äußersten",
    "Dienstreisender",
    "Verletzte",
    "Vermisste",
    "Äußeres",
    "Abseits",
    "Unschuldige",
    "Unschuldiger",
    "Unschuldigen",
    "Mitarbeitende",
    "Mitarbeitender",
    "Mitarbeitenden",
    "Beschäftigter",
    "Beschäftigte",
    "Beschäftigten",
    "Beschäftigtem",
    "Bekannter",
    "Bekannte",
    "Bevollmächtigte",
    "Bevollmächtigter",
    "Bevollmächtigten",
    "Brecht",
    "Tel",  // Tel. = Telefon
    "Unschuldiger",
    "Vorgesetzter",
    "Abs",   // Abs. = Abkürzung für Absatz, Absender, ...
    "Klappe",
    "Vorfahre",
    "Mittler",
    "Hr",   // Hr. = Abkürzung für Herr
    "Schwarz",
    "Genese",
    "Rosa",
    "Auftrieb",
    "Zuschnitt",
    "Geschossen",
    "Vortrieb",
    "Abtrieb",
    "Gesandter",
    "Durchfahrt",
    "Durchgriff",
    "Überfahrt",
    "Zeche",
    "Sparte",
    "Sparten",
    "Heiliger",
    "Reisender",
    "Pest",
    "Schwinge",
    "Verlies",
    "Nachfolge",
    "Stift",
    "Belange",
    "Geistlicher",
    "Google",
    "Hu", // name
    "Jenseits",
    "Abends",
    "Stimmberechtigte",
    "Stimmberechtigten",
    "Stimmberechtigter",
    "Alleinerziehende",
    "Alleinerziehenden",
    "Alleinerziehender",
    "Abgeordneter",
    "Abgeordnete",
    "Abgeordneten",
    "Angestellter",
    "Angestellte",
    "Angestellten",
    "Armeeangehörige",
    "Armeeangehörigen",
    "Armeeangehöriger",
    "Liberaler",
    "Abriss",
    "Ahne",
    "Ähnlichem",
    "Ähnliches",   // je nach Kontext groß (TODO), z.B. "Er hat Ähnliches erlebt" 
    "Allerlei",
    "Anklang",
    "Verlobter",
    "Anstrich",
    "Armes",
    "Ausdrücke",
    "Auswüchsen",
    "Bände",
    "Bänden",
    "Beauftragter",
    "Belange",
    "Biss",
    "De",    // "De Morgan" etc
    "Diesseits", // "im Diesseits"
    "Dr",
    "Durcheinander",
    "Eindrücke",
    "Erwachsener",
    "Familienangehörige", // "Brüder und solche Familienangehörige, die..."
    "Flöße",
    "Folgendes",   // je nach Kontext groß (TODO)...
    "Fort",
    "Fraß",
    "Fristende",
    "Frevel",
    "Genüge",
    "Gefallen", // Gefallen finden
    "Gläubige",
    "Gläubiger",
    "Gläubigen",
    "Hechte",
    "Herzöge",
    "Herzögen",
    "Hinfahrt",
    "Hilfsstoff",
    "Hilfsstoffe",
    "Hundert",   // groß und klein möglich 
    "Zehntausend",   // groß und klein möglich 
    "Hunderttausend",   // groß und klein möglich 
    "Hyperwallet", // Anglizismus
    "Ihnen",
    "Ihrerseits",
    "Ihr",
    "Ihre",
    "Ihrem",
    "Ihren",
    "Ihrer",
    "Ihres",
    "Infrarot",
    "Jenseits",
    "Jugendliche",
    "Jugendlichen",
    "Jugendlicher",
    "Jünger",
    "Kant", //Immanuel
    "Klaue",
    "Konditional",
    "Krähe",
    "Kurzem",
    "Landwirtschaft",
    "Langem",
    "Längerem",
    "Lausitz",
    "Le",    // "Le Monde" etc
    "Lehrlingsunterweisung",
    // "Leichter", // Leichter = ein Schiff in oben offener Bauweise ohne Eigenantrieb
    "Letzt",
    "Letzt",      // "zu guter Letzt"
    "Letztere",
    "Letzterer",
    "Letzteres",
    "Link",
    "Links",
    "Löhne",
    "Luden",
    "Milk", // Englisches Wort und eine Form von "melken"
    "Mitfahrt",
    "Mr",
    "Mrd",
    "Mrs",
    "Nachfrage",
    "Nachts",   // "des Nachts", "eines Nachts"
    "Nachspann",
    "Nähte",
    "Nähten",
    "Narkoseverfahren",
    "Neuem",
    "Neugeborene",
    "Neugeborenen",
    "Neugeborenes",
    "Nr",
    "Nutze",   // zu Nutze
    "Obdachlose",
    "Obdachloser",
    "Obdachlosen",
    "Oder",   // der Fluss
    "Ohrfeige",
    "Patsche",
    "Pfiffe",
    "Pfiffen",
    "Press", // University Press
    "Prof",
    "Puste",
    "Sachverständiger",
    "Sankt",
    "Schaulustige",
    "Schaulustigen",
    "Schaulustiger",
    "Scheine",
    "Scheiße",
    "Schuft",
    "Schufte",
    "Schuld",
    "Schwangere",
    "Schwangeren",
    "Schwärme",
    "Schwarzes",    // Schwarzes Brett
    "Sie",
    "Skype",
    "Spitz",
    "Spott",
    "St",   // Paris St. Germain
    "Stereotyp",
    "Störe",
    "Tausend",   // je nach Kontext groß (TODO)
    "Tischende",
    "Toter",
    "Übrigen",   // je nach Kontext groß (TODO), z.B. "im Übrigen"
    "Unentschieden",
    "Unvorhergesehenes",   // je nach Kontext groß (TODO), z.B. "etwas Unvorhergesehenes"
    "Verantwortlicher",
    "Verlass",
    "Verwandter",
    "Verstorbenen",
    "Verstorbene",
    "Vielfache",
    "Vielfaches",
    "Vorsitzender",
    "Fraktionsvorsitzender",
    "Verletzte",
    "Verletzten",
    "Walt",
    "Weitem",
    "Weiteres",
    "Wohlen", // Stadt in der Schweiz
    "Wicht",
    "Wichtiges",
    "Wider",    // "das Für und Wider"
    "Wild",
    "Zeche",
    "Zusage",
    "Zwinge",
    "Zirkusrund",
    "Tertiär",  // geologischer Zeitabschnitt

    "Erster",   // "er wurde Erster im Langlauf"
    "Zweiter",
    "Dritter",
    "Vierter",
    "Fünfter",
    "Sechster",
    "Siebter",
    "Achter",
    "Neunter",
    "Erste",   // "sie wurde Erste im Langlauf"
    "Zweite",
    "Dritte",
    "Vierte",
    "Fünfte",
    "Sechste",
    "Siebte",
    "Achte",
    "Neunte",

    // Änderungen an der Rechtschreibreform 2006 erlauben hier Großschreibung:
    "Dein",
    "Deine",
    "Deinem",
    "Deinen",
    "Deiner",
    "Deines",
    "Deinerseits",
    "Dich",
    "Dir",
    "Du",
    "Euch",
    "Euer",
    "Eure",
    "Euern",
    "Eurem",
    "Euren",
    "Eures",
    "Eueren",
    "Euerem",
    "Eueres",
    "Euerer",
    "Eurerseits",
    "Euerseits"
];

// Java: CaseRule#exceptionPatterns (static init from CaseRuleExceptions, loaded on first use)
let exceptionPatterns = null;
function getExceptionPatternsCached() {
  if (exceptionPatterns === null) exceptionPatterns = getExceptionPatterns();
  return exceptionPatterns;
}

// Java: CaseRule#substVerbenExceptions
const substVerbenExceptions = new Set([
  "hinziehen",
  "helfen",
  "lassen",
  "passieren",  // "das Schlimmste, das passieren könnte"
  "haben",  // "Das haben schon viele versucht."
  "passiert",  // "Das passiert..."
  "beschränkt",  // "Das beschränkt sich..."
  "wiederholt",
  "scheinen",
  "klar",
  "heißen",
  "einen",
  "gehören",
  "bedeutet",    // "und das bedeutet..."
  "ermöglicht",    // "und das ermöglicht..."
  "funktioniert",    // "Das funktioniert..."
  "sollen",
  "werden",
  "dürfen",
  "müssen",
  "so",
  "ist",
  "können",
  "mein", // "etwas, das mein Interesse geweckt hat"
  "sein",
  "muss",
  "muß",
  "wollen",
  "habe",
  "ein",   // nicht "einen" (Verb)
  "tun",   // "...dann wird er das tun."
  "bestätigt",
  "bestätigte",
  "bestätigten",
  "bekommen",
  "sauer",
  "bedeuten",
]);

// Java: CaseRule
export class CaseRule extends Rule {
  static FQCN = 'org.languagetool.rules.de.CaseRule';

  // Java: CaseRule(ResourceBundle,German)
  constructor(messages, german) {
    super();
    this.language = german;
    this.setCategory(Categories.CASING.getCategory(messages));
    this.setUrl(getUrl('https://languagetool.org/insights/de/beitrag/gross-klein-schreibung-rechtschreibung/#1-nomen-werden-gro%C3%9Falle-anderen-wortarten-kleingeschrieben'));
    this.antiPatterns = Rule.cacheAntiPatterns(german, ANTI_PATTERNS);
    this.addExamplePair(Example.wrong('<marker>Das laufen</marker> fällt mir schwer.'),
      Example.fixed('<marker>Das Laufen</marker> fällt mir schwer.'));
  }

  // Java: CaseRule#getId()
  getId() {
    return 'DE_CASE';
  }

  // Java: CaseRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return ANTI_PATTERNS.reduce((max, l) => Math.max(max, l.length), 0);
  }

  // Java: CaseRule#getUrl()
  getUrl() {
    return getUrl('https://dict.leo.org/grammatik/deutsch/Rechtschreibung/Regeln/Gross-klein/index.html');
  }

  // Java: CaseRule#getDescription()
  getDescription() {
    return 'Großschreibung von Nomen und substantivierten Verben';
  }

  // Java: CaseRule#match(AnalyzedSentence)
  match(sentence) {
    const ruleMatches = [];
    const tokens = this.getSentenceWithImmunization(sentence).getTokensWithoutWhitespace();

    let prevTokenIsDas = false;
    let isPrecededByModalOrAuxiliary = false;
    for (let i = 0; i < tokens.length; i++) {
      //Note: defaulting to the first analysis is only save if we only query for sentence start
      const posToken = tokens[i].getAnalyzedToken(0).getPOSTag();
      if (SENTENCE_START_TAGNAME === posToken) {
        continue;
      }
      if (i === 1) {   // don't care about first word, UppercaseSentenceStartRule does this already
        prevTokenIsDas = nounIndicators.has(toLowerCase(tokens[1].getToken()));
        continue;
      }
      if (i > 0 && (this.isSalutation(tokens[i - 1].getToken()) || this.isCompany(tokens[i - 1].getToken()))) {   // e.g. "Frau Stieg" could be a name, ignore
        continue;
      }

      // 1.1 Technische Dokumentation
      if (i > 2 && NUMERALS_EN.matcher(tokens[i - 1].getToken()).matches() && this.isDot(tokens[i - 2].getToken()) && NUMERALS_EN.matcher(tokens[i - 3].getToken()).matches()) {
        continue;
      }

      const analyzedToken = tokens[i];
      const token = analyzedToken.getToken();

      const isBaseform = analyzedToken.getReadingsLength() >= 1 && analyzedToken.hasLemma(token);
      if ((analyzedToken.getAnalyzedToken(0).getPOSTag() === null || hasReadingOfType(analyzedToken, POSType.VERB))
          && isBaseform) {
        let nextTokenIsPersonalOrReflexivePronoun = false;
        if (i < tokens.length - 1) {
          const nextToken = tokens[i + 1];
          // avoid false alarm for "Das haben wir getan." etc:
          nextTokenIsPersonalOrReflexivePronoun = nextToken.hasPartialPosTag('PRO:PER') || equalsAny(nextToken.getToken(), 'sich', 'Sie');
          if (nextToken.hasPosTag('PKT')) {
            // avoid false alarm for "So sollte das funktionieren." (might also remove true alarms...)
            continue;
          }
          if ((prevTokenIsDas
              && (equalsAny(nextToken.getToken(), ...DAS_VERB_EXCEPTIONS) ||
                  this.isFollowedByRelativeOrSubordinateClause(i, tokens))) ||
                  (i > 1 && this.hasPartialTag(tokens[i - 2], 'VER:AUX', 'VER:MOD'))) {
            // avoid false alarm for "Er kann ihr das bieten, was sie verdient."
            // avoid false alarm for "Das wissen die meisten." / "Um das sagen zu können, ..."
            // avoid false alarm for "Du musst/solltest/könntest das wissen, damit du die Prüfung bestehst / weil wir das gestern besprochen haben."
            // avoid false alarm for "Wir werden das stoppen."
            // avoid false alarm for "Wahre Liebe muss das aushalten."
            continue;
          }
        }
        if (this.isPrevProbablyRelativePronoun(tokens, i) ||
            (prevTokenIsDas && this.getTokensWithPosTagStartingWithCount(tokens, 'VER') === 1)) {// ignore sentences containing a single verb, e.g., "Das wissen viele nicht."
          continue;
        }
        this.potentiallyAddLowercaseMatch(ruleMatches, tokens[i], prevTokenIsDas, token, nextTokenIsPersonalOrReflexivePronoun, sentence);
      }
      prevTokenIsDas = nounIndicators.has(toLowerCase(tokens[i].getToken()));
      if (analyzedToken.matchesPosTagRegex(VER_MOD_AUX)) {
        isPrecededByModalOrAuxiliary = true;
      }
      const lowercaseReadings = this.language.getTagger().lookup(toLowerCase(token));
      if (this.hasNounReading(analyzedToken)) { // it's the spell checker's task to check that nouns are uppercase
        if (!this.isPotentialUpperCaseError(i, tokens, lowercaseReadings, isPrecededByModalOrAuxiliary)) {
          continue;
        }
      } else if (analyzedToken.hasPosTagStartingWith('SUB:') &&
                 i < tokens.length - 1 &&
                 Character.isLowerCase(tokens[i + 1].getToken().charCodeAt(0)) &&
                 tokens[i + 1].matchesPosTagRegex('(VER:[123]:|PA2).+')) {
        // "Viele Minderjährige sind" but not "Das wirklich Wichtige Verfahren ist"
        continue;
      }
      if (analyzedToken.getAnalyzedToken(0).getPOSTag() === null && lowercaseReadings === null) {
        continue;
      }
      if (analyzedToken.getAnalyzedToken(0).getPOSTag() === null && lowercaseReadings !== null
          && (lowercaseReadings.getAnalyzedToken(0).getPOSTag() === null || analyzedToken.getToken().endsWith('innen'))) {
        continue;  // unknown word, probably a name etc.
      }
      this.potentiallyAddUppercaseMatch(ruleMatches, tokens, i, analyzedToken, token, lowercaseReadings, sentence);
    }
    return this.toRuleMatchArray(ruleMatches);
  }

  // Java: CaseRule#getTokensWithPosTagStartingWithCount(AnalyzedTokenReadings[],String)
  getTokensWithPosTagStartingWithCount(tokens, partialPosTag) {
    return tokens.filter((token) => token.hasPosTagStartingWith(partialPosTag)).length;
  }

  // Java: CaseRule#isPotentialUpperCaseError(int,AnalyzedTokenReadings[],AnalyzedTokenReadings,boolean)
  isPotentialUpperCaseError(pos, tokens, lowercaseReadings, isPrecededByModalOrAuxiliary) {
    if (pos <= 1) {
      return false;
    }

    // "Das ist zu Prüfen." but not "Das geht zu Herzen."
    if ('zu' === tokens[pos - 1].getToken() &&
      !tokens[pos].matchesPosTagRegex('.*(NEU|MAS|FEM)$') &&
      lowercaseReadings !== null &&
      lowercaseReadings.hasPosTagStartingWith('VER:INF')) {
      return true;
    }
    if (VERHALTEN.matcher(tokens[pos].getToken()).matches()) {
      return false;
    }
    // find error in: "Man müsse Überlegen, wie man das Problem löst."
    let isPotentialError = pos < tokens.length - 3
        && tokens[pos + 1].getToken() === ','
        && equalsAny(tokens[pos + 2].getToken(), ...INTERROGATIVE_PARTICLES)
        && tokens[pos - 1].hasPosTagStartingWith('VER:MOD')
        && !tokens[pos - 1].hasLemma('mögen')
        && tokens[pos + 3].getToken() !== 'zum';
    if (!isPotentialError &&
        lowercaseReadings !== null
        && tokens[pos].hasAnyPartialPosTag('SUB:NOM:SIN:NEU:INF', 'SUB:DAT:PLU:')
        && ('zu' === tokens[pos - 1].getToken() || this.hasPartialTag(tokens[pos - 1], 'SUB', 'EIG', 'VER:AUX:3:', 'ADV:TMP', 'ABK'))) {
      // find error in: "Der Brief wird morgen Übergeben." / "Die Ausgaben haben eine Mrd. Euro Überschritten."
      isPotentialError ||= lowercaseReadings.hasPosTag('PA2:PRD:GRU:VER') && !tokens[pos - 1].hasPosTagStartingWith('VER:AUX:3') && !lowercaseReadings.hasPosTag('VER:3:PLU:PRT:NON');
      // find error in: "Er lässt das Arktisbohrverbot Überprüfen."
      // find error in: "Sie bat ihn, es zu Überprüfen."
      // find error in: "Das Geld wird Überwiesen."
      isPotentialError ||= (pos >= tokens.length - 2 || ',' === tokens[pos + 1].getToken())
        && ('zu' === tokens[pos - 1].getToken() || isPrecededByModalOrAuxiliary)
        && tokens[pos].getToken().startsWith('Über')
        && lowercaseReadings.hasAnyPartialPosTag('VER:INF:', 'PA2:PRD:GRU:VER');
    }
    return isPotentialError;
  }

  // Java: CaseRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns();
  }

  // e.g. "Ein Kaninchen, das zaubern kann" - avoid false alarm here
  //                          ^^^^^^^
  // Java: CaseRule#isPrevProbablyRelativePronoun(AnalyzedTokenReadings[],int)
  isPrevProbablyRelativePronoun(tokens, i) {
    return i >= 3 &&
      tokens[i - 1].getToken() === 'das' &&
      tokens[i - 2].getToken() === ',' &&
      tokens[i - 3].matchesPosTagRegex('SUB:...:SIN:NEU');
  }

  // Java: CaseRule#isSalutation(String)
  isSalutation(token) {
    return equalsAny(token, 'Herr', 'Hr', 'Herrn', 'Frau', 'Fr', 'Fräulein');
  }

  // Java: CaseRule#isCompany(String)
  isCompany(token) {
    return equalsAny(token, 'Firma', 'Familie', 'Unternehmen', 'Firmen', 'Bäckerei', 'Metzgerei', 'Fa');
  }

  // Java: CaseRule#isDot(String)
  isDot(token) {
    return token === '.';
  }

  // Java: CaseRule#hasNounReading(AnalyzedTokenReadings)
  hasNounReading(readings) {
    if (readings !== null && readings !== undefined) {
      // Anmeldung bis Fr. 1.12. (Fr. as abbreviation of Freitag is has a noun reading!)
      if (readings.hasPosTagStartingWith('ABK') && readings.hasPartialPosTag('SUB')) {
        return true;
      }
      // "Die Schöne Tür": "Schöne" also has a noun reading but like "SUB:AKK:SIN:FEM:ADJ", ignore that:
      const allReadings = this.lookup(javaReplace(readings.getToken(), '­', ''));  // unification in disambiguation.xml removes reading, so look up again, removing soft hyphens
      if (allReadings !== null) {
        for (const reading of allReadings.getReadings()) {
          const posTag = reading.getPOSTag();
          if (posTag !== null && posTag.includes('SUB:') && !posTag.includes(':ADJ')) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Java: CaseRule#potentiallyAddLowercaseMatch(List,AnalyzedTokenReadings,boolean,String,boolean,AnalyzedSentence)
  potentiallyAddLowercaseMatch(ruleMatches, tokenReadings, prevTokenIsDas, token, nextTokenIsPersonalOrReflexivePronoun, sentence) {
    // e.g. essen -> Essen
    if (prevTokenIsDas &&
        !nextTokenIsPersonalOrReflexivePronoun &&
        Character.isLowerCase(token.charCodeAt(0)) &&
        !substVerbenExceptions.has(token) &&
        tokenReadings.hasPosTagStartingWith('VER:INF') &&
        !tokenReadings.isIgnoredBySpeller() &&
        !tokenReadings.isImmunized()) {
      this.addRuleMatch(ruleMatches, sentence, LOWERCASE_MESSAGE, tokenReadings, uppercaseFirstChar(tokenReadings.getToken()));
    }
  }

  // Java: CaseRule#potentiallyAddUppercaseMatch(List,AnalyzedTokenReadings[],int,AnalyzedTokenReadings,String,AnalyzedTokenReadings,AnalyzedSentence)
  potentiallyAddUppercaseMatch(ruleMatches, tokens, i, analyzedToken, token, lowercaseReadings, sentence) {
    const isUpperFirst = Character.isUpperCase(token.charCodeAt(0));
    const lcWord = lowercaseFirstChar(tokens[i].getToken());
    if (isUpperFirst &&
        token.length > 1 &&     // length limit = ignore abbreviations
        !tokens[i].isIgnoredBySpeller() &&
        !tokens[i].isImmunized() &&
        !equalsAny(tokens[i - 1].getToken(), ...SENTENCE_START_EXCEPTIONS) &&
        !equalsAny(token, ...exceptions) &&
        !isAllUppercase(token) &&
        !this.isLanguage(i, tokens, token) &&
        !this.isProbablyCity(i, tokens, token) &&
        !hasReadingOfType(analyzedToken, POSType.PROPER_NOUN) &&
        !analyzedToken.isSentenceEnd() &&
        !this.isEllipsis(i, tokens) &&
        !this.isNumbering(i, tokens) &&
        !this.isNominalization(i, tokens, token, lowercaseReadings) &&
        !this.isAdverbAndNominalization(i, tokens) &&
        !this.isSpecialCase(i, tokens) &&
        !this.isAdjectiveAsNoun(i, tokens, lowercaseReadings) &&
        !this.isSingularImperative(lowercaseReadings, tokens[i]) &&  // too many names like "Kusch", "Klemm" etc.
        !this.isExceptionPhrase(i, tokens) &&
        !(i === 2 && '“' === tokens[i - 1].getToken()) &&   // closing quote at sentence start (https://github.com/languagetool-org/languagetool/issues/2558)
        !this.isCaseTypo(tokens[i].getToken()) &&
        !this.followedByGenderGap(tokens, i) &&
        !this.isNounWithVerbReading(i, tokens) &&
        !this.isInvisibleSeparator(i - 1, tokens) &&
        !this.language.getDefaultSpellingRule().isMisspelled(lcWord)) {
      if (':' === tokens[i - 1].getToken()) {
        // allow short question sentences like "Warum? Und warum?" after colon
        if (this.isQuestionEquivalentAfterColon(i, tokens)) {
          return;
        }

        const subarray = tokens.slice(0, i);

        if (this.isVerbFollowing(i, tokens, lowercaseReadings) || this.getTokensWithPosTagStartingWithCount(subarray, 'VER') === 0) {
          // empty branch in Java
        } else {
          this.addRuleMatch(ruleMatches, sentence, COLON_MESSAGE, tokens[i], lcWord);
        }
        return;
      }
      this.addRuleMatch(ruleMatches, sentence, UPPERCASE_MESSAGE, tokens[i], lcWord);
    }
  }

  // Java: CaseRule#followedByGenderGap(AnalyzedTokenReadings[],int)
  followedByGenderGap(tokens, i) {
    if (i + 2 < tokens.length && tokens[i + 1].getToken() === ':' && javaMatches(tokens[i + 2].getToken(), 'in|innen')) {
      return true;
    }
    return false;
  }

  // Java: CaseRule#isCaseTypo(String)
  isCaseTypo(token) {
    return TWO_UPPERCASE_CHARS.matcher(token).matches();   // e.g. "WUrzeln"
  }

  // Java: CaseRule#isSingularImperative(AnalyzedTokenReadings,AnalyzedTokenReadings)
  isSingularImperative(lowercaseReadings, token) {
    return lowercaseReadings !== null && lowercaseReadings.hasPosTagStartingWith('VER:IMP:SIN') &&
              'Ein' !== token.getToken() && 'Eine' !== token.getToken();
  }

  // Java: CaseRule#isNounWithVerbReading(int,AnalyzedTokenReadings[])
  isNounWithVerbReading(i, tokens) {
    return tokens[i].hasPosTagStartingWith('SUB') &&
        tokens[i].hasPosTagStartingWith('VER:INF');
  }

  // Java: CaseRule#isInvisibleSeparator(int,AnalyzedTokenReadings[])
  isInvisibleSeparator(i, tokens) {  // u2063 is used internally by our browser add-on
    return i >= 0 && i < tokens.length && tokens[i].getToken().length > 0 && tokens[i].getToken().charAt(0) === '⁣';
  }

  // Java: CaseRule#isVerbFollowing(int,AnalyzedTokenReadings[],AnalyzedTokenReadings)
  isVerbFollowing(i, tokens, lowercaseReadings) {
    const subarray = tokens.slice(i);
    if (lowercaseReadings !== null) {
      subarray[0] = lowercaseReadings;
    }
    // capitalization after ":" requires an independent clause to follow
    // if there is not a single verb, the tokens cannot be part of an independent clause
    return this.getTokensWithPosTagStartingWithCount(subarray, 'VER:') !== 0;
  }

  // Java: CaseRule#isColonQuestionWord(String)
  isColonQuestionWord(word) {
    return equalsAnyIgnoreCase(word, ...COLON_QUESTION_WORDS);
  }

  // Java: CaseRule#addRuleMatch(List,AnalyzedSentence,String,AnalyzedTokenReadings,String)
  addRuleMatch(ruleMatches, sentence, msg, tokenReadings, fixedWord) {
    const ruleMatch = new RuleMatch(this, sentence, tokenReadings.getStartPos(), tokenReadings.getEndPos(), msg);
    ruleMatch.setSuggestedReplacement(fixedWord);
    ruleMatches.push(ruleMatch);
  }

  // e.g. "a) bla bla"
  // Java: CaseRule#isNumbering(int,AnalyzedTokenReadings[])
  isNumbering(i, tokens) {
    return i >= 2
            && equalsAny(tokens[i - 1].getToken(), ')', ']')
            && NUMERALS_EN.matcher(tokens[i - 2].getToken()).matches()
            && !(i > 3 && tokens[i - 3].getToken() === '('
              && tokens[i - 4].hasPosTagStartingWith('SUB:')); // no numbering "Der Vater (51) fuhr nach Rom."
  }

  // Java: CaseRule#isEllipsis(int,AnalyzedTokenReadings[])
  isEllipsis(i, tokens) {
    return equalsAny(tokens[i - 1].getToken(), ']', ')') && // sentence starts with […]
           ((i === 4 && tokens[i - 2].getToken() === '…') || (i === 6 && tokens[i - 2].getToken() === '.'));
  }

  // Java: CaseRule#isNominalization(int,AnalyzedTokenReadings[],String,AnalyzedTokenReadings)
  isNominalization(i, tokens, token, lowercaseReadings) {
    const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
    // TODO: "vor Schlimmerem", "Er hatte Schlimmes zu befürchten"
    // TODO: wir finden den Fehler in "Die moderne Wissenschaftlich" nicht, weil nicht alle
    // Substantivierungen in den Morphy-Daten stehen (z.B. "Größte" fehlt) und wir deshalb nur
    // eine Abfrage machen, ob der erste Buchstabe groß ist.
    if (startsWithUppercase(token) && !this.isNumber(token) && !(this.hasNounReading(nextReadings) ||
        (nextReadings !== null && isNumeric(nextReadings.getToken()))) && !javaMatches(token, 'Alle[nm]')) {
      if (lowercaseReadings !== null && lowercaseReadings.hasPosTag('PRP:LOK+TMP+CAU:DAT+AKK')) {
        return false;
      }
      // Ignore "das Dümmste, was je..." but not "das Dümmste Kind"
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const prevPrevToken = i >= 2 ? tokens[i - 2] : null;
      const prevPrevPrevToken = i >= 3 ? tokens[i - 3] : null;
      const prevTokenStr = prevToken !== null ? prevToken.getToken() : '';
      if (equalsAny(prevTokenStr, 'und', 'oder', 'beziehungsweise') && prevPrevToken !== null &&
          (tokens[i].hasPartialPosTag('SUB') && tokens[i].hasPartialPosTag(':ADJ')) || //"das dabei Erlernte und Erlebte ist ..." -> 'Erlebte' is correct here
          (prevPrevToken.hasPartialPosTag('SUB') && !this.hasNounReading(nextReadings) && // "die Ausgaben für Umweltschutz und Soziales"
              lowercaseReadings !== null && lowercaseReadings.hasPartialPosTag('ADJ') && prevTokenStr !== ','))  {
        return true;
      }
      if (lowercaseReadings !== null && lowercaseReadings.hasPosTag('PA1:PRD:GRU:VER')) {
        // "aus sechs Überwiegend muslimischen Ländern"
        return false;
      }
      return ((prevToken !== null && IRGEND_ETC.matcher(prevTokenStr).matches() && tokens[i].hasPartialPosTag('SUB'))
              || this.isNumber(prevTokenStr)) ||
         (this.hasPartialTag(prevToken, 'ART', 'PRO:') && !(((i < 4 && tokens.length > 4) || prevToken.getReadings().length === 1 || prevPrevToken.hasLemma('sein')) && prevToken.hasPosTagStartingWith('PRO:PER:NOM:'))  && !prevToken.hasPartialPosTag(':STD')) ||  // "die Verurteilten", "etwas Verrücktes", "ihr Bestes"
         (this.hasPartialTag(prevPrevPrevToken, 'ART') && this.hasPartialTag(prevPrevToken, 'PRP') && this.hasPartialTag(prevToken, 'SUB')) || // "die zum Tode Verurteilten"
         (this.hasPartialTag(prevPrevToken, 'PRO:', 'PRP') && this.hasPartialTag(prevToken, 'ADJ', 'ADV', 'PA2', 'PA1')) ||  // "etwas schön Verrücktes", "mit aufgewühltem Innerem"
         (this.hasPartialTag(prevPrevPrevToken, 'PRO:', 'PRP') && this.hasPartialTag(prevPrevToken, 'ADJ', 'ADV') && this.hasPartialTag(prevToken, 'ADJ', 'ADV', 'PA2')) || // "etwas ganz schön Verrücktes"
         (tokens[i].hasPosTagStartingWith('SUB:') && this.hasPartialTag(prevToken, 'GEN') && !this.hasPartialTag(nextReadings, 'PKT')); // "Parks Vertraute Choi Soon Sil ist zu drei Jahren Haft verurteilt worden."
    }
    return false;
  }

  // Java: CaseRule#isNumber(String)
  isNumber(token) {
    if (isNumeric(token)) {
      return true;
    }
    const lookup = this.lookup(lowercaseFirstChar(token));
    return lookup !== null && lookup.hasPosTag('ZAL');
  }

  // Java: CaseRule#isAdverbAndNominalization(int,AnalyzedTokenReadings[])
  isAdverbAndNominalization(i, tokens) {
    const prevPrevToken = i > 1 ? tokens[i - 2].getToken() : '';
    const prevToken = i > 0 ? tokens[i - 1] : null;
    const token = tokens[i].getToken();
    const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
    // ignore "das wirklich Wichtige":
    return equalsAnyIgnoreCase('das', prevPrevToken) && this.hasPartialTag(prevToken, 'ADV')
            && startsWithUppercase(token) && !this.hasNounReading(nextReadings);
  }

  // Java: CaseRule#hasPartialTag(AnalyzedTokenReadings,String...)
  hasPartialTag(token, ...posTags) {
    if (token !== null && token !== undefined) {
      for (const posTag of posTags) {
        if (token.hasPartialPosTag(posTag)) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: CaseRule#isSpecialCase(int,AnalyzedTokenReadings[])
  isSpecialCase(i, tokens) {
    const prevToken = i > 1 ? tokens[i - 1].getToken() : '';
    const token = tokens[i].getToken();
    const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
    // ignore "im Allgemeinen gilt" but not "im Allgemeinen Fall":
    return equalsAnyIgnoreCase('im', prevToken) && 'Allgemeinen' === token && !this.hasNounReading(nextReadings);
  }

  // Java: CaseRule#isAdjectiveAsNoun(int,AnalyzedTokenReadings[],AnalyzedTokenReadings)
  isAdjectiveAsNoun(i, tokens, lowercaseReadings) {
    const prevToken = i > 0 ? tokens[i - 1] : null;
    const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
    let prevLowercaseReadings = null;

    if (i > 1 && equalsAny(tokens[i - 2].getToken(), ...SENTENCE_START_EXCEPTIONS)) {
      prevLowercaseReadings = this.lookup(toLowerCase(prevToken.getToken()));
    }

    // ignore "Der Versuch, Neues zu lernen / Gutes zu tun / Spannendes auszuprobieren"
    const isPossiblyFollowedByInfinitive = nextReadings !== null && nextReadings.getToken() === 'zu';
    const isFollowedByInfinitive = nextReadings !== null && !isPossiblyFollowedByInfinitive && nextReadings.hasPartialPosTag('EIZ');
    const isFollowedByPossessiveIndicator = nextReadings !== null && equalsAny(nextReadings.getToken(), ...POSSESSIVE_INDICATORS);

    const isUndefQuantifier = prevToken !== null && equalsAny(toLowerCase(prevToken.getToken()), ...UNDEFINED_QUANTIFIERS);
    const isPrevDeterminer = prevToken !== null
                               && (this.hasPartialTag(prevToken, 'ART', 'PRP', 'ZAL') || this.hasPartialTag(prevLowercaseReadings, 'ART', 'PRP', 'ZAL'))
                               && !prevToken.hasPartialPosTag(':STD');
    const isPrecededByVerb = prevToken !== null && prevToken.matchesPosTagRegex('VER:(MOD:|AUX:)?[1-3]:.*') && !prevToken.hasLemma('sein');
    if (!isPrevDeterminer && !isUndefQuantifier && !(isPossiblyFollowedByInfinitive || isFollowedByInfinitive)
        && !(isPrecededByVerb && lowercaseReadings !== null && this.hasPartialTag(lowercaseReadings, 'ADJ:', 'PA') && nextReadings !== null &&
             !equalsAny(nextReadings.getToken(), 'und', 'oder', ','))
        && !(isFollowedByPossessiveIndicator && this.hasPartialTag(lowercaseReadings, 'ADJ', 'VER')) // "Wacht auf, Verdammte dieser Welt!"
        && !(prevToken !== null && prevToken.hasPosTag('KON:UNT') && !this.hasNounReading(nextReadings) && nextReadings !== null && !nextReadings.hasPosTag('KON:NEB'))) {
      const prevPrevToken = i > 1 && prevToken !== null && prevToken.hasPartialPosTag('ADJ') ? tokens[i - 2] : null;
      // Another check to avoid false alarms for "eine Gruppe Aufständischer starb"
      if (!isPrecededByVerb && lowercaseReadings !== null && prevToken !== null) {
        if (prevToken.hasPartialPosTag('SUB:') && lowercaseReadings.matchesPosTagRegex('(ADJ|PA2):GEN:PLU:MAS:GRU:SOL.*')) {
          return nextReadings !== null && !nextReadings.hasPartialPosTag('SUB:');
        } else if (nextReadings !== null && nextReadings.getReadingsLength() === 1 && prevToken.hasPosTagStartingWith('PRO:PER:NOM:') && nextReadings.hasPosTag('ADJ:PRD:GRU')) {
          // avoid false alarm "Weil er Unmündige sexuell missbraucht haben soll,..."
          return true;
        }
      }
      // Another check to avoid false alarms for "ein politischer Revolutionär"
      if (!this.hasPartialTag(prevPrevToken, 'ART', 'PRP', 'ZAL')) {
        return false;
      }
    }

    // ignore "die Ausgewählten" but not "die Ausgewählten Leute":
    for (const reading of tokens[i].getReadings()) {
      const posTag = reading.getPOSTag();
      if ((posTag === null || posTag.includes('ADJ')) && !this.hasNounReading(nextReadings) && !isNumeric(nextReadings !== null ? nextReadings.getToken() : '')) {
        if (posTag === null && this.hasPartialTag(lowercaseReadings, 'PRP:LOK', 'PA2:PRD:GRU:VER', 'PA1:PRD:GRU:VER', 'ADJ:PRD:KOM', 'ADV:TMP')) {
          // skip to avoid a false true for, e.g. "Die Zahl ging auf Über 1.000 zurück."/ "Dies gilt schon lange als Überholt." / "Bis Bald!"
          // but not for "Er versuchte, Neues zu wagen."
        } else {
          return true;
        }
      }
    }

    return false;
  }

  // Java: CaseRule#isLanguage(int,AnalyzedTokenReadings[],String)
  isLanguage(i, tokens, token) {
    const maybeLanguage = (token.endsWith('sch') && LanguageNames.get().contains(token)) ||
                            LanguageNames.get().contains(removeEnd(removeEnd(token, 'n'), 'e'));   // z.B. "im Japanischen" / z.B. "ins Japanische übersetzt"
    const prevToken = i > 0 ? tokens[i - 1] : null;
    const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
    return maybeLanguage && (!this.hasNounReading(nextReadings) || (prevToken !== null && prevToken.getToken() === 'auf'));
  }

  // Java: CaseRule#isProbablyCity(int,AnalyzedTokenReadings[],String)
  isProbablyCity(i, tokens, token) {
    const hasCityPrefix = equalsAny(token, 'Klein', 'Groß', 'Neu');
    if (hasCityPrefix) {
      const nextReadings = i < tokens.length - 1 ? tokens[i + 1] : null;
      return nextReadings !== null && (!nextReadings.isTagged() || nextReadings.hasPosTagStartingWith('EIG'));
    }
    return false;
  }

  // Java: CaseRule#isFollowedByRelativeOrSubordinateClause(int,AnalyzedTokenReadings[])
  isFollowedByRelativeOrSubordinateClause(i, tokens) {
    if (i < tokens.length - 4) {
      return ',' === tokens[i + 1].getToken()
             && (equalsAny(tokens[i + 2].getToken(), ...INTERROGATIVE_PARTICLES) || tokens[i + 2].hasPosTag('KON:UNT'));
    }
    return false;
  }

  // Java: CaseRule#isExceptionPhrase(int,AnalyzedTokenReadings[])
  isExceptionPhrase(i, tokens) {
    for (const patterns of getExceptionPatternsCached()) {
      for (let j = 0; j < patterns.length; j++) {
        if (patterns[j].matches(tokens[i].getToken())) {
          const startIndex = i - j;
          if (CaseRule.compareLists(tokens, startIndex, startIndex + patterns.length - 1, ...patterns)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Java: CaseRule#compareLists(AnalyzedTokenReadings[],int,int,StringMatcher...)
  static compareLists(tokens, startIndex, endIndex, ...patterns) {
    if (startIndex < 0) {
      return false;
    }
    let i = 0;
    for (let j = startIndex; j <= endIndex; j++) {
      if (i >= patterns.length || j >= tokens.length || !patterns[i].matches(tokens[j].getToken())) {
        return false;
      }
      i++;
    }
    return true;
  }

  /**
   * Returns true if the token at position i starts a short question fragment
   * that forms a valid Satzäquivalent after a colon, per Duden rules.
   */
  // Java: CaseRule#isQuestionEquivalentAfterColon(int,AnalyzedTokenReadings[])
  isQuestionEquivalentAfterColon(i, tokens) {
    if (i < tokens.length - 1) {
      const word = tokens[i].getToken();
      const next = tokens[i + 1].getToken();
      // "Warum?"
      if (this.isColonQuestionWord(word) && '?' === next) {
        return true;
      }
      // "Und warum?"
      if (equalsAnyIgnoreCase(word, ...COLON_QUESTION_CONJUNCTIONS)
          && i < tokens.length - 2
          && this.isColonQuestionWord(tokens[i + 1].getToken())
          && '?' === tokens[i + 2].getToken()) {
        return true;
      }
    }
    return false;
  }

  // Java: CaseRule#lookup(String)
  lookup(word) {
    try {
      return this.language.getTagger().lookup(word);
    } catch (e) {
      if (e instanceof IOException) {
        throw new RuntimeException("Could not lookup '" + word + "'.", e);
      }
      throw e;
    }
  }
}
