// org.languagetool.chunking.GermanChunker (rule-based German noun phrase chunker on OpenRegex expressions)
import { RuntimeException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaReplace, javaReplaceFirst, javaSplit, CASE_INSENSITIVE_ORDER } from '../../../lib/java/strings.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { TreeSet } from '../../../lib/java/collections/TreeSet.js';
import { registerComponent } from '../../../core/language/components.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../core/chunking/ChunkTaggedToken.js';
import { TokenExpressionFactory } from '../../../core/chunking/TokenExpressionFactory.js';
import { StringMatcher } from '../../../core/patterns/StringMatcher.js';
import { RegularExpression } from '../../../lib/openregex/regex/RegularExpression.js';

const FILTER_TAGS = new JavaHashSet(['PP', 'NPP', 'NPS']);
const SYNTAX_EXPANSION = new Map(); // Java: HashMap (the two replacements do not overlap, order is irrelevant)
SYNTAX_EXPANSION.set('<NP>', '<chunk=B-NP> <chunk=I-NP>*');
SYNTAX_EXPANSION.set('&prozent;', 'Prozent|Kilo|Kilogramm|Gramm|Euro|Pfund');

// Java: GermanChunker.PhraseType
const NP = 'NP'; // "noun phrase", will be assigned as B-NP for the first token and I-NP for following tokens (like OpenNLP)
const NPS = 'NPS'; // "noun phrase singular"
const NPP = 'NPP'; // "noun phrase plural"
const PP = 'PP'; // "prepositional phrase" and similar

// Java: GermanChunker#debug (static)
let debug = false;

let FACTORY = null;
let simpleFormRegexp = null;

// Java: GermanChunker#build(String,PhraseType)
function build(expr, phraseType, overwrite = false) {
  let expandedExpr = expr;
  for (const [key, value] of SYNTAX_EXPANSION) {
    expandedExpr = javaReplace(expandedExpr, key, value);
  }
  return buildExpanded(expandedExpr, phraseType, overwrite, calcFormHints(expandedExpr));
}

// Java: GermanChunker#buildExpanded(String,PhraseType,boolean,String[][])
function buildExpanded(expandedExpr, phraseType, overwrite, formHints) {
  const expression = RegularExpression.compile(expandedExpr, FACTORY);
  return new RegularExpressionWithPhraseType(expression, phraseType, overwrite, formHints);
}

// Java: GermanChunker#calcFormHints(String)
function calcFormHints(expandedExpr) {
  const formHints = [];
  const matcher = simpleFormRegexp.matcher(expandedExpr);
  while (matcher.find()) {
    const possibleValues = StringMatcher.create(matcher.group(2), true, false).getPossibleValues();
    if (possibleValues !== null) {
      formHints.push([...possibleValues]);
    }
  }
  return formHints;
}

// Java: GermanChunker.RegularExpressionWithPhraseType
class RegularExpressionWithPhraseType {
  // Java: GermanChunker.RegularExpressionWithPhraseType#RegularExpressionWithPhraseType(RegularExpression,PhraseType,boolean,String[][])
  constructor(expression, phraseType, overwrite, formHints) {
    this.expression = expression;
    this.phraseType = phraseType;
    this.overwrite = overwrite;
    this.formHints = formHints;
  }

  // Java: GermanChunker.RegularExpressionWithPhraseType#toString()
  toString() {
    return `${this.phraseType} <= ${this.expression.toString()} (overwrite: ${this.overwrite})`;
  }
}

// Java: GermanChunker.Span
class Span {
  // Java: GermanChunker.Span#Span(int,int)
  constructor(startIndex, endIndex) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }
}

// Java: GermanChunker.AffectedSpans
class AffectedSpans {
  // Java: GermanChunker.AffectedSpans#AffectedSpans(List)
  constructor(spans) {
    this.spans = spans;
  }

  // Java: GermanChunker.AffectedSpans#isAffected(int)
  isAffected(pos) {
    for (const span of this.spans) {
      if (pos >= span.startIndex && pos < span.endIndex) {
        return true;
      }
    }
    return false;
  }
}

// Java: GermanChunker static initializer (REGEXES1, REGEXES2); done on first use like Java class initialisation
let REGEXES1 = null;
let REGEXES2 = null;
function initStatics() {
  if (REGEXES1 !== null) return;
  FACTORY = new TokenExpressionFactory(false);
  simpleFormRegexp = Pattern.compile('(^| )<([a-zäöüß|()\\[\\]?,]+)>\\+?( |$)', Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
  const undOderBzw = [['und', 'oder', 'bzw']];
  /*
   * REGEXES1 and REGEXES2 are OpenRegex (https://github.com/knowitall/openregex) expressions.
   * REGEXES1 roughly emulates the behavior of the OpenNLP chunker by tagging the first
   * token of a noun phrase with B-NP and the remaining ones with I-NP.
   * REGEXES2 builds on those annotations to find complex noun phrases.
   */
  const regexes1 = [
      // "das Auto", "das schöne Auto", "das sehr schöne Auto", "die Pariser Innenstadt":
      build('(<posre=^ART.*>|<pos=PRO>)? <pos=ADV>* <pos=PA2>* <pos=ADJ>* <pos=SUB>+', NP),
      // "Mythen und Sagen":
      buildExpanded('<pos=SUB> (<und|oder>|(<bzw> <.>)) <pos=SUB>', NP, false, undOderBzw),
      // "ältesten und bekanntesten Maßnahmen":
      buildExpanded('<pos=ADJ> (<und|oder>|(<bzw> <.>)) <pos=PA2> <pos=SUB>', NP, false, undOderBzw),
      // "räumliche und zeitliche Abstände":
      buildExpanded('<pos=ADJ> (<und|oder>|(<bzw> <.>)) <pos=ADJ> <pos=SUB>', NP, false, undOderBzw),

      // "eine leckere Lasagne":
      build('<posre=^ART.*> <pos=ADV>* <pos=ADJ>* <regexCS=[A-ZÖÄÜ][a-zöäü]+>', NP),  // Lexikon kennt nicht alle Nomen, also so...

      //build('<posre=^ART.*>? <pos=PRO>? <pos=ZAL> <pos=SUB>'),  // "zwei Wochen"
      build('<pos=PRO>? <pos=ZAL> <pos=SUB>', NP),  // "zwei Wochen", "[eines] ihrer drei Autos"

      build('<Herr|Herrn|Frau> <pos=EIG>+', NP),
      build('<Herr|Herrn|Frau> <regexCS=[A-ZÖÄÜ][a-zöäü-]+>+', NP),  // für seltene Nachnamen, die nicht im Lexikon sind

      build('<der>', NP)  // simulate OpenNLP?!
  ];

  const regexes2 = [
      // ===== plural and singular noun phrases, based on OpenNLP chunker output ===============
      // "In christlichen, islamischen und jüdischen Traditionen":
      build('<pos=ADJ> <,> <chunk=B-NP> <chunk=I-NP>* <und|sowie> <NP>', NPP),
      // "ein Hund und eine Katze":
      build('<chunk=B-NP & !regex=jede[rs]?> <chunk=I-NP>* <und|sowie> <pos=ADV>? <NP>', NPP),
      // "größte und erfolgreichste Erfindung" (fixes mistagging introduced above):
      build('<pos=ADJ> <und|sowie> <chunk=B-NP & !pos=PLU> <chunk=I-NP>*', NPS, true),
      // "deren Bestimmung und Funktion" (fixes mistagging introduced above):
      build('<deren> <chunk=B-NP & !pos=PLU> <und|sowie> <chunk=B-NP>*', NPS, true),
      // "Julia und Karsten":
      build('<pos=EIG> <und> <pos=EIG>', NPP),
      // "die älteste und bekannteste Maßnahme" - OpenNLP won't detect that as one NP:
      build('<pos=ART> <pos=ADJ> <und|sowie> (<pos=ADJ>|<pos=PA2>) <chunk=I-NP & !pos=PLU>+', NPS, true),
      // "eine Masseeinheit und keine Gewichtseinheit":
      build('<chunk=B-NP & !pos=PLU> <chunk=I-NP>* <und|sowie> <keine> <chunk=I-NP>+', NPS, true),
      // "Der See und das anliegende Marschland":
      build('<NP> <und|sowie> <pos=ART> <pos=PA1> <pos=SUB>', NPP, true),

      // "eins ihrer drei Autos":
      build('<eins|eines> <chunk=B-NP> <chunk=I-NP>+', NPS),

      // "er und seine Schwester":
      build('<ich|du|er|sie|es|wir|ihr|sie> <und|oder|sowie> <NP>', NPP),
      // "sowohl sein Vater als auch seine Mutter":
      build('<sowohl> <NP> <als> <auch> <NP>', NPP),
      // "sowohl Tom als auch Maria":
      build('<sowohl> <pos=EIG> <als> <auch> <pos=EIG>', NPP),
      // "sowohl er als auch seine Schwester":
      build('<sowohl> <ich|du|er|sie|es|wir|ihr|sie> <als> <auch> <NP>', NPP),
      // "Rekonstruktionen oder der Wiederaufbau", aber nicht "Isolation und ihre Überwindung":
      build('<pos=SUB> <und|oder|sowie> <chunk=B-NP & !ihre> <chunk=I-NP>*', NPP),
      // "Weder Gerechtigkeit noch Freiheit":
      build('<weder> <pos=SUB> <noch> <pos=SUB>', NPP),

      // "drei Katzen" - needed as ZAL cannot be unified, as it has no features:
      build('<zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf> <chunk=I-NP>', NPP),

      // "der von der Regierung geprüfte Hund ist grün":
      build('<chunk=B-NP> <pos=PRP> <NP> <chunk=B-NP & pos=SIN> <chunk=I-NP>*', NPS),
      build('<chunk=B-NP> <pos=PRP> <NP> <chunk=B-NP & pos=PLU> <chunk=I-NP>*', NPP),

      // "der von der Regierung geprüfte Hund":
      build('<chunk=B-NP> <pos=PRP> <NP> <pos=PA2> <chunk=B-NP & !pos=PLU> <chunk=I-NP>*', NPS),
      build('<chunk=B-NP> <pos=PRP> <NP> <pos=PA2> <chunk=B-NP & !pos=SIN> <chunk=I-NP>*', NPP),

      // "Herr und Frau Schröder":
      build('<Herr|Frau> <und> <Herr|Frau> <pos=EIG>*', NPP),

      // "ein Hund", aber nicht: "[kaum mehr als] vier Prozent":
      build('<chunk=B-NP & !pos=ZAL & !pos=PLU & !chunk=NPP & !einige & !(regex=&prozent;)> <chunk=I-NP & !pos=PLU & !und>*', NPS),  //"!und": OpenNLP packt "Bob und Tom" in eine NP
      // "die Hunde":
      build('<chunk=B-NP & !pos=SIN & !chunk=NPS & !Ellen> <chunk=I-NP & !pos=SIN>*', NPP),

      // "die hohe Zahl dieser relativ kleinen Verwaltungseinheiten":
      build('<chunk=NPS> <pos=PRO> <pos=ADJ> <pos=ADJ> <NP>', NPS),

      // "eine der am meisten verbreiteten Krankheiten":
      build('<regex=eine[rs]?> <der> <am> <pos=ADJ> <pos=PA2> <NP>', NPS),
      // "einer der beiden Höfe":
      build('<regex=eine[rs]?> <der> <beiden> <pos=ADJ>* <pos=SUB>', NPS),
      // "Einer seiner bedeutendsten Kämpfe":
      build('<regex=eine[rs]?> <seiner|ihrer> <pos=PA1> <pos=SUB>', NPS),

      // "xy Prozent" - beide Varianten okay (zumindest umgangssprachlich):
      // siehe https://dict.leo.org/grammatik/deutsch/Wort/Verb/Kategorien/Numerus-Person/ProblemNum.html#grammarAnchor-Mengenangabe-49575
      build('<regex=[\\d,.]+> <&prozent;>', NPS),
      build('<regex=[\\d,.]+> <&prozent;>', NPP),

      // "[alle Arbeitsplätze so umzugestalten,] dass sie wie ein Spiel":
      build('<dass> <sie> <wie> <NP>', NPP),
      // "[so dass Knochenbrüche und] Platzwunden die Regel [sind]"
      build('<pos=PLU> <die> <Regel>', NPP),
      // "Veranstaltung, die immer wieder ein kultureller Höhepunkt", aber nicht "... in der Geschichte des Museums, die Sammlung ist seit 2011 zugänglich.":
      build('<chunk=B-NP & pos=SIN> <chunk=I-NP & pos=SIN>* <,> <die> <pos=ADV>+ <chunk=NPS>+', NPS),
      // "Die Nauheimer Musiktage, die immer wieder ein kultureller Höhepunkt sind":
      build('<chunk=B-NP & pos=PLU> <chunk=I-NP & pos=PLU>* <,> <die> <pos=ADV>+ <chunk=NPS>+', NPP),

      // ===== genitive phrases and similar ====================================================
      
      // "Das letzte der teilnehmenden Länder":
      build('<der|die|das> <pos=ADJ> <der> <pos=PA1> <pos=SUB>', NPS),
      // "Ursachen der vorliegenden Durchblutungsstörung":
      build('<pos=SUB & pos=PLU> <der> <pos=PA1> <pos=SUB>', NPP),
      // "die ältere der beiden Töchter":
      build('<der|die|das> <pos=ADJ> <der> <pos=PRO>? <pos=SUB>', NPS),
      // "Synthese organischer Verbindungen", "die Anordnung der vier Achsen", aber nicht "Einige der Inhaltsstoffe":
      build('<chunk=NPS & !einige> <chunk=NPP & (pos=GEN |pos=ZAL)>+', NPS, true),
      // "die Kenntnisse der Sprache":
      build('<chunk=NPP> <chunk=NPS & pos=GEN>+', NPP, true),
      // "die Pyramide des Friedens und der Eintracht":
      build('<chunk=NPS>+ <und> <chunk=NP[SP] & (pos=GEN | pos=ADV)>+', NPS, true),
      // "Teil der dort ausgestellten Bestände":
      build('<chunk=NPS>+ <der> <pos=ADV> <pos=PA2> <chunk=I-NP>', NPS, true),
      // "Autor der ersten beiden Bücher":
      build('<chunk=NPS>+ <der> (<pos=ADJ>|<pos=ZAL>) <NP>', NPS, true),
      // "Autor der beiden Bücher":
      build('<chunk=NPS>+ <der> <NP>', NPS, true),
      // "Teil der umfangreichen dort ausgestellten Bestände":
      build('<chunk=NPS>+ <der> <pos=ADJ> <pos=ADV> <pos=PA2> <NP>', NPS, true),
      // "die Krankheit unserer heutigen Städte und Siedlungen":
      build('<chunk=NPS>+ <pos=PRO:POS> <pos=ADJ> <NP>', NPS, true),
      // "der letzte der vier großen Flüsse":
      build('<der|das> <pos=ADJ> <der> <pos=ZAL> <NP>', NPS, true),
      // "Elemente eines axiomatischen Systems":  -- führt zu Fehlalarm anderswo
      //build('<chunk=B-NP & pos=PLU> <chunk=I-NP>* <chunk=B-NP & pos=GEN> <chunk=I-NP>*', NPP),

      // "eine Menge englischer Wörter [sind aus dem Lateinischen abgeleitet]":
      // NPP stimmt aber nicht für Mathematik, dort NPS: "Eine Menge ist ein Konzept der Mathematik."
      build('<eine> <menge> <NP>+', NPP, true),
      // "dass [sie und sein Sohn ein Paar] sind":
      build('<er|sie|es> <und> <NP> <NP>', NPP),

      // ===== prepositional phrases ===========================================================

      // "laut den meisten Quellen":
      build('<laut> <regex=.*>{0,3} <Quellen>', PP, true),
      // "bei den sehr niedrigen Oberflächentemperaturen" (OpenNLP doesn't find this)
      build('<pos=PRP> <pos=ART:> <pos=ADV>* <pos=ADJ> <NP>', PP, true),
      // "in den alten Religionen, Mythen und Sagen":
      build('<pos=PRP> <chunk=NPP>+ <,> <NP>', PP, true),
      // "für die Stadtteile und selbständigen Ortsteile":
      build('<pos=PRP> <chunk=NPP>+', PP, true),
      // "Das Bündnis zwischen der Sowjetunion und Kuba":
      build('<pos=PRP> <der> <chunk=NPP>+', PP),
      // "in chemischen Komplexverbindungen", "für die Fische":
      build('<pos=PRP> <NP>', PP),
      // "einschließlich der biologischen und sozialen Grundlagen":
      // with OpenNLP: build('<pos=PRP> <NP> <pos=ADJ> (<und>|<oder>|<bzw.>) <pos=ADJ> <NP>', PP),
      build('<pos=PRP> <NP> <pos=ADJ> <und|oder|bzw.> <NP>', PP),
      // "für Ärzte und Ärztinnen festgestellte Risikoprofil", "der als Befestigung gedachte östliche Teil der Burg":
      build('<pos=PRP> (<NP>)+', PP),
      // "in den darauf folgenden Wochen":
      build('<pos=PRP> <chunk=B-NP> <pos=ADV> <NP>', PP),
      // "in nur zwei Wochen":
      build('<pos=PRP> <pos=ADV> <pos=ZAL> <chunk=B-NP>', PP),
      // "in deren deutschen Installationen":
      build('<pos=PRP> <pos=PRO> <NP>', PP),
      // "nach sachlichen und militärischen Kriterien" - we need to help OpenNLP a bit with this one:
      // with OpenNLP: build('<pos=PRP> <pos=ADJ> (<und|oder|sowie>) <pos=ADJ> <chunk=B-NP>', PP),
      build('<pos=PRP> <pos=ADJ> <und|oder|sowie> <NP>', PP),
      // "mit über 1000 Handschriften":
      build('<pos=PRP> <pos=ADV> <regex=\\d+> <NP>', PP),
      // "über laufende Sanierungsmaßnahmen":
      build('<pos=PRP> <pos=PA1> <NP>', PP),
      // "Aufgrund stark schwankender Absatzmärkte war die GEFA-Flug..."
      build('<pos=PRP> <pos=ADJ> <pos=PA1> <NP>', PP),
      // "durch Einsatz größerer Maschinen und bessere Kapazitätsplanung":
      // with OpenNLP: build('<pos=PRP> <NP> <pos=ADJ> <NP> (<und|oder>) <NP>', PP),
      build('<pos=PRP> <NP> <NP> <und|oder> <NP>', PP),
      // "bei sehr guten Beobachtungsbedingungen":
      build('<pos=PRP> <pos=ADV> <pos=ADJ> <NP>', PP),
      // "[Von ursprünglich drei Almhütten] ist noch eine erhalten":
      build('<pos=PRP> <pos=ADJ:PRD:GRU> <pos=ZAL> <NP>', PP),

      // "die darauffolgenden Jahre" -> eigentlich "in den darauffolgenden Jahren":
      build('<die> <pos=ADJ> <Sekunden|Minuten|Stunden|Tage|Wochen|Monate|Jahre|Jahrzehnte|Jahrhunderte> (<NP>)?', PP),
      // "die letzten zwei Monate" -> eigentlich "in den letzten zwei Monaten":
      build('<die> <pos=ADJ> <pos=ZAL> <Sekunden|Minuten|Stunden|Tage|Wochen|Monate|Jahre|Jahrzehnte|Jahrhunderte> (<NP>)?', PP),
      // "letztes Jahr":
      build('<regex=(vor)?letzte[sn]?> <Woche|Monat|Jahr|Jahrzehnt|Jahrhundert>', PP),
      // "Für in Österreich lebende Afrikaner und Afrikanerinnen":
      build('<für> <in> <pos=EIG> <pos=PA1> <pos=SUB> <und> <pos=SUB>', PP, true),

      // "die Beziehungen zwischen Kanada und dem Iran":
      build('<chunk=NPP> <zwischen> <pos=EIG> <und|sowie> <NP>', NPP),
      // ", die die hauptsächliche Beute der Eisbären", ", welche der Urstoff aller Körper":
      build('<,> <die|welche> <NP> <chunk=NPS & pos=GEN>+', NPP),
      // "Kommentare, Korrekturen, Kritik":
      build('<NP> <,> <NP> <,> <NP>', NPP),
      // "Details, Dialoge, wie auch die Typologie der Charaktere":
      build('<NP> <,> <NP> <,> <wie> <auch> <chunk=NPS>+', NPP)
  ];
  REGEXES2 = regexes2;
  REGEXES1 = regexes1;
}

// Java: GermanChunker
export class GermanChunker {
  static FQCN = 'org.languagetool.chunking.GermanChunker';

  // Java: GermanChunker#setDebug(boolean) (deprecated, for internal use only)
  static setDebug(debugMode) {
    debug = debugMode;
  }

  // Java: GermanChunker#isDebug() (deprecated, for internal use only)
  static isDebug() {
    return debug;
  }

  // Java: GermanChunker#GermanChunker()
  constructor() {
    initStatics();
  }

  // Java: GermanChunker#addChunkTags(List)
  addChunkTags(tokenReadings) {
    const allForms = this.allForms(tokenReadings);
    const chunkTaggedTokens = this.getBasicChunksWithForms(tokenReadings, allForms);
    for (const regex of REGEXES2) {
      this.apply(regex, chunkTaggedTokens, allForms);
    }
    this.assignChunksToReadings(chunkTaggedTokens);
  }

  // Java: GermanChunker#getBasicChunks(List) (package-private)
  getBasicChunks(tokenReadings) {
    return this.getBasicChunksWithForms(tokenReadings, this.allForms(tokenReadings));
  }

  // Java: GermanChunker#getBasicChunks(List,Set) (private)
  getBasicChunksWithForms(tokenReadings, allForms) {
    const chunkTaggedTokens = [];
    for (const tokenReading of tokenReadings) {
      if (!tokenReading.isWhitespace()) {
        const chunkTags = [new ChunkTag('O')];
        const chunkTaggedToken = new ChunkTaggedToken(tokenReading.getToken(), chunkTags, tokenReading);
        chunkTaggedTokens.push(chunkTaggedToken);
      }
    }
    if (debug) {
      process.stdout.write('=============== CHUNKER INPUT ===============\n');
      process.stdout.write(`${this.getDebugString(chunkTaggedTokens)}\n`);
    }
    for (const regex of REGEXES1) {
      this.apply(regex, chunkTaggedTokens, allForms);
    }
    return chunkTaggedTokens;
  }

  // Java: GermanChunker#apply(RegularExpressionWithPhraseType,List,Set) (private)
  apply(regex, tokens, allForms) {
    if (!this.hasAllFormHints(regex, allForms)) {
      return;
    }

    const prevDebug = this.getDebugString(tokens);
    try {
      const affectedSpans = this.doApplyRegex(regex, tokens);
      const debugString = this.getDebugString(tokens);
      if (debugString !== prevDebug) {
        this.printDebugInfo(regex, affectedSpans, debugString);
      }
    } catch (e) {
      if (e.notPorted === true) throw e;
      throw new RuntimeException(`Could not apply chunk regexp '${regex.toString()}' to tokens: [${tokens.map((t) => t.toString()).join(', ')}]`, e);
    }
  }

  // Java: GermanChunker#hasAllFormHints(RegularExpressionWithPhraseType,Set) (private static)
  hasAllFormHints(regex, allForms) {
    for (const hints of regex.formHints) {
      if (!this.hasForm(allForms, hints)) {
        return false;
      }
    }
    return true;
  }

  // Java: GermanChunker#hasForm(Set,String[]) (private static)
  hasForm(allForms, hints) {
    for (const hint of hints) {
      if (allForms.contains(hint)) {
        return true;
      }
    }
    return false;
  }

  // Java: GermanChunker#allForms(List) (private static)
  allForms(tokens) {
    const result = new TreeSet(CASE_INSENSITIVE_ORDER);
    for (const token of tokens) {
      result.add(token.getToken());
    }
    return result;
  }

  // Java: GermanChunker#assignChunksToReadings(List) (private)
  assignChunksToReadings(chunkTaggedTokens) {
    for (const taggedToken of chunkTaggedTokens) {
      const readings = taggedToken.getReadings();
      if (readings !== null && readings !== undefined) {
        readings.setChunkTags(taggedToken.getChunkTags());
      }
    }
  }

  // Java: GermanChunker#doApplyRegex(RegularExpressionWithPhraseType,List) (private)
  doApplyRegex(regex, tokens) {
    const matches = regex.expression.findAll(tokens);
    const affectedSpans = [];
    for (const match of matches) {
      affectedSpans.push(new Span(match.startIndex(), match.endIndex()));
      for (let i = match.startIndex(); i < match.endIndex(); i++) {
        const token = tokens[i];
        let newChunkTags = [...token.getChunkTags()];
        if (regex.overwrite) {
          const filtered = [];
          for (const newChunkTag of newChunkTags) {
            if (!FILTER_TAGS.contains(newChunkTag.getChunkTag())) {
              filtered.push(newChunkTag);
            }
          }
          newChunkTags = filtered;
        }
        const newTag = this.getChunkTag(regex, match, i);
        if (!newChunkTags.some((t) => t.equals(newTag))) {
          newChunkTags.push(newTag);
          const oIndex = newChunkTags.findIndex((t) => t.equals(new ChunkTag('O')));
          if (oIndex !== -1) newChunkTags.splice(oIndex, 1);
        }
        tokens[i] = new ChunkTaggedToken(token.getToken(), newChunkTags, token.getReadings());
      }
    }
    return new AffectedSpans(affectedSpans);
  }

  // Java: GermanChunker#getChunkTag(RegularExpressionWithPhraseType,Match,int) (private)
  getChunkTag(regex, match, i) {
    let newTag;
    if (regex.phraseType === NP) {
      // we assign the same tags as the OpenNLP chunker
      if (i === match.startIndex()) {
        newTag = new ChunkTag('B-NP');
      } else {
        newTag = new ChunkTag('I-NP');
      }
    } else {
      newTag = new ChunkTag(regex.phraseType);
    }
    return newTag;
  }

  // Java: GermanChunker#printDebugInfo(RegularExpressionWithPhraseType,AffectedSpans,String) (private)
  printDebugInfo(regex, affectedSpans, debugString) {
    process.stdout.write(`=== Applied ${regex.toString()} ===\n`);
    if (regex.overwrite) {
      process.stdout.write(`Note: overwrite mode, replacing old ${FILTER_TAGS.toString()} tags\n`);
    }
    const debugLines = javaSplit(debugString, '\n');
    let i = 0;
    for (const debugLine of debugLines) {
      if (affectedSpans.isAffected(i)) {
        process.stdout.write(`${javaReplaceFirst(debugLine, '^  ', ' *')}\n`);
      } else {
        process.stdout.write(`${debugLine}\n`);
      }
      i++;
    }
    process.stdout.write('\n');
  }

  // Java: GermanChunker#getDebugString(List) (private)
  getDebugString(tokens) {
    if (!debug) {
      return '';
    }
    let sb = '';
    for (const token of tokens) {
      const tokenReadingStr = javaReplaceFirst(token.getReadings().toString(), `${Pattern.quote(token.getToken())}\\[`, '[');
      sb += `  ${token.toString()} -- ${tokenReadingStr}\n`;
    }
    return sb;
  }
}

registerComponent(GermanChunker.FQCN, () => new GermanChunker());
