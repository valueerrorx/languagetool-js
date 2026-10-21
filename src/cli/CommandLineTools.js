// Java: org.languagetool.commandline.CommandLineTools (plain/JSON match listing, time line; bitext, tagging, profiling and antipattern listing follow with their IDs)
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../core/text/AnnotatedTextBuilder.js';
import { ApiPrintMode } from '../core/text/StringTools.js';
import { ContextTools } from '../core/text/ContextTools.js';
import { DetectedLanguage } from '../core/rules/model/DetectedLanguage.js';
import { Premium } from '../core/rules/model/Premium.js';
import { RuleMatchesAsJsonSerializer } from '../core/RuleMatchesAsJsonSerializer.js';
import { AnalyzedSentence } from '../core/AnalyzedSentence.js';
import { PatternRule } from '../core/patterns/PatternRule.js';
import { PatternRuleMatcher } from '../core/patterns/PatternRuleMatcher.js';
import { TextLevelRule } from '../core/rules/model/TextLevelRule.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { formatFixed } from '../lib/java/Formatter.js';
import { abstractCollectionToString } from '../lib/java/toString.js';
import { checkBitext as toolsCheckBitext } from '../core/bitext/BitextTools.js';
import { StringIndexOutOfBoundsException } from '../lib/java/errors.js';
import { errPrintln, outPrint, outPrintln, systemErr } from './stdio.js';

const DEFAULT_CONTEXT_SIZE = 45; // Java: CommandLineTools.DEFAULT_CONTEXT_SIZE

// Java: CommandLineTools#tagText(String,JLanguageTool)
export function tagText(contents, lt) {
  const sentences = lt.sentenceTokenize(contents);
  for (const sentence of sentences) {
    const analyzedText = lt.getAnalyzedSentence(sentence);
    outPrintln(analyzedText.toString());
  }
}

// Java: CommandLineTools#checkText(...) overloads; short forms (contents, lt[, isJsonFormat, lineOffset[, level, listUnknownWords[, verbose]]]) or the full form
// (contents, lt, isJsonFormat, contextSize, lineOffset, prevMatches, apiMode, listUnknownWords, level, unknownWords, verbose)
export function checkText(contents, lt, ...a) {
  switch (a.length) {
    case 0: return checkTextFull(contents, lt, false, -1, 0, 0, ApiPrintMode.NORMAL_API, false, Level.DEFAULT, [], false);
    case 2: return checkTextFull(contents, lt, a[0], -1, a[1], 0, ApiPrintMode.NORMAL_API, false, Level.DEFAULT, [], false);
    case 4: return checkTextFull(contents, lt, a[0], -1, a[1], 0, ApiPrintMode.NORMAL_API, a[3], a[2], [], false);
    case 5: return checkTextFull(contents, lt, a[0], -1, a[1], 0, ApiPrintMode.NORMAL_API, a[3], a[2], [], a[4]);
    case 9: return checkTextFull(contents, lt, ...a);
    default: throw new Error(`no checkText overload with ${a.length + 2} arguments`);
  }
}

// Java: CommandLineTools#checkText(String,JLanguageTool,boolean,int,int,int,ApiPrintMode,boolean,Level,List,boolean)
export function checkTextFull(contents, lt, isJsonFormat, contextSize, lineOffset, prevMatches, apiMode, listUnknownWords, level, unknownWords, verbose) {
  if (contextSize === -1) {
    contextSize = DEFAULT_CONTEXT_SIZE;
  }
  const startTime = currentTimeMillis();
  const ruleMatches = lt.check(new AnnotatedTextBuilder().addText(contents).build(), true, ParagraphHandling.NORMAL, null, Mode.ALL, level);
  for (const r of ruleMatches) {
    // adjust line numbers
    r.setLine(r.getLine() + lineOffset);
    r.setEndLine(r.getEndLine() + lineOffset);
    // calculate lazy suggestions and cache them
    r.getSuggestedReplacementObjects();
  }
  if (isJsonFormat) {
    const serializer = new RuleMatchesAsJsonSerializer();
    const json = serializer.ruleMatchesToJson(ruleMatches, contents, contextSize, new DetectedLanguage(lt.getLanguage(), lt.getLanguage()));
    outPrint(json);
  } else {
    printMatches(ruleMatches, prevMatches, contents, contextSize, lt.getLanguage(), verbose);
    if (verbose) {
      printActivatedAntiPatterns(contents, lt);
    }
  }

  // display stats if it's not in a buffered mode
  if (apiMode === ApiPrintMode.NORMAL_API && !isJsonFormat) {
    const sentenceTokenizer = lt.getLanguage().getSentenceTokenizer();
    const sentenceCount = sentenceTokenizer.tokenize(contents).length;
    displayTimeStats(startTime, sentenceCount);
  }
  return ruleMatches.length;
}

// Java: CommandLineTools#printActivatedAntiPatterns(String,JLanguageTool)
function printActivatedAntiPatterns(contents, lt) {
  let sentences;
  lt.setOutput(null);
  try {
    sentences = lt.analyzeText(contents);
  } finally {
    lt.setOutput(systemErr);
  }
  const tokensByAntipattern = new Map();
  for (const rule of lt.getAllActiveRules()) {
    if (!(rule instanceof PatternRule) || rule.getAntiPatterns().length === 0) {
      continue;
    }
    const patternRule = rule;
    const matcher = new PatternRuleMatcher(patternRule, false);
    for (const sentence of sentences) {
      if (matcher.match(sentence).length === 0) {
        continue;
      }
      for (let i = 0; i < rule.getAntiPatterns().length; i++) {
        const antiPattern = rule.getAntiPatterns()[i];
        const immunizedSentence = antiPattern.replace(sentence.copy(sentence));
        if (matcher.match(immunizedSentence).length > 0) {
          continue;
        }
        const line = antiPattern.getXmlLineNumber();
        const key = `${patternRule.getFullId()} <antipattern> ${i + 1} (line ${line}) ${patternToString(antiPattern.getPatternTokens())}`;
        for (const token of immunizedSentence.getTokens()) {
          if (token.isImmunized() && token.getImmunizationSourceLine() === line) {
            if (!tokensByAntipattern.has(key)) tokensByAntipattern.set(key, []);
            const tokens = tokensByAntipattern.get(key);
            if (!tokens.includes(token.getToken())) {
              tokens.push(token.getToken());
            }
          }
        }
      }
    }
  }
  if (tokensByAntipattern.size === 0) {
    return;
  }
  errPrintln('Antipatterns activated:');
  for (const [key, tokens] of tokensByAntipattern) {
    errPrintln(`  ${key}: ${tokens.join(' ')}`);
  }
}

// Java: CommandLineTools#patternToString(List)
function patternToString(patternTokens) {
  return patternTokens.map((t) => t.toString()).join(' ');
}

// Java: CommandLineTools#displayTimeStats(long,long)
function displayTimeStats(startTime, sentCount) {
  const endTime = currentTimeMillis();
  const time = endTime - startTime;
  const timeInSeconds = Math.fround(time / 1000.0);
  const sentencesPerSecond = Math.fround(sentCount / timeInSeconds);
  outPrint(`Time: ${time}ms for ${sentCount} sentences (${formatFixed(sentencesPerSecond, 1)} sentences/sec)`);
  outPrintln();
}

// Java: CommandLineTools#printMatches(List,int,String,int,Language,boolean)
export function printMatches(ruleMatches, prevMatches, contents, contextSize, lang, verbose) {
  let i = 1;
  const contextTools = new ContextTools();
  contextTools.setContextSize(contextSize);
  const AbstractPatternRule = JLanguageTool.abstractPatternRuleClass;
  for (const match of ruleMatches) {
    const rule = match.getRule();
    let output = `${i + prevMatches}.) Line ${match.getLine() + 1}, column ${match.getColumn()}, Rule ID: ${match.getSpecificRuleId()}`;
    if (AbstractPatternRule !== null && rule instanceof AbstractPatternRule) {
      if (rule.getSubId() !== null) {
        output += `[${rule.getSubId()}]`;
      }
    }
    output += ` premium: ${Premium.get().isPremiumRule(match.getRule())}`;
    const priorityForId = lang.getRulePriority(match.getRule());
    if (priorityForId !== 0) {
      output += ` prio=${priorityForId}`;
    }
    if (verbose && AbstractPatternRule !== null && rule instanceof AbstractPatternRule) {
      output += ` (line ${rule.getXmlLineNumber()})`;
    }
    outPrintln(output);
    const msg = lang.toAdvancedTypography(match.getMessage());
    outPrintln(`Message: ${msg}`);
    let replacements = match.getSuggestedReplacements();
    if (replacements.length > 0) {
      replacements = replacements.slice(0, Math.min(5, replacements.length));
      outPrintln(`Suggestion: ${replacements.join('; ')}`);
    }
    outPrintln(contextTools.getPlainTextContext(match.getFromPos(), match.getToPos(), contents));
    if (match.getUrl() !== null) {
      outPrintln(`More info: ${match.getUrl()}`);
    } else if (rule.getUrl() !== null) {
      outPrintln(`More info: ${rule.getUrl()}`);
    }
    const tags = rule.getTags();
    if (tags.length > 0) {
      outPrintln(`Tags: ${abstractCollectionToString(tags)}`);
    }
    if (i < ruleMatches.length) {
      outPrintln();
    }
    i++;
  }
}

// Java: CommandLineTools#profileRulesOnText(String,JLanguageTool)
export function profileRulesOnText(contents, lt) {
  const iterationCount = 3;
  const workTime = new Array(iterationCount).fill(0);
  const rules = lt.getAllActiveRules();
  const ruleCount = rules.length;

  const sentences = lt.sentenceTokenize(contents);

  const analyzeStartTime = currentTimeMillis();
  const rawAnalyzedSentences = [];
  for (const sentence of sentences) {
    rawAnalyzedSentences.push(lt.getRawAnalyzedSentence(sentence));
  }

  const tagEndTime = currentTimeMillis();

  const analyzeEndTime = tagEndTime;
  const analyzeTime = analyzeEndTime - analyzeStartTime;
  outPrint(`Analyze time: ${analyzeTime} ms, ${formatFixed(Math.fround(Math.fround(Math.fround(sentences.length) / Math.fround(analyzeTime)) * 1000), 1)} sent/sec\n\n`);

  const language = lt.getLanguage();

  // TODO: it would be nice to have timing for each disambiguation rule too
  const analyzedSentences = rawAnalyzedSentences.map((s) => {
    const disambig = language.getDisambiguator().disambiguate(s);
    const analyzedSentence = new AnalyzedSentence(disambig.getTokens(), s.getTokens());
    if (language.getPostDisambiguationChunker() !== null) {
      language.getPostDisambiguationChunker().addChunkTags(analyzedSentence.getTokens().slice());
    }
    return analyzedSentence;
  });

  const disambigEndTime = currentTimeMillis();
  const disambigTime = disambigEndTime - tagEndTime;
  outPrint(`Disambig time: ${disambigTime} ms, ${formatFixed(Math.fround(Math.fround(Math.fround(sentences.length) / Math.fround(disambigTime)) * 1000), 6)} sent/sec\n\n`);

  outPrint(`Testing ${ruleCount} rules\n`);
  outPrint(`${'Rule ID'.padEnd(40)}${'Time'.padStart(10)}${'Sentences'.padStart(10)}${'Matches'.padStart(10)}${'Sentences per sec.'.padStart(15)}\n`);

  for (const rule of rules) {
    if (rule instanceof TextLevelRule) {
      continue; // profile rules for sentences only
    }

    let matchCount = 0;
    for (let k = 0; k < iterationCount; k++) {
      const startTime = currentTimeMillis();
      for (const sentence of analyzedSentences) {
        matchCount += rule.match(sentence).length;
      }
      const endTime = currentTimeMillis();
      workTime[k] = endTime - startTime;
    }

    const time = median(workTime);
    const timeInSeconds = Math.fround(time / 1000.0);
    const sentencesPerSecond = Math.fround(sentences.length / timeInSeconds);
    outPrint(`${rule.getFullId().padEnd(40)}${String(time).padStart(10)}${String(sentences.length).padStart(10)}${String(matchCount).padStart(10)}${formatFixed(sentencesPerSecond, 1).padStart(15)}\n`);
  }

  const ruleEndTime = currentTimeMillis();
  const totalRuleTime = Math.trunc((ruleEndTime - disambigEndTime) / iterationCount);
  outPrint(`\nTotal rule time: ${totalRuleTime} ms\n`);
  outPrint(`Total time: ${analyzeTime + disambigTime + totalRuleTime} ms (analyze + disambig + rules)\n`);
}

// Java: CommandLineTools#median(long[])
function median(m) {
  m.sort((a, b) => a - b);
  const middle = Math.trunc(m.length / 2); // subscript of middle element
  if (m.length % 2 === 1) {
    // Odd number of elements -- return the middle one.
    return m[middle];
  }
  return Math.trunc((m[middle - 1] + m[middle]) / 2);
}

// Java: CommandLineTools#checkBitext(BitextReader,JLanguageTool,JLanguageTool,List)
export function checkBitext(reader, srcLt, trgLt, bRules) {
  const startTime = currentTimeMillis();
  const contextSize = DEFAULT_CONTEXT_SIZE;
  const ruleMatches = [];
  let matchCount = 0;
  let sentCount = 0;
  const it = reader.iterator();
  while (it.hasNext()) {
    const srcAndTrg = it.next();
    const curMatches = toolsCheckBitext(srcAndTrg.getSource(), srcAndTrg.getTarget(), srcLt, trgLt, bRules);
    const fixedMatches = [];
    for (const thisMatch of curMatches) {
      fixedMatches.push(trgLt.adjustRuleMatchPos(thisMatch, reader.getSentencePosition(), reader.getColumnCount(),
        reader.getLineCount(), reader.getCurrentLine(), null));
    }
    ruleMatches.push(...fixedMatches);
    if (fixedMatches.length > 0) {
      printMatches(fixedMatches, matchCount, reader.getCurrentLine(), contextSize, trgLt.getLanguage(), false);
      matchCount += fixedMatches.length;
    }
    sentCount++;
  }
  displayTimeStats(startTime, sentCount);
  return ruleMatches.length;
}

// Java: CommandLineTools#correctBitext(BitextReader,JLanguageTool,JLanguageTool,List)
export function correctBitext(reader, sourceLt, targetLt, bRules) {
  const it = reader.iterator();
  while (it.hasNext()) {
    const srcAndTrg = it.next();
    const curMatches = toolsCheckBitext(srcAndTrg.getSource(), srcAndTrg.getTarget(), sourceLt, targetLt, bRules);
    const fixedMatches = [];
    for (const thisMatch of curMatches) {
      fixedMatches.push(targetLt.adjustRuleMatchPos(thisMatch, 0, reader.getTargetColumnCount(),
        reader.getLineCount(), reader.getCurrentLine(), null));
    }
    if (fixedMatches.length > 0) {
      outPrintln(correctTextFromMatches(srcAndTrg.getTarget(), fixedMatches));
    } else {
      outPrintln(srcAndTrg.getTarget());
    }
  }
}

// Java: CommandLineTools#correctTextFromMatches(String,List)
function correctTextFromMatches(contents, matches) {
  let sb = contents;
  const errors = [];
  for (const rm of matches) {
    if (rm.getSuggestedReplacements().length > 0) {
      errors.push(javaSubstring(sb, rm.getFromPos(), rm.getToPos()));
    }
  }
  let offset = 0;
  let counter = 0;
  for (const rm of matches) {
    const replacements = rm.getSuggestedReplacements();
    if (replacements.length > 0) {
      // make sure the error hasn't been already corrected:
      if (errors[counter] === javaSubstring(sb, rm.getFromPos() - offset, rm.getToPos() - offset)) {
        sb = sb.slice(0, rm.getFromPos() - offset) + replacements[0] + sb.slice(rm.getToPos() - offset);
        offset += (rm.getToPos() - rm.getFromPos()) - replacements[0].length;
      }
      counter++;
    }
  }
  return sb;
}

// Java: StringBuilder#substring(int,int) bounds check
function javaSubstring(s, start, end) {
  if (start < 0 || start > end || end > s.length) {
    throw new StringIndexOutOfBoundsException(`start ${start}, end ${end}, length ${s.length}`);
  }
  return s.slice(start, end);
}
