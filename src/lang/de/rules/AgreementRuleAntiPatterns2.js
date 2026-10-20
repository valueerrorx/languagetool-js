// org.languagetool.rules.de.AgreementRuleAntiPatterns2 (token lists; converted mechanically from the Java source)
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex, posRegex, csToken, csRegex, regex, pos } from '../../../core/patterns/PatternRuleBuilderHelper.js';

// Java: AgreementRuleAntiPatterns2#ANTI_PATTERNS
export const ANTI_PATTERNS = [
    [
      token("Eurovision"),
      token("Song"),
      token("Contest")
    ],
    [
      token("Account"),
      tokenRegex("Managers?")
    ],
    [
      token("Wohnungsbau"),
      token("Aalen")
    ],
    [
      token("Display"),
      tokenRegex("Ads?|Advertising")
    ],
    [
      token("Private"),
      tokenRegex("Equitys?|Clouds?")
    ],
    [
      token("Personal"),
      tokenRegex("Agents?|Computers?|Data|Firewalls?")
    ],
    [
      token("Junge"),
      tokenRegex("Union|Freiheit|Welt|Europäische|Alternative|Volkspartei|Akademie")
    ],
    [ // "Das Holocaust Memorial Museum."
      posRegex("ART:.+"),
      posRegex("SUB:.+"),
      pos("UNKNOWN")
    ],
    [ // "Er fragte, ob das Spaß macht."
      csToken(","),
      posRegex("KON:UNT|ADV:INR"),
      csToken("das"),
      posRegex("SUB:.+"),
      posRegex("VER:3:SIN.*")
    ],
    [ // "Es gibt viele solcher Bilder"
      tokenRegex("viele|etliche|wenige|einige|mehrere"),
      csToken("solcher"),
      posRegex("SUB:GEN:PLU:.*")
    ],
    [ // "der französischen First Lady"
      tokenRegex("[dD](ie|er)"),
      csToken("First"),
      csToken("Lady")
    ],
    [ // "der französischen First Lady"
      tokenRegex("[dD](ie|er)"),
      posRegex("ADJ:.*"),
      csToken("First"),
      csToken("Lady")
    ],
    [ // "der Super Nintendo"
      tokenRegex("[dD](ie|er)"),
      csToken("Super"),
      csToken("Nintendo")
    ],
    [ // Firmenname
      csToken("Pizza"),
      csToken("Hut")
    ],
    [ // Texas und New Mexico, beides spanische Kolonien, sind
      csToken(","),
      csToken("beides"),
      new PatternTokenBuilder().posRegex("ADJ:NOM:PLU.+").min(0).build(),
      posRegex("SUB:NOM:PLU.+"),
      pos("PKT")
    ],
    [    // Beides Teenager mit verrückten Ideen
      pos("SENT_START"),
      csToken("Beides"),
      posRegex("SUB:NOM:PLU.+")
    ],
    [
      tokenRegex("[dD]e[rn]"),
      csToken("Gold"),
      csToken("Cup")
    ],
    [
      token("das"),
      tokenRegex("viele|wenige"),
      posRegex("SUB:.*")
    ],
    [
      token("das"),
      posRegex("SUB:.+"),
      new PatternTokenBuilder().csToken("dauern").matchInflectedForms().build()
    ],
    [ // "Er verspricht allen/niemandem/jedem hohe Gewinne."
      tokenRegex("allen|(nieman|je(man)?)dem"),
      posRegex("ADJ:AKK:PLU:.*"),
      posRegex("SUB:AKK:PLU:.*")
    ],
    [ // "Er verspricht allen/niemandem/jedem Gewinne von über 15 Prozent."
      tokenRegex("allen|(nieman|je(man)?)dem"),
      posRegex("SUB:AKK:PLU:.*")
    ],
    [ // "Für ihn ist das Alltag." / "Für die Religiösen ist das Blasphemie und führt zu Aufständen."
      new PatternTokenBuilder().posRegex("PRP:.+|ADV:MOD").setSkip(2).build(),
      new PatternTokenBuilder().token("sein").matchInflectedForms().build(),
      csToken("das"),
      posRegex("SUB:NOM:.*"),
      posRegex("PKT|SENT_END|KON.*")
    ],
    [ // "Meistens sind das faktenfreie Behauptungen."
      regex("sind|waren|wären"),
      csToken("das"),
      posRegex("ADJ:NOM:PLU.*"),
      posRegex("SUB:NOM:PLU.*"),
      posRegex("PKT|KON.*")
    ],
    [ // "Meistens ist das reine Formsache."
      regex("ist|war|wär"),
      csToken("das"),
      posRegex("ADJ:NOM:SIN.*"),
      posRegex("SUB:NOM:SIN.*"),
      posRegex("PKT|KON.*")
    ],
    [ // "Aber ansonsten ist das erste Sahne"
      new PatternTokenBuilder().token("sein").matchInflectedForms().build(),
      csToken("das"),
      csToken("erste"),
      csToken("Sahne")
    ],
    [ // "Sie sagte, dass das Rache bedeuten würden", "Sie werden merken, dass das echte Nutzer sind."
      pos("KON:UNT"),
      csToken("das"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:.+"),
      new PatternTokenBuilder().tokenRegex("bedeuten|sein").matchInflectedForms().build()
    ],
    [ // "Sie fragte, ob das wirklich Rache bedeuten würde"
      pos("KON:UNT"),
      csToken("das"),
      pos("ADV:MOD"),
      posRegex("SUB:.+"),
      new PatternTokenBuilder().tokenRegex("bedeuten|sein").matchInflectedForms().build()
    ],
    [ // "Karl sagte, dass sie niemandem Bescheid gegeben habe."
      new PatternTokenBuilder().token("niemand").matchInflectedForms().build(),
      posRegex("SUB:.+")
    ],
    [
      token("alles"),
      csToken("Walzer")
    ],
    [ // "ei der Daus"
      csToken("der"),
      csToken("Daus")
    ],
    [ // "Das Orange ist meine Lieblingsfarbe"
      posRegex("PRO:...:...:SIN:NEU.*"),
      csToken("Orange")
    ],
    [ // "Dieses rötliche Orange gefällt mir am besten"
      posRegex("PRO:...:...:SIN:NEU.*"),
      posRegex("ADJ:.+"),
      csToken("Orange")
    ],
    [
      csToken("dem"),
      new PatternTokenBuilder().csToken("Achtung").setSkip(1).build(),
      new PatternTokenBuilder().csToken("schenken").matchInflectedForms().build()
    ],
    [
      new PatternTokenBuilder().csToken("schenken").matchInflectedForms().build(),
      csToken("dem"),
      csToken("Achtung")
    ],
    [
      csToken("dem"),
      new PatternTokenBuilder().csToken("Rechnung").setSkip(1).build(),
      new PatternTokenBuilder().csToken("tragen").matchInflectedForms().build()
    ],
    [
      new PatternTokenBuilder().csToken("tragen").matchInflectedForms().build(),
      csToken("dem"),
      csToken("Rechnung")
    ],
    [
      csToken("zum"),
      csToken("einen"),
      posRegex("(ADJ|PA[12]):.+")
    ],
    [
      token("auf"),
      csToken("die"),
      csToken("Lauer")
    ],
    [
      tokenRegex("(eben)?dieser"),
      csToken("eine"),
      pos("SUB:NOM:SIN:MAS")
    ],
    [
      token("das"),
      posRegex("SUB:DAT:.+"),
      token("vorbehalten")
    ],
    [ // Wenn hier einer Geld hat, dann ich.
      new PatternTokenBuilder().token("wenn").setSkip(1).build(),
      csToken("einer"),
      posRegex("SUB:AKK:.+"),
      posRegex("VER:(MOD:)?3:SIN:.+"),
      csToken(",")
    ],
    [ // Es ist nicht eines jeden Bestimmung
      tokenRegex("eine[rs]"),
      tokenRegex("jed(wed)?en")
    ],
    [ // Ich vertraue auf die Meinen.
      token("die"),
      tokenRegex("[MDS]einen")
    ],
    [ // Sie ist über die Maßen schön.
      csToken("über"),
      csToken("die"),
      tokenRegex("Ma(ß|ss)en")
    ],
    [ // Was nützt einem Gesundheit, wenn man sonst ein Idiot ist?
      token("was"),
      new PatternTokenBuilder().csToken("nützen").matchInflectedForms().build(),
      csToken("einem"),
      posRegex("SUB:NOM:.+")
    ],
    [ // Auch das hat sein Gutes.
      new PatternTokenBuilder().csToken("haben").matchInflectedForms().build(),
      csToken("sein"),
      csToken("Gutes")
    ],
    [ // Auch wenn es sein Gutes hatte.
      csToken("Gutes"),
      new PatternTokenBuilder().tokenRegex("haben|tun").matchInflectedForms().build()
    ],
    [
      tokenRegex("(eben)?dieser"),
      csToken("einen"),
      pos("SUB:DAT:SIN:FEM")
    ],
    [
      csToken("Rede"),
      csToken("und"),
      csToken("Antwort")
    ],
    [
      posRegex("ABK:.+:SUB")
    ],
    [
      tokenRegex("(all|je(d|glich))en"),
      csToken("Reiz")
    ],
    [
      tokenRegex("wieso|ob|warum|w[ae]nn"),
      token("das"),
      tokenRegex("sinn|mehrwert"),
      tokenRegex("macht|ergibt|stiftet|bringt")
    ],
    [
      tokenRegex("hat|hätte|kann|wird|dürfte|muss|soll(te)?|könnte|müsste|würde"),
      token("das"),
      token("Konsequenzen")
    ],
    [
      new PatternTokenBuilder().posRegex("VER:.*[1-3]:.+").setSkip(1).build(),
      csToken("vermehrt")
    ],
    [ // In den Ruhr Nachrichten
      csToken("Ruhr"),
      csToken("Nachrichten")
    ],
    [
      csToken("Joint"),
      tokenRegex("Ventures?|Cares?")
    ],
    [
      csToken("Premier"),
      csToken("League")
    ],
    [
      // Common job title
      csToken("Software"),
      tokenRegex("Engineers?|Developer[sn]?|(Back|Front)end")
    ],
    [
      csToken("Mark"),
      posRegex("EIG:.*")
    ],
    [
      csToken("Sales"),
      tokenRegex("Agent")
    ],
    [
      csToken("Total"),
      tokenRegex("Tankstellen?")
    ],
    [
      posRegex("ART:.*"),
      csToken("Bund"),
      csToken("Naturschutz")
    ],
    [
      csToken("Real"),
      tokenRegex("Madrid|Valladolid|Mallorca")
    ],
    [ // Eng.
      csToken("Real"),
      pos("UNKNOWN")
    ],
    [
      csToken("Hammer"),
      tokenRegex("Stra(ß|ss)e")
    ],
    [ // https://www.duden.de/rechtschreibung/Personal_Trainer
      csToken("Personal"),
      tokenRegex("Trainers?")
    ],
    [ // Ich wollte erstmal allen Hallo sagen.
      token("Hallo"),
      new PatternTokenBuilder().csToken("sagen").matchInflectedForms().build()
    ],
    [ // "ob die Deutsch sprechen"
      token("die"),
      tokenRegex("Deutsch|Englisch|Spanisch|Französisch|Russisch|Polnisch|Holländisch|Niederländisch|Portugiesisch"),
      new PatternTokenBuilder().csToken("sprechen").matchInflectedForms().build()
    ],
    [ // "Ein Trainer, der zum einen Fußballspiele sehr gut lesen und analysieren kann"
      token("zum"),
      token("einen"),
      posRegex("SUB:.*")
    ],
    [ // https://www.duden.de/suchen/dudenonline/Fake%20News
      csToken("Fake"),
      posRegex("News")
    ],
    [
      tokenRegex("Steinberg|Park"),
      csToken("Apotheke")
    ],
    [
      csToken("IT"),
      csToken("Finanzmagazin")
    ],
    [
      csToken("Golden"),
      csToken("Gate")
    ],
    [ // Vielen Dank fürs Bescheid geben
      token("fürs"),
      token("Bescheid"),
      tokenRegex("geben|sagen")
    ],
    [ // "Los" ist ein deutsches Substantiv
      token("Los"),
      tokenRegex("Angeles|Zetas")
    ],
    [ // https://www.autozeitung.de/
      csToken("Auto"),
      csToken("Zeitung")
    ],
    [ // "Das letzte Mal war das Ende der..."
      csToken("Mal"),
      new PatternTokenBuilder().token("sein").matchInflectedForms().build(),
      csToken("das"),
      posRegex("SUB:NOM:.*")
    ],
    [
      csToken("FC"), // Die FC Bayern München Hymne (Vorschlag macht keinen Sinn "FC-Bayern")
      csToken("Bayern")
    ],
    [
      csToken("Super"),
      csToken("Mario")
    ],
    [
      tokenRegex(".+"),
      tokenRegex(".+"),
      csToken("Toyota"),
      csToken("Motor"),
      tokenRegex("Corp(oration)?|Company")
    ],
    [
      tokenRegex(".+"),
      tokenRegex(".+"),
      csToken("Metropolitan"),
      tokenRegex("Police|Community|City|Books")
    ],
    [
      tokenRegex("Office|Microsoft"),
      csToken("365")
    ],
    [
      csToken("Prinz"),
      tokenRegex("Charles|William")
    ],
    [
      token(":"),
      csToken("D")
    ],
    [
      tokenRegex("ist|war(en)?|sind|wird|werden"),
      csToken("das"),
      csToken("reine"),
      posRegex("SUB:NOM:.*")
    ],
    [ // Eine Android Watch
      csToken("Android"),
      tokenRegex("Wear|Watch(es)?|Smartwatch(es)?|OS")
    ],
    [ // "Bitte öffnen Sie die CAD.pdf"
      tokenRegex("\\w+"),
      new PatternTokenBuilder().token(".").setIsWhiteSpaceBefore(false).build(),
      new PatternTokenBuilder().tokenRegex("pdf|zip|jpe?g|gif|png|rar|mp[34]|mpe?g|avi|docx?|xlsx?|pptx?|html?").setIsWhiteSpaceBefore(false).build()
    ],
    [ // "Ich mache eine Ausbildung zur Junior Digital Marketing Managerin"
      new PatternTokenBuilder().tokenRegex("Junior|Senior|Account").setSkip(3).build(),
      tokenRegex("Manager[ns]?|Managerin(nen)?|Developer(in)?")
    ],
    [
      new PatternTokenBuilder().tokenRegex("Junior|Senior").build(),
      token("Software"),
      tokenRegex("Engineers?|Architects?|Managers?|Directors?")
    ],
    [
      new PatternTokenBuilder().tokenRegex("Junior|Senior").build(),
      token("Engineering"),
      tokenRegex("Manager[ns]?|Directors?")
    ],
    [ // "Angel" is tagged like the "Die Angel" for fishing
      csToken("Business"),
      tokenRegex("Angel[ns]?|Cases?")
    ],
    [ // "des Manager Magazins"
      csToken("Manager"),
      tokenRegex("Magazins?")
    ],
    [
      csToken("Junior"),
      tokenRegex("Suite[sn]?")
    ],
    [ // Deine Abt.
      tokenRegex("die|eine|unsere|meine|ihre|eure|(eben)?diese|seine|deine"),
      csToken("Abt"),
      token("."),
      tokenRegex(".+")
    ],
    [
      tokenRegex(".+"),
      tokenRegex(".+"),
      tokenRegex("Customer|User"),
      tokenRegex("Journeys?|Service")
    ],
    [
      tokenRegex(".+"),
      tokenRegex(".+"),
      token("Hall"),
      token("of"),
      token("Fame")
    ],
    [ // Wir trinken ein kühles Blondes
      token("kühles"),
      token("Blondes")
    ],
    [
      tokenRegex("Vitamin|Buchstabe"),
      tokenRegex("D|B[1-9]?|B12")
    ],
    [ // "Bei uns im Krankenhaus betrifft das Operationssäle."
      new PatternTokenBuilder().token("betreffen").matchInflectedForms().build(),
      csToken("das"),
      posRegex("SUB:AKK:PLU:.*")
    ],
    [ // "Was für ein Narr"
      token("was"),
      csToken("für"),
      csToken("ein"),
      new PatternTokenBuilder().posRegex("ADJ:NOM:SIN:(MAS|NEU).*").min(0).build(),
      posRegex("SUB:NOM:SIN:(MAS|NEU)")
    ],
    [ // "Was für ein liebe Frau"
      token("was"),
      csToken("für"),
      csToken("eine"),
      new PatternTokenBuilder().posRegex("ADJ:NOM:SIN:FEM.*").min(0).build(),
      pos("SUB:NOM:SIN:FEM")
    ],
    [ // "Was war ich für ein Narr"
      token("was"),
      new PatternTokenBuilder().token("sein").matchInflectedForms().setSkip(2).build(),
      csToken("für"),
      csToken("ein"),
      new PatternTokenBuilder().posRegex("ADJ:NOM:SIN:(MAS|NEU).*").min(0).build(),
      posRegex("SUB:NOM:SIN:(MAS|NEU)")
    ],
    [ // "Was war sie nur für eine dumme Person"
      token("was"),
      new PatternTokenBuilder().token("sein").matchInflectedForms().setSkip(2).build(),
      csToken("für"),
      csToken("eine"),
      new PatternTokenBuilder().posRegex("ADJ:NOM:SIN:FEM.*").min(0).build(),
      pos("SUB:NOM:SIN:FEM")
    ],
    [ // "Wie viele Paar Schuhe braucht er?"
      csRegex("vielen?|etliche|wenigen?|einigen?"),
      csToken("Paar"),
      posRegex("SUB:NOM:PLU:...")
    ],
    [ // Dann macht das Sinn.
      csRegex("machte?|ergibt|ergab|stiftete?"),
      csToken("das"),
      csToken("Sinn")
    ],
    [ // Mir machte das Spaß
      csRegex("machte?"),
      csToken("das"),
      csRegex("Spa(ß|ss)|Freude")
    ],
    [ // Das sind beides Lichtschalter; Wasser und Luft sind beides Fluide.
      csRegex("sind|waren"),
      csToken("beides"),
      new PatternTokenBuilder().posRegex("ADJ:.*").min(0).build(),
      posRegex("SUB:NOM:PLU:.*")
    ],
    [ // Heinrich von der Haar (https://de.wikipedia.org/wiki/Heinrich_von_der_Haar)
      token("Heinrich"),
      token("von"),
      token("der"),
      csRegex("Haars?")
    ],
    [
      token("Präsident"),
      token("Xi")
    ],
    [
      token("Porsche"),
      token("Museum")
    ],
    [
      token("Auto"),
      token("Club"),
      token("Europa")
    ],
    [
      token("Queen"),
      posRegex("EIG:.*")
    ],
    [
      token("King"),
      posRegex("EIG:.*")
    ],
    [ // des Sturm und Drangs
      token("des"),
      token("Sturm"),
      token("und"),
      csRegex("Drangs?")
    ],
    [ // die Funke Mediengruppe
      token("die"),
      token("Funke"),
      token("Mediengruppe")
    ],
    [
      new PatternTokenBuilder().csToken("meinen").matchInflectedForms().setSkip(3).build(),
      csRegex("das|(eben)?dies(es)?"),
      new PatternTokenBuilder().token("wirklich").min(0).build(),
      token("Ernst")
    ],
    [
      new PatternTokenBuilder().csToken("nehmen").matchInflectedForms().setSkip(3).build(),
      csRegex("das|(eben)?dies(es)?"),
      new PatternTokenBuilder().token("wirklich").min(0).build(),
      token("Ernst")
    ],
    [
      // ... dann spart das Zeit und Geld.
      new PatternTokenBuilder().csToken("sparen").matchInflectedForms().setSkip(3).build(),
      csRegex("das|(eben)?dies(es)?"),
      token("Zeit"),
      token("und"),
      csRegex("Geld|Nerven")
    ],
    [
      csRegex("das|es|(eben)?dies"),
      csRegex("bedeutete?"),
      csRegex("Krieg|Ärger")
    ],
    [
      // In der aktuellen Niedrigzinsphase bedeutet das sehr geringe Zinsen, die aber deutlich ansteigen können.
      tokenRegex("bedeutete?"),
      csRegex("das|(eben)?dies")
    ],
    [
      // Bietet das Vorteile, außer dass es "intelligent" wirkt?
      tokenRegex("bietete?"),
      csRegex("das|(eben)?dies"),
      posRegex("SUB.*PLU.*")
    ],
    [
      // Bietet das große Vorteile, außer dass es "intelligent" wirkt?
      csRegex("bietete?"),
      csRegex("das|(eben)?dies"),
      posRegex("ADJ.*PLU.*"),
      posRegex("SUB.*PLU.*")
    ],
    [
      // Bietet das sehr große Vorteile, außer dass es "intelligent" wirkt?
      csRegex("bietete?"),
      csRegex("das|(eben)?dies"),
      posRegex("ADV.*"),
      posRegex("ADJ.*PLU.*"),
      posRegex("SUB.*PLU.*")
    ],
    [
      csRegex("das|es|(eben)?dies"),
      csRegex("weite"),
      token("Teile")
    ],
    [
      token("hat"),
      token("das"),
      csRegex("Einfluss|Auswirkungen"),
      csRegex("auf|darauf")
    ],
    [ // ein Auto, das schnell fährt und in **das Menschen** gerne einsteigen
      posRegex("VER.*[123].*"),
      tokenRegex("und|oder|aber"),
      new PatternTokenBuilder().posRegex("PRP.*").min(0).build(),
      tokenRegex("der|die|das|dem|den")  // nicht 'des' weil sonst nicht gefunden: "Wir haben das Abo beendet und des Betrag erstattet."
    ],
    [ // weil man oft bei **anderen schreckliches Essen** vorgesetzt bekommt
      tokenRegex("bei|zum"),
      token("anderen"),
      posRegex("ADJ.*"),
      posRegex("SUB.*")
    ],
    [ // dass jeder LanguageTool benutzen sollte
      token("jeder"),
      posRegex("SUB:(AKK|DAT).*"),
      posRegex("VER.*")
    ],
    [ // der fließend Französisch sprechende Trudeau
      posRegex("(ART|PRO:DEM).*"),
      posRegex("ADV.*"),
      posRegex("SUB.*"),
      posRegex("PA[12].*")
    ],
    [ // Spricht dieser fließend Französisch
      posRegex("VER.*[123].*"),
      posRegex("(ART|PRO:DEM).*"),
      posRegex("ADV.*"),
      posRegex("SUB.*")
    ],
    [ // Der Deutsch Langhaar ist ein mittelgroßer Jagdhund
      token("Deutsch"),
      token("Langhaar")
    ],
    [ // Einige nennen das
      new PatternTokenBuilder().csToken("nennen").matchInflectedForms().build(),
      token("das"),
      posRegex("SUB:NOM:SIN:(FEM|MAS)")
    ],
    [ // Das ist bestimmt kein Made in Germany
      csToken("Made"),
      csToken("in"),
      csToken("Germany")
    ],
    [ // Des Plan de XXX
      csRegex("[A-Z].+"),
      csRegex("del?"),
      csRegex("[A-Z].+")
    ],
    [ // Des Plan de XXX
      csRegex("[A-Z].+"),
      csToken("de"),
      regex("l[ao]s?"),
      csRegex("[A-Z].+")
    ]
  ];
