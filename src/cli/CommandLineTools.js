// Java: org.languagetool.commandline.CommandLineTools (plain/JSON match listing, time line; bitext, tagging, profiling and antipattern listing follow with their IDs)
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../core/text/AnnotatedTextBuilder.js';
import { ApiPrintMode } from '../core/text/StringTools.js';
import { ContextTools } from '../core/text/ContextTools.js';
import { DetectedLanguage } from '../core/rules/model/DetectedLanguage.js';
import { Premium } from '../core/rules/model/Premium.js';
import { RuleMatchesAsJsonSerializer } from '../core/RuleMatchesAsJsonSerializer.js';
import { notPortedYet } from '../core/language/components.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { formatFixed } from '../lib/java/Formatter.js';
import { abstractCollectionToString } from '../lib/java/toString.js';
import { withInterimAnalysis } from '../server/interimRules.js';
import { outPrint, outPrintln } from './stdio.js';

const DEFAULT_CONTEXT_SIZE = 45; // Java: CommandLineTools.DEFAULT_CONTEXT_SIZE

// Java: CommandLineTools#tagText(String,JLanguageTool)
export function tagText() {
  throw notPortedYet('CommandLineTools#tagText');
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
  const ruleMatches = withInterimAnalysis(lt.getLanguage(), () =>
    lt.check(new AnnotatedTextBuilder().addText(contents).build(), true, ParagraphHandling.NORMAL, null, Mode.ALL, level));
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
function printActivatedAntiPatterns() {
  throw notPortedYet('CommandLineTools#printActivatedAntiPatterns (-v)');
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
