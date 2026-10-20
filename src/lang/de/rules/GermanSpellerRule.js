// org.languagetool.rules.de.GermanSpellerRule (hunspell based German speller with compound handling, ignore/prohibit lists and suggestion pipeline)
import { CompoundAwareHunspellRule } from '../../../core/rules/spelling/hunspell/CompoundAwareHunspellRule.js';
import { CommonFileTypes } from '../../../core/rules/spelling/CommonFileTypes.js';
import { MorfologikMultiSpeller } from '../../../core/rules/spelling/morfologik/MorfologikMultiSpeller.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { StringMatcher } from '../../../core/patterns/StringMatcher.js';
import { registerComponent } from '../../../core/language/components.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { DICTIONARY_FILENAME_EXTENSION } from '../../../core/JLanguageToolConstants.js';
import {
  isAllUppercase, lowercaseFirstChar, startsWithLowercase, startsWithUppercase, uppercaseFirstChar,
} from '../../../core/text/StringTools.js';
import { GermanCompoundTokenizer } from '../tokenizers/GermanCompoundTokenizer.js';
import { GermanWordSplitter } from '../../../lib/wordsplitter/GermanWordSplitter.js';
import { InputTooLongException } from '../../../lib/wordsplitter/InputTooLongException.js';
import { LineExpander } from './LineExpander.js';
import { isVowel } from './GermanTools.js';
import {
  ADDITIONAL_SUGGESTIONS_ENTRIES, ONLY_SUGGESTIONS, PREVENT_SUGGESTION_PATTERNS,
} from './GermanSpellerRuleData.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { Character } from '../../../lib/java/Character.js';
import { BufferedReader } from '../../../lib/java/io.js';
import { decodeUtf8Java } from '../../../lib/java/charset.js';
import { arrayGet, listGet } from '../../../lib/java/arrays.js';
import { IOException, IndexOutOfBoundsException, NullPointerException, RuntimeException } from '../../../lib/java/errors.js';
import {
  capitalize, endsWithAny, equalsAny, isAllLowerCase, isAllUpperCase, removeEnd, replaceOnce, startsWithAny, substringAfter, uncapitalize,
} from '../../../lib/java/StringUtils.js';
import {
  charAt, equalsIgnoreCase, indexOf, javaMatches, javaReplace, javaReplaceAll, javaReplaceFirst, javaSplit, javaTrim, substring, toLowerCase,
} from '../../../lib/java/strings.js';

const { topMatch } = SuggestedReplacement;

const RULE_ID = 'GERMAN_SPELLER_RULE'; // Java: GermanSpellerRule#RULE_ID
const MIN_WORD_LENGTH = 5;
const MAX_WORD_LENGTH = 40;
const MAX_EDIT_DISTANCE = 2;

// Java: GermanSpellerRule static Pattern constants
const adjSuffix = "(affin|basiert|konform|widrig|fähig|haltig|bedingt|gerecht|würdig|relevant|" +
    "übergreifend|tauglich|untauglich|artig|bezogen|orientiert|fremd|liebend|hassend|bildend|hemmend|abhängig|zentriert|" +
    "förmig|mäßig|pflichtig|ähnlich|spezifisch|verträglich|technisch|typisch|frei|arm|freundlich|feindlich|gemäß|neutral|seitig|begeistert|geeignet|ungeeignet|berechtigt|sicher|süchtig|resistent|verachtend|schädigend)";
const missingAdjPattern = Pattern.compile("[a-zöäüß]{3,25}" + adjSuffix + "(er|es|en|em|e)?");
const compoundPatternWithHeit = Pattern.compile(".*(heit|keit|ion|ität|schaft|ung|tät)s");
const compoundPatternWithAction = Pattern.compile("Action|Session|Champion|Jung|Wahrung");
const compoundPatternWithFirst = Pattern.compile("First|Firsten");  // First/First are too easy to mix up
const compoundPatternSpecialEnding = Pattern.compile(".*(mus|ss|z|ß|innen|chen)");

const GENDER_STAR_PATTERN = Pattern.compile("([A-ZÖÄÜ][a-zöäüß]{1,25}|[A-ZÖÄÜ]{1,10}-[A-ZÖÄÜ][a-zöäüß]{1,25})[*:_][a-zöäüß]{1,25}");  // z.B. "Jurist:innenausbildung"
const FILE_UNDERLINE_PATTERN = Pattern.compile("[a-zA-Z0-9-]{1,25}_[a-zA-Z0-9-]{1,25}\\.[a-zA-Z]{1,5}");
const MENTION_UNDERLINE_PATTERN = Pattern.compile("@[a-zA-Z0-9-]{1,25}_[a-zA-Z0-9_-]{1,25}");

const FIRST_UPPER_CASE = Pattern.compile("[A-ZÖÄÜ][a-zöäüß-]+");
const HYPHENED_UPPER_WORD = Pattern.compile("[A-ZÖÄÜ][a-zöäüß]+-[\\\\-\\\\s]?[a-zöäüß]+");
const HYPHENED_WORD = Pattern.compile("[a-zöäüß]+-[\\-\\s][A-ZÖÄÜa-zöäüß]+");

const START_WITH_SPIEL = Pattern.compile("Spielzugs?|Spielzugangs?|Spielzuganges|Spielzugbuchs?|Spielzugbüchern?|Spielzuges|Spielzugverluste?|Spielzugverluste[ns]");
const END_WITH_SCHAFTE = Pattern.compile("[A-ZÖÄÜ][a-zöäß-]+schafte");
const WORD_WITH_PUNCT = Pattern.compile("\\w\\p{Punct}?");
const LOWER_CASE_WORD = Pattern.compile("[a-zöäü]-.+");
const SPECIAL_CASE = Pattern.compile(".{3,25}(tum|ing|ling|heit|keit|schaft|ung|ion|tät|at|um)");
const SPECIAL_CASE_WITH_S = Pattern.compile(".{3,25}(tum|ing|ling|heit|keit|schaft|ung|ion|tät|at|um)s");
const AUTENTISCH_WITH_CASES = Pattern.compile("[Aa]utentisch(e[nmsr]?|ste[nmsr]?|ere[nmsr]?)?");
const SYMPHATISCH = Pattern.compile("symphatisch(e[nmsr]?|ste[nmsr]?|ere[nmsr]?)?");
const BRILLIANT_WITH_CASES = Pattern.compile("brilliant(e[nmsr]?|ere[nmsr]?|este[nmsr]?)?");
const RECHTMASIG_WITH_CASES = Pattern.compile("rechtmässig(e[nmsr]?|ere[nmsr]?|ste[nmsr]?)?");
const HOLZ_SPIEGEL_PANEL_COMPOUND = Pattern.compile("(Holz|Spiegel)panel(s|en?)?");
const SBHAN_PREFIX = Pattern.compile("SBahn(en|hofs?|zug(e?s)?|zügen?|höfen?|netz(e[ns]?)?|tunnel[sn]?|linien?)?");
const UBAHN_PREFIX = Pattern.compile("UBahn(en|hofs?|zug(e?s)?|zügen?|höfen?|netz(e[ns]?)?|tunnel[sn]?|linien?)?");
const SCHAF_PATTERN = Pattern.compile(".{3,}schaf(s|en)?");
const SCHAFE_PATTERN = Pattern.compile("(Alpenschaf|Berberschaf|Bergschaf|Blauschaf|Brillenschaf|Dachsteinschaf|Deichschaf|Dickhornschaf|Feinwollschaf|Fettschwanzschaf|Fleischschaf|Fuchsschaf|Glücksschaf|Hausschaf|Jungschaf|Karakulschaf|Klonschaf|Merinoschaf|Milchschaf|Mondschaf|Nutzschaf|Rhönschaf|Riesenwildschaf|Schaukelschaf|Schneeschaf|Steinschaf|Steppenschaf|Superschaf|Waldschaf|Weideschaf|Wildschaf|Wollschaf|Zackelschaf|Zuchtschaf|Zwergblauschaf)(s|en)?");

const START_WITH_NEGER = Pattern.compile("neger.*");
const CONTAINS_NEGER = Pattern.compile(".+neger(s|n|in|innen)?.+");
const CONTAINS_NEGER_2 = Pattern.compile(".+-neger(s|n|in|innen)?-.+");
const CONTAINS_UNCOMMON_LOWERCASED_NOUN_AT_BEGINNING = Pattern.compile("^(hunger|zeit|käse|zwiebel|kommoden?|lager|angst|freund|feind)\\s.+");
const CONTAINS_UNCOMMON_LOWERCASED_NOUN_AT_END = Pattern.compile(".+\\s(hunger|zeit|käse|zwiebel|kommoden?|lager|angst|freund|feind)$");
const ENDS_WITH_IBELKEIT_IBLICHKEIT = Pattern.compile(".*ibel[hk]eit$");
const ALLMAHLLIG = Pattern.compile("[aA]llmähll?i(g|ch)(e[mnrs]?)?");
const CONTAINS_MAYONNAISE = Pattern.compile(".*[mM]a[jy]onn?[äe]se.*");
const CONTAINS_MASZNAME = Pattern.compile(".*[mM]a(ss|ß)namen?.*");
const CONTAINS_RESERVIERUNG = Pattern.compile(".*[rR]es(a|er)[vw]i[he]?rung(en)?");
const STARTS_WITH_RESCHASCHIER = Pattern.compile("[rR]eschaschier.+");
const ENDS_WITH_LABORANTS = Pattern.compile(".*[lL]aborants$");
const PROFESSIONELL = Pattern.compile("[pP]roff?ess?ion([äe])h?ll?(e[mnrs]?)?");
const VERSTANDNIS = Pattern.compile("[vV]erstehendniss?(es?)?");
const STARTS_WITH_DIAGNOSZIER = Pattern.compile("diagno[sz]ier.*");
const STARTING_WITH_SINGLE_CHAR = Pattern.compile("\\p{L} \\p{L}+");
const SPECIAL_CASE_THIRD = Pattern.compile("[A-ZÖÄÜ][a-zöäüß]{2,}(ei|öl)$");
const ZB = Pattern.compile("z[bB]");
const STARTS_WITH_ZB = Pattern.compile("z[bB].");
const DIRECTION = Pattern.compile("nord|ost|süd|west");
const WOCHENTAGE = Pattern.compile("Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag");
const WOCHENTAGE_S = Pattern.compile("(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s");
const CAMEL_CASE = Pattern.compile(".*(\\p{Ll}\\p{Lu}|\\p{Lu}{2,}\\p{Ll}).*");
const COMPOUND_TYPOS = Pattern.compile("([Ee]mail|[Ii]reland|[Kk]reissaal|[Mm]akeup|[Ss]tandart).*");
const COMPOUND_END_TYPOS = Pattern.compile(".*(gruße|schaf(s|en)?)$");
const INFIX_S_SUFFIXES = Pattern.compile(".*(heit|(s|[^c]t|x)ion|ität|keit|ling|ung|schaft|tum)$");
const WECHSELINFIX = Pattern.compile("(arbeit|dienstag|donnerstag|freitag|montag|mittwoch|link|recht|samstag|sonntag|verband)s?");
const CONFUSED_PREFIXES = Pattern.compile("bach|bade?|wi(e)?der");
const NEEDS_TO_BE_PLURAL = Pattern.compile("absolvent(in)?|adressat|aktie|antenne|apache|arbeitnehmer(in)?|ärztin|assistent(in)?|astronom(in)?|asylant(in)?|autor(in)?|azteke|bakterie|ballade|bauer|billion|bisexuelle|blume|bonze|börse|bot(e|in)|buche|bürg(e|in)|bürokrat(in)?|chrysantheme|dän(e|in)?|debatte|debitor(in)?|decke|diakon(in)?|diktator(in)?|direktor(in)?|doktorand(in)?|domäne|dozent(in)?|drohne|druid(e|in)?|düne|ehre|eibe|elefant|elektron|ellipse|emittent(in)?|elfe|elle|enge|erbse|eremit|erde|erste|esche|exot(e|in)?|expert(e|in)?|extremist(in)?|fabrikant(in)?|falke|fassade|farbe|fasan|favorit(in)?|felge|ferien|figur|fluor|frage|franz(ose|ösin)|frau|frisur|förde|galle|gatt(e|in)?|gerät|gepard|gezeit|gigant|gilde|göttin|griech(e|in)?|halt|heid(e|in)?|herde|historie|hölle|höhle|hose|hugenott(e|in)?|hund|hündin|immigrant(in)?|investor(in)?|irokes(e|in)|islamist(in)?|jesuit(in)?|jungfer|jungfrau|junggesell(e|in)|juror(in)?|kadett|kante|kaskade|kathode|katholik(in)?|katze|kette|kid|klasse|kirche|klaue|klient(in)?|klinge|knappe|koeffizient|kojote|komet|kommentator(in)?|komödie|kompliz(e|in)|konkurrent(in)?|konfirmand(in)?|konsonant|kontrahent(in)?|krake|kralle|kranke|krähe|kraut|krippe|kurd(e|in)|kuriosität|kurve|kusine|küste|laie|laterne|laute|legende|lehne|leise|lektor(in)?|leopard|lerche|leserin|lieferant(in)?|lippe|loge|lotse|länge|läuse|löwe|lücke|luke|made|mädel|maske|maßnahme|matriarchin|menge|mensch|metapher|methode|metropole|miene|miete|migrant(in)?|million|mitte|maus|moderator(in)?|monarch(in)?|mongol(e|in)|mormone|mücke|mühle|musikant(in)?|mysterium|nerv|niederlage|nixe|nonne|note|obdachlose|ode|organist|panne|papagei|parzelle|pastor(in)?|pate|patient|patriarch(in)?|petze|pfadfinderin|pfanne|pfaffe|pfau|pfeife|platte|polle|pomade|pomeranze|posse|praktikant(in)?|prinz(essin)?|prise|produzent(in)?|prominente|prophet(in)?|prototyp|prälat|psychopath(in)?|puppe|pädophile|pygmäe|rabe|radikale|rakete|rampe|ranke|rassist(in)?|rate|raupe|rendite|repressalie|rest|riese|rinde|rind|robbe|robe|romanist|rose|ross|route|nummer|runde|russ(e|in)?|röhre|rübe|salbe|schabe|schale|scheide|schelle|schenke|schere|sphäre|dicke|kröte|schauspielerin|schimpans(e|in)|schlampe|schlange|schluchte|schmiere|schnake|schnalle|schneide|schnelle|schokolade|schotte|schurke|schwabe|schwalbe|schwede|schwule|seele|seide|seite|senator(in)?|serb(e|in)?|serie|silbe|skulptur|sonne|sorge|sorte|spanne|sparte|spatz|sperre|spitze|sproße|spule|stalaktit|steppe|straße|streife|studie|stunde|stütze|tabelle|therapeut(in)?|tinte|tote|toilette|torte|traube|treffe|treppe|truhe|träne|tunte|tüte|tyrann|urne|utensil|vandal(e|in)|vasall(in)?|vene|versicherte|verwandte|veteran(in)?|virtuose|vorname|waffe|wanne|ware|watte|wehe|welle|welpe|wiese|wirtin|zar(in)?|zentrum|zutat");
const SUBNOMPLUFEM_EXCEPTIONS = Pattern.compile(".+(atie|lyse|metrie|sophie|omie)|absage|accessoire|allergie|analogie|anästhesie|anatomie|anomalie|archäologie|aufnahme|balance|barriere|batterie|creme|deponie|dürre|einlage|energie|folklore|franchise|gemeinde|glu[ck]ose|gülle|hanse|hefe|hirse|infanterie|kolonie|kontrolle|lounge|massage|mathe|melodie|nässe|parfümerie|pharmazie|pflege|pipeline|poesie|psychotherapie|regie|renaissance|säure|single|sprache|spree|stärke|suche|teilnahme|theorie|therapie|vanille|wiederaufnahme|wende");
const CITIES_EXCEPTIONS = Pattern.compile("bahnhof|flughafen|haupt");
const INVALID_COMP_PART_1 = Pattern.compile("adresse|ahmen|kamp|kontrolle|leuchte|norden|osten|perspektive|schule|sprache|stelle|suche|süden|westen"); // words that can never be the first part of a compound (e. g. 'Sprache') or rare words that belong to a common confusion pair (e. g. Kamp/Kampf)
const INVALID_COMP_PART_2 = Pattern.compile("kamp"); // 'kamp' will most likely be typo for 'kampf'
const SUBINF_SINGULAR_OBJECT = Pattern.compile("putzen|rauchen|sein|spielen");
const ARBEIT_COMP = Pattern.compile("(gebe|nehme)(r(s|n|innen|in)?|nde[mnr]?)");
const BACH_COMP = Pattern.compile("aue|bett|biograph(ie|in)?|chor|forelle|gesellschaft|kantate|lauf|niederung|stelze|tal|verein");
const BAD_COMP = Pattern.compile("accessoire|architektur|besitzer(in)?|design|eintritt|fenster|größe|grund|kollektion|konzept|lösung|maß|möbel|nutzer(in)?|regal|spezialist(in)?|spiegel|straße|tür|utensil");
const LINK_COMP = Pattern.compile("element|inhalt|liste|portal|text|titel|tracking|verzeichnis");
const LINKS_COMP = Pattern.compile("abbieger(in)?|abweichler(in)?|anwalt|anwältin|anwaltschaft|ausfall|auslage|ausleger(in)?|au(ss|ß)en|bündnis|drall|drehung|extremer?|extremis(t|tin|mus)|faschis(t|tin|mus)|fraktion|galopp|gewinde|händ(er|erin|igkeit)|hörnchen|innen|intellektueller?|katholizis(t|tin|mus)|koalition|konter|kurs|kurve|lastigkeit|lenker|nationalis(t|tin|mus)|opposition|orientierung|partei|populis(t|tin|mus)|radikal(e|er|ismus|ist|istin)|regierung|ruck|rutsch|schnitt|schuss|schwenk(ung)?|sektierer(in)?|steuerung|terror(t|tin|ismus)|verbinder(in)?|verkehr|wendung|wichser");
const PERSON_SUFFIXES = Pattern.compile(".+([dlt]ant(in)?|arch(in)?|graf(in)?|gog(e|in)|([bdfghnoptuvxyz]|he|([inrt]a|o)(l)|(for|ga|i)m|[^f]r)(ist)(in)?|krat(in)?|man(e|in)|naut(in)?|olog(e|in)|(d|[pt]i|r)ent(in)?|seur(in)?|soph(in)?|tit(in)?|.+[^b]urg(in)?)$");
const RECHT_COMP = Pattern.compile("bank|eck|fertigung|gläubigkeit|haber|haberei|leitung|losigkeit|mäßigkeit|winkligkeit|zeitigkeit");
const RECHTS_COMP = Pattern.compile("abbieger(in)?|abteilung|akt|akte|angelegenheit|ansicht|anspruch|anwalt|anwalts|anwaltschaft|anwendung|anwältin|auffassung|aufsicht|auskunft|ausleger(in)?|ausschuss|au(ss|ß)en|begehren|begriff|behelf|beistand|berater|beratung|bereich|beschwerde|beugung|beziehung|brecher|bruch|dienst|drall|durchsetzung|empfinden|entwicklung|setzung|experte|experten|extremer?|extremis(t|tin|mus)|fall|fehler|folge|form|fortbildung|frage|fähigkeit|gebiet|gebieten|gelehrte|gelehrter|geschichte|geschäft|gewinde|gleichheit|grund|grundlage|grundsatz|gründen|gut|gutachten|gültigkeit|güter|handlung|hilfe|händ(er|erin|igkeit)|hängigkeit|inhaber|institut|katholizis(t|tin|mus)|klick|konformität|kraft|kreis|kurve|lage|lastigkeit|lehre|lenker|medizin|mediziner|meinung|missbrauch|mittel|mitteln|mängel|nachfolge|nachfolger|nachfolgerin|nationalis(t|tin|mus)|natur|norm|ordnung|persönlichkeit|pflege|pfleger|pflicht|philosophie|politik|populis(t|tin|mus)|position|praxis|problem|quelle|radikal(e|er|ismus|ist|istin)|rahmen|rat|ratgeber(in)?|ruck|rutsch|sache|sachen|satz|schutz|sicherheit|sinn|sprache|soziologie|sprechung|staat|staatlichkeit|stand|status|stellung|streit|streitigkeit|system|terroris(t|tin|ismus)|texte|texter|thema|theorie|tipp|titel|träger|unsicherheit|verfolgung|vergleichung|verhältnis|verkehr|verletzung|verletzungen|verordnung|verstoß|verständnis|verteidiger|verteidigung|vertreter|vertretung|vorschrift|wahl|weg|wesen|widrigkeit|wirksamkeit|wirkung|wissenschaft|wissenschaften|wissenschaftler|zug|änderung");
const VERBAND_COMP = Pattern.compile("klammer|kasten|kiste|mull|material|päckchen|platz|raum|schere|zeug|zimmer");
const VERBANDS_COMP = Pattern.compile("chef(in)?|flug|funktionär(in)?|kasse|klage|leben|leitung|leiter(in)?|ligist(in)|material|päckchen|präsident(in)?|presse|spiel|vertreter(in)|vorsitzender?|vorstand|wechsel|zeichen|zeit(schrift|ung)");
const WIDER_COMP = Pattern.compile("glanz|hall|haken|klage|klang|lager|rechtliche|ruf|spiel|spruch|sehen|stand|streit|wille");
const WOCHENTAG_COMP = Pattern.compile("abend|mittag|morgen|nachmittag|vormittag");

const POTENTIAL_BINNEN_I = Pattern.compile(".*((?<=(\\w))In).*");
const GENDER_NEUTRAL_SPECIAL_CHRS_SIN = Pattern.compile(".*[\\*:_/]in$");
const GENDER_NEUTRAL_SPECIAL_CHRS_PLU = Pattern.compile(".*[\\*:_/]in.+");
const GENDER_NEUTRAL_SLASH_HYPHEN = Pattern.compile(".*/-in.+");
const GENDER_STAR = Pattern.compile("((?<=(\\w))In|[\\*:_]in|/-in)");
const GENDER2_STAR2 = Pattern.compile(".*((?<=(\\w))In|[\\*:_]in|/-in).*");

const WECHSELNUMERUS = Pattern.compile("wort|welt");
const WELTEN_COMP = Pattern.compile("Brand|Bummler(in)?|Drama|Wende");
const WOERTER_COMP = Pattern.compile("Buch|Liste|Verzeichnis");

const EXPAND_PATTERN = Pattern.compile(".*/[ESNAPFT]");

// Java: GermanSpellerRule#lcDoNotSuggestWords
const lcDoNotSuggestWords = new Set([
  // some of these are taken from hunspell's dictionary where non-suggested words use tag "/n":
  'verjuden', 'verjudet', 'verjudeter', 'verjudetes', 'verjudeter', 'verjudeten', 'verjudetem',
  'entjuden', 'entjudet', 'entjudete', 'entjudetes', 'entjudeter', 'entjudeten', 'entjudetem',
  'auschwitzmythos',
  'judensippe', 'judensippen',
  'judensippschaft', 'judensippschaften',
  'nigger', 'niggern', 'niggers', 'neger', 'negers', 'negern',
  'rassejude', 'rassejuden', 'rassejüdin', 'rassejüdinnen',
  'möse', 'mösen', 'fotze', 'fotzen',
  'judenfrei', 'judenfreie', 'judenfreier', 'judenfreies', 'judenfreien', 'judenfreiem',
  'judenrein', 'judenreine', 'judenreiner', 'judenreines', 'judenreinen', 'judenreinem',
  'judenmord', 'judenmorden', 'judenmörder',
]);

const MAX_TOKEN_LENGTH = 200; // Java: GermanSpellerRule#MAX_TOKEN_LENGTH

const verbStems = new Set(); // Java: GermanSpellerRule#verbStems (static)
const verbPrefixes = new Set(); // Java: GermanSpellerRule#verbPrefixes (static)
const otherPrefixes = new Set(); // Java: GermanSpellerRule#otherPrefixes (static)
const oldSpelling = new Set(); // Java: GermanSpellerRule#oldSpelling (static)

let additionalSuggestions = null; // Java: GermanSpellerRule#ADDITIONAL_SUGGESTIONS (built on first use; the static block has no side effects)

// Java: GermanSpellerRule#ADDITIONAL_SUGGESTIONS (static block with put/putRepl)
function getAdditionalSuggestionsMap() {
  if (additionalSuggestions === null) {
    additionalSuggestions = ADDITIONAL_SUGGESTIONS_ENTRIES.map(([pattern, f]) => [StringMatcher.regexp(pattern), f]);
  }
  return additionalSuggestions;
}

let splitterInstance = null; // Java: GermanSpellerRule#splitter (own plain jwordsplitter instance, created on first use)

// Java: GermanSpellerRule#getSplitter()
function getSplitter() {
  if (splitterInstance === null) splitterInstance = new GermanWordSplitter(false);
  return splitterInstance;
}

// Java: GermanSpellerRule$ExpandingReader
class ExpandingReader extends BufferedReader {
  // Java: ExpandingReader(Reader)
  constructor(text) {
    super(text);
    this.buffer = [];
    this.lineExpander = new LineExpander();
  }

  // Java: ExpandingReader#readLine()
  readLine() {
    if (this.buffer.length === 0) {
      const line = super.readLine();
      if (line === null) {
        return null;
      }
      this.buffer.push(...this.lineExpander.expandLine(line));
    }
    if (this.buffer.length === 0) throw new IndexOutOfBoundsException('Index 0 out of bounds for length 0');
    return this.buffer.shift();
  }
}

// Java: RegExUtils#removePattern(String,String)
function removePattern(text, regex) {
  return Pattern.compile(regex, Pattern.DOTALL).matcher(text).replaceAll('');
}

// Java: GermanSpellerRule#removeTrailingS(String)
function removeTrailingS(part1) {
  return removeEnd(part1, 's');
}

// Java: GermanSpellerRule#removeTrailingHyphen(String)
function removeTrailingHyphen(part1) {
  return removeEnd(part1, '-');
}

// Java: GermanSpellerRule#removeTrailingSAndHyphen(String)
function removeTrailingSAndHyphen(part1) {
  return removeTrailingS(removeTrailingHyphen(part1));
}

// Java: GermanSpellerRule (CompoundAwareHunspellRule with German compound and suggestion logic)
export class GermanSpellerRule extends CompoundAwareHunspellRule {
  static FQCN = 'org.languagetool.rules.de.GermanSpellerRule';
  static RULE_ID = RULE_ID;
  static verbStems = verbStems; // test hooks for the oracle data probe (X-DESPELL de-data)
  static verbPrefixes = verbPrefixes;
  static otherPrefixes = otherPrefixes;
  static oldSpelling = oldSpelling;
  static lcDoNotSuggestWords = lcDoNotSuggestWords;

  // Java: GermanSpellerRule(ResourceBundle,German) / (..., UserConfig, String) / (..., UserConfig, String, List, LanguageModel)
  constructor(messages, language, userConfig = null, languageVariantPlainTextDict = null, altLanguages = [], languageModel = null) {
    super(messages, language, language.getNonStrictCompoundSplitter(), () => GermanSpellerRule.getSpeller(language, userConfig, languageVariantPlainTextDict), userConfig, altLanguages, languageModel);
    this.wordsToBeIgnoredInCompounds = new Set();
    this.wordStartsToBeProhibited = new Set();
    this.wordEndingsToBeProhibited = new Set();
    this.wordsNeedingInfixS = new Set();
    this.lineExpander = new LineExpander();
    this.addExamplePair(Example.wrong('LanguageTool kann mehr als eine <marker>nromale</marker> Rechtschreibprüfung.'),
      Example.fixed('LanguageTool kann mehr als eine <marker>normale</marker> Rechtschreibprüfung.'));
    this.compoundTokenizer = language.getStrictCompoundTokenizer();
    this.nonStrictCompoundTokenizer = GermanCompoundTokenizer.getNonStrictInstance();
    this.synthesizer = language.getSynthesizer();
    this.loadFile('/de/words_infix_s.txt', this.wordsNeedingInfixS);
    this.loadFile('/de/verb_stems.txt', verbStems);
    this.loadFile('/de/verb_prefixes.txt', verbPrefixes);
    this.loadFile('/de/other_prefixes.txt', otherPrefixes);
    this.loadFile('/de/alt_neu.csv', oldSpelling);
  }

  // Java: GermanSpellerRule#loadFile(String,Set)
  loadFile(fileInClasspath, set) {
    const lines = getDataBroker().getFromResourceDirAsLines(fileInClasspath);
    for (const line of lines) {
      if (!line.startsWith('#')) {
        set.add(arrayGet(javaSplit(javaTrim(line), ';'), 0));
      }
      if (EXPAND_PATTERN.matcher(line).matches()) {
        throw new RuntimeException(`Syntax '/{X}' for expansion not supported in this file: '${line}' in ${fileInClasspath}`);
      }
      if (line.endsWith('_in')) {
        throw new RuntimeException(`Syntax '_in' not supported in this file: '${line}' in ${fileInClasspath}`);
      }
    }
  }

  // Java: GermanSpellerRule#init()
  init() {
    super.init();
    this.ignoreWordsWithLength = 1;
    const pattern = `(${this.nonWordPattern.pattern()}|(?<=[\\d°])-|-(?=\\d+))`;
    this.nonWordPattern = Pattern.compile(pattern);
  }

  // Java: GermanSpellerRule#getId()
  getId() {
    return RULE_ID;
  }

  // Java: GermanSpellerRule#isIgnoredNoCase(String)
  isIgnoredNoCase(word) {
    return this.wordsToBeIgnored.has(word)
      // words from spelling.txt also accepted in uppercase (e.g. sentence start, bullet list items):
      || (FIRST_UPPER_CASE.matcher(word).matches() && this.wordsToBeIgnored.has(toLowerCase(word, this.language.getLocale())))
      || (this.ignoreWordsWithLength > 0 && word.length <= this.ignoreWordsWithLength);
  }

  // Java: GermanSpellerRule#getMessage(String,SuggestedReplacement)
  getMessage(origWord, firstSuggestion) {
    // Note: will not work for words like "Abgasausstoss" where there's more than one string of "ss"
    // and the first one is not the one we're looking for
    if (firstSuggestion === null) {
      throw new NullPointerException('Cannot invoke "org.languagetool.rules.SuggestedReplacement.getReplacement()" because "firstSuggestion" is null');
    }
    if (replaceOnce(origWord, 'ss', 'ß') === firstSuggestion.getReplacement()) {
      const firstSz = indexOf(origWord, 'ss');
      if (firstSz >= 2) {
        const prevPrevChar = origWord.charAt(firstSz - 2);
        const prevChar = origWord.charAt(firstSz - 1);
        if (isVowel(prevPrevChar) && isVowel(prevChar)) {
          return `Nach einer Silbe aus zwei Vokalen (hier: ${prevPrevChar}${prevChar}) schreibt man 'ß' statt 'ss'.`;
        } else {
          return `Nach einer lang gesprochenen Silbe (hier: ${prevChar}) schreibt man 'ß' statt 'ss'.`;
        }
      }
    }
    return this.messages.getString('spelling');
  }

  // Java: GermanSpellerRule#getCandidates(String)
  getCandidates(word) {
    let partList;
    try {
      partList = getSplitter().getAllSplits(word);
    } catch (e) {
      if (!(e instanceof InputTooLongException)) throw e;
      partList = [];
    }
    const candidates = [];
    for (const parts of partList) {
      let tmp = super.getCandidatesForParts(parts);
      tmp = tmp.filter((k) => !HYPHENED_UPPER_WORD.matcher(k).matches() && !HYPHENED_WORD.matcher(k).matches()); // avoid e.g. "Direkt-weg"
      tmp = tmp.filter((k) => !k.includes('-s-')); // avoid e.g. "Geheimnis-s-voll"
      if (!word.endsWith('-')) {
        tmp = tmp.filter((k) => !k.endsWith('-')); // avoid "xyz-" unless the input word ends in "-"
      }
      candidates.push(...tmp);
      if (parts.length === 2) {
        // e.g. "inneremedizin" -> "innere Medizin", "gleichgroß" -> "gleich groß"
        candidates.push(`${parts[0]} ${parts[1]}`);
        if (this.isNounOrProperNoun(uppercaseFirstChar(parts[1]))) {
          candidates.push(`${parts[0]} ${uppercaseFirstChar(parts[1])}`);
        }
      }
      if (parts.length === 2 && !parts[0].endsWith('s')) {
        // so we get e.g. Einzahlungschein -> Einzahlungsschein
        candidates.push(`${parts[0]}s${parts[1]}`);
      }
      if (parts.length === 2 && parts[1].startsWith('s')) {
        // so we get e.g. Ordnungshütter -> Ordnungshüter (Ordnungshütter is split as Ordnung + shütter)
        const firstPart = parts[0];
        const secondPart = parts[1];
        candidates.push(...super.getCandidatesForParts([`${firstPart}s`, secondPart.substring(1)]));
      }
    }
    return candidates;
  }

  // Java: GermanSpellerRule#isProhibited(String)
  isProhibited(word) {
    if (super.isProhibited(word)) {
      return true;
    }
    for (const w of this.wordStartsToBeProhibited) { // Java: stream().anyMatch
      if (word.startsWith(w)) return true;
    }
    for (const w of this.wordEndingsToBeProhibited) {
      if (word.endsWith(w)) return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#addIgnoreWords(String)
  addIgnoreWords(origLine) {
    // hack: Swiss German doesn't use "ß" but always "ss" - replace this, otherwise
    // misspellings (from Swiss point-of-view) like "äußere" wouldn't be found:
    const line = this.language.getShortCodeWithCountryAndVariant() === 'de-CH' ? javaReplace(origLine, 'ß', 'ss') : origLine;
    if (origLine.endsWith('-*')) {
      // words whose line ends with "-*" are only allowed in hyphenated compounds
      this.wordsToBeIgnoredInCompounds.add(substring(line, 0, line.length - 2));
      return;
    }
    const words = this.expandLine(line);
    for (const word of words) {
      super.addIgnoreWords(word);
    }
  }

  // Java: GermanSpellerRule#expandLine(String)
  expandLine(line) {
    return this.lineExpander.expandLine(line);
  }

  // Java: GermanSpellerRule#createWrongSplitMatch(AnalyzedSentence,List,int,String,String,String,int)
  createWrongSplitMatch(sentence, ruleMatchesSoFar, pos, coveredWord, suggestion1, suggestion2, prevPos) {
    if (LOWER_CASE_WORD.matcher(suggestion2).matches()) {
      // avoid confusing matches for e.g. "haben -sehr" (was: "habe n-sehr")
      return null;
    }
    return super.createWrongSplitMatch(sentence, ruleMatchesSoFar, pos, coveredWord, suggestion1, suggestion2, prevPos);
  }

  // Java: GermanSpellerRule#getSuggestions(String)
  getSuggestions(word) {
    let suggestions = super.getSuggestions(word);
    suggestions = suggestions.filter((s) => this.acceptSuggestion(s));
    if (word.endsWith('.')) {
      // To avoid losing the "." of "word" if it is at the end of a sentence.
      suggestions = suggestions.map((s) => (s.endsWith('.') ? s : `${s}.`));
    }
    suggestions = suggestions.filter((k) => k !== word
      && (!k.endsWith('-') || word.endsWith('-')) // no "-" at end (#2450)
      && !STARTING_WITH_SINGLE_CHAR.matcher(k).matches()); // single chars like in "ü berstenden" (#2610)
    return suggestions;
  }

  // Java: GermanSpellerRule#acceptSuggestion(String)
  acceptSuggestion(s) {
    return !PREVENT_SUGGESTION_PATTERNS.some((p) => p.matcher(s).matches())
      && !s.includes('--')
      && !s.endsWith('roulett')
      && !s.endsWith('-s') // https://github.com/languagetool-org/languagetool/issues/4042
      && !s.endsWith(' de') // https://github.com/languagetool-org/languagetool/issues/4042
      && !s.endsWith(' en') // https://github.com/languagetool-org/languagetool/issues/4042
      && !s.endsWith(' Artigen')
      && !s.endsWith(' Artige')
      && !s.endsWith(' artigen')
      && !s.endsWith(' artiges')
      && !s.endsWith(' artiger')
      && !s.endsWith(' artige')
      && !s.endsWith(' artig')
      && !s.endsWith(' gen')
      && !s.endsWith(' ehe')
      && !s.endsWith(' ende')
      && !s.endsWith(' enden')
      && !s.endsWith(' enge')
      && !s.endsWith(' förmig')
      && !s.endsWith(' förmige')
      && !s.endsWith(' förmigen')
      && !s.endsWith(' förmiger')
      && !s.endsWith(' förmiges')
      && !s.startsWith('Doppel ')
      && !s.startsWith('Kombi ');
  }

  // Java: GermanSpellerRule#getSpellingFilePaths(String)
  static getSpellingFilePaths(langCode) {
    const paths = [...CompoundAwareHunspellRule.getSpellingFilePaths(langCode)];
    paths.push(`/${langCode}/hunspell/spelling_recommendation.txt`);
    return paths;
  }

  // Java: GermanSpellerRule#getSpeller(Language,UserConfig,String)
  static getSpeller(language, userConfig, languageVariantPlainTextDict) {
    try {
      const langCode = language.getShortCode();
      const morfoFile = `/${langCode}/hunspell/${langCode}_${language.getCountries()[0]}${DICTIONARY_FILENAME_EXTENSION}`;
      if (getDataBroker().resourceExists(morfoFile)) { // spell data will not exist in LibreOffice/OpenOffice context
        const paths = [...GermanSpellerRule.getSpellingFilePaths(langCode)];
        if (languageVariantPlainTextDict !== null) {
          paths.push(languageVariantPlainTextDict);
        }
        const streams = CompoundAwareHunspellRule.getStreams(paths);
        const variantReader = GermanSpellerRule.getVariantReader(languageVariantPlainTextDict);
        return new MorfologikMultiSpeller(morfoFile, new ExpandingReader(decodeUtf8Java(Buffer.concat(streams))), paths,
          variantReader, languageVariantPlainTextDict, userConfig, MAX_EDIT_DISTANCE, null);
      } else {
        return null;
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException('Could not set up morfologik spell checker', e);
      throw e;
    }
  }

  // Java: GermanSpellerRule#getVariantReader(String)
  static getVariantReader(languageVariantPlainTextDict) {
    let variantReader = null;
    if (languageVariantPlainTextDict !== null && languageVariantPlainTextDict.length !== 0) {
      const variantStream = getDataBroker().getFromResourceDirAsStream(languageVariantPlainTextDict);
      variantReader = new ExpandingReader(decodeUtf8Java(variantStream));
    }
    return variantReader;
  }

  // Java: GermanSpellerRule#filterForLanguage(List)
  filterForLanguage(suggestions) {
    if (this.language.getShortCodeWithCountryAndVariant() === 'de-CH') {
      for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i];
        suggestions[i] = javaReplace(s, 'ß', 'ss');
      }
    }
    // Remove suggestions like "Mafiosi s" and "Mafiosi s.":
    removeIf(suggestions, (s) => javaSplit(s, ' ').some((k) => WORD_WITH_PUNCT.matcher(k).matches()));
    // This is not quite correct as it might remove valid suggestions that start with "-",
    // but without this we get too many strange suggestions that start with "-" for no apparent reason
    // (e.g. for "Gratifikationskrisem" -> "-Gratifikationskrisen"):
    removeIf(suggestions, (s) => s.length > 1 && s.startsWith('-'));
  }

  // Java: GermanSpellerRule#sortSuggestionByQuality(String,List)
  sortSuggestionByQuality(misspelling, suggestions) {
    // filter some undesired inflected forms
    const filteredSuggestions = [];
    let readingsList = [];
    readingsList = this.getTagger().tag(suggestions);
    let lemmaToFilter = '';
    let formToAccept = '';
    for (const readings of readingsList) {
      if (readings.hasAnyPartialPosTag('ADJ') || readings.hasAnyPartialPosTag('SUB')
        || readings.hasAnyPartialPosTag('PA1:') || readings.hasAnyPartialPosTag('PA2:')) {
        if (readings.getToken().endsWith(substring(misspelling, misspelling.length - 2))) {
          formToAccept = readings.getToken();
          lemmaToFilter = readings.getAnalyzedToken(0).getLemma();
          break;
        }
      }
    }
    if (lemmaToFilter.length !== 0 && formToAccept.length !== 0 && misspelling.length > 1) {
      for (let i = 0; i < suggestions.length; i++) {
        if (suggestions[i] === formToAccept || !listGet(readingsList, i).hasAnyLemma(lemmaToFilter)) {
          if (!filteredSuggestions.includes(suggestions[i])) {
            filteredSuggestions.push(suggestions[i]);
          }
        }
      }
    } else {
      filteredSuggestions.push(...suggestions);
    }
    // end of filtering
    const result = [];
    const topSuggestions = []; // candidates from suggestions that get boosted to the top
    for (const suggestion of filteredSuggestions) {
      if (equalsIgnoreCase(misspelling, suggestion)) { // this should be preferred - only case differs
        topSuggestions.push(suggestion);
      } else if (suggestion.includes(' ')) { // this should be preferred - prefer e.g. "vor allem":
        // suggestions at the sentence end include a period sometimes, clean up for ngram lookup
        const words = javaSplit(javaReplaceFirst(suggestion, '\\.$', ''), ' ', 2);
        if (this.languageModel !== null && words.length === 2) {
          // language model available, test if split word occurs at all / more frequently than alternative
          const nonSplit = this.languageModel.getPseudoProbability([words[0] + words[1]]);
          const split = this.languageModel.getPseudoProbability(words);
          if (nonSplit.getProb() > split.getProb() || split.getProb() === 0) {
            result.push(suggestion);
          } else {
            topSuggestions.push(suggestion);
          }
        } else {
          topSuggestions.push(suggestion);
        }
      } else {
        result.push(suggestion);
      }
    }
    result.splice(0, 0, ...topSuggestions);
    return result;
  }

  // Java: GermanSpellerRule#getFilteredSuggestions(List)
  getFilteredSuggestions(wordsOrPhrases) {
    const result = [];
    for (const wordOrPhrase of wordsOrPhrases) {
      const words = this.tokenizeText(wordOrPhrase);
      if (words.length >= 2 && this.isAdjOrNounOrUnknown(words[0]) && this.isNounOrUnknown(words[1])
        && startsWithUppercase(words[0]) && startsWithUppercase(words[1])) {
        // ignore, seems to be in the form "Release Prozess" which is *probably* wrong
      } else if (words.length === 2 && this.isAdjBaseForm(words[0]) && !startsWithUppercase(words[0]) && this.isSubVerInf(words[1])) {
        // filter "groß Denken" in "großdenken"
      } else {
        result.push(wordOrPhrase);
      }
    }
    return result;
  }

  // Java: GermanSpellerRule#isNounOrUnknown(String)
  isNounOrUnknown(word) {
    const readings = this.getTagger().tag([word]);
    return readings.some((reading) => reading.hasPosTagStartingWith('SUB') || reading.isPosTagUnknown());
  }

  // Java: GermanSpellerRule#isOnlyNoun(String)
  isOnlyNoun(word) {
    const readings = this.getTagger().tag([word]);
    for (const reading of readings) {
      const accept = reading.getReadings().every((k) => k.getPOSTag() !== null && k.getPOSTag().startsWith('SUB:'));
      if (!accept) {
        return false;
      }
    }
    return readings.every((reading) => reading.matchesPosTagRegex('SUB:.*'));
  }

  // Java: GermanSpellerRule#isAdjOrNounOrUnknown(String)
  isAdjOrNounOrUnknown(word) {
    const readings = this.getTagger().tag([word]);
    return readings.some((reading) => reading.hasPosTagStartingWith('SUB') || reading.hasPosTagStartingWith('ADJ') || reading.isPosTagUnknown());
  }

  // Java: GermanSpellerRule#isNounOrProperNoun(String)
  isNounOrProperNoun(word) {
    const readings = this.getTagger().tag([word]);
    return readings.some((reading) => reading.hasPosTagStartingWith('SUB') || reading.hasPosTagStartingWith('EIG'));
  }

  // Java: GermanSpellerRule#isSubVerInf(String)
  isSubVerInf(word) {
    const readings = this.getTagger().tag([word]);
    return readings.some((reading) => reading.matchesPosTagRegex('SUB:.*:INF'));
  }

  // Java: GermanSpellerRule#isAdjBaseForm(String)
  isAdjBaseForm(word) {
    const readings = this.getTagger().tag([word]);
    return readings.some((reading) => reading.hasPosTagStartingWith('ADJ:PRD:GRU'));
  }

  // Java: GermanSpellerRule#ignoreElative(String)
  ignoreElative(word) {
    if (startsWithAny(word, 'bitter', 'dunkel', 'erz', 'extra', 'früh',
      'gemein', 'hyper', 'lau', 'mega', 'minder', 'stock', 'super', 'tod', 'ultra', 'ur')) {
      const lastPart = removePattern(word, '^(bitter|dunkel|erz|extra|früh|gemein|grund|hyper|lau|mega|minder|stock|super|tod|ultra|ur|voll)');
      return lastPart.length >= 3 && !this.isMisspelled(lastPart);
    }
    return false;
  }

  // Java: GermanSpellerRule#isMisspelled(String)
  isMisspelled(word) {
    if (SCHAF_PATTERN.matcher(word).matches() && !SCHAFE_PATTERN.matcher(word).matches()) {
      const variant = javaReplaceFirst(javaReplaceFirst(javaReplaceFirst(word, 'schaf$', 'schaft'), 'schafs$', 'schaft'), 'schafen$', 'schaften');
      if (!this.isMisspelled(variant)) {
        return true;
      }
    }
    if (word.startsWith('Spielzug') && !START_WITH_SPIEL.matcher(word).matches()) {
      return true;
    }
    if (word.startsWith('Standart') && word !== 'Standarte' && word !== 'Standarten' && !word.startsWith('Standartenträger') && !word.startsWith('Standartenführer')) {
      return true;
    }
    if (word.endsWith('schafte') && END_WITH_SCHAFTE.matcher(word).matches()) {
      return true;
    }
    return super.isMisspelled(word);
  }

  // Java: GermanSpellerRule#ignoreWord(List,int)
  ignoreWordAt(words, idx) {
    const word = listGet(words, idx);
    if (word.length > MAX_TOKEN_LENGTH) {
      return true;
    }
    const ignore = super.ignoreWordAt(words, idx);
    const ignoreUncapitalizedWord = !ignore && idx === 0 && super.ignoreWord(uncapitalize(listGet(words, 0)));
    let ignoreByHyphen = false;
    let ignoreBulletPointCase = false;
    if (!ignoreUncapitalizedWord) {
      // happens e.g. with list items in Google Docs, which introduce ﻿, which here appears as
      // an empty token:
      ignoreBulletPointCase = !ignore && idx === 1 && listGet(words, 0).length === 0
        && startsWithUppercase(word)
        && this.isMisspelled(word)
        && !this.isMisspelled(toLowerCase(word));
    }
    let ignoreHyphenatedCompound = false;
    if (!ignore && !ignoreUncapitalizedWord) {
      if (word.includes('-')) {
        if (idx > 0 && listGet(words, idx - 1) === '' && startsWithAny(word, 'stel-', 'tel-')) {
          // accept compounds such as '100stel-Millimeter' or '5tel-Gramm'
          return !this.isMisspelled(substringAfter(word, '-'));
        } else {
          ignoreByHyphen = word.endsWith('-') && this.ignoreByHangingHyphen(words, idx);
        }
      }
      ignoreHyphenatedCompound = !ignoreByHyphen && this.ignoreCompoundWithIgnoredWord(word);
    }
    if (CommonFileTypes.getSuffixPattern().matcher(word).matches()) {
      return true;
    }
    if (missingAdjPattern.matcher(word).matches()) {
      const firstPart = uppercaseFirstChar(javaReplaceFirst(word, `${adjSuffix}(er|es|en|em|e)?`, ''));
      // We append "test" to see if the word plus "test" is accepted as a compound. This way, we get the
      // infix 's' handled properly (e.g. "arbeitsartig" is okay, "arbeitartig" is not). It does not accept
      // all compounds, though, as hunspell's compound detection is limited ("Zwiebacktest"):
      // TODO: see isNeedingFugenS()
      // https://www.sekada.de/korrespondenz/rechtschreibung/artikel/grammatik-in-diesen-faellen-steht-das-fugen-s/
      if (this.isMisspelled(word)) {
        if (!this.isMisspelled(firstPart)
          && !SPECIAL_CASE.matcher(firstPart).matches()
          && this.isOnlyNoun(firstPart)
          && !this.isMisspelled(`${firstPart}test`)) { // does hunspell accept this? takes infex-s into account automatically
          return true;
        } else if (!this.isMisspelled(firstPart)
          && !SPECIAL_CASE.matcher(firstPart).matches()) {
          // will not accept
        } else if (firstPart.endsWith('s') && !this.isMisspelled(substring(firstPart, 0, firstPart.length - 1))
          && SPECIAL_CASE_WITH_S.matcher(firstPart).matches()
          && this.isOnlyNoun(substring(firstPart, 0, firstPart.length - 1))
          && !this.isMisspelled(`${firstPart}test`)) { // does hunspell accept this? takes infex-s into account automatically
          return true;
        } else if (firstPart.endsWith('s') && !this.isMisspelled(substring(firstPart, 0, firstPart.length - 1))
          && SPECIAL_CASE.matcher(firstPart).matches()) {
          // will not accept
        }
      }
    }
    if (word.endsWith('mitarbeitende') || word.endsWith('mitarbeitenden')) {
      if (this.hunspell.spell(javaReplaceFirst(word, 'mitarbeitenden?', 'mitarbeiter'))) {
        return true;
      }
    }
    if ((idx + 1 < words.length && (word.endsWith('.mp') || word.endsWith('.woff')) && listGet(words, idx + 1) === '')
      || (idx > 0 && listGet(words, idx - 1) === '' && equalsAny(word, 'sat', 'stel', 'tel', 'stels', 'tels'))) {
      // e.g. ".mp3", "3sat", "100stel", "5tel" - the check for the empty string is because digits were removed during
      // hunspell-style tokenization before
      return true;
    }
    return ignore || ignoreUncapitalizedWord || ignoreBulletPointCase || ignoreByHyphen || ignoreHyphenatedCompound || this.ignoreElative(word);
  }

  // Java: GermanSpellerRule#ignorePotentiallyMisspelledWord(String)
  ignorePotentiallyMisspelledWord(word) {
    // Remove dot
    let wordNoDot = word.endsWith('.') ? word.substring(0, word.length - 1) : word;

    if (this.isValidWordLength(word) || startsWithLowercase(word) || this.isProhibited(word) || this.isProhibited(wordNoDot)) {
      // Exclude cases like weird/irrelevant words and very long words that can cause crashes
      return false;
    }
    // Check for words that are likely to be typos
    if (this.isProbablyTypo(word)) {
      return false;
    }

    // Format gender neutral forms here to make splitting easier, but
    //   we need to double-check the word later to avoid words in camel case
    //   that look similar to gender-neutral language (e. g. AktienIndex).
    const wordNoDotOrg = wordNoDot;
    // "Expert*innen" -> "Expertinnen"
    // "ExpertInnen"  -> "Expertinnen"
    wordNoDot = GENDER_STAR.matcher(wordNoDot).replaceFirst('in');

    // Return false if a word is written in CamelCase
    if (!this.isValidCamelCase(wordNoDot)) {
      return false;
    }

    let parts = this.compoundTokenizer.tokenize(wordNoDot);
    if (parts.length === 1) {
      parts = this.nonStrictCompoundTokenizer.tokenize(wordNoDot);
    }
    // If at least one element in *parts* at position i equals "s", then append "s" to element at i-1
    parts = this.avoidInfixSAsSingleToken(parts);

    // Handle cases for hyphenated compounds that don't depend on tokenization
    // and preprocess further
    if (wordNoDot.includes('-')) {
      // Split original word by hyphen
      const splitByHyphen = [...javaSplit(wordNoDot, '-')];
      const lastPart = listGet(splitByHyphen, splitByHyphen.length - 1);

      if (!this.isNoun(lastPart) && this.isNoun(uppercaseFirstChar(lastPart))) {
        // Make sure that last part is uppercase, if it is probably a noun
        // e.g. "Implementierungs-pflicht"
        return false;
      }

      for (const w of splitByHyphen) {
        if (this.isMisspelled(w) && this.isMisspelled(removeTrailingSAndHyphen(w))) {
          return false;
        }
      }

      // Split tokenized parts that contain hyphens
      // example: "Wacht" + "ums-pistole" -> "Wacht" + "ums" + "pistole"
      parts = this.splitPartsByHyphen(parts);

      // Hyphens are often removed by the tokenizer. Restore them to determine later if a compound is correct
      parts = this.restoreRemovedHyphens(parts, wordNoDot);
    }

    // Make sure that the individual parts of the compound have appropriate length.
    // Short words can also be typos.
    if (!this.isValidPartLength(parts)) {
      return false;
    }

    // Make sure that compound is not written in old spelling
    if (parts.length >= 2) {
      if (this.isOldSpelling(parts)) {
        return false;
      }
    }

    // Now that the compound has probably been split correctly,
    //   we can use this information to check,
    //   if a part matching '(?<=(\w))In|[\*:_]in|/-in'
    //   is actually gender-neutral language
    if (GENDER2_STAR2.matcher(wordNoDotOrg).matches()) {
      if (!this.isValidGenderNeutralWord(parts, wordNoDotOrg)) {
        return false;
      }
    }

    if (parts.length === 2) {
      return this.processTwoPartCompounds(parts[0], parts[1]);
    } else if (parts.length === 3) {
      return this.processThreePartCompound(parts);
    } else {
      // more than three parts can be supported later
      return false;
    }
  }

  // Java: GermanSpellerRule#isValidWordLength(String)
  isValidWordLength(word) {
    return word.length <= MIN_WORD_LENGTH || word.length >= MAX_WORD_LENGTH;
  }

  // Java: GermanSpellerRule#isValidPartLength(List)
  isValidPartLength(parts) {
    // don't assume very short parts (like "Ei") are correct, these can easily be typos:
    if (parts.length === 2) {
      return parts[0].length >= 3 && parts[1].length >= 4;
    }
    if (parts.length === 3) {
      return parts[0].length >= 3 && parts[1].length >= 4 && parts[2].length >= 4;
    }
    return false;
  }

  // Java: GermanSpellerRule#isOldSpelling(List)
  isOldSpelling(parts) {
    for (const part of parts) {
      const cleanedPart = removeTrailingSAndHyphen(part);
      if (part.endsWith('s')) {
        if (oldSpelling.has(uppercaseFirstChar(part)) || oldSpelling.has(uppercaseFirstChar(cleanedPart))
          || oldSpelling.has(lowercaseFirstChar(part)) || oldSpelling.has(lowercaseFirstChar(cleanedPart))) {
          return true;
        }
      } else if (oldSpelling.has(uppercaseFirstChar(cleanedPart)) || oldSpelling.has(lowercaseFirstChar(cleanedPart))) {
        return true;
      }
    }
    return false;
  }

  // Java: GermanSpellerRule#isValidGenderNeutralWord(List,String)
  isValidGenderNeutralWord(parts, word) {
    let start = 0;
    for (const part of parts) {
      let end = start + part.length;

      let toCheck = substring(word, start, end);
      if (toCheck.startsWith('I') && start > 0) {
        // e. g. AktienIndex
        return false;
      }
      if (POTENTIAL_BINNEN_I.matcher(toCheck).matches()) {
        if (this.isMisspelled(javaReplaceFirst(toCheck, '((?<=(\\w))In)', 'in'))
          || (!toCheck.endsWith('In') && !toCheck.endsWith('Innen'))) {
          return false;
        }
      }
      if (GENDER_NEUTRAL_SPECIAL_CHRS_SIN.matcher(toCheck).matches()) {
        if (this.isMisspelled(javaReplaceFirst(toCheck, '[\\*:_/]in', 'in'))) {
          return false;
        }
        end++;
      }
      if (GENDER_NEUTRAL_SPECIAL_CHRS_PLU.matcher(toCheck).matches()) {
        if (end < word.length) {
          end++;
          toCheck = substring(word, start, end);
        }
        if (this.isMisspelled(javaReplaceFirst(toCheck, '[\\*:_/]in', 'in'))
          || (!toCheck.endsWith('in') && !toCheck.endsWith('innen'))) {
          return false;
        }
      }
      if (GENDER_NEUTRAL_SLASH_HYPHEN.matcher(toCheck).matches()) {
        if (end + 1 < word.length) {
          end += 2;
          toCheck = substring(word, start, end);
        }
        if (this.isMisspelled(javaReplaceFirst(toCheck, '/-in', 'in'))
          || (!toCheck.endsWith('in') && !toCheck.endsWith('innen'))) {
          return false;
        }
      }

      start = end;
    }
    return true;
  }

  // Java: GermanSpellerRule#isAdjective(String)
  isAdjective(word) {
    return this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('ADJ:'));
  }

  // Java: GermanSpellerRule#isNoun(String)
  isNoun(word) {
    return this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('SUB:'));
  }

  // Java: GermanSpellerRule#processTwoPartCompounds(String,String)
  processTwoPartCompounds(part1, part2) {
    // Expects two parts of a compound and checks
    //  if their POS tags are correct,
    //  if an infix s is missing or
    //  if an infix s is incorrect
    const part1upcased = uppercaseFirstChar(part1);
    const part2upcased = uppercaseFirstChar(part2);
    const part1WithoutHyphen = removeTrailingHyphen(part1);
    const part2upcasedIsNoun = this.isNoun(part2upcased);
    const part2upcasedIsMispelled = this.isMisspelled(uppercaseFirstChar(part2upcased));

    if (INVALID_COMP_PART_1.matcher(lowercaseFirstChar(part1WithoutHyphen)).matches()) {
      return false;
    }
    if (INVALID_COMP_PART_2.matcher(lowercaseFirstChar(part2)).matches()) {
      return false;
    }

    let part1WithoutInfixS = part1upcased;

    // Sometimes part1 requires singular or plural
    let part1Lemma = this.findLemmaForNoun(removeTrailingHyphen(part1));
    //
    if (part1Lemma === '' && removeTrailingHyphen(part1).endsWith('s')) {
      part1Lemma = this.findLemmaForNoun(removeTrailingSAndHyphen(part1));
      part1WithoutInfixS = removeTrailingS(part1upcased);
    }

    // Allow part1 to be a plural noun if...

    // ... part2 is a nominalized verb or...
    if (this.isNounNomPlu(part1WithoutInfixS) && !this.isNounNomSin(part1WithoutInfixS) && !this.isCountryOrRegionNomSin(part1WithoutInfixS)
      && (!this.isSubVerInf(part2upcased)
        || (this.isSubVerInf(part2upcased) && SUBINF_SINGULAR_OBJECT.matcher(lowercaseFirstChar(part2)).matches()))
      && !this.needsToBePlural(lowercaseFirstChar(part1Lemma))
      && !WECHSELNUMERUS.matcher(lowercaseFirstChar(part1Lemma)).matches()
      && !WECHSELINFIX.matcher(lowercaseFirstChar(removeTrailingS(part1Lemma))).matches()) {
      return false;
    }
    // ... part1 always needs to be plural or...
    if (this.needsToBePlural(lowercaseFirstChar(part1Lemma)) && this.isNounNomSin(part1WithoutInfixS)) {
      return false;
    }
    // ... part1
    if (WECHSELNUMERUS.matcher(lowercaseFirstChar(part1Lemma)).matches()) {
      if (!this.checkPluralForPart1Part2Combination(part1, part2)) {
        return false;
      }
    }

    // For some part1-and-part2 combinations an infix s is correct or incorrect
    if (WECHSELINFIX.matcher(lowercaseFirstChar(part1)).matches()) {
      return this.checkInfixSForPart1Part2Combination(part1, part2);
    }

    // Check for easily confused prefixes (e. g. wieder vs wider)
    if (CONFUSED_PREFIXES.matcher(lowercaseFirstChar(part1)).matches() && !part2upcasedIsMispelled
      && part2upcasedIsNoun) {
      return this.checkConfusionForPart1Part2Combination(part1, part2);
    }

    // TODO distinguish more cases with hyphens
    if (part2upcasedIsNoun && !part2upcasedIsMispelled
      // 's' is the last character in *part1* and is probably not an infix
      && part1WithoutHyphen.endsWith('s') && (this.isNounNom(part1upcased) || this.isVerbStem(part1))
      // check if infix 's' is required or not allowed
      && (!this.needsInfixS(removeTrailingS(part1upcased)))) {
      return true;
    }
    if (part2upcasedIsNoun && !part2upcasedIsMispelled
      // 's' is the last character in *part1* and is probably an infix
      && part1WithoutHyphen.endsWith('s') && this.isNounNom(removeTrailingSAndHyphen(part1upcased))
      // check if infix 's' is required or not allowed
      && (this.needsInfixS(removeTrailingSAndHyphen(part1upcased)))) {
      return true;
    }
    if (part2upcasedIsNoun && !part2upcasedIsMispelled
      // *part1* does not end with 's' and is noun or verb stem
      && (!part1WithoutHyphen.endsWith('s')) && (this.isNounNom(part1upcased) || this.isVerbStem(part1))
      // check if infix 's' is required or not allowed
      && (!this.needsInfixS(part1upcased))) {
      return true;
    }
    if (part2upcasedIsNoun && !part2upcasedIsMispelled
      // *part1* is acronym or other prefix, e. g. "SEO-Expertinnen", "Sprachvariante"
      && ((isAllUppercase(removeTrailingSAndHyphen(part1)) && !this.isMisspelled(removeTrailingSAndHyphen(part1))) || this.isOtherPrefix(part1))) {
      return true;
    }
    if (part2upcasedIsNoun && !part2upcasedIsMispelled
      // e. g. Schwedenreise
      && this.isCountryOrRegionNomSin(part1) && !CITIES_EXCEPTIONS.matcher(lowercaseFirstChar(part2)).matches()) {
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#processThreePartCompound(List)
  processThreePartCompound(parts) {
    const part1 = parts[0];
    const part2 = parts[1];
    const part3 = parts[2];
    const compound1 = part1 + part2;
    const compound2 = uppercaseFirstChar(part2) + parts[2];

    if (this.isNoun(compound1) && this.isNoun(compound2)) {
      // If part1part2 and part2part3 are compounds, then so is part1part2part3
      return (this.processTwoPartCompounds(part1, removeTrailingHyphen(part2)) && this.processTwoPartCompounds(part2, part3));
    }
    if (compound1.endsWith('s') || compound1.endsWith('s-')) {
      const part2NoInfixSNoHyphen = removeTrailingSAndHyphen(part2);
      // If part1part2NoInfixSNoHyphen and part2part3 are compounds, then so is part1part2part3
      return (this.processTwoPartCompounds(part1, part2NoInfixSNoHyphen) && this.processTwoPartCompounds(part2, part3));
    }
    if (this.isVerbPrefix(part1) && this.isVerbStem(part2) && this.isNoun(compound2)) {
      // e.g. "Aus" + "leih" + "stelle"
      return true;
    }
    if (this.isNounNomSin(part1) && this.isVerbStem(part2) && this.isNoun(compound2)) {
      // e.g. "Wein" + "kühl" + "schrank"
      return true;
    }
    if (this.isNounNom(part1) && this.isOtherPrefix(part2) && this.isNoun(compound2)) {
      // e.g. "Erwachsenen" + "intensiv" + "kurse"
      return true;
    }
    if (this.isOtherPrefix(part1) && this.isVerbStem(part2) && this.isNoun(compound2)) {
      // e.g. "Horizontal" + "bohr" + "technik"
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#checkInfixSForPart1Part2Combination(String,String)
  checkInfixSForPart1Part2Combination(part1, part2) {
    // For some part1-and-part2 combinations an infix s is correct or incorrect
    let part2Lemma = this.findLemmaForNoun(removeTrailingHyphen(part2));
    if (part2Lemma === '' && removeTrailingHyphen(part2).endsWith('s')) {
      part2Lemma = this.findLemmaForNoun(removeTrailingSAndHyphen(part2));
    }

    if (part1 === 'Arbeit' && (ARBEIT_COMP.matcher(part2).matches())) {
      // e. g. "Arbeitplatz"
      return true;
    }
    if (part1 === 'Arbeits' && !(ARBEIT_COMP.matcher(part2).matches())) {
      // e. g. "Arbeitsgeber"
      return true;
    }
    if (part1 === 'Link' && LINK_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      return true;
    }
    if (part1 === 'Links' && LINKS_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      return true;
    }
    if (part1 === 'Recht' && RECHT_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      // e. g. "Rechtanwälte"
      return true;
    }
    if (part1 === 'Rechts' && RECHTS_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      // e. g. "Rechtsfertigung"
      return true;
    }
    if (part1 === 'Verband' && VERBAND_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      // e. g. "Verbandgemeinde"
      return true;
    }
    if (part1 === 'Verbands' && VERBANDS_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      // e. g. "Verbandszeug"
      return true;
    }
    if (WOCHENTAGE.matcher(part1).matches() && WOCHENTAG_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      return true;
    }
    if (WOCHENTAGE_S.matcher(part1).matches() && !WOCHENTAG_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches()) {
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#checkConfusionForPart1Part2Combination(String,String)
  checkConfusionForPart1Part2Combination(part1, part2) {
    const part2Lemma = this.findLemmaForNoun(removeTrailingHyphen(part2));
    if (part1 === 'Bad' && (BACH_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches())) {
      return true;
    }
    if (part1 === 'Bad' && (BAD_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches())) {
      return true;
    }
    if (part1 === 'Bade' && (!BAD_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches())) {
      return true;
    }
    if (part1 === 'Wider' && (WIDER_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches())) {
      return true;
    }
    if (part1 === 'Wieder' && (!WIDER_COMP.matcher(lowercaseFirstChar(part2Lemma)).matches())) {
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#checkPluralForPart1Part2Combination(String,String)
  checkPluralForPart1Part2Combination(part1, part2) {
    // For some part1-and-part2 combinations part1 needs to be singular or plural
    let part2Lemma = this.findLemmaForNoun(removeTrailingHyphen(part2));
    if (part2Lemma === '' && removeTrailingHyphen(part2).endsWith('s')) {
      part2Lemma = this.findLemmaForNoun(removeTrailingSAndHyphen(part2));
    }
    if (part1 === 'Welt' && (!WELTEN_COMP.matcher(part2Lemma).matches())) {
      // e. g. "Weltklima"
      return true;
    }
    if (part1 === 'Welten' && (WELTEN_COMP.matcher(part2Lemma).matches())) {
      // e. g. "Weltenbummler"
      return true;
    }
    if (part1 === 'Wort' && (!WOERTER_COMP.matcher(part2Lemma).matches())) {
      // e. g. "Wortgrenze"
      return true;
    }
    if (part1 === 'Wörter' && (WOERTER_COMP.matcher(part2Lemma).matches())) {
      // e. g. "Wörterbuch"
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#findLemmaForNoun(String)
  findLemmaForNoun(word) {
    let lemma = '';
    const readings = this.getTagger().tag([uppercaseFirstChar(word)]);
    for (const reading of readings) {
      if (reading.hasPosTagStartingWith('SUB')) {
        lemma = listGet(reading.getReadings(), 0).getLemma();
      }
    }
    return lemma;
  }

  // Java: GermanSpellerRule#isProbablyTypo(String)
  isProbablyTypo(word) {
    return COMPOUND_TYPOS.matcher(word).matches() || COMPOUND_END_TYPOS.matcher(word).matches();
  }

  // Java: GermanSpellerRule#isValidCamelCase(String)
  isValidCamelCase(input) {
    // Check if the string contains any instance of camel casing
    return !CAMEL_CASE.matcher(input).matches();
  }

  // Java: GermanSpellerRule#restoreRemovedHyphens(List,String)
  restoreRemovedHyphens(parts, word) {
    // Restore hyphens that were removed by the tokenizer by appending them to
    //   individual tokens
    const tokensWithHyphens = [];

    // Find and store the positions of hyphens in the original word
    const hyphenPositions = [];
    for (let i = 0; i < word.length; i++) {
      if (word.charAt(i) === '-') {
        hyphenPositions.push(i);
      }
    }

    let currentPos = 0;
    for (let token of parts) {
      // Check if the next hyphen is within the current token
      for (const hyphenPos of hyphenPositions) {
        if (hyphenPos >= currentPos && hyphenPos === currentPos + token.length) {
          // Insert hyphen at the end of this token
          token += '-';
          break; // Move to the next token after adding a hyphen
        }
      }
      tokensWithHyphens.push(token);
      currentPos += token.length;
    }
    return tokensWithHyphens;
  }

  // Java: GermanSpellerRule#avoidInfixSAsSingleToken(List)
  avoidInfixSAsSingleToken(parts) {
    // If a part equals "s", append it to its predecessor
    //   example: "Priorität", "s", "ding" -> "Prioritäts", "ding"
    const indexesOfS = this.indexOfInfixS(parts);

    // Sort indexes in descending order to avoid shifting issues while removing elements
    indexesOfS.sort((a, b) => b - a);

    for (const index of indexesOfS) {
      if (index > 0 && index < parts.length) { // Ensure index is within bounds and not the first element
        const toAppend = parts.splice(index, 1)[0]; // Remove the element at position i and store it
        parts[index - 1] = parts[index - 1] + toAppend; // Append the removed string to the element at i-1
      }
    }
    return parts;
  }

  // Java: GermanSpellerRule#splitPartsByHyphen(List)
  splitPartsByHyphen(originalParts) {
    const parts = [...originalParts];

    // Iterate through the list using indices to safely modify it while iterating
    for (let i = 0; i < parts.length; i++) {
      const element = parts[i];

      if (element.includes('-')) {
        const splitWords = javaSplit(element, '-');

        // Remove the original element
        parts.splice(i, 1);

        // Insert the split parts back into the list at the current position
        // Insert in reverse order to maintain the original order after insertion
        for (let j = splitWords.length - 1; j >= 0; j--) {
          parts.splice(i, 0, splitWords[j]);
        }

        // Adjust the index to account for the newly inserted elements
        // Subtracting 1 because the loop increment will add 1 back
        i += splitWords.length - 1;
      }
    }
    return parts;
  }

  // Java: GermanSpellerRule#indexOfInfixS(List)
  indexOfInfixS(parts) {
    const indexList = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 's') {
        indexList.push(i);
      }
    }
    return indexList;
  }

  // Java: GermanSpellerRule#needsInfixS(String)
  needsInfixS(word) {
    // check for cases like Rivalität, Freiheit, Expedition...
    if (INFIX_S_SUFFIXES.matcher(word).matches()
      // make sure the POS tag is correct to avoid cases like "Jungs"
      && this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('SUB:NOM:SIN:FEM'))) {
      return true;
    }
    return this.wordsNeedingInfixS.has(word);
  }

  // Java: GermanSpellerRule#needsToBePlural(String)
  needsToBePlural(lemma) {
    if (NEEDS_TO_BE_PLURAL.matcher(lemma).matches()) {
      return true;
    }
    if (this.getTagger().tag([uppercaseFirstChar(lemma)]).some((k) => k.hasPosTagStartingWith('SUB:NOM:SIN:FE'))
      && lemma.endsWith('e')
      && !SUBNOMPLUFEM_EXCEPTIONS.matcher(lemma).matches()) {
      return true;
    }
    if (PERSON_SUFFIXES.matcher(lemma).matches()) {
      return true;
    }
    return false;
  }

  // Java: GermanSpellerRule#isNounNom(String)
  isNounNom(word) {
    return this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('SUB:NOM'));
  }

  // Java: GermanSpellerRule#isNounNomSin(String)
  isNounNomSin(word) {
    return this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('SUB:NOM:SIN'));
  }

  // Java: GermanSpellerRule#isNounNomPlu(String)
  isNounNomPlu(word) {
    return this.getTagger().tag([word]).some((k) => k.hasPosTagStartingWith('SUB:NOM:PLU'));
  }

  // Java: GermanSpellerRule#isCountryOrRegionNomSin(String)
  isCountryOrRegionNomSin(word) {
    return this.getTagger().tag([word]).some((k) => k.matchesPosTagRegex('EIG:NOM:SIN.+(COU|GEB|STD|WAT)'));
  }

  // Java: GermanSpellerRule#isOtherPrefix(String)
  isOtherPrefix(word) {
    return otherPrefixes.has(lowercaseFirstChar(word));
  }

  // Java: GermanSpellerRule#isVerbPrefix(String)
  isVerbPrefix(word) {
    return verbPrefixes.has(lowercaseFirstChar(word));
  }

  // Java: GermanSpellerRule#isVerbStem(String)
  isVerbStem(word) {
    return verbStems.has(lowercaseFirstChar(word));
  }

  // Java: GermanSpellerRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    const suggestionsList = suggestions.map((s) => s.getReplacement());
    return SuggestedReplacement.convert(this.getAdditionalTopSuggestionsString(suggestionsList, word));
  }

  // Java: GermanSpellerRule#getAdditionalTopSuggestionsString(List,String)
  getAdditionalTopSuggestionsString(suggestions, word) {
    let suggestion;
    if (equalsIgnoreCase('WIFI', word)) {
      return ['Wi-Fi'];
    } else if (equalsIgnoreCase('W-Lan', word)) {
      return ['WLAN'];
    } else if (word === 'Endstadion') {
      return ['Endstadium'];
    } else if (word === 'Endstadions') {
      return ['Endstadiums'];
    } else if (word === 'genomen') {
      return ['genommen'];
    } else if (word === 'Preis-Leistungsverhältnis') {
      return ['Preis-Leistungs-Verhältnis'];
    } else if (word === 'getz') {
      return ['jetzt', "geht's"];
    } else if (word === 'Trons') {
      return ['Trance'];
    } else if (word === 'ei') {
      return ['ein'];
    } else if (word === 'jo' || word === 'jepp' || word === 'jopp') {
      return ['ja'];
    } else if (word === 'Jo' || word === 'Jepp' || word === 'Jopp') {
      return ['Ja'];
    } else if (word === 'Ne') {
      // "Ne einfach Frage!"
      // "Ne, das musst du machen!"
      return ['Nein', 'Eine'];
    } else if (word === 'is') {
      return ['ist'];
    } else if (word === 'Is') {
      return ['Ist'];
    } else if (word === 'un') {
      return ['und'];
    } else if (word === 'Un') {
      return ['Und'];
    } else if (word === 'Std') {
      return ['Std.'];
    } else if (ENDS_WITH_IBELKEIT_IBLICHKEIT.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'el[hk]eit$', 'ilität');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('aquise')) {
      suggestion = javaReplaceFirst(word, 'aquise$', 'akquise');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('standart')) {
      suggestion = javaReplaceFirst(word, 'standart$', 'standard');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('standarts')) {
      suggestion = javaReplaceFirst(word, 'standarts$', 'standards');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('tips')) {
      suggestion = javaReplaceFirst(word, 'tips$', 'tipps');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('tip')) {
      suggestion = `${word}p`;
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('entfehlung')) {
      suggestion = replaceOnce(word, 'ent', 'emp');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.endsWith('oullie')) {
      suggestion = javaReplaceFirst(word, 'oullie$', 'ouille');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.startsWith('Bundstift')) {
      suggestion = javaReplaceFirst(word, '^Bundstift', 'Buntstift');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (ALLMAHLLIG.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'llmähll?i(g|ch)', 'llmählich');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (CONTAINS_MAYONNAISE.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'a[jy]onn?[äe]se', 'ayonnaise');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (CONTAINS_RESERVIERUNG.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'es(a|er)[vw]i[he]?rung', 'eservierung');
      if (this.hunspell.spell(suggestion)) { // suggest e.g. 'Ticketreservierung', but not 'Blödsinnsquatschreservierung'
        return [suggestion];
      }
    } else if (STARTS_WITH_RESCHASCHIER.matcher(word).matches()) {
      suggestion = replaceOnce(word, 'schaschier', 'cherchier');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (ENDS_WITH_LABORANTS.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'ts$', 'ten');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (PROFESSIONELL.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, 'roff?ess?ion([äe])h?l{1,2}', 'rofessionell');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (VERSTANDNIS.matcher(word).matches()) {
      suggestion = javaReplaceFirst(word, '[vV]erstehendnis', 'Verständnis');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.startsWith('koregier')) {
      suggestion = javaReplace(word, 'reg', 'rrig');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (STARTS_WITH_DIAGNOSZIER.matcher(word).matches()) {
      suggestion = javaReplaceAll(word, 'gno[sz]ier', 'gnostizier');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.includes('eiss')) {
      suggestion = javaReplace(word, 'eiss', 'eiß');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.includes('Akkupressur')) {
      suggestion = javaReplace(word, 'Akkupressur', 'Akupressur');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.includes('farbend')) { // steinfarbenden, schwarzfarbenden, kupferfarbenden etc.
      suggestion = javaReplace(word, 'farbend', 'farben');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word.includes('uess')) {
      suggestion = javaReplace(word, 'uess', 'üß');
      if (this.hunspell.spell(suggestion)) {
        return [suggestion];
      }
    } else if (word === 'gin') {
      return ['ging'];
    } else if (word === 'dh' || word === 'dh.') {
      return ['d. h.'];
    } else if (word === 'ua' || word === 'ua.') {
      return ['u. a.'];
    } else if (ZB.matcher(word).matches() || STARTS_WITH_ZB.matcher(word).matches()) {
      return ['z. B.'];
    } else if (word === 'uvm' || word === 'uvm.') {
      return ['u. v. m.'];
    } else if (word === 'udgl' || word === 'udgl.') {
      return ['u. dgl.'];
    } else if (word === 'Ruhigkeit') {
      return ['Ruhe'];
    } else if (word === 'angepreist') {
      return ['angepriesen'];
    } else if (word === 'halo') {
      return ['hallo'];
    } else if (equalsIgnoreCase(word, 'zumindestens')) {
      return [javaReplace(word, 'ens', '')];
    } else if (word === 'ca') {
      return ['ca.'];
    } else if (word === 'Jezt') {
      return ['Jetzt'];
    } else if (word === 'Wollst') {
      return ['Wolltest'];
    } else if (word === 'wollst') {
      return ['wolltest'];
    } else if (word === 'Rolladen') {
      return ['Rollladen'];
    } else if (word === 'Maßname') {
      return ['Maßnahme'];
    } else if (word === 'Maßnamen') {
      return ['Maßnahmen'];
    } else if (word === 'nanten') {
      return ['nannten'];
    } else if (word === 'diees') {
      return ['dieses', 'dies'];
    } else if (word === 'Diees') {
      return ['Dieses', 'Dies'];
    } else if (word.endsWith('ies')) {
      if (word === 'Lobbies') {
        return ['Lobbys'];
      } else if (word === 'Parties') {
        return ['Partys'];
      } else if (word === 'Babies') {
        return ['Babys'];
      } else if (word.endsWith('derbies')) {
        suggestion = javaReplaceFirst(word, 'derbies$', 'derbys');
        if (this.hunspell.spell(suggestion)) {
          return [suggestion];
        }
      } else if (word.endsWith('stories')) {
        suggestion = javaReplaceFirst(word, 'stories$', 'storys');
        if (this.hunspell.spell(suggestion)) {
          return [suggestion];
        }
      } else if (word.endsWith('parties')) {
        suggestion = javaReplaceFirst(word, 'parties$', 'partys');
        if (this.hunspell.spell(suggestion)) {
          return [suggestion];
        }
      }
    } else if (word === 'Hallochen') {
      return ['Hallöchen', 'hallöchen'];
    } else if (word === 'hallochen') {
      return ['hallöchen'];
    } else if (word === 'ok') {
      return ['okay', 'O. K.']; // Duden-like suggestion with no-break space
    } else if (word === 'gesuchen') {
      return ['gesuchten', 'gesucht'];
    } else if (word === 'Germanistiker') {
      return ['Germanist', 'Germanisten'];
    } else if (word === 'Abschlepper') {
      return ['Abschleppdienst', 'Abschleppwagen'];
    } else if (word === 'par') {
      return ['paar'];
    } else if (word === 'iwie') {
      return ['irgendwie'];
    } else if (word === 'schwarzfarbenden') {
      return ['schwarzfarbenen'];
    } else if (word === 'bzgl') {
      return ['bzgl.'];
    } else if (word === 'bau') {
      return ['baue'];
    } else if (word === 'sry') {
      return ['sorry'];
    } else if (word === 'Sry') {
      return ['Sorry'];
    } else if (word === 'thx') {
      return ['danke'];
    } else if (word === 'Thx') {
      return ['Danke'];
    } else if (word === 'Zynik') {
      return ['Zynismus'];
    } else if (word === 'pieksen') {
      return ['piksen'];
    } else if (word === 'piekst') {
      return ['pikst'];
    } else if (word === 'gepiekst') {
      return ['gepikst'];
    } else if (equalsIgnoreCase(word, 'email')) {
      return ['E-Mail'];
    } else if (word.length > 9 && word.startsWith('Email')) {
      let suffix = word.substring(5);
      if (!this.hunspell.spell(suffix)) {
        const suffixSuggestions = this.hunspell.suggest(uppercaseFirstChar(suffix));
        suffix = suffixSuggestions.length === 0 ? suffix : suffixSuggestions[0];
      }
      return [`E-Mail-${String.fromCharCode(Character.toUpperCase(charAt(suffix, 0)))}${suffix.substring(1)}`];
    } else if (word === 'wiederspiegeln') {
      return ['widerspiegeln'];
    } else if (word === 'ch') {
      return ['ich'];
    } else {
      for (const [matcher, f] of getAdditionalSuggestionsMap()) {
        if (matcher.matches(word)) {
          return f(word);
        }
      }
    }
    if (!startsWithUppercase(word)) {
      const ucWord = uppercaseFirstChar(word);
      if (!suggestions.includes(ucWord) && this.hunspell.spell(ucWord) && !ucWord.endsWith('.')) {
        // Hunspell doesn't always automatically offer the most obvious suggestion for compounds:
        return [ucWord];
      }
    }
    const verbSuggestion = this.getPastTenseVerbSuggestion(word);
    if (verbSuggestion !== null) {
      return [verbSuggestion];
    }
    const participleSuggestion = this.getParticipleSuggestion(word);
    if (participleSuggestion !== null) {
      return [participleSuggestion];
    }
    const abbreviationSuggestion = this.getAbbreviationSuggestion(word);
    if (abbreviationSuggestion !== null) {
      return [abbreviationSuggestion];
    }
    // hyphenated compounds words (e.g., "Netflix-Flm")
    if (suggestions.length === 0 && word.includes('-')) {
      const words = javaSplit(word, '-');
      if (words.length > 1) {
        const suggestionLists = [];
        let startAt = 0;
        let stopAt = words.length;
        let partialWord = `${words[0]}-${words[1]}`;
        if (super.ignoreWord(partialWord) || this.wordsToBeIgnoredInCompounds.has(partialWord)) { // "Au-pair-Agentr"
          startAt = 2;
          suggestionLists.push([`${words[0]}-${words[1]}`]);
        }
        partialWord = `${words[words.length - 2]}-${words[words.length - 1]}`;
        if (super.ignoreWord(partialWord) || this.wordsToBeIgnoredInCompounds.has(partialWord)) { // "Seniren-Au-pair"
          stopAt = words.length - 2;
        }
        for (let idx = startAt; idx < stopAt; idx++) {
          if (!this.hunspell.spell(words[idx])) {
            const list = this.sortSuggestionByQuality(words[idx], super.getSuggestions(words[idx]));
            suggestionLists.push(list);
          } else {
            suggestionLists.push([words[idx]]);
          }
        }
        if (stopAt < words.length - 1) {
          suggestionLists.push([partialWord]);
        }
        if (suggestionLists.length <= 3) { // avoid OutOfMemory on words like "free-and-open-source-and-cross-platform"
          let additionalSuggestions = listGet(suggestionLists, 0);
          for (let idx = 1; idx < suggestionLists.length; idx++) {
            const suggestionList = suggestionLists[idx];
            const newList = [];
            for (const additionalSuggestion of additionalSuggestions) {
              for (const aSuggestionList of suggestionList) {
                newList.push(`${additionalSuggestion}-${aSuggestionList}`);
              }
            }
            additionalSuggestions = newList;
          }
          // avoid overly long lists of suggestions (we just take the first results, although we don't know whether they are better):
          return additionalSuggestions.slice(0, Math.min(5, additionalSuggestions.length));
        }
      }
    }
    return [];
  }

  // Get a correct suggestion for invalid words like greifte, denkte, gehte: useful for
  // non-native speakers and cannot be found by just looking for similar words.
  // Java: GermanSpellerRule#getPastTenseVerbSuggestion(String)
  getPastTenseVerbSuggestion(word) {
    if (word.endsWith('e')) {
      // strip trailing "e"
      const wordStem = word.substring(0, word.length - 1);
      const lemma = this.baseForThirdPersonSingularVerb(wordStem);
      if (lemma !== null) {
        const token = new AnalyzedToken(lemma, null, lemma);
        const forms = this.synthesizer.synthesize(token, 'VER:3:SIN:PRT:.*', true);
        if (forms.length > 0) {
          return forms[0];
        }
      }
    }
    return null;
  }

  // Java: GermanSpellerRule#baseForThirdPersonSingularVerb(String)
  baseForThirdPersonSingularVerb(word) {
    const readings = this.getTagger().tag([word]);
    for (const reading of readings) {
      if (reading.hasPosTagStartingWith('VER:3:SIN')) {
        return listGet(reading.getReadings(), 0).getLemma();
      }
    }
    return null;
  }

  // Get a correct suggestion for invalid words like geschwimmt, geruft: useful for
  // non-native speakers and cannot be found by just looking for similar words.
  // Java: GermanSpellerRule#getParticipleSuggestion(String)
  getParticipleSuggestion(word) {
    if (word.startsWith('ge') && word.endsWith('t')) {
      // strip leading "ge" and replace trailing "t" with "en":
      const baseform = `${substring(word, 2, word.length - 1)}en`;
      const participle = this.getParticipleForBaseform(baseform);
      if (participle !== null) {
        return participle;
      }
    }
    return null;
  }

  // Java: GermanSpellerRule#getParticipleForBaseform(String)
  getParticipleForBaseform(baseform) {
    const token = new AnalyzedToken(baseform, null, baseform);
    const forms = this.synthesizer.synthesize(token, 'VER:PA2:.*', true);
    if (forms.length > 0 && this.hunspell.spell(forms[0])) {
      return forms[0];
    }
    return null;
  }

  // Java: GermanSpellerRule#getAbbreviationSuggestion(String)
  getAbbreviationSuggestion(word) {
    if (word.length < 5) {
      const readings = this.getTagger().tag([word]);
      for (const reading of readings) {
        if (reading.hasPosTagStartingWith('ABK')) {
          return `${word}.`;
        }
      }
    }
    return null;
  }

  // Java: GermanSpellerRule#ignoreByHangingHyphen(List,int)
  ignoreByHangingHyphen(words, idx) {
    let word = listGet(words, idx);
    let nextWord = this.getWordAfterEnumerationOrNull(words, idx + 1);
    nextWord = removeEnd(nextWord, '.');
    const isCompound = nextWord !== null
      && (this.compoundTokenizer.tokenize(nextWord).length > 1
        || nextWord.indexOf('-') > 0
        || SPECIAL_CASE_THIRD.matcher(nextWord).matches()); // compound tokenizer will only split compounds where each part is >= 3 characters...
    if (isCompound) {
      word = removeEnd(word, '-');
      let isMisspelled = !this.hunspell.spell(word); // "Stil- und Grammatikprüfung" or "Stil-, Text- und Grammatikprüfung"
      if (isMisspelled && (super.ignoreWord(word) || this.wordsToBeIgnoredInCompounds.has(word))) {
        isMisspelled = false;
      } else if (isMisspelled && word.endsWith('s') && this.isNeedingFugenS(removeEnd(word, 's'))) {
        // Vertuschungs- und Bespitzelungsmaßnahmen: remove trailing "s" before checking "Vertuschungs" so that the spell checker finds it
        isMisspelled = !this.hunspell.spell(removeEnd(word, 's'));
      }
      return !isMisspelled;
    }
    return false;
  }

  // Java: GermanSpellerRule#isNeedingFugenS(String)
  isNeedingFugenS(word) {
    // according to http://www.spiegel.de/kultur/zwiebelfisch/zwiebelfisch-der-gebrauch-des-fugen-s-im-ueberblick-a-293195.html
    return endsWithAny(word, 'tum', 'ling', 'ion', 'tät', 'keit', 'schaft', 'sicht', 'ung', 'en');
  }

  // for "Stil- und Grammatikprüfung", get "Grammatikprüfung" when at position of "Stil-"
  // Java: GermanSpellerRule#getWordAfterEnumerationOrNull(List,int)
  getWordAfterEnumerationOrNull(words, idx) {
    for (let i = idx; i < words.length; i++) {
      const word = words[i];
      if (!(word.endsWith('-') || equalsAny(word, ',', '/', '&', 'und', 'oder', 'bzw.', 'beziehungsweise', 'sowie', 'statt') || javaTrim(word).length === 0)) {
        return word;
      }
    }
    return null;
  }

  // check whether a <code>word<code> is a valid compound (e.g., "Feynmandiagramm" or "Feynman-Diagramm")
  // that contains an ignored word from spelling.txt (e.g., "Feynman")
  // Java: GermanSpellerRule#ignoreCompoundWithIgnoredWord(String)
  ignoreCompoundWithIgnoredWord(word) {
    if (!startsWithUppercase(word) && !startsWithAny(word, 'nord', 'west', 'ost', 'süd')) {
      // otherwise stuff like "rumfangreichen" gets accepted
      return false;
    }
    const words = javaSplit(word, '-');
    if (words.length < 2) {
      // non-hyphenated compound (e.g., "Feynmandiagramm"):
      // only search for compounds that start(!) with a word from spelling.txt
      let end = super.startsWithIgnoredWord(word, true);
      if (end < 3) {
        // support for geographical adjectives - although "süd/ost/west/nord" are not in spelling.txt
        // to accept sentences such as
        // "Der westperuanische Ferienort, das ostargentinische Städtchen, das südukrainische Brauchtum, der nordägyptische Staudamm."
        if (word.startsWith('ost') || word.startsWith('süd')) {
          end = 3;
        } else if (word.startsWith('west') || word.startsWith('nord')) {
          end = 4;
        } else {
          return false;
        }
      }
      const ignoredWord = substring(word, 0, end);
      let partialWord = substring(word, end);
      partialWord = partialWord.endsWith('.') ? partialWord.substring(0, partialWord.length - 1) : partialWord;
      const isNoun = this.isNoun(partialWord);
      let isUppercaseNoun = false;
      if (!isNoun && !startsWithUppercase(partialWord)) {
        isUppercaseNoun = this.isNoun(uppercaseFirstChar(partialWord));
      }
      const isDirection = DIRECTION.matcher(ignoredWord).matches();
      const isAdjective = this.isAdjective(ignoredWord);
      const isDirectionalAdjective = (isDirection && (isAdjective || javaMatches(partialWord, '.+ische?[mnrs]?')));
      const isCandidateForNonHyphenatedCompound = (isDirectionalAdjective || isNoun || isUppercaseNoun) && !isAllUpperCase(ignoredWord) && (isAllLowerCase(partialWord) || ignoredWord.endsWith('-'));
      const needFugenS = this.isNeedingFugenS(ignoredWord);
      if (isCandidateForNonHyphenatedCompound && !needFugenS && partialWord.length > 2) {
        return this.hunspell.spell(partialWord) || this.hunspell.spell(capitalize(partialWord));
      } else if (isCandidateForNonHyphenatedCompound && needFugenS && partialWord.length > 2) {
        partialWord = partialWord.startsWith('s') ? partialWord.substring(1) : partialWord;
        return this.hunspell.spell(partialWord) || this.hunspell.spell(capitalize(partialWord));
      }
      return false;
    }
    // hyphenated compound (e.g., "Feynman-Diagramm"):
    let hasIgnoredWord = false;
    const toSpellCheck = [];
    const stripFirst = substring(word, words[0].length + 1); // everything after the first "-"
    const stripLast = substring(word, 0, word.length - words[words.length - 1].length - 1); // everything up to the last "-"

    if (super.ignoreWord(stripFirst) || this.wordsToBeIgnoredInCompounds.has(stripFirst)) { // e.g., "Senioren-Au-pair"
      hasIgnoredWord = true;
      if (!super.ignoreWord(words[0])) {
        toSpellCheck.push(words[0]);
      }
    } else if (super.ignoreWord(stripLast) || this.wordsToBeIgnoredInCompounds.has(stripLast)) { // e.g., "Au-pair-Agentur"
      hasIgnoredWord = true;
      if (!super.ignoreWord(words[words.length - 1])) {
        toSpellCheck.push(words[words.length - 1]);
      }
    } else {
      for (const word1 of words) {
        if (super.ignoreWord(word1) || this.wordsToBeIgnoredInCompounds.has(word1)) {
          hasIgnoredWord = true;
        } else {
          toSpellCheck.push(word1);
        }
      }
    }

    if (hasIgnoredWord) {
      for (const w of toSpellCheck) {
        if (!this.hunspell.spell(w)) {
          return false;
        }
      }
    }
    return hasIgnoredWord;
  }

  // Java: GermanSpellerRule#getTagger()
  getTagger() {
    return this.language.getTagger();
  }

  // Java: GermanSpellerRule#isQuotedCompound(AnalyzedSentence,int,String)
  isQuotedCompound(analyzedSentence, idx, token) {
    if (idx > 3 && token.startsWith('-')) {
      return equalsAny(analyzedSentence.getTokens()[idx - 1].getToken(), '“', '"')
        && equalsAny(analyzedSentence.getTokens()[idx - 3].getToken(), '„', '"');
    }
    return false;
  }

  /* (non-Javadoc)
   * @see org.languagetool.rules.spelling.SpellingCheckRule#addProhibitedWords(java.util.List)
   */
  // Java: GermanSpellerRule#addProhibitedWords(List)
  addProhibitedWords(words) {
    if (words.length === 1 && words[0].endsWith('.*')) {
      this.wordStartsToBeProhibited.add(substring(words[0], 0, words[0].length - 2));
    } else if (listGet(words, 0).startsWith('.*')) {
      for (const word of words) this.wordEndingsToBeProhibited.add(substring(word, 2));
    } else {
      super.addProhibitedWords(words);
    }
  }

  // Java: GermanSpellerRule#filterNoSuggestWords(List)
  filterNoSuggestWords(l) {
    return l
      .filter((k) => !lcDoNotSuggestWords.has(toLowerCase(k.getReplacement())))
      .filter((k) => !START_WITH_NEGER.matcher(toLowerCase(k.getReplacement())).matches())
      .filter((k) => !CONTAINS_NEGER.matcher(toLowerCase(k.getReplacement())).matches())
      .filter((k) => !CONTAINS_NEGER_2.matcher(toLowerCase(k.getReplacement())).matches())
      .filter((k) => !CONTAINS_UNCOMMON_LOWERCASED_NOUN_AT_END.matcher(k.getReplacement()).matches())
      .filter((k) => !CONTAINS_UNCOMMON_LOWERCASED_NOUN_AT_BEGINNING.matcher(k.getReplacement()).matches());
  }

  // Java: GermanSpellerRule#getOnlySuggestions(String)
  getOnlySuggestions(word) {
    if (SYMPHATISCH.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'symphatisch', 'sympathisch'));
    }
    if (AUTENTISCH_WITH_CASES.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'utent', 'uthent'));
    }
    if (BRILLIANT_WITH_CASES.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'brilliant', 'brillant'));
    }
    if (RECHTMASIG_WITH_CASES.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'mässig', 'mäßig'));
    }
    if (CONTAINS_MASZNAME.matcher(word).matches()) {
      return topMatch(javaReplaceFirst(word, 'a(ss|ß)name', 'aßnahme'));
    }
    if (HOLZ_SPIEGEL_PANEL_COMPOUND.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'panel', 'paneel'));
    }
    if (SBHAN_PREFIX.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'SBahn', 'S-Bahn'));
    }
    if (UBAHN_PREFIX.matcher(word).matches()) {
      return topMatch(replaceOnce(word, 'UBahn', 'U-Bahn'));
    }
    switch (word) {
      case 'Büffet':
      case 'Buffett':
      case 'Bufett':
      case 'Büffett':
      case 'Bufet':
      case 'Büfet':
        if (this.language.getShortCodeWithCountryAndVariant() === 'de-CH' || this.language.getShortCodeWithCountryAndVariant() === 'de-AT') {
          return topMatch('Buffet', 'zum Verzehr bereitgestellte Speisen');
        } else {
          return topMatch('Büfett', 'zum Verzehr bereitgestellte Speisen');
        }
      default: {
        const e = ONLY_SUGGESTIONS.get(word);
        if (e !== undefined) {
          return e.length > 1 ? topMatch(e[0], e[1]) : topMatch(e[0]);
        }
      }
    }
    return [];
  }

  // ":" and "*" are not in the tokenised text for the speller, so it's easier to remove matches for
  // e.g. "Jurist:innenausbildung" as a cleanup step after the speller has run:
  // Java: GermanSpellerRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = super.match(sentence);
    return this.removeGenderCompoundMatches(sentence, matches);
  }

  // Java: GermanSpellerRule#removeGenderCompoundMatches(AnalyzedSentence,RuleMatch[])
  removeGenderCompoundMatches(sentence, matches) {
    let filteredMatches = [...matches];
    const genderPattern = GENDER_STAR_PATTERN.matcher(sentence.getText()); // Jurist:innenausbildung -> 'Jurist', ':innenausbildung'
    let pos = 0;
    while (genderPattern.find(pos)) {
      if (!this.isMisspelled(javaReplaceFirst(genderPattern.group(), '[*:_]', ''))) { // "_" is not tokenized anyway, so no need to handle it here
        const gs = genderPattern.start();
        const ge = genderPattern.end();
        filteredMatches = filteredMatches
          // e.g. "Jurist:innenausbildung" with the ":" removed should be accepted:
          //              ^^^^^^^^^^^^^^^
          .filter((k) => !(gs < k.getFromPos() && ge === k.getToPos()))
          // e.g. "Testexpert*innen" with the "*" removed should be accepted:
          //       ^^^^^^^^^^
          .filter((k) => !(gs === k.getFromPos() && ge > k.getToPos()));
      }
      pos = genderPattern.end();
    }
    const filePattern = FILE_UNDERLINE_PATTERN.matcher(sentence.getText());
    pos = 0;
    while (filePattern.find(pos)) {
      const fs = filePattern.start();
      const fe = filePattern.end();
      filteredMatches = filteredMatches.filter((k) => !(fs <= k.getFromPos() && fe >= k.getToPos()));
      pos = filePattern.end();
    }
    const mentionPattern = MENTION_UNDERLINE_PATTERN.matcher(sentence.getText());
    pos = 0;
    while (mentionPattern.find(pos)) {
      const ms = mentionPattern.start();
      const me = mentionPattern.end();
      filteredMatches = filteredMatches.filter((k) => !(ms <= k.getFromPos() && me >= k.getToPos()));
      pos = mentionPattern.end();
    }
    return filteredMatches;
  }
}

// Java: Collection#removeIf(Predicate) on a List
function removeIf(list, pred) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (pred(list[i])) list.splice(i, 1);
  }
}

registerComponent(GermanSpellerRule.FQCN, (...args) => new GermanSpellerRule(...args));
