// org.languagetool.rules.de.AgreementRuleAntiPatterns1 (token lists; converted mechanically from the Java source)
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';

export const MONTH_NAMES_REGEX = 'Jänner|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';

// Java: AgreementRuleAntiPatterns1#ANTI_PATTERNS
export const ANTI_PATTERNS = [
    [
      tokenRegex("bring(s?t|en?)"),
      token("das"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*PLU.*"),
      token("mit"),
      token("sich")
    ],
    [
      tokenRegex("der|die|das"),
      posRegex("_english_ignore_")
    ],
    [
      tokenRegex("der|des"),   // "Übernahme der früher selbständigen Gesellschaft"
      token("früher"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      token("sein"),   // "ich kann nicht dabei sein nächste Woche"
      pos("ADV:TMP"),
      tokenRegex("Woche|Monat|Jahr")
    ],
    [
      posRegex("(ART|PRO):.*"),   // "Wie viele Kolleg/-innen haben sie?"
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*"),
      token("/"),
      tokenRegex("-in|-innen")
    ],
    [
      token("wegen"),   //  "...und hatte wegen des vielen Trinkens Kopfschmerzen." (#4695)
      token("des"),
      token("vielen"),
      posRegex("SUB:GEN:SIN:.*"),
      posRegex("SUB:GEN:.*")
    ],
    [
      tokenRegex("des"),   // "Chef des renommierten Institute for Fiscal Studies (IFS)"
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      token("Institute"),
      tokenRegex("for|of")
    ],
    [
      token("zur"),   // "Bis zur Anfang Juni geplanten Eröffnung gebe es noch einiges zu tun."
      tokenRegex("Anfang|Ende|Mitte"),
      tokenRegex(MONTH_NAMES_REGEX),
      posRegex("PA2:.*"),
      posRegex("SUB:.*FEM.*")
    ],
    [  // "Jedes Grad zählt"
      token("jedes"),
      token("Grad")
    ],
    [
      token("euer"),
      token("Gnaden")
    ],
    [
      token("die"),  // "Die Adelmanns" (Nachname not tagged properly)
      new PatternTokenBuilder().pos("SUB:GEN:SIN:MAS").tokenRegex(".*manns").build()
    ],
    [
      token("für"),
      token("viele"),
      token("Grund"),
      token("genug")
    ],
    [
      token("sowas"),   // "Wir können sowas Mittwoch machen."
      tokenRegex("Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag")
    ],
    [
      token("bei"),   // "Es kann gut sein, dass bei sowas Probleme erkannt werden."
      token("sowas"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*PLU.*")
    ],
    [
      token("beides"),   // "Beides Grund genug, es mal zu probieren."
      token("Grund")
    ],
    [
      token("bisschen"),   // "Für schwangere Frauen gelten wohl ein bisschen strengere Einschränkungen."
      posRegex("ADJ.*"),
      posRegex("SUB.*PLU.*")
      ],
    [
      tokenRegex("der|die|den"),   // "Ein Haus für die weniger Glücklichen."
      tokenRegex("weniger|besser|mehr|schlechter"),
      posRegex("SUB:.*PLU:.*:ADJ")
    ],
    [
      tokenRegex("wusste|weiß"),   // "Da wusste keiner Bescheid"
      tokenRegex("keiner?"),
      token("Bescheid")
    ],
    [
      tokenRegex("keiner?"),  // "es braucht keiner Bescheid wissen"
      token("Bescheid"),
      token("wissen")
    ],
    [
      token("von"),  // "eine von manchem geforderte Übergewinnsteuer"
      tokenRegex("manche[nmr]?"),
      posRegex("PA2:.*"),
      posRegex("SUB:.*")
    ],
    [
      token("niemandem"),  // "hat niemandem wirkliches Leid zugefügt"
      posRegex("ADJ:NOM:SIN:NEU:.*"),
      posRegex("SUB:.*SIN.*")
    ],
    [   // "Eine mehrere hundert Meter lange Startbahn."
      tokenRegex("viele|mehrere"),
      pos("ZAL"),
      tokenRegex("Meter|.+meter"),
      tokenRegex("lange[ns]?|kurze[ns]?|große[ns]?|kleine[ns]?"),
      posRegex("SUB:.*")
    ],
    [  // "eine alles in allem spannende Geschichte"
      token("alles"),
      token("in"),
      token("allem")
    ],
    [  // "Man darf gespannt sein, wen Müller für"
      token("wen"),
      posRegex("EIG:.*")
    ],
    [  // "das Vereinslokal in welchem Zusammenkünfte"
      tokenRegex("in|zu"),
      tokenRegex("welche[nmrs]"),
      posRegex("SUB.*PLU.*")
    ],
    [  // "er lässt niemanden zu Wort kommen"
      token("niemanden"),
      token("zu"),
      token("Wort")
    ],
    [
      token("zu"),
      tokenRegex("Kopfe?|Zwecken?|Ohren|Fü(ß|ss)en|Fu(ß|ss)|Händen|Beginn|Anfang|Geld|Gesicht|Recht|Unrecht|.*stein")
    ],
    [   // "Zum anderen verringert Zuversicht seelische Belastungen"
      token("zum"),
      token("anderen"),
      posRegex("VER:3:SIN:(PRÄ|PRT):SFT"),
      posRegex("SUB:NOM:SIN:.*")
    ],
    [
      token("an"),
      token("allem"),
      token("Schuld")
    ],
    [
      posRegex("ART.*|PRO:POS.*"),
      token("zu"),
      tokenRegex("gleichen|gro(ß|ss)en|kleinen"),
      token("Teilen")
    ],
    [  //"Bald läppert sich das zu richtigem Geld zusammen."
      new PatternTokenBuilder().tokenRegex("läppern|summieren").matchInflectedForms().build(),
      token("sich"),
      posRegex("PRO:DEM.*"),
      token("zu"),
      posRegex("ADJ:DAT.*"),
      posRegex("SUB:DAT.*")
    ],
    [  //"Die Weimarer Parks laden ja förmlich ein zu Fotos im öffentlichen Raum."
      new PatternTokenBuilder().token("laden").matchInflectedForms().setSkip(-1).build(),
      token("ein"),
      token("zu"),
      posRegex("SUB:AKK.*")
    ],
    [ //"Es is schwierig für mich, diese zu Sätzen zu verbinden."
      posRegex("PRO:DEM.*"),
      token("zu"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB.*"),
      new PatternTokenBuilder().token("zu").min(0).build(),
      tokenRegex("verbinden|verhelfen|fähig")
    ],
    [ //"Kombinieren Sie diese zu ganzen Bewegungsprogrammen"
      tokenRegex("diese[sn]?"),
      token("zu"),
      posRegex("ADJ.*PLU.*"),
      posRegex("SUB.*PLU.*")
    ],
    [ //"Es kam zum einen zu technischen Problemen, zum anderen wurde es unübersichtlich."
      token("zum"),
      token("einen"),
      token("zu"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      new PatternTokenBuilder().posRegex("SUB.*").setSkip(-1).build(),
      token("zum"),
      token("anderen")
    ],
    [ //"Das Spiel wird durch den zu neuer Größe gewachsenen Torwart dominiert."
      posRegex("ART.*|PRO:POS.*"),
      token("zu"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).max(2).build(),
      posRegex("SUB.*"),
      posRegex("PA2.*")
    ],
    [ //"Dort findet sich schlicht und einfach alles & das zu sagenhafter Hafenkulisse."
      tokenRegex("und|&"),
      posRegex("ART:DEF.*"),
      token("zu"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [  // "die zu basisdemokratischen Prozessen benötigte Mitbestimmung"
      token("die"),
      token("zu"),
      posRegex("ADJ.*"),
      posRegex("SUB:.*"),
      tokenRegex("nötigen?|benötigten?|erforderlichen?")
    ],
    [
      posRegex("PRO:.*|ART.*"),
      token("zu"),
      tokenRegex("wenige|viele|verschiedene|höheren|günstigeren"),
      posRegex("SUB:.*PLU.*")
    ],
    [
      posRegex("PRO:.*|ART.*"),
      token("zu"),
      token("Hause")
    ],
    [  // "Und das zu guter Qualität."
      posRegex("PRO:.*|ART.*"),
      token("zu"),
      posRegex("ADJ:DAT:SIN:FEM:GRU:SOL"),
      token("Qualität")
    ],
    [
      posRegex("PRO.*"),  // "Es gibt viele Stock Screener."
      posRegex("SUB:.*"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-ZÖÄÜ][A-ZÖÄÜa-zöäüß\\-]+").build()
    ],
    [
      posRegex("PRP.*(DAT|AKK)"),  // "zur Learning Academy"
      posRegex("SUB:.*"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-ZÖÄÜ][A-ZÖÄÜa-zöäüß\\-]+").build()
    ],
    [
      posRegex("PRP.*DAT"),  // "zur neuen Learning Academy"
      posRegex("ADJ.*DAT.*"),  
      posRegex("SUB:.*"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-ZÖÄÜ][A-ZÖÄÜa-zöäüß\\-]+").build()
    ],
    [
      posRegex("PRP.*AKK"),  // "zur neuen Learning Academy"
      posRegex("ADJ.*AKK.*"),  
      posRegex("SUB:.*"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-ZÖÄÜ][A-ZÖÄÜa-zöäüß\\-]+").build()
    ],
    [
      posRegex("PRO.*"),  // "Es gibt viele verschiedene Stock Screener."
      posRegex("(ADJ|PA2).*"),
      posRegex("SUB:.*"),
      new PatternTokenBuilder().pos("UNKNOWN").csTokenRegex("[A-ZÖÄÜ][A-ZÖÄÜa-zöäüß\\-]+").build()
    ],
    [
      tokenRegex("[(\\[]"),   // "... (ich meine Pfeil, nicht Raute) ..."
      token("ich"),
      token("meine"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("ein|das"),   // "ein leichter handhabbares Logo"
      token("leichter"),
      posRegex("ADJ:NOM:SIN:NEU:GRU:IND"),
      pos("SUB:NOM:SIN:NEU")
    ],
    [
      tokenRegex("eine|die"),   // "eine leichter handhabbare Situation"
      token("leichter"),
      posRegex("ADJ:NOM:SIN:FEM:GRU:IND"),
      pos("SUB:NOM:SIN:FEM")
    ],
    [
      tokenRegex("der|die|das"),   // "Der solchen Einsätzen gegenüber kritische Müller ..."
      tokenRegex("solche[mn]|(eben)?diese[mn]"),
      posRegex("SUB:.*"),
      token("gegenüber"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*|EIG.*")
    ],
    [
      tokenRegex("des|der"),   // "des wenige Jahrzehnte zuvor verstorbenen Klostergründers"
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*|EIG.*"),
      token("zuvor"),
      posRegex("PA2:.*")
    ],
    [
      token("Ehre"),  // "Ehre, wem Ehre gebührt"
      token(","),
      token("wem"),
      token("Ehre")
    ],
    [
      token("in"),
      token("mehrerer"),
      token("Hinsicht")
    ],
    [
      tokenRegex("der|die|das"),   // "die [daraus] jedem zukommende Freiheit", "im Lichte der diesem zukommenden Repräsentationsaufgabe"
      new PatternTokenBuilder().posRegex("ADV:.*").min(0).build(),
      tokenRegex("jedem|(eben)?diesem"),
      posRegex("PA1:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("spendet|macht"),  // "Macht dir das Hoffnung?"
      tokenRegex("mir|euch|dir|uns|ihnen"),
      token("das"),
      posRegex("SUB:.*SIN.*")
    ],
    [
      tokenRegex("der|dem"),  // "Das Staatsoberhaupt ist der Verfassung zufolge der König."
      posRegex("SUB:.*SIN.*"),
      token("zufolge"),
      tokenRegex("der|die|das"),
      posRegex("SUB:.*SIN.*")
    ],
    [
      tokenRegex("Erkenntnis|Erkenntnissen"), // "Als Auslöser könnte den ersten Erkenntnissen zufolge ein Specht in Betracht kommen."
      token("zufolge"),
      posRegex("ART:.*")
    ],
    [
      // "die Anfang des 20. Jahrhunderts"
      tokenRegex("Anfang|Mitte|Ende"),
      tokenRegex("des"),
      tokenRegex("\\d+"),
      tokenRegex(".")
    ],
    [
      // "Das verlangt reifliche Überlegung.", "Die abnehmend aufwendige Gestaltung der Portale...",
      // "Eine ausreichend genaue Bestimmung"
      tokenRegex("(eben)?diese|der|die|das|ein|eine|dem|den|eine[ernm]|anderen?"),
      posRegex("PA[12]:.*VER|ADV:TMP"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      // "Und den dritten wenige Tage später."
      tokenRegex("den|die"),
      tokenRegex("ersten?|zweiten?|dritten?|vierten?|fünften?|sechsten?|siebten?|achten?|neuten?|zehnten?|elften?|zwölften?"),
      posRegex("ADJ:.*")
    ],
    [
      // "Die ersten Drei bekommen einen Preis." / "Die geheimen Sechs"
      tokenRegex("den|die"),
      tokenRegex(".+n"),
      csRegex("Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn|Elf|Zwölf|Zwanzig|Drei(ß|ss)ig|Vierzig|Fünzig|Hundert|Tausend")
    ],
    [
      // "sie zog allem anderen kindliche Spiele vor"
      token("allem"),
      token("anderen")
    ],
    [
      // "Von denen die meisten erst Ende des 19. Jahrhunderts"
      token("denen"),
      token("die"),
      token("meisten")
    ],
    [
      // "Viele weniger bekannte Vorschläge", "Seine überwiegend raschen Walzer ...",
      // "Keiner erwähnte eigene Überprüfungen"
      new PatternTokenBuilder().posRegexWithStringException("PRO:(IND|POS).*", "eine[nm]").build(),
      posRegex("PA[12]:.*|ADV:TMP"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("der|die|manche[mr]"), // "zog sich der Düsseldorfer schwere Verletzungen zu. "
      csRegex("[A-ZÖÄÜ].*"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("einer?"),  // "Der als einer der ersten gängige Swingklischees vermied"
      token("der"),
      posRegex("ADJ:GEN:.*")
    ],
    [
      tokenRegex("der|ein|eine[rnms]?|des|die"),  // "Ein lose zusammengewürfelter Haufen"
      token("lose"),
      tokenRegex("zusammengewürfelte[rnms]?")
    ],
    [
      token("den"),  // Als Ersatz für den kleiner gewordenen Spielplatz.
      posRegex("ADJ:PRD:KOM"),
      posRegex("ADJ:AKK:SIN.*"),
      posRegex("SUB:AKK:SIN.*")
    ],
    [
      token("die"),  // Als Ersatz für die kleiner gewordenen Spielplätze.
      posRegex("ADJ:PRD:KOM"),
      posRegex("ADJ:AKK:PLU.*"),
      posRegex("SUB:AKK:PLU.*")
    ],
    [
      // "Andere weniger bekannte Vorschläge", "Ich habe mir das gerade letzte Woche zugelegt."
      posRegex("ART:.*|PRO:(POS|DEM|PER|IND).*"),
      tokenRegex("anscheinend|zunehmend|vorzugsweise|gekonnt|ausgeprägt|einige|solcher|solchen|typischerweise|hinreichend|nachgerade|vereinzelt|verheerend|hinreichend|zahlreiche|genauer|weiter|weniger|einzige|teilweise|anderen|sämtlicher|geringer|anderer|ausreichend|gerade|anhaltend|meisten"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      posRegex("PRO:DEM:.*"),  // "Diese definiert einzelne Genres ..."
      new PatternTokenBuilder().posRegexWithStringException("VER:[23]:.*", "eine").build(),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("aufs|beides|welcher"),  // "aufs äußerste grausamer Krieg"
      posRegex("ADJ:.*"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("eine[mr]"),  // "Dieses Bild stammt von einem lange Zeit unbekannten Maler."
      pos("ADV:TMP"),
      pos("ADV:TMP"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*SIN.*")
    ],
    [
      tokenRegex("zu"),  // "Sie gehörte einst zu den besten Afrikas."
      tokenRegex("den"),
      posRegex("ADJ:.*"),
      posRegex("EIG:GEN:.*")
    ],
    [
      token("von"),  // "von denen viele Open-Source-Software sind"
      token("denen"),
      tokenRegex("viele|etliche|alle|einige|manche|mehrere|wenige"),
      new PatternTokenBuilder().posRegex("SUB:.*SIN:.*").setSkip(-1).build(),
      tokenRegex("sind|seien|sein|waren|wären")
    ],
    [
      token("von"),  // "von denen die meisten Open-Source-Software sind"
      token("denen"),
      token("die"),
      tokenRegex("meisten|wenigsten|besten"),
      new PatternTokenBuilder().posRegex("SUB:.*SIN:.*").setSkip(-1).build(),
      tokenRegex("sind|seien|sein|waren|wären")
    ],
    [
      tokenRegex("die|der|den"),  // "die späten 50er Jahre"
      tokenRegex("frühen|späten"),  // "die späten 50er Jahre"
      tokenRegex("\\d+er"),  // "die späten 50er Jahre"
      tokenRegex("Jahren?")
    ],
    [
      tokenRegex("die|der|den"),  // "die wilden 90er"
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      tokenRegex("\\d+er")
    ],
    [
      posRegex("ART:.*"),  // "ein ausgesprochen unattraktiver Dienstort"
      token("ausgesprochen"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("ein|eine|einen"),  // "bietet einen weniger genauen Zugriff"
      token("weniger"),
      posRegex("ADJ:AKK:SIN:.*:GRU:.*"),
      posRegex("SUB:.*SIN.*")
    ],
    [
      new PatternTokenBuilder().csToken("sein").matchInflectedForms().build(),
      token("das"),
      tokenRegex("Grund|Anlass|Auslöser|Ursache")
    ],
    [
      // "Vielleicht schreckt das Frauen ab"
      tokenRegex("schreckte?"),
      token("das"),
      posRegex("SUB:.*")
    ],
    [
      token("eine"),
      token("Zeitlang")
    ],
    [
      token("für"),  // "..., wann und für wen Impfungen vorgenommen werden könnten."
      token("wen"),
      posRegex("SUB:.*PLU.*")
    ],
    [
      token("der"),  // "der fließend Englisch sprechende Mitarbeiter"
      tokenRegex("flie(ß|ss)end"),
      tokenRegex(".*"),
      token("sprechende")
    ],
    [
      token("ein"),  // "Das wolkige und ein bisschen kühle Wetter..."
      token("bisschen"),
      posRegex("ADJ:.*"),
      posRegex("SUB:.*SIN.*")
    ],
    [
      token("ein"),  // "...um mal ein bisschen Einsichten zu bekommen" (ugs., aber okay)
      token("bisschen"),
      posRegex("SUB:.*PLU.*")
    ],
    [
      token("dem"),  // "dem Abhilfe zu schaffen"
      token("Abhilfe"),
      new PatternTokenBuilder().token("zu").min(0).build(),
      token("schaffen")
    ],
    [
      token("die"),  // "Die Müllers aus Hamburg"
      new PatternTokenBuilder().posRegex("EIG.*").tokenRegex(".*s").build()
    ],
    [
      token("die"),  // "Die Xi Jinping Ära ist …" -- should be 'Xi-Jinping-Ära', but don't detect here because of confusing error message
      posRegex("EIG:.*"),
      posRegex("SUB:.*")
    ],
    [
      token("die"),  // "Die Xi Ära ist …"  -- should be 'Xi-Ära', but don't detect here because of confusing error message
      posRegex("EIG:.*"),
      posRegex("EIG:.*"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("ist|war|sei|wäre"),  // "war das Absicht"
      token("das"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      tokenRegex("Absicht")
    ],
    [
      token("das"),  // "in das damalige Reichenbach in Schlesien"
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      tokenRegex("Reichenbach|Albstadt|Arnstadt|Darmstadt|Duderstadt|Eberstadt|Eibelstadt|Erftstadt|Freudenstadt|Bergneustadt|" +
        "Neustadt|Burgkunstadt|Diemelstadt|Ebermannstadt|Eisenhüttenstadt|Friedrichstadt|Filderstadt|Freystadt|Florstadt|Glückstadt|" +
        "Grünstadt|Hallstadt|Halberstadt|Ingolstadt|Johanngeorgenstadt|Karlstadt")  // TODO: extend, https://de.wikipedia.org/wiki/Liste_der_St%C3%A4dte_in_Deutschland
    ],
    [
      token("das"),  // "Einwohnerzahl stieg um das Zweieinhalbfache"
      tokenRegex("(zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf).*fache")
    ],
    [
      token("ein"),  // "um ein vielfaches höhere Preise" -> Vielfaches, found by other rule
      tokenRegex("(viel|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf).*faches"),
      posRegex("ADJ.*KOM.*")
    ],
    [
      tokenRegex("(eben)?diese"),  // "...damit diese ausreichend Sauerstoff geben."
      tokenRegex("genug|genügend|viel|hinreichend|ausreichend"),
      posRegex("SUB:NOM:SIN:.*"),
      posRegex("VER:.*")
    ],
    [
      tokenRegex("(eben)?diese[nmr]|andere[nm]"),  // "...um einer anderen genügend Platz zu schaffen"
      tokenRegex("genug|genügend|viel|hinreichend|ausreichend"),
      posRegex("SUB:NOM:SIN:.*"),
      token("zu"),
      posRegex("VER:.*")
    ],
    [
      posRegex("VER:MOD:.*"),  // "Sollten zu diesem weitere Informationen benötigt werden, ..."
      token("zu"),
      regex("(eben)?diese[mnr]"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:NOM:PLU:.*"),
      posRegex("PA2:.*")
    ],
    [
      regex("ein|das"),  // "Ein Geschenk, das Maßstäbe setzt" (#4043)
      pos("SUB:NOM:SIN:NEU"),
      token(","),
      token("das"),
      posRegex("SUB:NOM:PLU:.*"),
      posRegex("VER:3:.*")
    ],
    [
      token("uns"),  // "und wünschen uns allen Gesundheit."
      token("allen"),
      posRegex("SUB:.*:SIN:.*")
    ],
    [
      token("Domain"),
      token("Name"),
      tokenRegex("Systems?")
    ],
    [
      tokenRegex("der|das|die"),
      new PatternTokenBuilder().min(0).build(),
      token("Bad"),
      token("Homburger")
    ],
    [
      tokenRegex("der|die|das"),   // "Lieber jemanden, der einem Tipps/Hoffnung gibt." / "die 69er Revolte"
      csRegex("einem|[0-9]+er"),
      posRegex("SUB:.*")
    ],
    [
      tokenRegex("de[rs]"),   // "Die dauerhafte Abgrenzung des später Niedersachsen genannten Gebietes"
      posRegex("ADJ:.*"),
      posRegex("EIG:.*"),
      posRegex("PA2:.*")
    ],
    [
      posRegex("ART:.*FEM.*"),  // "Eine Lücke in der erneuerbare Energien eine sinnvolle Rolle spielen könnten"
      posRegex("SUB:.*FEM.*"),
      token("in"),
      token("der")
    ],
    [
      token("einem"),
      token("kalte"),
      token("Schauer")
    ],
    [
      regex("die|der"),  // "die Querwild GmbH"
      tokenRegex(".*"),
      token("GmbH")
    ],
    [
      token("Die"),
      regex("Waltons|Einen")
    ],
    [
      regex("Gro(ß|ss)e[sn]?"),
      regex("(Bundes)?Verdienstkreuz(es)?")
    ],
    [ // "Adiponitril und Acetoncyanhydrin, beides Zwischenprodukte der Kunststoffproduktion."
      tokenRegex("[,–-]"),
      token("beides"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*")
    ],
    [ // "In den Zwei Abhandlungen" (lowercase "zwei" is correct, but does not need to be found here)
      tokenRegex("Eins|Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn|Elf|Zwölf"),
      posRegex("SUB:.*")
    ],
    [ // "Eine Massengrenze, bis zu der Lithium nachgewiesen werden kann."
      token("bis"),
      token("zu"),
      token("der"),
      posRegex("SUB:.*"),
      posRegex("PA2:.*")
    ],
    [
      tokenRegex("jeder?"),
      token("Abitur")
    ],
    [
      token("Halle"),
      token("an"),
      token("der"),
      token("Saale")
    ],
    [  // "mehrere Tausend Menschen"
      tokenRegex("Dutzend|Hundert|Tausend"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*")
    ],
    [  // "Besonders reizen mich Fahrräder.", "weil mich psychische Erkrankungen aus der Bahn werfen"
      tokenRegex("dich|mich"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.*")
    ],
    [  // "jenes Weges, den die Tausenden Juden 1945 ..."
      token("die"),
      token("Tausenden"),
      posRegex("SUB:.*PLU.*")
    ],
    [  // misspelling "Format"
      tokenRegex("das|ein"),
      token("Formart")
    ],
    [  // "... andere erfreut Tennis."
      regex("andere"),
      posRegex("VER:PA2.*"),
      posRegex("SUB:.*")
    ],
    [  // "Das eine bedeutet Gefahr und das andere Gelegenheit."
      regex("der|die|das"),
      new PatternTokenBuilder().token("eine").setSkip(-1).build(),
      regex("der|die|das"),
      token("andere"),
      posRegex("SUB:.*")
    ],
    [  // "... größeren Bekanntheitsgrad in der Bevölkerung als jeder andere Kandidat vor ihm"
      regex("jede[mnrs]?"),
      regex("anderen?"),
      posRegex("SUB:.*")
    ],
    [  // "... kein anderer Unrecht hat."
      regex("(eben)?diese[rs]?|keine?"),
      regex("anderer?"),
      posRegex("SUB:.*")
    ],
    [  // "Toleranz ist der Verdacht, dass der andere Recht hat."
      regex("der|die|das"),
      regex("anderen?"),
      token("Recht"),
      new PatternTokenBuilder().csToken("haben").matchInflectedForms().build()
    ],
    [  // "als einziger ein für die anderen unsichtbares Wunder zu sehen."
      token("für"),
      regex("den|die"),
      token("anderen")
    ],
    [  // "Wer auf eines anderen Schuhe wartet...", "...Auge darauf haben, dass keine der anderen Abbruch tue"
      regex("der|eine[sr]"),
      token("anderen"),
      posRegex("SUB:.*")
    ],
    [  // "wenn andere anderer Meinung sind"
      token("andere"),
      regex("anderer?"),
      posRegex("SUB:.*")
    ],
    [  // "Hat ein Schutzgut gegenüber den anderen Priorität?"
      token("gegenüber"),
      token("den"),
      token("anderen"),
      posRegex("SUB:.*")
    ],
    [  // "... ist des anderen Freiheitskämpfer", "... die anderen Volleyball"
      regex("des|die"),
      token("anderen"),
      posRegex("SUB:.*")
    ],
    [  // "Ein Esel schimpft den anderen Langohr."
      posRegex("VER:3:.*"),
      regex("den|die|das"),
      regex("anderen?"),
      posRegex("SUB:.*")
    ],
    [  // "... eine bessere Behandlung als andere Gefangene."
      token("als"),
      token("andere"),
      posRegex("SUB:.*PLU.*")
    ],
    [  // "was sein Klient für ein Mensch sei",
      // "Mir wird nicht ganz klar, was das bei 1:58 für ein Akkord ist."
      new PatternTokenBuilder().token("was").setSkip(5).build(),
      token("für"),
      token("ein"),
      new PatternTokenBuilder().posRegex("ADJ:.*(MAS|NEU).*").min(0).build(),
      posRegex("SUB:.*:(MAS|NEU).*")
    ],
    [  // "was sein Klient für ein Mensch sei",
      // "Mir wird nicht ganz klar, was das bei 1:58 für ein Akkord ist."
      new PatternTokenBuilder().token("was").setSkip(5).build(),
      token("für"),
      token("eine"),
      new PatternTokenBuilder().posRegex("ADJ:.*FEM.*").min(0).build(),
      posRegex("SUB:.*:FEM.*")
    ],
    [
      // "Wir zeigen die Gründe auf, wieso noch nicht jeder solche Anschlüsse hat."
      regex("jede[rsm]?"),
      regex("(eben)?solche[rsm]?"),
      posRegex("SUB.*PLU.*")
    ],
    [
      regex("als|um"),
      regex("(eben)?solche")
    ],
    [
      // "Solch frivolen Gedanken wollen wir gar nicht erst nachgehen."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+en?"),
      posRegex("SUB.*PLU.*")
    ],
    [
      // "Solch frivolen ungewohnten Gedanken wollen wir gar nicht erst nachgehen."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+en?"),
      csRegex("[a-zäöüß]+en?"),
      posRegex("SUB.*PLU.*")
    ],
    [
      // "Er erwartete solch aggressives Verhalten."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[nms]"),
      posRegex("SUB.*SIN.*NEU.*")
    ],
    [
      // "Er erwartete solch aggressives ungewohntes Verhalten."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[nms]"),
      csRegex("[a-zäöüß]+e[nms]"),
      posRegex("SUB.*SIN.*NEU.*")
    ],
    [
      // "Ein solch schöner Tisch."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[nmr]"),
      posRegex("SUB.*SIN.*MAS.*")
    ],
    [
      // "Ein solch schöner neuer Tisch."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[nmr]"),
      csRegex("[a-zäöüß]+e[nmr]"),
      posRegex("SUB.*SIN.*MAS.*")
    ],
    [
      // "Eine solch schöne Frau."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[rn]?"),
      posRegex("SUB.*SIN.*FEM.*")
    ],
    [
      // "Eine solch schöne hübsche Frau."
      regex("(eben)?solch"),
      csRegex("[a-zäöüß]+e[rn]?"),
      csRegex("[a-zäöüß]+e[rn]?"),
      posRegex("SUB.*SIN.*FEM.*")
    ],
    [  
      // "Wenn ein Tiger einen Menschen tötet, ist das Grausamkeit."
      token(","),
      new PatternTokenBuilder().tokenRegex("dann|so").min(0).build(),
      csRegex("ist|wäre?"),
      csRegex("das(jenige)?|(der|die)jenige"),
      posRegex("SUB:NOM.*")
    ],
    [  
      // "Sind im Molekül mehrere Aminogruppen vertreten, so bestimmt dasjenige Kohlenstoff"
      new PatternTokenBuilder().tokenRegex("wenn|falls|sobald").matchInflectedForms().setSkip(-1).build(),
      token(","),
      new PatternTokenBuilder().tokenRegex("dann|so").min(0).build(),
      token("bestimmt"),
      csRegex("das(jenige)?"),
      posRegex("SUB:NOM.*")
    ],
    [  
      // "das Bände spricht"
      token("das"),
      token("Bände"),
      csRegex("spricht|sprach|sprechen")
    ],
    [  
      regex("des|der|den|dem|die"),
      csToken("Kommando"),
      csRegex("Spezialkräften?")
    ],
    [  
      token("auf"),
      csRegex("die|den|das"),
      csToken("Verlass"),
      csRegex("ist|war|wäre?")
    ],
    [  
      token("auf"),
      csRegex("die|den|das"),
      csToken("Verlass"),
      csToken("zu"),
      csToken("sein")
    ],
    [  
      // kannst du mal schauen, ob das zahlende Kunden sind?
      token("ob"),
      token("das"),
      csRegex(".+e"),
      posRegex("SUB:NOM:PLU.*"),
      csRegex("sind|waren")
    ],
    [
      // Er fragte, ob das Frauen auch so toll finden.
      token("ob"),
      token("das"),
      token("Frauen")
    ],
    [
      // Ich lese das Korrektur.
      csRegex("l[ea]sen?|liest|l[ea]st?"),
      token("das"),
      token("Korrektur")
    ],
    [
      // Ich habe das Korrektur gelesen.
      csRegex("habe?n?|ha[sb]?t"),
      token("das"),
      token("Korrektur"),
      token("gelesen")
    ],
    [
      // In einer entzückend chaotischen Partie zwischen A und B kam es zum Unentschieden.
      posRegex("ART.*"),
      posRegex("VER:PA[12]"),
      posRegex("ADJ.*"),
      posRegex("SUB.*")
    ],
    [
      // Er lässt einen Visionen haben.
      csRegex("lässt|lassen|ließ|ließen"),
      token("einen"),
      posRegex("SUB:AKK.*"),
      posRegex("VER:INF.*")
    ],
    [
      // Eine Initialzündung war der Bericht „Grenzen des Wachstums“ des Club of Rome, ...
      token("des"),
      token("Club"),
      token("of"),
      token("Rome")
    ],
    [
      // Entwickelt wurde das Session Initiation Protocol von der IETF.
      csRegex("das|ein"),
      token("Session"),
      token("Initiation"),
      token("Protocol")
    ],
    [
      // Ähnliches gilt im Norden der Insel für die George-Washington-Bridge.
      token("die"),
      token("George-Washington-Bridge")
    ],
    [
      // Wie kann ich das zu Wege bringen?
      token("das"),
      token("zu"),
      token("Wege")
    ],
    [
      // Erst in der zweiten Hälfte des 4. Jahrhunderts ging die alte aristokratische Ordnung durch Machtkämpfe zwischen diesen zu Grunde.
      csRegex("diese[mnrs]?"),
      token("zu"),
      token("Grunde")
    ],
    [
      // acht Passionsszenen Christi sowie das Jüngste Gericht
      csRegex("das|dem|des"),
      csRegex("Jüngsten?"),
      csRegex("Gerichts?")
    ],
    [
      // Großes Konzert in der Kampnagel Kulturfabrik
      token("Kampnagel"),
      token("Kulturfabrik")
    ],
    [
      // Es war Teil von Madonnas Performance während des Super Bowls 2012.
      token("Super"),
      csRegex("Bowls?")
    ],
    [
      // Ein Teil der Communauté Française schloss sich zur Westafrikanischen Zollunion (UDAO) zusammen.
      csRegex("Westafrikanischen?"),
      token("Zollunion")
    ],
    [
      // Die Zeit begann mit der Gründung der englischen Football Association.
      csRegex("[Ee]nglischen?"),
      token("Football"),
      token("Assosiation")
    ],
    [
      // die neu geschaffene Position des Head of Men’s Tennis
      token("des"),
      token("Head"),
      token("of")
    ]
  ];
