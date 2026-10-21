// Java: org.languagetool.commandline.Main (plain check of one file/STDIN; line-by-line, recursive, bitext, profile, apply, tagger, rule files follow with their IDs)
import fs from 'node:fs';
import { JLanguageTool } from '../core/JLanguageTool.js';
import { MultiThreadedJLanguageTool } from '../core/MultiThreadedJLanguageTool.js';
import { Language } from '../core/Language.js';
import { Languages } from '../core/Languages.js';
import { VERSION, BUILD_DATE, GIT_SHORT_ID } from '../core/LtBuildInfo.js';
import { LanguageIdentifierService } from '../core/language/identifier/LanguageIdentifierService.js';
import { createComponent, notPortedYet } from '../core/language/components.js';
import { correctText, profileRulesOnLine, selectRules } from '../core/Tools.js';
import { ApiPrintMode, filterXML, readerToString } from '../core/text/StringTools.js';
import { AmericanEnglish } from '../lang/en/language/AmericanEnglish.js';
import { English } from '../lang/en/language/English.js';
import { Exception, FileNotFoundException, IllegalArgumentException, NullPointerException, RuntimeException } from '../lib/java/errors.js';
import { BufferedReader, inputStreamReader } from '../lib/java/io.js';
import { File } from '../lib/java/io/File.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { javaCompare } from '../lib/java/strings.js';
import { CommandLineParser, UnknownParameterException, WrongParameterNumberException } from './CommandLineParser.js';
import { TabBitextReader } from '../core/bitext/TabBitextReader.js';
import { getBitextRules } from '../core/bitext/BitextTools.js';
import { checkBitext, correctBitext, checkText, checkTextFull, profileRulesOnText, tagText } from './CommandLineTools.js';
import { errPrintln, outPrint, outPrintln, systemErr } from './stdio.js';

// Java: Main.SystemExitHandler (exit must not return in production; tests install a throwing handler)
export const exitHandler = { exit: (status) => process.exit(status) };

// Java: commons-io ByteOrderMark list of the BOMInputStream, longest first (UTF-32LE before UTF-16LE)
const BOMS = [
  { name: 'UTF-32BE', bytes: [0x00, 0x00, 0xfe, 0xff] },
  { name: 'UTF-32LE', bytes: [0xff, 0xfe, 0x00, 0x00] },
  { name: 'UTF-8', bytes: [0xef, 0xbb, 0xbf] },
  { name: 'UTF-16BE', bytes: [0xfe, 0xff] },
  { name: 'UTF-16LE', bytes: [0xff, 0xfe] },
];

// Java: FileInputStream#open errno texts (FileNotFoundException message "<path> (<reason>)")
const ERRNO_TEXT = {
  ENOENT: 'No such file or directory', EISDIR: 'Is a directory', EACCES: 'Permission denied', ENOTDIR: 'Not a directory',
  ELOOP: 'Too many levels of symbolic links', ENAMETOOLONG: 'File name too long', EMFILE: 'Too many open files',
};

// Java: System.in read to EOF
function readStdin() {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  for (;;) {
    let n;
    try {
      n = fs.readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if (e.code === 'EAGAIN') continue;
      if (e.code === 'EOF') break;
      throw e;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks);
}

// Java: new FileInputStream(File) read completely; failures as FileNotFoundException
function readFileBytes(filename) {
  try {
    return fs.readFileSync(filename);
  } catch (e) {
    if (e.code !== undefined && ERRNO_TEXT[e.code] !== undefined) {
      throw new FileNotFoundException(`${filename} (${ERRNO_TEXT[e.code]})`);
    }
    throw e;
  }
}

// Java: SLF4J WARN line of the CLI logging setup (oracle fixtures: "<yyyy-MM-dd HH:mm:ss.SSS> WARN  <logger> - <msg>" on STDERR; logger framework: F71)
function logWarn(logger, message) {
  const d = new Date(currentTimeMillis());
  const p = (n, w = 2) => String(n).padStart(w, '0');
  const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
  errPrintln(`${ts} WARN  ${logger} - ${message}`);
}

// Java: Main
export class Main {
  static FQCN = 'org.languagetool.commandline.Main';

  // Java: Main#Main(CommandLineOptions)
  constructor(options) {
    this.options = options;
    this.profileRules = false;
    this.bitextMode = false;
    this.srcLt = null;
    this.bRules = null;
    this.currentRule = null;
    this.lt = Main.newLanguageTool(options.getLanguage(), options.getMotherTongue());
    this.lt.setCleanOverlappingMatches(options.isCleanOverlapping());
    if (options.getRuleFile() !== null) {
      this.addExternalRules(options.getRuleFile(), options.getLanguage());
    }
    if (options.getLanguageModel() !== null) {
      this.lt.activateLanguageModelRules(options.getLanguageModel());
    }
    this.lt.activateRemoteRules(options.getRemoteRulesFile() !== null ? options.getRemoteRulesFile() : null);
    selectRules(this.lt, options.getDisabledCategories(), options.getEnabledCategories(),
      new Set(options.getDisabledRules()), new Set(options.getEnabledRules()), options.isUseEnabledOnly(), options.isEnableTempOff());
  }

  // Java: new MultiThreadedJLanguageTool(language, motherTongue) (sequential, S9; real rule list)
  static newLanguageTool(language, motherTongue) {
    return new MultiThreadedJLanguageTool(language, [], motherTongue, null, null, null, true, false, null);
  }

  // Java: Main#addExternalRules(String,Language)
  addExternalRules(filename, lang) {
    const ruleLoader = createComponent('org.languagetool.rules.patterns.PatternRuleLoader');
    const is = readFileBytes(filename); // new FileInputStream(filename)
    const externalRules = ruleLoader.getRules(is, filename, lang);
    for (const externalRule of externalRules) {
      this.lt.addRule(externalRule);
    }
  }

  // Java: Main#isSpellCheckingActive()
  isSpellCheckingActive() {
    const rules = this.lt.getAllActiveRules();
    for (const rule of rules) {
      if (rule.isDictionaryBasedSpellingRule()) {
        return true;
      }
    }
    return false;
  }

  // Java: Main#getJLanguageTool()
  getJLanguageTool() {
    return this.lt;
  }

  // Java: Main#setListUnknownWords(boolean)
  setListUnknownWords(listUnknownWords) {
    this.lt.setListUnknownWords(listUnknownWords);
  }

  // Java: Main#cleanUp()
  cleanUp() {
    this.lt.shutdown();
    if (this.srcLt !== null) this.srcLt.shutdown();
    JLanguageTool.removeTemporaryFiles();
  }

  // Java: Main#setProfilingMode()
  setProfilingMode() {
    this.profileRules = true;
  }

  // Java: Main#setBitextMode(Language,List,List,File)
  setBitextMode(sourceLang, disabledRules, enabledRules, bitextRuleFile) {
    this.bitextMode = true;
    const target = this.lt.getLanguage();
    this.lt = Main.newLanguageTool(target, null);
    this.srcLt = Main.newLanguageTool(sourceLang, null);
    selectRules(this.lt, disabledRules, enabledRules, true);
    selectRules(this.srcLt, disabledRules, enabledRules, true);
    this.bRules = getBitextRules(sourceLang, this.lt.getLanguage(), bitextRuleFile);

    let bRuleList = [...this.bRules];
    for (const bitextRule of this.bRules) {
      for (const disabledRule of disabledRules) {
        if (bitextRule.getId() === disabledRule) {
          const idx = bRuleList.indexOf(bitextRule);
          if (idx >= 0) bRuleList.splice(idx, 1);
        }
      }
    }
    this.bRules = bRuleList;
    if (enabledRules.length > 0) {
      bRuleList = [];
      for (const enabledRule of enabledRules) {
        for (const bitextRule of this.bRules) {
          if (bitextRule.getId() === enabledRule) {
            bRuleList.push(bitextRule);
          }
        }
      }
      this.bRules = bRuleList;
    }
  }

  // Java: Main#runOnFile(String,String,boolean)
  runOnFile(filename, encoding, xmlFiltering) {
    if (this.bitextMode) {
      const reader = new TabBitextReader(filename, encoding);
      if (this.options.isApplySuggestions()) {
        correctBitext(reader, this.srcLt, this.lt, this.bRules);
      } else {
        checkBitext(reader, this.srcLt, this.lt, this.bRules);
      }
      return;
    }
    const text = this.getFilteredText(filename, encoding, xmlFiltering);
    if (this.isStdIn(filename)) {
      errPrintln('Working on STDIN...');
    } else {
      errPrintln(`Working on ${filename}...`);
    }
    if (this.options.isAutoDetect()) {
      let language = this.detectLanguageOfString(text);
      if (language === null) {
        errPrintln('Could not detect language well enough, using American English');
        language = AmericanEnglish.getInstance();
      }
      this.changeLanguage(language, this.options.getMotherTongue(), this.options.getDisabledRules(), this.options.getEnabledRules());
      errPrintln(`Using ${language.getName()} for file ${filename}`);
    }
    if (this.options.isApplySuggestions()) {
      outPrint(correctText(text, this.lt));
    } else if (this.profileRules) {
      profileRulesOnText(text, this.lt);
    } else if (!this.options.isTaggerOnly()) {
      checkText(text, this.lt, this.options.isJsonFormat(), 0, this.options.getLevel(), this.options.isListUnknown(), this.options.isVerbose());
    } else {
      tagText(text, this.lt);
    }
    if (this.options.isListUnknown() && !this.options.isJsonFormat()) {
      outPrintln(`Unknown words: ${this.unknownWordsToString()}`);
    }
  }

  // Java: "" + lt.getUnknownWords() (AbstractCollection#toString of the List)
  unknownWordsToString() {
    return `[${this.lt.getUnknownWords().join(', ')}]`;
  }

  // Java: Main#runOnFileLineByLine(String,String,Level)
  runOnFileLineByLine(filename, encoding, level) {
    errPrintln('Warning: running in line by line mode. Cross-paragraph checks will not work.\n');
    if (this.options.isVerbose()) {
      this.lt.setOutput(systemErr);
    }
    if (!this.options.isApplySuggestions()) {
      if (this.isStdIn(filename)) {
        errPrintln('Working on STDIN...');
      } else {
        errPrintln(`Working on ${filename}...`);
      }
    }
    if (this.profileRules && this.isStdIn(filename)) {
      throw new IllegalArgumentException('Profiling mode cannot be used with input from STDIN');
    }
    let runCount = 1;
    const rules = this.lt.getAllActiveRules();
    if (this.profileRules) {
      outPrint(`Testing ${rules.length} rules\n`);
      outPrintln('Rule ID\tTime\tSentences\tMatches\tSentences per sec.');
      runCount = rules.length;
    }
    let lineOffset = 0;
    let tmpLineOffset = 0;
    this.handleLine(ApiPrintMode.START_API, 0, '', level);
    let sb = '';
    for (let ruleIndex = 0; rules.length !== 0 && ruleIndex < runCount; ruleIndex++) {
      this.currentRule = rules[ruleIndex];
      try {
        const br = new BufferedReader(readerToString(this.getInputStreamReader(filename, encoding)));
        let line;
        let lineCount = 0;
        while ((line = br.readLine()) !== null) {
          sb += line;
          lineCount++;
          // to detect language from the first input line
          if (lineCount === 1 && this.options.isAutoDetect()) {
            let language = this.detectLanguageOfString(line);
            if (language === null) {
              errPrintln('Could not detect language well enough, using American English');
              language = AmericanEnglish.getInstance();
            }
            errPrintln(`Language used is: ${language.getName()}`);
            language.getSentenceTokenizer().setSingleLineBreaksMarksParagraph(this.options.isSingleLineBreakMarksParagraph());
            this.changeLanguage(language, this.options.getMotherTongue(), this.options.getDisabledRules(), this.options.getEnabledRules());
          }
          sb += '\n';
          tmpLineOffset++;

          if (this.isBreakPoint(line)) {
            this.handleLine(ApiPrintMode.CONTINUE_API, lineOffset, sb, level);
            if (this.profileRules) {
              this.lt.sentenceTokenize(sb).length;
            }
            sb = '';
            lineOffset = tmpLineOffset;
          }
        }
      } finally {
        if (sb.length > 0) {
          if (this.profileRules) {
            this.lt.sentenceTokenize(sb).length;
          }
        }
        this.handleLine(ApiPrintMode.END_API, tmpLineOffset - 1, sb, level);
      }
    }
  }

  // Java: Main#handleLine(ApiPrintMode,int,StringBuilder,Level)
  handleLine(mode, lineOffset, sb, level) {
    const matches = 0;
    const s = filterXML(sb);
    if (this.options.isApplySuggestions()) {
      outPrint(correctText(s, this.lt));
    } else if (this.profileRules) {
      profileRulesOnLine(s, this.lt, this.currentRule);
    } else if (!this.options.isTaggerOnly()) {
      checkTextFull(s, this.lt, this.options.isJsonFormat(), -1,
        lineOffset, matches, mode, this.options.isListUnknown(), level, [], this.options.isVerbose());
    } else {
      tagText(s, this.lt);
    }
  }

  // Java: Main#isBreakPoint(String)
  isBreakPoint(line) {
    return this.lt.getLanguage().getSentenceTokenizer().singleLineBreaksMarksPara() || line === '';
  }

  // Java: Main#getInputStreamReader(String,String); returns a Reader over the fully read bytes
  getInputStreamReader(filename, encoding) {
    let charsetName = encoding !== null ? encoding : 'UTF-8'; // Charset.defaultCharset().name()
    let bytes;
    if (!this.isStdIn(filename)) {
      bytes = readFileBytes(filename);
      // BOMInputStream(is, true, UTF_8, UTF_16BE, UTF_16LE, UTF_32BE, UTF_32LE): the BOM stays in the stream (include = true)
      const bom = BOMS.find((b) => bytes.length >= b.bytes.length && b.bytes.every((v, i) => bytes[i] === v));
      if (bom !== undefined && encoding === null) {
        charsetName = bom.name;
      }
    } else {
      bytes = readStdin();
    }
    return inputStreamReader(bytes, charsetName);
  }

  // Java: Main#isStdIn(String)
  isStdIn(filename) {
    return filename === '-';
  }

  // Java: Main#runRecursive(String,String,boolean,Level)
  runRecursive(filename, encoding, xmlFiltering, level) {
    const dir = new File(filename);
    const files = Main.listFiles(dir);
    if (files === null) {
      throw new IllegalArgumentException(`${dir.getAbsolutePath()} is not a directory, cannot use recursion`);
    }
    for (const file of files) {
      try {
        if (Main.isDirectory(file)) {
          this.runRecursive(file.getAbsolutePath(), encoding, xmlFiltering, level);
        } else if (this.options.isLineByLine()) {
          this.runOnFileLineByLine(file.getAbsolutePath(), encoding, level);
        } else {
          this.runOnFile(file.getAbsolutePath(), encoding, xmlFiltering);
        }
      } catch (e0) {
        let e = e0;
        if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
        if (!(e instanceof Exception)) throw e0; // catch (Exception e): notPorted markers and Errors pass
        throw new RuntimeException(`Could not check text in file ${file}`, e);
      }
    }
  }

  // Java: File#listFiles() (null if not a directory or on I/O error; directory order)
  static listFiles(dir) {
    try {
      const d = fs.opendirSync(dir.getPath()); // raw readdir order, as File.listFiles()
      const files = [];
      try {
        for (let e = d.readSync(); e !== null; e = d.readSync()) files.push(new File(dir, e.name));
      } finally {
        d.closeSync();
      }
      return files;
    } catch {
      return null;
    }
  }

  // Java: File#isDirectory()
  static isDirectory(file) {
    try {
      return fs.statSync(file.getPath()).isDirectory();
    } catch {
      return false;
    }
  }

  // Java: Main#getFilteredText(String,String,boolean)
  getFilteredText(filename, encoding, xmlFiltering) {
    if (this.options.isVerbose()) {
      this.lt.setOutput(systemErr);
    }
    // don't use StringTools.readStream() as that might add newlines which aren't there:
    const reader = this.getInputStreamReader(filename, encoding);
    const fileContents = readerToString(reader);
    if (xmlFiltering) {
      return filterXML(fileContents);
    }
    return fileContents;
  }

  // Java: Main#changeLanguage(Language,Language,List,List)
  changeLanguage(language, motherTongue, disabledRules, enabledRules) {
    try {
      this.lt = Main.newLanguageTool(language, motherTongue);
      selectRules(this.lt, disabledRules, enabledRules, true);
      if (this.options.isVerbose()) {
        this.lt.setOutput(systemErr);
      }
    } catch (e) {
      if (!(e instanceof Exception)) throw e; // catch (Exception e): notPorted markers and Errors pass
      throw new RuntimeException(`Could not create LanguageTool instance for language ${language}`, e);
    }
  }

  // Java: Main#main(String[])
  static main(args) {
    const commandLineParser = new CommandLineParser();
    let options = null;
    try {
      options = commandLineParser.parseOptions(args);
    } catch (e) {
      if (e instanceof WrongParameterNumberException) {
        commandLineParser.printUsage();
        exitHandler.exit(1);
      } else if (e instanceof IllegalArgumentException) {
        errPrintln(e.toString());
        exitHandler.exit(1);
      } else if (e instanceof UnknownParameterException) {
        if (e.getMessage() !== null) {
          errPrintln(e.getMessage());
        } else {
          errPrintln(e.toString());
        }
        commandLineParser.printUsage(systemErr);
        exitHandler.exit(1);
      } else {
        throw e;
      }
    }
    if (options.isPrintUsage()) {
      commandLineParser.printUsage();
      exitHandler.exit(1);
    }
    if (options.isPrintVersion()) {
      outPrintln(`LanguageTool version ${VERSION} (${BUILD_DATE}, ${GIT_SHORT_ID})`);
      exitHandler.exit(0);
    }
    if (options.isPrintLanguages()) {
      Main.printLanguages();
      exitHandler.exit(0);
    }
    if (options.getFilename() === null) {
      options.setFilename('-');
    }
    let languageHint = null;
    if (options.getLanguage() === null) {
      if (!options.isAutoDetect()) {
        errPrintln('No language specified, using English (no spell checking active, '
          + "specify a language variant like 'en-GB' if available)");
      }
      options.setLanguage(new English());
    } else if (!options.isApplySuggestions()) {
      languageHint = `Expected text language: ${options.getLanguage().getName()}`;
    }
    options.getLanguage().getSentenceTokenizer().setSingleLineBreaksMarksParagraph(options.isSingleLineBreakMarksParagraph());
    const prg = new Main(options);
    if (options.getFalseFriendFile() !== null) {
      const ffRules = prg.lt.loadFalseFriendRules(options.getFalseFriendFile());
      for (const ffRule of ffRules) {
        prg.lt.addRule(ffRule);
      }
    }
    if (prg.lt.getAllActiveRules().length === 0) {
      const catIds = options.getEnabledCategories().map((i) => i.toString());
      throw new RuntimeException('No rules are active. Please make sure your rule ids '
        + `([${options.getEnabledRules().join(', ')}]) and `
        + `category ids ([${catIds.join(', ')}]) are correct`);
    }
    if (languageHint !== null) {
      let spellHint = '';
      if (!prg.isSpellCheckingActive()) {
        if (prg.lt.getLanguage().isVariant()) {
          spellHint = ' (no spell checking active)';
        } else {
          spellHint = " (no spell checking active, specify a language variant like 'en-GB' if available)";
        }
      }
      errPrintln(languageHint + spellHint);
    }
    prg.setListUnknownWords(options.isListUnknown());
    if (options.isProfile()) {
      prg.setProfilingMode();
    }
    if (options.isBitext()) {
      if (options.getMotherTongue() === null) {
        throw new IllegalArgumentException('You have to set the source language (as mother tongue) in bitext mode');
      }
      const bitextRuleFile = options.getBitextRuleFile() !== null ? new File(options.getBitextRuleFile()) : null;
      prg.setBitextMode(options.getMotherTongue(), options.getDisabledRules(), options.getEnabledRules(), bitextRuleFile);
    }
    if (options.isRecursive()) {
      prg.runRecursive(options.getFilename(), options.getEncoding(), options.isXmlFiltering(), options.getLevel());
    } else if (options.isLineByLine()) {
      prg.runOnFileLineByLine(options.getFilename(), options.getEncoding(), options.getLevel());
    } else {
      prg.runOnFile(options.getFilename(), options.getEncoding(), options.isXmlFiltering());
    }
    prg.cleanUp();
  }

  // Java: Main#printLanguages()
  static printLanguages() {
    const languages = [];
    for (const language of Languages.get()) {
      languages.push(`${language.getShortCodeWithCountryAndVariant()} ${language.getName()}`);
    }
    languages.sort(javaCompare);
    for (const s of languages) {
      outPrintln(s);
    }
  }

  // Java: Main#detectLanguageOfString(String)
  detectLanguageOfString(text) {
    const first = LanguageIdentifierService.INSTANCE.getInitialized() === null;
    const identifier = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(0, null, this.options.getFasttextBinary(), this.options.getFasttextModel());
    if (first && this.options.getFasttextBinary() === null && this.options.getFasttextModel() === null) {
      logWarn('o.l.l.i.DefaultLanguageIdentifier', 'fastText not configured - language detection performance will be degraded. See https://dev.languagetool.org/http-server#starting-from-command-line for instructions.');
    }
    const language = identifier.detectLanguage(text);
    if (language !== null && !(language instanceof Language)) throw notPortedYet(`language ${language.getShortCode()} (out of scope, DEV-006)`);
    return language;
  }
}
