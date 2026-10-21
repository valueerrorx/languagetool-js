// Java: org.languagetool.commandline.CommandLineParser (+ UnknownParameterException, WrongParameterNumberException)
import { JLanguageTool } from '../core/JLanguageTool.js';
import { Languages } from '../core/Languages.js';
import { ArrayIndexOutOfBoundsException, IllegalArgumentException, RuntimeException } from '../lib/java/errors.js';
import { File } from '../lib/java/io/File.js';
import { javaSplit } from '../lib/java/strings.js';
import { CommandLineOptions } from './CommandLineOptions.js';
import { outPrintln } from './stdio.js';

// Java: org.languagetool.commandline.UnknownParameterException
export class UnknownParameterException extends RuntimeException {
  static FQCN = 'org.languagetool.commandline.UnknownParameterException';
}

// Java: org.languagetool.commandline.WrongParameterNumberException
export class WrongParameterNumberException extends RuntimeException {
  static FQCN = 'org.languagetool.commandline.WrongParameterNumberException';
}

const USAGE = [
  'Usage: java -jar languagetool-commandline.jar [OPTION]... FILE',
  ' FILE                      plain text file to be checked',
  ' Available options:',
  '  -r, --recursive          work recursively on directory, not on a single file',
  '  -c, --encoding ENC       character set of the input text, e.g. utf-8 or latin1',
  '  -b                       assume that a single line break marks the end of a paragraph',
  '  -l, --language LANG      the language code of the text, e.g. en for English, en-GB for British English',
  '  --list                   print all available languages and exit',
  '  -adl, --autoDetect       auto-detect the language of the input text - note this will not detect',
  '                           variants like \'English (US)\', so you will not get spell checking for',
  '                           languages with variants',
  '  -m, --mothertongue LANG  the language code of your first language, used to activate false-friend checking',
  '  -d, --disable RULES      a comma-separated list of rule ids to be disabled (use no spaces between ids)',
  '  -e, --enable RULES       a comma-separated list of rule ids to be enabled (use no spaces between ids)',
  '  -eo, --enabledonly       disable all rules except those enabled explicitly in -e',
  '  --enablecategories CAT   a comma-separated list of category ids to be enabled (use no spaces between ids)',
  '  --disablecategories CAT  a comma-separated list of category ids to be disabled (use no spaces between ids)',
  '  -t, --taggeronly         don\'t check, but only print text analysis (sentences, part-of-speech tags)',
  '  -u, --list-unknown       also print a summary of words from the input that LanguageTool doesn\'t know',
  '  -b2, --bitext            check bilingual texts with a tab-separated input file,',
  '                           see http://languagetool.wikidot.com/checking-translations-bilingual-texts',
  '  --json                   print results as JSON (see https://languagetool.org/http-api/#!/default/post_check)',
  '  -p, --profile            print performance measurements',
  '  -v, --verbose            print text analysis (sentences, part-of-speech tags) to STDERR',
  '  --version                print LanguageTool version number and exit',
  '  -a, --apply              automatically apply suggestions if available, printing result to STDOUT',
  '                           NOTE: only use with very robust rules, as this will otherwise introduce new errors',
  '  --rulefile FILE          use an additional grammar file; if the filename contains a known language code,',
  '                           it is used in addition of standard rules',
  '  --remoterules FILE       configure rules depending on external services via a JSON file (optional)',
  '  --falsefriends FILE      use external false friend file to be used along with the built-in rules',
  '  --bitextrules  FILE      use external bitext XML rule file (useful only in bitext mode)',
  '  --languagemodel DIR      a directory with e.g. \'en\' sub directory (i.e. a language code) that contains',
  '                           \'1grams\'...\'3grams\' sub directories with Lucene indexes with',
  '                           ngram occurrence counts; activates the confusion rule if supported;',
  '                           see https://dev.languagetool.org/finding-errors-using-n-gram-data',
  '  --fasttextmodel FILE     fasttext language detection model (optional), see https://fasttext.cc/docs/en/language-identification.html',
  '  --fasttextbinary FILE    fasttext executable (optional), see https://fasttext.cc/docs/en/support.html',
  '  --xmlfilter              [deprecated] remove XML/HTML elements from input before checking',
  '  --line-by-line           work on file line by line (for development, e.g. inside an IDE)',
  '  --enable-temp-off        enable all temp_off rules (for testing and development)',
  '  --clean-overlapping      clean overlapping matches (show only the highest priority match)',
  '  --level level            enable the given level (currently only \'PICKY\')',
].join('\n');

// Java: args[i] with the JVM bounds check (ArrayIndexOutOfBoundsException text)
function argAt(args, i) {
  if (i < 0 || i >= args.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${args.length}`);
  return args[i];
}

// Java: CommandLineParser
export class CommandLineParser {
  static FQCN = 'org.languagetool.commandline.CommandLineParser';

  // Java: CommandLineParser#parseOptions(String[])
  parseOptions(args) {
    if (args.length < 1 || args.length > 14) {
      throw new WrongParameterNumberException();
    }
    const options = new CommandLineOptions();
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--version') {
        options.setPrintVersion(true);
      } else if (args[i] === '--list') {
        options.setPrintLanguages(true);
      } else if (args[i] === '-h' || args[i] === '-help' || args[i] === '--help' || args[i] === '--?') {
        options.setPrintUsage(true);
      } else if (args[i] === '-adl' || args[i] === '--autoDetect') { // set autoDetect flag
        options.setAutoDetect(true);
      } else if (args[i] === '-v' || args[i] === '--verbose') {
        options.setVerbose(true);
      } else if (args[i] === '--line-by-line') {
        options.setLineByLine(true);
      } else if (args[i] === '--enable-temp-off') {
        options.setEnableTempOff(true);
      } else if (args[i] === '--clean-overlapping') {
        options.setCleanOverlapping(true);
      } else if (args[i] === '--level') {
        // DEV-019: Java AIOOBE for a missing value; clean message like the sibling options
        if (i + 1 >= args.length) throw new IllegalArgumentException('Missing value for option --level');
        const level = argAt(args, ++i);
        try {
          options.setLevel(JLanguageTool.Level.valueOf(level));
        } catch (e) {
          if (e instanceof IllegalArgumentException) {
            throw new IllegalArgumentException(`Unknown level '${level}' - currently, only 'PICKY' is supported`);
          }
          throw e;
        }
      } else if (args[i] === '-t' || args[i] === '--taggeronly') {
        options.setTaggerOnly(true);
        if (options.isListUnknown()) {
          throw new IllegalArgumentException('You cannot list unknown words when tagging only');
        }
        if (options.isApplySuggestions()) {
          throw new IllegalArgumentException('You cannot apply suggestions when tagging only');
        }
      } else if (args[i] === '-r' || args[i] === '--recursive') {
        options.setRecursive(true);
      } else if (args[i] === '-b2' || args[i] === '--bitext') {
        options.setBitext(true);
      } else if (args[i] === '-eo' || args[i] === '--enabledonly') {
        if (options.getDisabledRules().length > 0) {
          throw new IllegalArgumentException('You cannot specify both disabled rules and enabledonly');
        }
        options.setUseEnabledOnly();
      } else if (args[i] === '-d' || args[i] === '--disable') {
        if (options.isUseEnabledOnly()) {
          throw new IllegalArgumentException('You cannot specify both disabled rules and enabledonly');
        }
        this.checkArguments('-d/--disable', i, args);
        const rules = args[++i];
        options.setDisabledRules(javaSplit(rules, ','));
      } else if (args[i] === '-e' || args[i] === '--enable') {
        this.checkArguments('-e/--enable', i, args);
        const rules = args[++i];
        options.setEnabledRules(javaSplit(rules, ','));
      } else if (args[i] === '--enablecategories') {
        this.checkArguments('--enablecategories', i, args);
        const categories = args[++i];
        options.setEnabledCategories(javaSplit(categories, ','));
      } else if (args[i] === '--disablecategories') {
        this.checkArguments('--disablecategories', i, args);
        const categories = args[++i];
        options.setDisabledCategories(javaSplit(categories, ','));
      } else if (args[i] === '-l' || args[i] === '--language') {
        this.checkArguments('-l/--language', i, args);
        options.setLanguage(this.getLanguage(args[++i]));
      } else if (args[i] === '-m' || args[i] === '--mothertongue') {
        this.checkArguments('-m/--mothertongue', i, args);
        options.setMotherTongue(this.getLanguage(args[++i]));
      } else if (args[i] === '--languagemodel') {
        this.checkArguments('--languagemodel', i, args);
        options.setLanguageModel(new File(args[++i]));
      } else if (args[i] === '--fasttextmodel') {
        this.checkArguments('--fasttextmodel', i, args);
        options.setFasttextModel(new File(args[++i]));
      } else if (args[i] === '--fasttextbinary') {
        this.checkArguments('--fasttextbinary', i, args);
        options.setFasttextBinary(new File(args[++i]));
      } else if (args[i] === '--rulefile') {
        this.checkArguments('--rulefile', i, args);
        options.setRuleFile(args[++i]);
      } else if (args[i] === '--remoterules') {
        this.checkArguments('--remoterules', i, args);
        options.setRemoteRulesFile(args[++i]);
      } else if (args[i] === '--falsefriends') {
        this.checkArguments('--falsefriends', i, args);
        options.setFalseFriendFile(args[++i]);
      } else if (args[i] === '--bitextrules') {
        this.checkArguments('--bitextrules', i, args);
        options.setBitextRuleFile(args[++i]);
      } else if (args[i] === '-c' || args[i] === '--encoding') {
        this.checkArguments('-c/--encoding', i, args);
        options.setEncoding(args[++i]);
      } else if (args[i] === '-u' || args[i] === '--list-unknown') {
        options.setListUnknown(true);
        if (options.isTaggerOnly()) {
          throw new IllegalArgumentException('You cannot list unknown words when tagging only');
        }
      } else if (args[i] === '-b') {
        options.setSingleLineBreakMarksParagraph(true);
      } else if (args[i] === '--json') {
        options.setJsonFormat();
        if (options.isApplySuggestions()) {
          throw new IllegalArgumentException('JSON output format makes no sense for automatic application of suggestions');
        }
        if (options.isLineByLine()) {
          throw new IllegalArgumentException('JSON output format is not implemented for "line by line" analysis');
        }
        if (options.isBitext()) {
          throw new IllegalArgumentException('JSON output format is not implemented for Bitext');
        }
        if (options.isListUnknown()) {
          throw new IllegalArgumentException('You cannot list unknown words in JSON output format');
        }
      } else if (args[i] === '-a' || args[i] === '--apply') {
        options.setApplySuggestions(true);
        if (options.isTaggerOnly()) {
          throw new IllegalArgumentException('You cannot apply suggestions when tagging only');
        }
        if (options.isJsonFormat()) {
          throw new IllegalArgumentException('JSON output format makes no sense for automatic application of suggestions');
        }
      } else if (args[i] === '-p' || args[i] === '--profile') {
        options.setProfile(true);
        if (options.isJsonFormat()) {
          throw new IllegalArgumentException('JSON output format makes no sense for profiling');
        }
        if (options.isApplySuggestions()) {
          throw new IllegalArgumentException('Applying suggestions makes no sense for profiling');
        }
        if (options.isTaggerOnly()) {
          throw new IllegalArgumentException('Tagging makes no sense for profiling');
        }
      } else if (args[i] === '--xmlfilter') {
        options.setXmlFiltering(true);
      } else if (i === args.length - 1) {
        options.setFilename(args[i]);
      } else {
        throw new UnknownParameterException(`Unknown parameter: ${args[i]}`);
      }
    }
    return options;
  }

  // Java: CommandLineParser#printUsage() / printUsage(PrintStream); stream = object with println (default STDOUT)
  printUsage(stream = { println: outPrintln }) {
    stream.println(USAGE);
  }

  // Java: CommandLineParser#checkArguments(String,int,String[])
  checkArguments(option, argParsingPos, args) {
    if (argParsingPos + 1 >= args.length) {
      throw new IllegalArgumentException(`Missing argument to ${option} command line option.`);
    }
  }

  // Java: CommandLineParser#getLanguage(String)
  getLanguage(userSuppliedLangCode) {
    return Languages.getLanguageForShortCode(userSuppliedLangCode);
  }
}
