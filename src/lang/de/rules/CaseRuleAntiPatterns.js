// org.languagetool.rules.de.CaseRuleAntiPatterns (token lists; converted mechanically from the Java source)
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import { SENTENCE_START_TAGNAME, SENTENCE_END_TAGNAME } from '../../../core/JLanguageToolConstants.js';
import { LanguageNames } from './LanguageNames.js';

// Java: CaseRuleAntiPatterns#SENT_START
const SENT_START = new PatternTokenBuilder().posRegex(SENTENCE_START_TAGNAME).build();

// Java: CaseRuleAntiPatterns#ANTI_PATTERNS (also see case_rule_exceptions.txt)
export const ANTI_PATTERNS = [
    [
      csRegex("von"),
      csRegex("Gleich"),
      csRegex("zu"),
      csRegex("Gleich")
    ],
    [
      csRegex("[iI]n"),
      csRegex("-"),
      csRegex("und|oder"),
      csRegex("[Aa]us.*")
    ],
    [
      csRegex("[1-9]{2,4}"),
      csRegex(":"),
      csRegex("[A-ZÜÄÖ][a-züäö].*")
    ],
    [
      csRegex("In"),
      csRegex(":"),
      csRegex("[A-ZÜÄÖ][a-züäö].*")
    ],
    [
      csRegex("China"),
      csRegex("National"),
      csRegex("Petroleum")
    ],
    [
      csRegex("Republik"),
      csRegex("der"),
      csRegex("Sieben"),
      csRegex("Vereinigten"),
      csRegex("Provinzen|Niederlande")
    ],
    [
      csRegex("Rat"),
      csRegex("für"),
      csRegex("das"),
      csRegex("Europäische"),
      csRegex("Hilfswerk")
    ],
    [
      csRegex("Museum"),
      csRegex("der"),
      csRegex("Bayerischen"),
      csRegex("Geschichte")
    ],
    [
      token("Planten"),
      token("un"),
      regex("Blomens?")
    ],
    [
      new PatternTokenBuilder().token("sprechen").matchInflectedForms().build(),
      csRegex(LanguageNames.getAsRegex())
    ],
    [
      tokenRegex("(inter)?national|regional"),
      csRegex("GmbH|gGmbH|AG|gAG|InvAG|OHG|KG|UG|eG|GbR")
    ],
    [   // "die Spiegelblank GmbH"
      tokenRegex("die|der"),
      csRegex("[A-ZÄÜÖ].+"),
      csRegex("GmbH|gGmbH|AG|gAG|InvAG|OHG|KG|UG|eG|GbR")
    ],
    [ // Autohaus Dornig GmbH
      new PatternTokenBuilder().posRegex("EIG:.+|SUB:.+").csTokenRegex("[A-Z].+").build(),
      csRegex("[A-ZÄÜÖ].+"),
      csRegex("GmbH|gGmbH|AG|gAG|InvAG|OHG|KG|UG|eG|GbR")
    ],
    [
      posRegex("ADJ:.*"),
      tokenRegex("&|and"),
      posRegex("ADJ:.*")
    ],
    [
      tokenRegex("Deutschen?|Österreichischen?|Schweizerischen?"),  // TODO: extend
      tokenRegex(".*gesellschaft")
    ],
    [
      csRegex("im|ins|ans?"),
      csRegex("Gestern|Vorgestern")
    ],
    [
      csRegex("im|ins|ans?|das"),
      csRegex("Gestern|Vorgestern"),
      csRegex("und|&"),
      csRegex("Gestern|Vorgestern")
    ],
    [
      csRegex("[Ii]m|[Dd]as|[Dd]em|[Ii]ns|[Dd]es|[Aa]ufs"),
      csRegex("Hier|Vorher"),
      csRegex("und|&"),
      csRegex("Jetzt|Nachher")
    ],
    [
      csRegex("[Ii]m|[Dd]as|[Dd]em|[Ii]ns|[Dd]es|[Aa]ufs"),
      csRegex("Jetzt|Nachher"),
      csRegex("und|&"),
      csRegex("Hier|Vorher")
    ],
    [
      csRegex("im|ins"),
      csRegex("Hier|Jetzt")
    ],
    [
      csRegex("[Dd]ieses|das|k?ein"),
      new PatternTokenBuilder().posRegex("ADJ.*NEU.*").min(0).build(),
      csRegex("Rein"),
      csRegex("und|&"),
      csRegex("Raus")
    ],
    [
      csRegex("Private[snm]|Familiäre[snm]"),
      csRegex("und|&"),
      csRegex("Berufliche[snm]|Geschäftliche[snm]")
    ],
    [
      csRegex("Hin"),
      csRegex("und|&"),
      csRegex("Her")
    ],
    [
      csRegex("k?ein"),
      csRegex("Richtig|Falsch"),
      csRegex("und|oder|&"),
      csRegex("Richtig|Falsch")
    ],
    [
      csRegex("Tax"),
      csRegex("[au]nd|&"),
      csRegex("Legal")
    ],
    [
      // Er sagte, Geradliniges und Krummliniges sei unvergleichbar.
      csRegex("[A-ZÄÖÜ].+es"),
      csRegex("und|oder|&"),
      csRegex("[A-ZÄÖÜ].+es"),
      csRegex("[a-zäöüß\\-,\\.\\!\\?…;:–\\)\\(]+")
    ],
    [
      // … in Ägyptisch, Berberisch und Semitisch erfolgte zuletzt.
      csRegex("[A-ZÄÖÜ].+isch"),
      csRegex("und|oder|&"),
      csRegex("[A-ZÄÖÜ].+isch"),
      csRegex("[a-zäöüß\\-,\\.\\!\\?…;:–\\)\\(]+")
    ],
    [
      // … in Ägyptisch, Berberisch und Semitisch erfolgte zuletzt.
      csRegex("[A-ZÄÖÜ].+em"),
      csRegex("und|oder|&"),
      csRegex("[A-ZÄÖÜ].+em"),
      csRegex("[a-zäöüß\\-,\\.\\!\\?…;:–\\)\\(]+")
    ],
    [
      // Er arbeitet im Bereich Präsidiales.
      csRegex("Bereich|Departement|Stabsstellen?|Dienststellen?|AG|Arbeitsgruppe|Edition"),
      csRegex("[A-ZÄÖÜ].+es")
    ],
    [
      csRegex("Berufliche[snm]"),
      csRegex("und|&"),
      csRegex("Private[snm]")
    ],
    [
      token("des"),
      csToken("Weiteren")
    ],
    [ // Mo.–So.
      csRegex("\\.|Mo|Di|Mi|Do|Fr|Sa"),
      csRegex("-|–"),
      csToken("So")
    ],
    [
      // "Tom ist ein engagierter, gutaussehender Vierzigjähriger, der..."
      posRegex("(ADJ:|PA[12]).*"),
      token(","),
      posRegex("(ADJ:|PA[12]).*"),
      regex("[A-ZÖÄÜ].+jährige[mnr]?"),
      posRegex("(?!SUB).*")
    ],
    [
      // Er war verantwortlich für Lieder wie Everything I Do und andere.
      posRegex("_english_ignore_"),
      posRegex("_english_ignore_")
    ],
    [
      // "Um das herauszubekommen..."
      token("das"),
      regex(".+zu.+")
    ],
    [
      token("Rock"),
      regex("['’]"),
      token("n"),
      regex("['’]"),
      token("Roll")
    ],
    [
      regex("Vitamin-[A-Z][0-9]?-reich(e|e[nms])?")
    ],
    [
      // Auflistung
      csRegex("[A-ZÖÄÜ][a-zöäüß]+"),
      token(","),
      csRegex("[A-ZÖÄÜ][a-zöäüß]+"),
      tokenRegex(",|etc")
    ],
    [
      regex("erste[nr]?"),
      csToken("Hilfe")
    ],
    [
      // Names
      regex("Alfred|Emanuel|Günter|Immanuel|Johannes|Karl|Ludvig|Anton|Peter|Robert|Rolf"),
      csToken("Nobel")
    ],
    [
      // https://github.com/languagetool-org/languagetool/issues/1663
      token("Großes"),
      new PatternTokenBuilder().tokenRegex("leisten|erreichen|schaffen").matchInflectedForms().build()
    ],
    [
      // https://github.com/languagetool-org/languagetool/issues/1515
      SENT_START,
      regex("[:;]"),
      token(")"),
      regex(".*")
    ],
    [
      // https://github.com/languagetool-org/languagetool/issues/1515
      SENT_START,
      regex("[;:]"),
      token("-"),
      token(")"),
      regex(".*")
    ],
    [
      SENT_START,
      regex("[A-Z]"),
      token(")"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // Commas used as lower quotes
      SENT_START,
      token(","),
      token(","),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ignore uppercase word at beginning after a character that is not a letter or number (needed to ignore emojies or bullet points at the beginning of a sentence)
      SENT_START,
      regex("^[^A-Za-z0-9ÄÖÜäöüàÀß]{1,2}$"),
      csRegex("[A-ZÖÜÄ].*")
    ],
    [
      SENT_START,
      token("*"),
      token("*"),
      regex(".*")
    ],
    [ // two single quotes (’’) that create one double quote (needs different rule)
      SENT_START,
      token("’"),
      token("’"),
      regex(".*")
    ],
    [ // wrong quote used as opening quote, leave to UNPAIRED_BRACKETS etc.
      token("“"),
      csRegex("[A-ZÖÜÄ].*")
    ],
    [ // => Hallo test
      SENT_START,
      regex("=|-"),
      token(">"),
      regex(".*")
    ],
    [
      SENT_START,
      token("#"),
      regex("\\d+"),
      regex(".*")
    ],
    [
      // GitHub / Markdown check lists
      SENT_START,
      regex("\\*|\\-"),
      token("["),
      regex("]"),
      regex(".*")
    ],
    [
      // GitHub / Markdown check lists
      SENT_START,
      regex("\\*|\\-"),
      token("["),
      token("x"),
      regex("]"),
      regex(".*")
    ],
    [
      // non-alphanumeric character
      SENT_START,
      regex("^[^a-zA-ZäöüÄÖÜ\\d\\s:]+$"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [
      regex("Roten?"),
      regex("Bete")
    ],
    [
      // see https://www.duden.de/suchen/dudenonline/u-f%C3%B6rmig
      regex("[A-Z]-förmig(e[mnrs]?)?")
    ],
    [
      token("Geboten")
    ],
    [
      regex("vor|den"),
      token("Gefahren")
    ],
    // names with english adjectives
    [
      regex("Digital|Global|Smart|International|Trade|Private|Live|Urban|Man|Total|Native|Imperial|Modern|Responsive|Simple|Legend|Human|Light|Ministerial|National"),
      pos("UNKNOWN")
    ],
    [
      token("International"),
      regex("Managements?")
    ],
    [
      token("National"),
      regex("Boards?")
    ],
    [
      regex("[kK]nock"),
      regex("[oO]ut")
    ],
    [
      csToken("das"),
      posRegex("VER:INF:.+"),
      posRegex("KON:NEB|PKT")
    ],
    [
      // wenn sie das beantworten
      regex("wenn|falls|sobald"),
      posRegex("PRO.*|EIG.*"),
      csToken("das"),
      posRegex("VER:INF:.+"),
      regex("dann|,|und|oder|\\.|\\!|\\:")
    ],
    [
      // wenn sie mir das beantworten
      regex("wenn|falls|sobald"),
      posRegex("PRO.*|EIG.*"),
      csRegex("mir|uns|ih[rm]"),
      csToken("das"),
      posRegex("VER:INF:.+"),
      regex("dann|,|und|oder|\\.|\\!|\\:")
    ],
    [
      // Ich hatte das vergessen oder nicht ganz verstanden.
      csToken("das"),
      posRegex("ADV.*"),
      posRegex("VER:INF:.+"),
      posRegex("KON:NEB|PKT")
    ],
    // names with english adjectives
    [
      pos("UNKNOWN"),
      regex("Digital|Global|Smart|International|Trade|Private|Live|Urban|Man|Total|Native|Imperial|Modern|Responsive|Simple|Legend|Human|Light|Ministerial")
    ],
    // names with english adjectives
    [
      token("Smart"),
      posRegex("SUB.*")
    ],
    // names with english adjectives
    [
      token("National"),
      regex("Sales|University")
    ],
    [
      // see http://www.lektorenverband.de/die-deutsche-rechtschreibung-was-ist-neu/
      // and http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Goldenen?"),
      regex("Hochzeit(en)?")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Graue[nr]?"),
      regex("Stars?|Eminenz")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Große[nr]?"),
      regex("Strafkammer|Latinums?|Rats?")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      csToken("Guten"),
      csToken("Tag")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Höheren?"),
      regex("Schule|Mathematik")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Künstliche[nr]?"),
      token("Intelligenz")
    ],
    [
      // see http://www.rechtschreibrat.com/DOX/rfdr_Woerterverzeichnis_2017.pdf
      regex("Neue[ns]?"),
      regex("Jahr(s|es)?|Linken?")
    ],
    [
      token("Neues"),
      token("\\?")
    ],
    [
      token("Zahl"),
      pos("UNKNOWN")
    ],
    [
      // "... und Expert*innnen ..."
      regex("[A-Z].+"),
      token("*"),
      token("innen")
    ],
    [
      // Names: "Jeremy Schulte", "Alexa Jung", "Fiete Lang", "Dorian Klug" ...
      new PatternTokenBuilder().posRegex("EIG:.+|UNKNOWN").csTokenRegex("[A-ZÄÖÜ].+").build(),
      csRegex("Schulte|Junge?|Lange?|Braun|Groß|Gross|K(ü|ue)hne?|Schier|Becker|Schön|Sauer|Ernst|Fr(ö|oe)hlich|Kurz|Klein|Schick|Frisch|Kluge|Weigert|D(ü|ue)rr|Nagele|Hoppe|D(ö|oe)rre|G(ö|oe)ttlich|Stark|Fahle|Fromm(er)?|Reichert|Wiest|Klug|Greiser|Nasser")
    ],
    [
      token(","),
      posRegex(".*ADJ.*|UNKNOWN"),
      regex("[\\.?!)]")
    ],
    [
      csToken(","),
      regex("[md]eine?|du"),
      posRegex(".*ADJ.*|UNKNOWN"),
      regex("[\\.?!]")
    ],
    [
      posRegex(".*ADJ.*|UNKNOWN"),
      regex("Konstanten?")
    ],
    [
      token("das"),
      posRegex("PA2:.+"),
      posRegex("VER:AUX:.+")
    ],
    [
      // Er fragte,ob das gelingen wird.
      csToken("das"),
      posRegex("VER:.+"),
      posRegex("VER:AUX:.+"),
      posRegex("PKT|KON:NEB")
    ],
    [
      // Er fragte, ob das gelingen oder scheitern wird.
      csToken("das"),
      posRegex("VER:.+"),
      new PatternTokenBuilder().pos("KON:NEB").setSkip(5).build(),
      posRegex("VER:(AUX|MOD):.*"),
      posRegex("PKT|KON:NEB")
    ],
    [
      // um ihren eigenen Glauben an das Gute, Wahre und Schöne zu stärken.
      token("das"),
      posRegex("SUB:.+"),
      token(","),
      regex("[A-ZÄÖÜ][a-zäöü]+"),
      regex("und|oder")
    ],
    [
      // "... weshalb ihr das wissen wollt."
      pos("VER:INF:NON"),
      pos("VER:MOD:2:PLU:PRÄ")
    ],
    [
      pos("UNKNOWN"),
      token("und"),
      posRegex("SUB:.*")
    ],
    [
      // Nicht geimpft werden dürfen Immunsupprimierte, Personen mit Fieber 38 °C oder Menschen, die allergisch sind.
      pos("UNKNOWN"),
      token(","),
      posRegex("SUB:.*")
    ],
    [
      // "... wie ich das prüfen sollte."
      posRegex("VER:INF.+"),
      posRegex("VER:MOD:.+")
    ],
    [
        // "... wie ich das prüfen würde."
        posRegex("VER:INF.+"),
        posRegex("VER:AUX:.:(SIN|PLU)(:KJ2)?")
    ],
    [
     // "... etwas Interessantes und Spannendes suchte"
     regex("etwas|nichts|viel|wenig|allerlei|was"),
     regex("[A-ZÄÖÜ].*es"),
     regex("und|oder|,"),
     regex("[A-ZÄÖÜ].*es")
    ],
    [
     // "... bringt Interessierte und Experten zusammen"
     posRegex("VER:.*[1-3]:.*"),
     posRegex("SUB:AKK:.+:ADJ"),
     regex("und|oder|,"),
     posRegex("SUB:AKK:.+:(NEU|FEM|MAS)|ART:.*")
    ],
    [
      // "Das südöstlich von Berlin gelegene"
      regex("(süd|nord|ost|west).*lich"),
      token("von")
    ],
    [
      // "Entscheiden 42,5 Millionen Stimmberechtigte über..."
      regex("Million(en)?"),
      posRegex("SUB:.*:ADJ")
    ],
    [
      // "Vor Betreten des" / "Trotz Verboten seiner Eltern"
      posRegex("PRP:.+|ADV:MOD"),
      pos("VER:PA2:NON"),
      posRegex("(ART|PRO):(IND|DE[FM]|POS):GEN:.*")
    ],
    [
      // "Er liebt UV-bestrahltes, Na-haltiges und Makeup-freies Obst."
      // "Er vertraut auf CO2-arme Wasserkraft"
      regex("[A-ZÄÖÜ0-9]+[a-zäöüß0-9]-[a-zäöüß]+")
    ],
    [
     // "Das Aus für Italien kam unerwartet." / "Müller drängt auf Aus bei Pflichtmitgliedschaft"
     regex("auf|das|vor|a[mn]|vorzeitige[mns]?|frühe[mns]?|späte[mns]?"),
     csToken("Aus"),
     posRegex("^PRP:.+|VER:[1-3]:.+")
    ],
    [
      // Das ist das Aus des Airbus A380.
      regex("das"),
      csToken("Aus"),
      tokenRegex("des|eines"),
      posRegex("EIG:.+|SUB:.*|UNKNOWN")
    ],
    /*Arrays.asList(
      // "...,die ins Nichts griff."
      new PatternTokenBuilder().csTokenRegex("ins|ans|vors|durchs|hinters").setSkip(1).build(),
      posRegex("^PRP:.+|VER:[1-3]:.+")
    ),*/
    [
     // "Bündnis 90/Die Grünen"
     csToken("90"),
     csToken("/"),
     csToken("Die")
    ],
    [
     // https://de.wikipedia.org/wiki/Neue_Mittelschule
     regex("Neue[nrs]?"),
     new PatternTokenBuilder().tokenRegex("Mitte(lschule)?|Rathaus|Testament|Welt|Markt|Rundschau").matchInflectedForms().build()
    ],
    [ // "Das schließen Forscher aus ..."
     token("das"),
     posRegex("VER:INF:(SFT|NON)"),
     posRegex("SUB:NOM:PLU:.+|ADV:MOD")
    ],
    [ // Das schaffen moderne E-Autos locker
     token("das"),
     posRegex("VER:INF:(SFT|NON)"),
     posRegex("ADJ:.+"),
     posRegex("SUB:NOM:PLU:.+|ADV:MOD")
    ],
    [ // Das schaffen moderne und effiziente E-Autos locker
     token("das"),
     posRegex("VER:INF:(SFT|NON)"),
     posRegex("ADJ:.+"),
     posRegex("KON:.+"),
     posRegex("ADJ:.+"),
     posRegex("SUB:NOM:PLU:.+|ADV:MOD")
    ],
    [ // "Tausende Gläubige kamen, um ihn zu sehen."
      tokenRegex("[tT]ausende?"),
      posRegex("SUB:NOM:.+"),
      posRegex(SENTENCE_END_TAGNAME+"|VER:[1-3]:.+")
    ],
    [ // "Man kann das generalisieren"
      posRegex("VER:MOD.*"),
      token("das"),
      posRegex("VER:INF:(SFT|NON)")
    ],
    [ // "Vielleicht kann er das generalisieren"
      posRegex("VER:MOD.*"),
      posRegex("PRO:.+"),
      token("das"),
      posRegex("VER:INF:(SFT|NON)")
    ],
    [ // "Er befürchtete Schlimmeres."
      regex("Schlimm(er)?es"),
      pos(SENTENCE_END_TAGNAME)
    ],
    [
      regex("Angehörige[nr]?")
    ],
    [ // aus Alt wird neu
      csToken("Alt"),
      regex("mach|w[iu]rde?"),
      csToken("Neu")
    ],
    [ // see GermanTagger.getSubstantivatedForms
      pos("SUB:NOM:SIN:MAS:ADJ"),
      posRegex("PRP:.+")
    ],
    [ // Einen Tag nach Bekanntwerden des Skandals
      pos("ZUS"),
      csToken("Bekanntwerden")
    ],
    [ // Das ist also ihr Zuhause.
      posRegex(".+:(POS|GEN):.+"),
      csToken("Zuhause")
    ],
    [ // Ein anderes Zuhause habe ich nicht.
      regex("altes|anderes|k?ein|neues"),
      csToken("Zuhause")
    ],
    [ // Weil er das kommen sah, traf er Vorkehrungen.
      csToken("das"),
      csToken("kommen"),
      new PatternTokenBuilder().csToken("sehen").matchInflectedForms().build()
    ],
    [
      token("auf"),
      csToken("die"),
      csToken("Schnelle")
    ],
    [ // denn es fehlt bis heute am Nötigsten
      new PatternTokenBuilder().csToken("fehlen").matchInflectedForms().setSkip(3).build(),
      csToken("am"),
      csToken("Nötigsten")
    ],
    [
      csToken("am"),
      csToken("Nötigsten"),
      new PatternTokenBuilder().csToken("fehlen").matchInflectedForms().build()
    ],
    [
      tokenRegex("im|ins"),
      csToken("Aus")
    ],
    [
      token("im"),
      csToken("Ganzen")
    ],
    [ // Die Top Fünf (https://www.korrekturen.de/forum.pl/md/read/id/73791/sbj/top-top-fuenf-fuenf/)
      csToken("Top"),
      pos("ZAL")
    ],
    [ // Die Top Ten (https://www.korrekturen.de/forum.pl/md/read/id/73791/sbj/top-top-fuenf-fuenf/)
      csToken("Top"),
      csToken("Ten")
    ],
    [ // Dutch name (e.g. "Bert van den Brink")
      csToken("Van"),
      csToken("Den")
    ],
    [
      csToken("Lasse"),
      posRegex("EIG:.*|UNKNOWN")
    ],
    [ // Spanish name (e.g. "Las Condes")
      csToken("Las"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-Z].+").build()
    ],
    [
      csToken("Just"),
      token("in"),
      csToken("Time")
    ],
    [ // Hey Süßer,
      regex("Hey|Hi|Hallo|Na|Moin|Servus"),
      regex("Süßer?|Hübscher?|Liebster?|Liebes"),
      pos("PKT")
    ],
    [ // Guten Morgen Liebste,
      csRegex("Guten?"),
      csRegex("Morgen|Abend|Mittag|Nacht"),
      regex("Süßer?|Hübscher?|Liebster?|Liebes"),
      pos("PKT")
    ],
    [ // Hey Matt (name),
      regex("Hey|Hi|Hallo|Na|Moin|Servus"),
      regex("Matt|Will|Per")
    ],
    [ // Hey mein Süßer,
      regex("Hey|Hi|Hallo|Na|Moin|Servus"),
      regex("du|meine?"),
      regex("Süßer?|Hübscher?"),
      pos("PKT")
    ],
    [ // Grüße aus Höchst, Ich wohne in Wohlen
      regex("aus|in"),
      regex("Höchst|Wohlen")
    ],
    [ // Am So. (Sonntag)
      regex(",|;|/|-|am|bis|vor|\\("),
      csToken("So"),
      token(".")
    ],
    [
      // a.) Im Mittelpunkt ...
      SENT_START,
      regex("[a-z]"),
      token("."),
      token(")"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ---> Der USB  ...
      SENT_START,
      regex("[-]{1,}"),
      token(">"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // # Was macht eigentlich Karl
      SENT_START,
      regex("[#]{1,}"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ## Was macht eigentlich Karl
      SENT_START,
      token("#"),
      token("#"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ### Was macht eigentlich Karl
      SENT_START,
      token("#"),
      token("#"),
      token("#"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // = Schrittweise Erklärung ()
      SENT_START,
      token("="),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // == Schrittweise Erklärung
      SENT_START,
      token("="),
      token("="),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // === Schrittweise Erklärung
      SENT_START,
      token("="),
      token("="),
      token("="),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ==== Schrittweise Erklärung
      SENT_START,
      token("="),
      token("="),
      token("="),
      token("="),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // ===== Schrittweise Erklärung
      SENT_START,
      token("="),
      token("="),
      token("="),
      token("="),
      token("="),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // § 1 Allgemeine Bedingungen
      SENT_START,
      token("§"),
      regex("\\d+"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // §1 Allgemeine Bedingungen
      SENT_START,
      regex("§\\d+"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // 3a) Deine Idee ...
      SENT_START,
      regex("[a-z0-9]{1,3}"),
      token(")"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // @Peter Hast du morgen Zeit?
      SENT_START,
      regex("@.+"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // @b_fischer Der Bonussemester-Antrag oder der Widerspruch?
      SENT_START,
      regex("@.+"),
      token("_"),
      regex("[a-z].*"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // M3.2 Deine Idee ...
      SENT_START,
      regex("[A-Z]\\d+"),
      token("."),
      regex("\\d+"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      csToken("Gefahren"),
      csToken("lauern")
    ],
    [
      csRegex("[A-ZÄÜÖ].+"),
      new PatternTokenBuilder().tokenRegex("\\*|:").setIsWhiteSpaceBefore(false).build(),
      csRegex("innen|en?")
    ],
    [ // Am So 14:00 (should be "So." but that's a different error)
      csRegex("am|jeden"),
      csToken("So")
    ],
    [ // "Sa. oder So."
      csRegex("M[io]|D[io]||Fr|Sa"),
      token("."),
      csRegex("&|und|oder|-|,"),
      csToken("So"),
      token(".")
    ],
    [ // "Sa. oder So."
      csRegex("M[io]|D[io]||Fr|Sa"),
      token("."),
      csToken("So"),
      token(".")
    ],
    [ // "Sa, So"
      csToken("Sa"),
      csRegex("&|und|oder|-|,"),
      csToken("So")
    ],
    [ // Es hatte 10,5 Ah
      csRegex("\\d+"),
      csToken("Ah")
    ],
    [ // Via Camparlungo (Straßennamen in der italienischen Schweiz)
      csToken("Via"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-Z].+").build()
    ],
    [ // Geoghegan Hart
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-Z].+").build(),
      csToken("Hart")
    ],
    [ // Namen mit "Matt" (e.g. Matt Gaetz, Will Smith)
      csRegex("Matt|Will|Dick"),
      new PatternTokenBuilder().posRegex("EIG:.+|UNKNOWN").csTokenRegex("[A-Z].+").build()
    ],
    [ // Klicke auf Home > Mehr > Team
      csToken(">"),
      csRegex("[A-ZÄÜÖ].+"),
      csToken(">")
    ],
    [
      // :D Auf dieses Frl. der apfel fällt ja doch nicht weit vom stamm!
      SENT_START,
      regex("[:;]"),
      regex("[DPO]"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // :-D Auf dieses Frl. der apfel fällt ja doch nicht weit vom stamm!
      SENT_START,
      regex("[:;]"),
      token("-"),
      regex("[DPO]"),
      regex("[A-ZÄÜÖ].*")
    ],
    [
      // Straßenname: "Am Hohen Hain 6"
      csRegex("[IA]m"),
      csRegex("[A-ZÄÖÜ].+n"),
      posRegex("(EIG|SUB|UNKNOWN).*"),
      csRegex("\\d{1,3}[a-hA-H]?")
    ],
    [
      // Straßenname: "Am hohen Hain 6"
      csToken("Am"),
      new PatternTokenBuilder().posRegex("ADJ:.+").csTokenRegex("[a-zäöü].+n").build(),
      csRegex("[A-ZÄÜÖ].*"),
      csRegex("\\d{1,3}[a-hA-H]?")
    ],
    [
      // Straßenname: "Im hohen Hain 6e"
      csToken("Im"),
      new PatternTokenBuilder().posRegex("ADJ:.+").csTokenRegex("[a-zäöü].+n").build(),
      csRegex("[A-ZÄÜÖ].*"),
      csRegex("\\d{1,3}[a-hA-H]|\\d")
    ],
    [
      // Straßenname: "Am Wasserturm 6"
      csToken("Am"),
      posRegex("(EIG|SUB|UNKNOWN).*"),
      csRegex("\\d+[a-hA-H]?")
    ],
    [
      // Straßenname: "Am Wasserturm 6"
      csRegex("[IA]m"),
      csRegex("[A-Z].*(pfad|weg|kamp|platz|tor|gasse|feld|berg|park)"),
      csRegex("\\d+[a-hA-H]?")
    ],
    [
      // Straßenname: "Neue Kantstraße 6"
      csRegex("Neuen?|Gro(ß|ss)e[rn]?|Alte[rn]?|Obere[rn]?|Untere[rn]?|Kleine[rn]?|Breite[rn]?"),
      csRegex("[A-Z].+stra(ss|ß)e|.*[kK]amps?|.*[Tt]ors?|.*[Hh]ofs?|.*[Gg]asse|.*[Gg]rabens?|.*[Ff]elds?|.*[Pp]latz(es)?|.*[Bb]ergs?|.*[Pp]arks?|.*[Ww]egs?|.*[Aa]llee|.*[wW]eide?|.*[mM]auer|.*[rR]eihe"),
      csRegex("\\d{1,3}[a-hA-H]?|in")
    ],
    [
      // Straßenname: "Neue Kantstr. 6"
      csRegex("Neuen?|Gro(ß|ss)en?|Alten?|Oberen?|Unteren?|Breiten?"),
      csRegex("[A-Z].+str"),
      token("."),
      csRegex("\\d{1,3}[a-hA-H]?|in")
    ],
    [
      SENT_START,
      // Listenpunkt https://github.com/languagetool-org/languagetool/issues/1515
      regex("\\*|-|/|_|%|o"),
      regex(".*")
    ],
    [
      // Trennzeichen https://github.com/languagetool-org/languagetool/issues/1515
      regex("▶︎|▶|▶️|►|⇒|→|•|★|⧪|⮞|✔︎|✓|✔️|✅|0️⃣|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣|❤️|➡️|➔|⇨|☛|◼|▲|◆|▪|■|☞|❤|♥︎|✒︎|☑️|✗|✘|✖|➢|↑|=|>|\\}|❏|›|❖|·|▲|◄|⬢|\\||!|‼️|⚠️|√"),
      regex(".*")
    ],
    [
      // Pfeil "=>"
      regex("[=\\-–]"),
      token(">"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [
      // Zwei Kommas, die wie Anführungszeichen verwendet werden: ",,"
      new PatternTokenBuilder().token(",").build(),
      new PatternTokenBuilder().token(",").setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().csTokenRegex("[A-ZÄÜÖ].*").setIsWhiteSpaceBefore(false).build()
    ],
    [
      // Markup: "[H3] Die Headline"
      regex("[a-z0-9\\-äöüß]+"),
      token("]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      csRegex("Schritt|Punkt|Absatz"),
      regex("\\d+"),
      token(":"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // Markup: "H3 Die Headline"
      SENT_START,
      regex("H[1-6]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "B.4 Neue Herstellervorgaben"
      SENT_START,
      regex("[a-z]"),
      token("."),
      regex("\\d+"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "1-) Ich bin ein Listenpunkt"
      SENT_START,
      regex("\\d+-"),
      regex("[\\)\\]\\}]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "1, Ich bin ebenfalls ein Listenpunkt"
      SENT_START,
      regex("[a-z0-9]"),
      token(","),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "T = Das Ziel"
      SENT_START,
      regex("[A-Z0-9]+"),
      token("="),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "(2c) Der Betrieb ist untersagt"
      SENT_START,
      regex("[\\[\\(\\{]"),
      regex("[a-z0-9]{1,5}"),
      regex("[\\]\\)\\}]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "(2c) Der Betrieb ist untersagt"
      SENT_START,
      regex("[\\[\\(\\{]"),
      regex("[a-z0-9]{1,5}"),
      token("."),
      regex("[a-z0-9]{1,5}"),
      regex("[\\]\\)\\}]")
    ],
    [
      // "Sie/Er hat recht."
      SENT_START,
      csRegex("[A-ZÄÜÖ].*"),
      token("/"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "Sie/Er/Es hat recht."
      SENT_START,
      csRegex("[A-ZÄÜÖ].*"),
      token("/"),
      csRegex("[A-ZÄÜÖ].*"),
      token("/"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "Er trank ein paar Halbe."
      regex("paar|einige|zwei|drei|vier|\\d+"),
      token("Halbe")
    ],
    [
      // "Wir machen das Sa So Mo" (fehlender Punkt)
      csToken("Sa"),
      csToken("So")
    ],
    [
      // "Wir machen das Sa oder So" (fehlender Punkt)
      csToken("Sa"),
      regex("&|und|oder|-"),
      csToken("So")
    ],
    [
      // Vielleicht reden wir später mit ein paar Einheimischen.
      token("ein"),
      token("paar"),
      new PatternTokenBuilder().posRegex(".*SUB.*").csTokenRegex("[A-ZÖÜÄ].+").build(),
      new PatternTokenBuilder().csTokenRegex("[a-zäöüß.,!?:;\\-–].*").build()
    ],
    [
      new PatternTokenBuilder().csToken("Neues").setSkip(1).build(),
      new PatternTokenBuilder().token("wagen").matchInflectedForms().build()
    ],
    [ // Wir wagen Neues.
      new PatternTokenBuilder().token("wagen").matchInflectedForms().build(),
      token("Neues")
    ],
    [ // Das birgt zugleich Gefahren
      new PatternTokenBuilder().csToken("birgen").matchInflectedForms().setSkip(5).build(),
      token("Gefahren")
    ],
    [
      // Du Ärmster!
      token("du"),
      csRegex("Ärmster?"),
      csRegex("[^A-ZÖÄÜ].*")
    ],
    [
        // "... und das Zwischenmenschliche Hand in Hand."
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Hand"),
        csToken("in"),
        csToken("Hand")
    ],
    [
        // "Der Platz auf dem die Ahnungslosen Kopf and Kopf stehen.""
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Kopf"),
        csToken("an"),
        csToken("Kopf")
    ],
    [
        // "Der Platz auf dem die Ahnungslosen Schulter and Schulter stehen.""
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Schulter"),
        csToken("an"),
        csToken("Schulter")
    ],
    [
        // "Der Platz auf dem die Ahnungslosen Stück für Stück ...""
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Stück"),
        csToken("für"),
        csToken("Stück")
    ],
    [
        // "Der Platz auf dem die Ahnungslosen Schritt für Schritt ...""
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Schritt"),
        csToken("für"),
        csToken("Schritt")
    ],
    [
        // "Der Platz auf dem die Ahnungslosen Arm in Arm ...""
        posRegex("ART:.*|PRO:POS:.*"),
        new PatternTokenBuilder().posRegex("SUB:.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
        csToken("Arm"),
        csToken("in"),
        csToken("Arm")
    ],
    [
      // ``Ich bin ein Anführungszeich
      SENT_START,
      token("`"),
      token("`"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "4b Ein Listenpunkt"
      SENT_START,
      regex("\\d{1,2}[a-z]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "3.) Ein Listenpunkt"
      SENT_START,
      regex("\\d{1,3}[a-z]?"),
      csToken("."),
      regex("[\\]\\)\\}]"),
      csRegex("[A-ZÄÜÖ].*")
    ],
    [
      // "Es besteht aus Schülern, Arbeitstätigen und Studenten."
      posRegex("SUB:.+"),
      csToken(","),
      posRegex("SUB:.+"),
      csRegex("und|oder|&"),
      posRegex("SUB:.+:(MAS|FEM|NEU)")
    ],
    [
      // Das denken zwar viele, ist aber total falsch.
      SENT_START,
      csToken("Das"),
      csToken("denken"),
      new PatternTokenBuilder().posRegex("ADV:.+").min(0).build(),
      csRegex("viele|manche|die|[dms]eine|ihre|eure|diese|jene|wenige")
    ],
    [
      // Ich habe eine Menge Schlechtes über dich gehört
      csToken("Menge"),
      csRegex("Gutes|Schlechtes|Tolles|Böses|Schlimmes"),
      csRegex("[a-zäöüß].*|\\.|\\,|\\!|:|;")
    ],
    [
      // Während 208 der Befragten Frau Baerbock bevorzugten, ...
      csRegex("\\d+%?|%|Prozent|meisten|wenige|einige|viele|Gro(ß|ss)teil"),
      csToken("der"),
      csRegex("Befragten|Teilnehmenden"),
      new PatternTokenBuilder().posRegex("SUB:.*").csTokenRegex("[A-ZÖÜÄ].+").build()
    ],
    [
      // Dabei trauten die Befragten Frau Baerbock mehr zu.
      csToken("die"),
      new PatternTokenBuilder().posRegex("SUB:NOM:PLU.*:ADJ").csTokenRegex("[A-ZÖÜÄ].+").build(),
      new PatternTokenBuilder().posRegex("SUB:.*:SIN").csTokenRegex("[A-ZÖÜÄ].+").build()
    ],
    [
      // Sie starrt ständig ins Nichts. 
      csRegex("vorm|ins|im"),
      csToken("Nichts")
    ],
    [
      // zahlreiche Kulturschaffende, jungen Wilden
      csRegex("[a-zäöü].+en?"),
      new PatternTokenBuilder().posRegex("SUB:NOM:PLU.*").csTokenRegex("[A-ZÄÖÜ].+").build(),
      csRegex(",|und|oder|aber|\\.|!|\\?|…")
    ],
    [
      // ignore uppercase words after invisible commas at sent start
      SENT_START,
      regex("\\u2063"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // ignore uppercase words after invisible commas at sent start
      SENT_START,
      regex("\\u2063"),
      regex("\\u2063"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // ignore uppercase words after invisible commas at sent start
      SENT_START,
      regex("\\u2063"),
      regex("\\u2063"),
      regex("\\u2063"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // ignore uppercase words after invisible commas at sent start
      SENT_START,
      regex("\\u2063"),
      regex("\\u2063"),
      regex("\\u2063"),
      regex("\\u2063"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // emoji question/exclamation mark
      regex(".*(\\u2753|\\u2757)"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      SENT_START,
      regex("[\\\\/`´*„\"']"),
      regex("[\\\\/`´*„\"']"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      regex("nur"),
      csRegex("Positives|Schlechtes|Gutes|Böses|Negatives|Folgendes|Neues|Altes|Schlimmes|Letzteres|Ersteres|Blödes|Schreckliches|Wesentliches|Falsches|Richtiges|Hässliches"),
      csRegex("[a-zäöü…\\.!\\?…].*")
    ],
    [
      token("im"),
      csRegex("Wesentlichen|Vorab|Geringsten")
    ],
    [
      token("ans"),
      csRegex("Wesentliche")
    ],
    [
      token("im"),
      csRegex("Allgemeinen"),
      csRegex("[a-zäöü…\\.!\\?…].*")
    ],
    [
      token("im"),
      csRegex("Allgemeinen"),
      posRegex("SUB.*FEM.*")
    ],
    [
      token("im"),
      csRegex("Allgemeinen"),
      posRegex("SUB.*PLU.*")
    ],
    [
      token("im"),
      csRegex("Stillen|Dunkeln|Dunklen|Trocke?nen|Hellen|Trüben|Kalten|Warmen|Geringsten|Entferntesten|Verborgenen"),
      csRegex("[a-zäöü…\\.!\\?…\\)\\(;].*")
    ],
    [
      regex("[\\ud83c\\udc00-\\ud83c\\udfff]+|[\\ud83d\\udc00-\\ud83d\\udfff]+|[\\u2600-\\u27ff]+"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // Es gibt S-Bahn-ähnliche(, günstige) Verkehrsmittel
      csRegex("[A-ZÄÖÜ]-[A-ZÄÖÜ].*-.*"),
      new PatternTokenBuilder().posRegex("PKT|KON:NEB|ADJ.*").min(0).max(2).build(),
      posRegex("SUB.*")
    ],
    [ // Das ist das Debakel und Aus für Podolski
      csToken("Aus"),
      csToken("für")
    ],
    [ // Frohes Neues!
      csRegex("[Ff]rohes|[Gg]esundes"),
      csToken("Neues")
    ],
    [ // Wir sollten das mal labeln
      csToken("das"),
      csToken("mal"),
      csRegex("[a-zäöüß].+n")
    ],
    [
      regex("[^a-zäöüß\\-0-9]+"),
      csToken("["),
      csToken("…"),
      csToken("]"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      regex("[^a-zäöüß\\-0-9]+"),
      csToken("["),
      csToken("."),
      csToken("."),
      csToken("."),
      csToken("]"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Kund:in
      csToken("Kund"),
      csRegex("[:_*\\/]"),
      regex("(in|innen|en?).*")
    ],
    [ // Wie ein verstoßener Größenwahnsinniger.
      posRegex("ART:.*|PRO:POS:.*"),
      posRegex("PA[12].*"),
      posRegex("SUB.*ADJ"),
      csRegex("[a-zäöüß\\-,\\.\\!\\?…;:–\\)\\(]+")
    ],
    [ // Vorab das Wichtigste - ...
      posRegex("das"),
      posRegex("SUB.*NEU:ADJ"),
      csRegex("[a-zäöüß\\-,\\.\\!\\?…;:–\\)\\(]+")
    ],
    [ // Wichtiges/Lehrreiches/Großes/...
      token("/"),
      csRegex("[A-ZÄÖÜ].*"),
      token("/")
    ],
    [ // Alles_Zutreffendes.csv
      token("_"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // Etwas anderes Lebendiges
      csRegex("anderes"),
      csRegex("[A-ZÄÖÜ].+es"),
      csRegex("[a-zäöü…\\.!:;,\\?…\\)].*")
    ],
    [ // Ich habe noch Dringendes mitzuteilen
      csRegex("Dringende[ms]|Bare[ms]|Vertraute[ms]|Positive[sm]|Negative[sm]|Gelernte[ms]|Neue[ms]|Alte[ms]|Bessere[ms]|Störende[ms]|Schlechteres|Schlechte[ms]|Schöne[ms]|Schönere[ms]|Schlimmere[ms]|Zutreffendes|Unzutreffende[ms]|Gesehene[ms]|Ungesehene[ms]|Abgerissene[ms]|Versoffenes|Empfehlenswerte[ms]|Entnommene[ms]|Sü(ß|ss)e[ms]|Saure[ms]|Wesentliche[ms]|Gegenteilige[ms]|Wegweisende[ms]|Hochprozentige[ms]|Erlernte[ms]|Vergangene[ms]|Unglaubliche[ms]|Schlimme[ms]|Eingemachte[ms]|Rare[ms]|Brauchbare[ms]|Unbrauchbare[ms]|Gesehene[ms]|Erlebte[ms]|Private[ms]|Berufliche[ms]|Ungeheuerliche[ms]|Vegane[ms]|Vegetarische[ms]|Eingemachte[ms]|Erwünschte[ms]|Äu(ß|ss)erste[ms]|Äu(ß|ss)ere[ms]|Inhaltliche[ms]|Vernichtende[ms]|Salzige[ms]|Sü(ß|ss)e[ms]|Selbstgemachte[ms]|Inhaltliche[ms]|Au(ß|ss)erordentliche[ms]|Säuerliche[ms]|Göttliche[ms]||Hochprozentige[sm]|Erbrochene[ms]|Innere[mns]|Vorhandene[ms]|Relevante[ms]|Geübte[ms]|Unmögliche[ms]|Mögliche[ms]|Näheres|Wissenswerte[ms]|Fundamentale[ms]|Interessante[ms]|Uninteressante[ms]|Entsetzliche[ms]|Hartnäckige[ms]|Ersparte[ms]|Halbgare[ms]|Universale[ms]|Finanzielle[ms]|Überraschendes|Grundlegendes|Gesunde[ms]|Ungesunde[ms]|Tagesaktuelle[ms]|Aktuelle[ms]|Geschehene[ms]|Ungeschehene[ms]|Böse[ms]|Gesagte[ms]|Aufregende[sm]|Ausgestelltes|Verschiedenes|Verborgenes|Soziale[ms]|Erfundenes|Gro(ß|ss)es|Neueres|Au(ß|ss)ergewöhnliche[ms]|Zukunftsfähige[sm]|Administrative[ms]|Beunruhigendes|Naturverträgliches|Nachhaltiges|Verderbliche[ms]|Sinnstiftendes|Unüberlegtes|Alltägliche[sm]|Geartetes?|Allgemeines?|Übernatürliches?|Juristisches?|Rechtliches?|Vielfältiges?|Kommunales|Wundervolles?|Abgelaufenes|Erstere[ms]|Zweitere[ms]|Letztere[ms]|Unvermeidliches?|Fressbares?|Essbares?|Erbrochene[sm]|Politische[sm]|Regionale[sm]|Recherchiertes|Höheres|Kleineres|Deftiges|Liebes|Grünes|Diverses|Machbare[ms]|Nachweisbare[ms]|Zerstörtes|Öffentliches|Produktives|Entbehrliches|Notwendiges|Sinnvolle[ms]|Bewährte[ms]|Nötiges|Erfreuliches|Frustrierendes|Vorübergehendes|Untaugliches|Rohes|Nettes|Blödes|Unerwartetes|Lesenswerte[ms]|Geplantes|Ungeplantes|Redaktionelles|Spezielle[ms]|Spezifische[ms]|Staatstragendes|Organisatorisches|Übersehenes|Altbewährte[ms]|Erstaunliches|Verdächtiges|Au(ß|ss)ergewöhnliches|Ungewöhnliches|Unerreichbare[ms]|Bezahltes|Unbezahltes|Beschämendes|Grundsätzliche[sm]|Freiheitliches|Übrige[ms]|Ähnliche[ms]|Letztgenannte[ms]|Echtes|Unechtes|Gro(ß|ss)artige[ms]|Esoterisches|Qualifizierte[ms]|Unqualifizierte[ms]|Grö(ß|ss)eres|Postmodernes|Unklares|Bezahlbares|Unbezahlbares|Gemischte[ms]|Gebündelte[ms]|Lebendige[ms]|Angenommenes|Zeitgenössisches|Geistliches|Elementare[ms]|Bitteres|Äu(ß|ss)erliches|Spannendes|Kurioses|Digitale[ms]|Hervorgebrachte[ms]|Gewirktes|Altbekannte[ms]|Gehackte[sm]|Gewordenes|Erkennbares|Verstörende[sm]|Versaute[ms]|Nachdenkliches|Bestehendes|Beobachtetes|Originelle[ms]|Derartige[sm]|Schriftliches|Mündliches|Verblühte[ms]|Faszinierende[ms]|Christliches|Gute[ms]|Böse[ms]||Folgende[ms]|Letztere[ms]|Erstere[ms]|Schreckliche[ms]|Falsche[sm]|Richtige[ms]|Hässliche[sm]|Auswärtige[ms]|Nervige[ms]|Ätzende[ms]|Kleine[ms]|Gro(ß|ss)e[ms]|Riskante[ms]|Li?ebenswerte[ms]|Materielle[ms]|Geglaubte[sm]|Ausgedachte[sm]|Unsagbare[sm]?|Unverwechselbare[sm]?|[A-Z].{1,20}rechtliche[ms]?|Umfassendere[ms]|[A-ZÄÖÜ].{1,20}(liche|bare|werte)[ms]|Signifikante[ms]|Bestialische[ms]|Delikate[sm]|Nennenswerte[ms]|Verunglimpfende[ms]|Wichtigere[ms]|Liberale[ms]|Heilsame[ms]|Geschriebene[sm]|Besondere[sm]|Bemerkenswerte[ms]|Ernsthafte[ms]|Unvollendete[ms]|Vollendete[ms]"),
      csRegex("(?!(und|oder))[a-zäöü…\\.!,\\?…\\)“„\"»«–\\-:;\\[\\]].*")
    ],
    [
      // Er sucht Neues und macht …
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Dieses|Alles|Eines|Jenes|[DMSK]eines|Anderes|Eures|Unse?res|Sonstiges|Einiges|Manches|Welches|Vieles|Solches|Studies|Eyes))[A-ZÄÖÜ].+es").build(),
      csRegex("und|oder"),
      csRegex("(?!([a-zäöüA-ZÄÖÜ].+es)).+")
    ],
    [
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Diesem|Allem|Einem|Jenem|[DMSK]einem|Anderem|Eurem|Unse?rem|Sonstigem|Einigem|Manchem|Welchem|Vielem|Solchem))[A-ZÄÖÜ].+em").build(),
      csRegex("und|oder"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Diesem|Allem|Einem|Jenem|[DMSK]einem|Anderem|Eurem|Unse?rem|Sonstigem|Einigem|Manchem|Welchem|Vielem|Solchem))[A-ZÄÖÜ].+em").build(),
      csRegex("[a-zäöü…\\.!,\\?…\\)“„\"»«–\\-:;].*")
    ],
    [
      // Already caught by SEIT_LAENGEREN
      token("seit"),
      token("Längeren")
    ],
    [
      token("von"),
      csToken("Nichts"),
      csToken("zu"),
      csToken("Nichts")
    ],
    [
      token("aus"),
      csToken("dem"),
      csToken("Nichts")
    ],
    [
      token("das"),
      csToken("meinen")
    ],
    [
      token("Vors"),
      token(".")
    ],
    [ // Immer mehr Ältere erkranken daran
      csRegex("Ältere[rn]?|Jüngere[rn]?|Zuschauende[rn]?|Angeklagte[rn]?|Referierende[rn]?|Schlafenden?|Moderierende[rn]?|Dunkelhäutige[rn]?|Verantwortliche[rn]?|Alleinlebende[rn]?|Verdammten?|Alleinstehende[rn]?|Ungeübte[rn]?|Au(ß|ss)erirdische[rn]?|Berittene[rn]?|Heranwachsende[rn]?|Ganze[sn]?|Gefangene[rn]?|Steuerpflichtige[rn]?|Geschädigte[rn]?|Heimatvertriebenen?|Schwerverletzte[rn]?|Werbenden?|Au(ß|ss)enstehenden?|Forschenden?|Prominenten?|Pflegenden?|Beklagten?|Geistlichen?|Pflegebedürftigen?|(Teil|Voll)zeitbeschäftigten?|Fortgeschrittenen?|Promovierenden?|Schreibenden?|Ungeimpfte[nr]?|Geimpfte[nr]?|Tatverdächtige[nr]?|Pubertären?|Flüchtende[nr]?|Vortragende[nr]?|Besuchenden?|Vortragenden?|Verantwortliche[rn]?|Geflohene[rn]?|Sterbende[nr]?|Werbende[nr]?|Vortragende[nr]?|Alliierte[nr]?|Bedürftige[rn]?|Praktizierenden?|Geisteskranke[nr]?|Religiöse[rn]?|Kleinsten?|Kleinen|Dauerarbeitslose[rn]|Angesteckten?|Ortskundigen?|Steuerpflichtige[rn]?|Vorbehandelnden?|Gefährdeten?|Eingemachte|Geübten?|Schwimmenden?|Tauchenden?|Anständigen?|Liebenden?|Volljährigen?|Minderjährigen?|Zeichnungsberechtigte[rn]?|Zeichnungsbefugte[rn]?|Altbekannte[nmr]?|Hartnäckigen?|Unerfahrenen?|Arbeitenden?|Vortragende[nr]?|Dummen?|Fragenden?|Antwortenden?|Kriegs[gb]eschädigten?|Begünstigten?|Verfolgten?|Verwitweten?|Geschiedenen?|Asexuellen?|Liebsten?|(Rechts|Links)extremen?|(Aus|Ein)geschlossenen?|Betuchten?|Anteilnehmende[rn]?|Anbietenden?|Hochbetagten?|Seelenverwandte[nr]?|Gleichgestellten?|Gottlosen?|Inhaftierten?|Protestierenden?|Wohnungssuchenden?|Lesenden?|Schreibenden?|Beitragenden?|Superreichen?|Au(ß|ss)enstehenden?|Juryvorsitzende[rn]?|Introvertierten?|Extrovertierten?|.+begeisterten?|(Schwer|Seh)behinderten?|Unbekannten?|Anwesenden?|Personalverantwortlichen?|[NF]rühgeborenen?|Hörgeschädigten?|Gehorsamen?|Ungehorsamen?|Suchtkranken?|Bildbetrachtenden?|Uniformierten?|Bediensteten?|Gesetzlosen?|Vermummten?|(Schwer|Leicht)verletzten?|Untoten?|Hübschen?|Reisende[rn]?|Abtrünnigen?|Liebende[nr]?|Befehlenden?|Pubertierende[rn]?|Lebenden?|Geistliche[rn]?|Klassenbeste[rn]?|Totgesagte[rn]?|Zivildienstleistende[rn]?|Nutzenden?|Kunstinteressierte[rn]?|Nachtaktive[nr]?|Bewerbenden?|Geliebter?|Unsterblichen?|Sterblichen?|Evangelikalen?|Gewaltbereiten?|Dozierenden?|Autofahenden?|Impfgeschädigten?|[A-ZÄÖÜ].+stämmigen?|Auszubildende[rn]?|Unnahbaren?|Arbeitgebenden?|Nutzungsberechtigte[nr]?|Interviewte[rn]?|Bewohnenden?|Zugewanderte[rn]?|Eingeweihte[rn]?|Heimatvertriebene[nr]?|Asylberechtigte[rn]?|Erwachte[rn]?|Kulturschaffende[rn]?|Gebärenden?|Beschenkte[rn]?|Ungelernten?|Verbrauchende[rn]?|Schwule[rn]?|Partywütige[rn]?|(Homo|Hetero|Metro|Trans)sexuelle[rn]?|Geduldige[rn]?|Ungeduldige[rn]?|Schneebegeisterte[rn]?|Befindlichen?|Gebietsansässigen?|Erneuerbaren?|Militärinternierte[rn]?|Steuerpflichtige[nr]?|Ungläubige[rn]?|Geduldigen?|Ungeduldigen?|Unerreichbaren?|Schuldige[rn]?|Alleinschuldige[rn]?|Getreuen?|Mitschuldige[rn]?|Auswärtige[rn]?|[A-ZÄÖÜ].+schaffende[rn]|Übergewichtige[rn]?|Schichtarbeitende[rn]?|Unbefugte[rn]?|Nominierte[rn]?|Erholungsuchende[rn]?|Getriebene[rn]?|Vertriebene[rn]?|Unverwechselbaren?|Anständigen?|Zeitreisende[rn]?|Gefallene[rn]?|Angereiste[rn]?|Liberale[rn]?|Geflüchtete[rn]?|Beratende[rn]?|Geborene[rn]?|Gerettete[rn]?|Wahlberechtigte[rn]?|Unbeteiligte[rn]?|Bevorteilte[rn]?|Begeisterte[rn]?|Benachteiligte[rn]?"),
      csRegex("(?!(und|oder))[a-zäöü…\\.!:;,\\?…\\)\\*\\(“„\"»«–\\-\\[\\]].*")
    ],
    [
      // wie oben, nur können die Adjektive auch als Verben gebraucht werden
      csRegex("[a-zäöü…\\.,:;0-9\\/$%].*"),
      csRegex("Vertraute[nr]?|Verwirrte[rn]?|Befragte[rn]?|Beschuldigte[rn]?|Interviewten?|Engagierten?|Beteiligte[nr]?|Verurteilte[rn]?"),
      csRegex("(?!(und|oder))[a-zäöü…\\.!:;,\\?…\\)\\*\\(“„\"»«–\\-].*")
    ],
    [ // Im Folgenden Kunde genannt
      token("im"),
      csRegex("Folgenden|Nachfolgenden")
    ],
    [ // § 12 Die Pflichtversicherung
      csToken("§"),
      csRegex("\\d+[a-z]{0,2}"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // § 12.1 Die Pflichtversicherung
      csToken("§"),
      regex("\\d+"),
      token("."),
      regex("\\d+"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Etwas anderes Lebendiges
      csToken("zu"),
      csRegex("Angeboten|Gefahren|Kosten")
    ],
    [ // Die Gemeinde Nahe in Schleswig-Holstein
      csRegex("Gemeinden?"),
      csToken("Nahe")
    ],
    [
      csToken("Für"),
      csToken("und"),
      csToken("Wider")
    ],
    [ // Ein Haus // Eine Villa
      token("/"),
      token("/"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Ein Haus // Eine Villa
      token("<"),
      token("<"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      token("("),
      csRegex("[!?]"),
      token(")"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Ein Haus // Eine Villa
      token(">"),
      token(">"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // [Weiterlesen]
      token("["),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Beim Hoch- und Runtertragen
      regex("beim|zum|im|am"),
      csRegex("[A-ZÄÖÜ].+-"),
      csRegex("und|oder|&|/"),
      csRegex("[A-ZÄÖÜ].+n")
    ],
    [ // Ein Highlight für Klein und Groß!
      regex("für"),
      csToken("Klein"),
      csRegex("und|oder|&|/"),
      csToken("Groß")
    ],
    [
      csToken("/"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [ // Ein Highlight für Groß und Klein!
      regex("für"),
      csToken("Groß"),
      csRegex("und|oder|&|/"),
      csToken("Klein")
    ],
    [ // Das sagen meine Kunden:
      posRegex("SENT_START|PKT"),
      token("das"),
      csRegex("sagen|beweisen|zeigen|schaffen|machen|halten|verstehen|versuchen"),
      new PatternTokenBuilder().posRegex("ADV.*").min(0).build(),
      csRegex("[dms]eine?|eure|die|unse?re|mehrere|einige|viele|manche|sonstige|diese|solche|andere|alle|wenige|jene|nicht|koennt?en|zwar|wird")
    ],
    [ // Das verstehen Deutsche eben nicht
      posRegex("SENT_START|PKT"),
      token("das"),
      csRegex("sagen|beweisen|zeigen|schaffen|machen|halten|verstehen|versuchen"),
      posRegex("SUB.+ADJ")
    ],
    [
      csToken("das"),
      csRegex("sieben")
    ],
    [ // Das belegen mehrere Studien
      token("das"),
      csRegex("belegen")
    ],
    [ // (Gelächter) Das sind die …
      SENT_START,
      csRegex("\\(|\\{"),
      csRegex("[A-ZÄÖÜ].*"),
      csRegex("\\)|\\}"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // ,Es sind die kleinen Dinge´
      SENT_START,
      token(","),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // ,Es sind die kleinen Dinge´
      token(":"),
      token(","),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // LaTeX
      SENT_START,
      token("\\"),
      csRegex("(no)?indent|item"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // [Gelächter] Das sind die …
      SENT_START,
      csToken("["),
      csRegex("[A-ZÄÖÜ].*"),
      csToken("]"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // 22:30 Das sind die …
      SENT_START,
      csRegex("\\d+"),
      csToken(":"),
      csRegex("\\d+"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // 12:00 - 12:30 Gemeinsames Mittagessen 
      SENT_START,
      csRegex("\\d+"),
      csToken(":"),
      csRegex("\\d+"),
      csRegex("[\\-–]"),
      csRegex("\\d+"),
      csToken(":"),
      csRegex("\\d+"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // (22:30) Das sind die …
      SENT_START,
      csRegex("\\(|\\["),
      csRegex("\\d+"),
      csToken(":"),
      csRegex("\\d+"),
      csRegex("\\)|\\]"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // Teil 1: Die Götter
      SENT_START,
      csToken("Teil"),
      csRegex("\\d+|I{1,3}|V|IV|VI{1,3}|IX|XI{1,3}"),
      csToken(":"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // ... ist das neue Normal.
      csToken("das"),
      csToken("neue"),
      csToken("Normal")
    ],
    [ // siehe hierzu: Argentinisches Antarktisterritorium
      csToken("siehe"),
      csToken("hierzu"),
      csToken(":"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // ... des vierten Offiziellen …
      csRegex("de[mrs]"),
      csRegex("vierten?"),
      csRegex("Offiziellen?")
    ],
    [ // Auf \foo{Weiter} klicken
      csRegex("[\\{\\[#]"),
      csRegex("[A-ZÄÖÜ].*")
    ],
    [ // Hallo, Kleines, wie geht es dir?
      token(","),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*NEU.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("[A-ZÄÖÜ].+es?").build(),
      token(",")
    ],
    [ // Es gibt mehr Neues
      csRegex("mehr|weniger|viel|nur"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*NEU.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Eines|Keines|Sonstiges|Anderes|Einiges))[A-ZÄÖÜ].+es").build()
    ],
    [
      // Bei der Fülle an Vorgaben kann das schnell vergessen werden.
      csToken("das"),
      csRegex("halt|schnell|gar|sicher|bitte|gleich"),
      posRegex("VER:INF.*")
    ],
    [
      // Dass du dir das gönnen tust
      csToken("das"),
      posRegex("VER:INF.*"),
      new PatternTokenBuilder().token("tun").matchInflectedForms().build()
    ],
    [
      // Über das Gesagte Gedanken machen
      // Und das Vergangene Revue passieren lassen
      csRegex("das|dieses|[dmsk]ein"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*NEU.*ADJ|(ADJ|PA[12]).*SIN.*NEU.*|UNKNOWN").csTokenRegex("(?!(Die|Diese|Alle|Eine|Jene|[DMSK]eine|Andere|Eure|Unse?re|Sonstige|Einige|Manche|Ohne|Welche|Viele|Solche))[A-ZÄÖÜ].+e").build(),
      posRegex("SUB.*PLU.*(FEM|NEU|MAS|NOG)|SUB.*NOM.*SIN.*FEM")
    ],
    [
      // Während der Befragte Geschichten erzählte
      csRegex("der|dieser|[msdk]ein|euer|unser|ihr"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Die|Diese|Alle|Eine|Jene|[DMSK]eine|Andere|Eure|Unse?re|Sonstige|Einige|Manche|Ohne|Welche|Viele|Solche))[A-ZÄÖÜ].+e").build(),
      posRegex("SUB.*PLU.*(FEM|NEU|MAS|NOG)")
    ],
    [
      // Während des Hochwassers den Eingeschlossenen Wasser und Nahrung bringen
      csRegex("den|diesen|[msdk]einen|unse?ren|euren|ihren"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Den|Diesen|Allen|Einen|Jenen|[DMSK]einen|Anderen|Euren|Unse?ren|Sonstigen|Einigen|Manchen|Welchen|Vielen|Solchen))[A-ZÄÖÜ].+en").build(),
      posRegex("SUB.*NOM.*SIN.*(FEM|NEU)")
    ],
    [
      // sind dem Zahlungspflichtigen Kosten entstanden
      csRegex("dem|diesem|[msdk]einem|unse?rem|eurem|ihrem"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Den|Diesen|Allen|Einen|Jenen|[DMSK]einen|Anderen|Euren|Unse?ren|Sonstigen|Einigen|Manchen|Welchen|Vielen|Solchen))[A-ZÄÖÜ].+en").build(),
      new PatternTokenBuilder().posRegexWithStringException("SUB.*PLU.*(FEM|NEU|MAS|NOG)", "Band|Kapitel|Maß|.*[Vv]erbrechen|Orchester|Gestalten|Gebirge|.*[vV]orkommen|.*[Vv]erfahren|.*[gG]utachten|Schreiben|Bayern|Theater|Verlangen|.*[sS]chlüssel|.*[mM]eister|.*[vV]erhalten|.*[Aa]benteuer|.*[wW]asser|Leben|Bauen|.*[gG]ewerbe|.*[Zz]immer|.*[Ee]ssen|.*[rR]asen|.*[hH]ebel|.*[oO]pfer|.*[cC]hirurgen|.*[Pp]räsidenten|.*[kK]reuzer|.*[wW]appen|Morgen").build()
    ],
    [
      // Dann hätten die Aufständischen Oberhand gewonnen
      csRegex("die|diese|alle|solche|einige|sonstige|viele|[msdk]eine|unse?re|eure|ihre"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Den|Diesen|Allen|Einen|Jenen|[DMSK]einen|Anderen|Euren|Unse?ren|Sonstigen|Einigen|Manchen|Welchen|Vielen|Solchen))[A-ZÄÖÜ].+en").build(),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*FEM").build()
    ],
    [
      // Während ein Befragter Geschichten erzählte
      // für welche ein Befragter Geld ausgegeben hat
      csRegex("[msdk]?ein"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Der|Dieser|Aller|Einer|Jener|[DMSK]einer|Anderer|Eurer|Unse?rer|Sonstiger|Einiger|Mancher|Welcher|Vieler|Solcher))[A-ZÄÖÜ].+er").build(),
      new PatternTokenBuilder().posRegexWithStringException("SUB.*PLU.*(FEM|NEU|MAS|NOG)|SUB.*SIN.*(NEU|FEM)", "Tag|Kalkül").build()
    ],
    [
      // Während die Besagte Geld verdiente
      // Während die Besagte Geschichten erzählte
      csRegex("die|diese|[msdk]eine"),
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Die|Diese|Alle|Eine|Jene|[DMSK]eine|Andere|Eure|Unse?re|Sonstige|Einige|Manche|Ohne|Welche|Viele|Solche))[A-ZÄÖÜ].+e").build(),
      posRegex("SUB.*NOM.*SIN.*(MAS|NEU)|SUB.*NOM.*PLU.*(FEM|NEU|MAS|NOG)")
    ],
    [
      // Mit Gesagtem Geschichten schreiben
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Diesem|Allem|Einem|Jenem|[DMSK]einem|Anderem|Eurem|Unse?rem|Sonstigem|Einigem|Manchem|Welchem|Vielem|Solchem))[A-ZÄÖÜ].+em").build(),
      posRegex("SUB.*SIN.*FEM|SUB.*PLU.*(FEM|NEU|MAS|NOG)")
    ],
    [
      // Während Besagtes Probleme verursacht
      new PatternTokenBuilder().posRegex("SUB.*SIN.*ADJ|(ADJ|PA[12]).*SIN.*|UNKNOWN").csTokenRegex("(?!(Dieses|Alles|Eines|Jenes|[DMSK]eines|Anderes|Eures|Unse?res|Sonstiges|Einiges|Manches|Welches|Vieles|Solches))[A-ZÄÖÜ].+es").build(),
      new PatternTokenBuilder().posRegexWithStringException("SUB.*SIN.*(FEM|MAS)|SUB.*PLU.*(FEM|NEU|MAS|NOG)", "Band|Kapitel|Maß|.*[Vv]erbrechen|Orchester|Gestalten|Gebirge|.*[vV]orkommen|.*[Vv]erfahren|.*[gG]utachten|Schreiben|Bayern|Theater|Verlangen|.*[sS]chlüssel|.*[mM]eister|.*[vV]erhalten|.*[Aa]benteuer|.*[wW]asser|Leben|Bauen|.*[gG]ewerbe|.*[Zz]immer|.*[Ee]ssen|.*[rR]asen|.*[hH]ebel|.*[oO]pfer|.*[cC]hirurgen|.*[Pp]räsidenten|.*[kK]reuzer|.*[wW]appen|Morgen").build()
    ],
    [
      // Hashtags
      token("#"),
      new PatternTokenBuilder().tokenRegex("[A-Z].*").setIsWhiteSpaceBefore(false).build()
    ],
    [
      // Jetzt, wo Protestierende und Politiker sich streiten
      new PatternTokenBuilder().posRegex("SUB.*SIN.*NEU.*ADJ|(ADJ|PA[12]).*SIN.*NEU.*|UNKNOWN").csTokenRegex("(?!(Die|Diese|Alle|Eine|Jene|[DMSK]eine|Andere|Eure|Unse?re|Sonstige|Einige|Manche|Ohne|Welche|Viele|Solche))[A-ZÄÖÜ].+e").build(),
      csRegex("und|oder|&"),
      posRegex("SUB.*NOM.*PLU.*(MAS|FEM|NEU|NOG)")
    ],
    [
      // Hier ist Text. (Und dann schreibe ich etwas in Klammern.) Nach der Klammer möchte LT klein weiterschreiben.
      csToken("."),
      csToken(")"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // Wenn Sie Strg+Umschalt+I drücken
      csRegex("Strg|STRG|Alt|ALT"),
      csRegex("und|&|oder|\\+"),
      csToken("Umschalt")
    ],
    [
      // Wenn Sie Strg+Umschalt+I drücken
      csToken("Umschalt"),
      csRegex("und|&|oder|\\+")
    ],
    [
      csRegex("[Ii]m"),
      csRegex("Inneren|Äu(ss|ß)eren")
    ],
    [
      // denke aber, dass die das machen werden.
      csRegex("ob|dass|weswegen|damit|sofern|wie|wann|wo|wozu|warum"),
      csRegex("wir|[Ss]ie|ich|er|die|der|es|du|ihr"),
      csToken("das"),
      posRegex("VER:INF.*")
    ],
    [
      posRegex("KON.*"),
      csRegex("wir|[Ss]ie|ich|er|die|der|es|du|ihr"),
      csToken("das"),
      posRegex("VER:INF.*")
    ],
    [
      csRegex("ob|dass|weswegen|damit|sofern|wie|wann|wo|wozu|warum"),
      posRegex("EIG.*|UNKNOWN"),
      csToken("das"),
      posRegex("VER:INF.*")
    ],
    [
      posRegex("KON.*"),
      posRegex("EIG.*|UNKNOWN"),
      csToken("das"),
      posRegex("VER:INF.*")
    ],
    [
      // Filme drehen muss mir Spaß machen, und das machen Organisation, Finanzierung, Logistik nicht, deswegen sind meine Filme nicht aufwändig.
      csRegex("und|oder|&"),
      csToken("das"),
      posRegex("VER:INF.*"),
      posRegex("SUB.*")
    ],
    [
      //  Ich würde ihn dann im Februar mal nach Potsdam schicken, damit die beiden das planen/entwickeln können.
      csToken("das"),
      posRegex("VER:INF.*"),
      csRegex("und|oder|&|beziehungsweise|/|\\+"),
      posRegex("VER:INF.*|UNKNOWN"),
      posRegex("VER:(MOD|AUX).*")
    ],
    [
      // Majid ergänzte: ”Vorläufigen Analysen der Terrakottaröhren aus Ardais liegen ...
      csToken(":"),
      csRegex("[\"”„»«]"),
      csRegex("[A-ZÄÖÜ].+")
    ],
    [
      // "gibt ja auch viele Nutzer, die sich das wünschen"
      csRegex("die|welche"),
      csToken("sich"),
      csToken("das"),
      posRegex("VER:INF.*")
    ],
    [
      csRegex("Bolivarische[mnrs]?"),
      csRegex("Republik(en)?|Verfassung(en)?|Revolution(en)?")
    ],
    [
      csRegex("Harmonisierte[mnr]?"),
      csRegex("Verbraucherpreisindex(e[sn]?)?")
    ],
    [
      csRegex("Gro(ss|ß)e[n]?"),
      csRegex("Koalition(en?)?")
    ],
    [
      csToken("Oval"),
      csRegex("Offices?")
    ],
    [
      // "Er studierte an der Hebräischen Universität Jerusalem."
      csRegex("Hebräischen?"),
      csRegex("Universität|Bibel")
    ],
    [
      // "Es wurde 1784 in das Allgemeine Krankenspital umgewandelt."
      csRegex("Allgemeine[ns]?"),
      csRegex("Kranken(spitale?s?|haus(es)?)?")
    ],
    [
      csRegex("[A-ZÄÖÜ].+stereotypen?")
    ],
    [
      // Allerdings gibt es im Französischen und im Spanischen Ausnahmen.
      csToken("im"),
      csRegex("(Afrikanisch|Alt(arabisch|chinesisch|griechisch|persisch)|Amerikanisch|Arabisch|Chinesisch|Dänisch|Deutsch|Plattdeutsch|Englisch|Finnisch|Französisch|Frühneuhochdeutsch|Germanisch|Griechisch|Hocharabisch|Hochchinesisch|Hochdeutsch|Holländisch|Italienisch|Japanisch|Jiddisch|Jugoslawisch|Koreanisch|Kroatisch|Lateinisch|Luxemburgisch|Mittelhochdeutsch|Neuhochdeutsch|Niederländisch|Norwegisch|Persisch|Polnisch|Portugiesisch|Russisch|Schwedisch|Schweizerisch|Semitisch|Serbisch|Serbokroatisch|Slawisch|Spanisch|Tschechisch|Türkisch|Ukrainisch|Ungarisch|Wei[sß]russisch|Hebräisch|Katalanisch)en")
    ],
    [
      // Aljos Farjon unterscheidet folgende Arten: die Europäische Eibe, Pazifische Eibe, Kanadische Eibe und Chinesische Eibe.
      csRegex("Pazifischen?|Chinesischen?|Europäischen?|Kanadischen?"),
      csRegex("Eiben?")
    ],
    [
      // für sein Werk Die Nächte des großen Jägers
      csRegex("sein(e[nrs]?)?|ihr(e[nrs]?)?|das|des|die|den|der"),
      csRegex(".*werks?|.*werke[sn]?|.*films?|.*filme[sn]?"),
      csRegex("Der|Die|Das")
    ],
    [
      //Jedenfalls schien das einigen völlig neu.
      csToken("das"),
      csToken("einigen")
    ],
    [
      //... schon gar nicht für Investorenträume das finden gerade die jüngeren, ...
      csRegex("das|Das"),
      csToken("finden")
    ],
    [
      //Ich habe Tom das machen sehen.
      csToken("das"),
      csToken("machen"),
      csRegex("sehen|gesehen")
    ],
    [
      //Das bestätigen andere Praktikanten, die ihre Erfahrungen im Internet weitergeben.
      csRegex("Das|das"),
      posRegex("VER:[13]:PLU.*"),
      posRegex("(PRO|SUB).*")
      ]
    ];
