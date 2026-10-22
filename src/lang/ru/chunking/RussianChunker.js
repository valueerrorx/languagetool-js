// Java: org.languagetool.chunking.RussianChunker (rule-based Russian chunker on OpenRegex expressions)
import { RuntimeException } from '../../../lib/java/errors.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { javaReplace, javaReplaceFirst, javaSplit } from '../../../lib/java/strings.js';
import { JavaHashSet } from '../../../lib/java/collections/JavaHashSet.js';
import { registerComponent } from '../../../core/language/components.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../core/chunking/ChunkTaggedToken.js';
import { TokenExpressionFactory } from '../../../core/chunking/TokenExpressionFactory.js';
import { RegularExpression } from '../../../lib/openregex/regex/RegularExpression.js';

const FILTER_TAGS = new JavaHashSet(['PP', 'NPP', 'NPS', 'MayMissingYO', 'VP', 'SBAR', 'ADJP', 'DPT']);
const SYNTAX_EXPANSION = new Map(); // Java: HashMap (the replacements do not overlap, order is irrelevant)
SYNTAX_EXPANSION.set('<NP>', '<chunk=B-NP> <chunk=I-NP>*');
SYNTAX_EXPANSION.set('<VP>', '<chunk=B-VP> <chunk=I-VP>*');
SYNTAX_EXPANSION.set('<ADJP>', '<chunk=B-ADJP> <chunk=I-ADJP>*');
SYNTAX_EXPANSION.set('<DPT>', '<chunk=B-DPT> <chunk=I-DPT>*');

// Java: RussianChunker.PhraseType
const NP = 'NP'; // "noun phrase", will be assigned as B-NP for the first token and I-NP for following tokens (like OpenNLP)
const NPP = 'NPP'; // "noun phrase plural"
const PP = 'PP'; // "prepositional phrase" and similar (unused by the expressions)
const MayMissingYO = 'MayMissingYO';
const VP = 'VP'; // verb phrase
const SBAR = 'SBAR';
const ADJP = 'ADJP'; // participle
const DPT = 'DPT'; // adverbial participle
void PP;
void MayMissingYO;

// Java: RussianChunker#debug (static)
let debug = false;

let FACTORY = null;

// Java: RussianChunker#build(String,PhraseType,boolean)
function build(expr, phraseType, overwrite = false) {
  let expandedExpr = expr;
  for (const [key, value] of SYNTAX_EXPANSION) {
    expandedExpr = javaReplace(expandedExpr, key, value);
  }
  const expression = RegularExpression.compile(expandedExpr, FACTORY);
  return new RegularExpressionWithPhraseType(expression, phraseType, overwrite);
}

// Java: RussianChunker.RegularExpressionWithPhraseType
class RegularExpressionWithPhraseType {
  // Java: RussianChunker.RegularExpressionWithPhraseType#RegularExpressionWithPhraseType(RegularExpression,PhraseType,boolean)
  constructor(expression, phraseType, overwrite) {
    this.expression = expression;
    this.phraseType = phraseType;
    this.overwrite = overwrite;
  }

  // Java: RussianChunker.RegularExpressionWithPhraseType#toString()
  toString() {
    return `${this.phraseType} <= ${this.expression.toString()} (overwrite: ${this.overwrite})`;
  }
}

// Java: RussianChunker.Span
class Span {
  // Java: RussianChunker.Span#Span(int,int)
  constructor(startIndex, endIndex) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }
}

// Java: RussianChunker.AffectedSpans
class AffectedSpans {
  // Java: RussianChunker.AffectedSpans#AffectedSpans(List)
  constructor(spans) {
    this.spans = spans;
  }

  // Java: RussianChunker.AffectedSpans#isAffected(int)
  isAffected(pos) {
    for (const span of this.spans) {
      if (pos >= span.startIndex && pos < span.endIndex) {
        return true;
      }
    }
    return false;
  }
}

// Java: RussianChunker static initializer (REGEXES1, REGEXES2); done on first use like Java class initialisation
let REGEXES1 = null;
let REGEXES2 = null;
function initStatics() {
  if (REGEXES1 !== null) return;
  FACTORY = new TokenExpressionFactory(false);
  REGEXES1 = [
    // Иванов Иван Иванович
    build("<posre='NN:(Name|Fam|Patr):.*'> <posre='NN:(Name|Fam|Patr):.*'>+ ", NP, true),
    // Иванов И.И.
    build("<posre='NN:Fam:.*'> <regexCS=[А-ЯЁ]> <.> <regexCS=[А-ЯЁ]> <.> ", NP, true),
    // И.И. Иванов
    build("<regexCS=[А-ЯЁ]> <.> <regexCS=[А-ЯЁ]> <.> <posre='NN:Fam:.*'> ", NP, true),
    // verb+verb
    build("<posre='VB:.*:.*' & !posre='NN:.*'>* ", VP, false),

    build('<если>', SBAR),
    build('<поэтому>', SBAR),
    // noun phrase
    build("<posre='ADJ:Posit:.*:.*'> <posre='NN:(Anim|Inanim):.*' & !posre='NN:(Anim|Inanim):.*:(R|D|T|P)'> ", NP, true),

    build("<posre='ADJ:Posit:.*:.*'> <posre='NN:(Anim|Inanim):.*' & !posre='NN:(Anim|Inanim):.*:(R|D|T|P)'> <posre='NN:(Anim|Inanim):.*'> ", NP, true),
    // adj -> participle phrase
    build("<posre='ADJ:Posit:.*:.*'> <posre='NN:(Anim|Inanim):.*' & !posre='NN:(Anim|Inanim):.*:(Nom|V)'> <posre='NN:(Anim|Inanim):.*:(Nom|V)' & !posre='NN:(Anim|Inanim):.*:(R|D|T|P)'> ", ADJP, true),

    // adverbial participle
    build("<posre='DPT:.*:.*' & !pos='PREP'> ", DPT),
    build("<posre='DPT:.*:.*' & !pos='PREP'> <posre='NN:.*:.*:(R|D|T|P)' > ", DPT, true),
    build("<posre='DPT:.*:.*' & !pos='PREP'> <posre='PREP'> <posre='NN:.*:.*:(R|D|T|P)' > ", DPT, true),
    // participle
    build("<posre='PT:.*:.*'> ", ADJP),

    build("<posre='PT:.*:.*'> <pos='ADV' > ", ADJP, true),

    build("<posre='PT:.*:.*'> <posre='NN:.*:.*:(R|D|T|P)' > ", ADJP, true),
    build("<posre='PT:.*:.*'> <posre='PREP'> <posre='NN:.*:.*:(R|D|T|P|V)' > ", ADJP, true),
    build("<posre='PT:.*:.*'> <posre='PREP'> <posre='ADJ:.*:.*:(R|D|T|P|V)' > <posre='NN:.*:.*:(R|D|T|P|V)' > ", ADJP, true),
    build("<posre='PT:.*:.*'> <posre='NN:(Anim|Inanim):.*' & !posre='NN:(Anim|Inanim):.*:(Nom|V)'> <posre='NN:(Anim|Inanim):.*:(Nom|V)' & !posre='NN:(Anim|Inanim):.*:(R|D|T|P)'> ", ADJP, true),
    build("<posre='PT:.*:.*'> <posre='PNN:.*' & !posre='PNN:.*:Nom:.*'> <posre='NN:(Anim|Inanim):.*:(Nom|V)' & !posre='NN:(Anim|Inanim):.*:(R|D|T|P)'> ", ADJP, true),
    //
    build("<posre='PT:.*:.*'> <posre='ADJ:.*:.*' > ", ADJP, false),
    //
    build('<тов>', NP), // simulate OpenNLP?!
  ];
  REGEXES2 = [
    // ===== plural and singular noun phrases, based on OpenNLP chunker output ===============
    // "Маша и Миша":
    build('<posre=NN:Name:.*> <и> <posre=NN:Name:.*>', NPP, true),
    build('<posre=NN:Name:.*> <или> <posre=NN:Name:.*>', NPP, true),
    // не + VB
    build("<не> <posre='VB:.*:.*' & !posre='NN:.*'>* ", VP, false),
  ];
}

// Java: RussianChunker
export class RussianChunker {
  static FQCN = 'org.languagetool.chunking.RussianChunker';

  // Java: RussianChunker#setDebug(boolean) (deprecated, for internal use only)
  static setDebug(debugMode) {
    debug = debugMode;
  }

  // Java: RussianChunker#isDebug() (deprecated, for internal use only)
  static isDebug() {
    return debug;
  }

  // Java: RussianChunker#RussianChunker()
  constructor() {
    initStatics();
  }

  // Java: RussianChunker#addChunkTags(List)
  addChunkTags(tokenReadings) {
    const chunkTaggedTokens = this.getBasicChunks(tokenReadings);
    for (const regex of REGEXES2) {
      this.apply(regex, chunkTaggedTokens);
    }
    this.assignChunksToReadings(chunkTaggedTokens);
  }

  // Java: RussianChunker#getBasicChunks(List) (package-private)
  getBasicChunks(tokenReadings) {
    const chunkTaggedTokens = [];
    const missingYo = new ChunkTag('MayMissingYO');
    for (const tokenReading of tokenReadings) {
      if (!tokenReading.isWhitespace() && !tokenReading.getChunkTags().some((t) => t.equals(missingYo))) {
        const chunkTags = [new ChunkTag('O')];
        chunkTaggedTokens.push(new ChunkTaggedToken(tokenReading.getToken(), chunkTags, tokenReading));
      }
    }
    if (debug) {
      process.stdout.write('=============== CHUNKER INPUT ===============\n');
      process.stdout.write(`${this.getDebugString(chunkTaggedTokens)}\n`);
    }
    for (const regex of REGEXES1) {
      this.apply(regex, chunkTaggedTokens);
    }
    return chunkTaggedTokens;
  }

  // Java: RussianChunker#apply(RegularExpressionWithPhraseType,List) (private)
  apply(regex, tokens) {
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

  // Java: RussianChunker#assignChunksToReadings(List) (private)
  assignChunksToReadings(chunkTaggedTokens) {
    for (const taggedToken of chunkTaggedTokens) {
      const readings = taggedToken.getReadings();
      if (readings !== null && readings !== undefined) {
        readings.setChunkTags(taggedToken.getChunkTags());
      }
    }
  }

  // Java: RussianChunker#doApplyRegex(RegularExpressionWithPhraseType,List) (private)
  doApplyRegex(regex, tokens) {
    const matches = regex.expression.findAll(tokens);
    const affectedSpans = [];
    for (const match of matches) {
      affectedSpans.push(new Span(match.startIndex(), match.endIndex()));
      for (let i = match.startIndex(); i < match.endIndex(); i++) {
        const token = tokens[i];
        let newChunkTags = [...token.getChunkTags()];
        if (regex.overwrite) {
          newChunkTags = newChunkTags.filter((t) => !FILTER_TAGS.contains(t.getChunkTag()));
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

  // Java: RussianChunker#getChunkTag(RegularExpressionWithPhraseType,Match,int) (private)
  getChunkTag(regex, match, i) {
    const first = i === match.startIndex();
    switch (regex.phraseType) {
      case NP: return new ChunkTag(first ? 'B-NP' : 'I-NP');
      case NPP: return new ChunkTag(first ? 'B-NP-plural' : 'I-NP-plural');
      case VP: return new ChunkTag(first ? 'B-VP' : 'I-VP');
      case ADJP: return new ChunkTag(first ? 'B-ADJP' : 'I-ADJP');
      case DPT: return new ChunkTag(first ? 'B-DPT' : 'I-DPT');
      default: return new ChunkTag(regex.phraseType);
    }
  }

  // Java: RussianChunker#printDebugInfo(RegularExpressionWithPhraseType,AffectedSpans,String) (private)
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

  // Java: RussianChunker#getDebugString(List) (private)
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

registerComponent(RussianChunker.FQCN, () => new RussianChunker());
