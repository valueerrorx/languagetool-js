// Java: org.languagetool.commandline.Main (plain check of one file/STDIN; line-by-line, recursive, bitext, profile, apply, tagger, rule files follow with their IDs)
import fs from 'node:fs';
import { JLanguageTool } from '../core/JLanguageTool.js';
import { MultiThreadedJLanguageTool } from '../core/MultiThreadedJLanguageTool.js';
import { Language } from '../core/Language.js';
import { Languages } from '../core/Languages.js';
import { VERSION, BUILD_DATE, GIT_SHORT_ID } from '../core/LtBuildInfo.js';
import { LanguageIdentifierService } from '../core/language/identifier/LanguageIdentifierService.js';
import { notPortedYet } from '../core/language/components.js';
import { selectRules } from '../core/Tools.js';
import { filterXML, readerToString } from '../core/text/StringTools.js';
import { AmericanEnglish } from '../lang/en/language/AmericanEnglish.js';
import { English } from '../lang/en/language/English.js';
import { Exception, FileNotFoundException, IllegalArgumentException, RuntimeException } from '../lib/java/errors.js';
import { inputStreamReader } from '../lib/java/io.js';
import { currentTimeMillis } from '../lib/java/clock.js';
import { javaCompare } from '../lib/java/strings.js';
import { interimRules } from '../server/interimRules.js';
import { CommandLineParser, UnknownParameterException, WrongParameterNumberException } from './CommandLineParser.js';
import { checkText } from './CommandLineTools.js';
import { errPrintln, outPrintln, systemErr } from './stdio.js';

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
    // the rule lists of de/fr are interim (ported core rules only): a rule set without -eo would differ from Java; English has the full list since F50
    // TODO(F59/F63): remove when the full rule lists of de and fr exist
    const interim = options.getLanguage().getShortCode() !== 'en';
    if (interim && !options.isUseEnabledOnly()) throw notPortedYet('full rule set (use -eo -e <ids>)');
    // TODO(F59/F63): remove when the full rule lists of de and fr exist
    if (interim && options.isEnableTempOff()) throw notPortedYet('full rule set (--enable-temp-off activates pattern rules with default temp_off; use -eo -e <ids>)');
    this.profileRules = false;
    this.bitextMode = false;
    this.srcLt = null;
    this.bRules = null;
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

  // Java: new MultiThreadedJLanguageTool(language, motherTongue) (sequential, S9; rule list = interim rules for de/fr until their rule steps land)
  static newLanguageTool(language, motherTongue) {
    return new MultiThreadedJLanguageTool(language, [], motherTongue, null, null, null, true, false, interimRules(language));
  }

  // Java: Main#addExternalRules(String,Language)
  addExternalRules() {
    throw notPortedYet('Main#addExternalRules (--rulefile)');
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
  setBitextMode() {
    throw notPortedYet('Main#setBitextMode (-b2)');
  }

  // Java: Main#runOnFile(String,String,boolean)
  runOnFile(filename, encoding, xmlFiltering) {
    if (this.bitextMode) {
      throw notPortedYet('Main#runOnFile bitext');
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
      throw notPortedYet('Main#runOnFile -a');
    } else if (this.profileRules) {
      throw notPortedYet('Main#runOnFile -p');
    } else if (!this.options.isTaggerOnly()) {
      checkText(text, this.lt, this.options.isJsonFormat(), 0, this.options.getLevel(), this.options.isListUnknown(), this.options.isVerbose());
    } else {
      throw notPortedYet('Main#runOnFile -t');
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
  runOnFileLineByLine() {
    throw notPortedYet('Main#runOnFileLineByLine (--line-by-line)');
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
  runRecursive() {
    throw notPortedYet('Main#runRecursive (-r)');
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
      throw notPortedYet('Main#main --falsefriends');
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
      prg.setBitextMode();
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
