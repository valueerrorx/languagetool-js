// Ports of CommandLineParserTest (CLI-0001..0003, CLI-0007, CLI-0021, CLI-0070); testSimple's xx-language cases use en (xx is not registered)
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { CommandLineParser, UnknownParameterException, WrongParameterNumberException } from '../../src/cli/CommandLineParser.js';
import { IllegalArgumentException, ArrayIndexOutOfBoundsException } from '../../src/lib/java/errors.js';

const parse = (...args) => new CommandLineParser().parseOptions(args);

describe('CommandLineParserTest', () => {
  it('testUsage', () => {
    expect(() => parse()).toThrow(WrongParameterNumberException);
    expect(parse('--help').isPrintUsage()).toBe(true);
    for (const h of ['-h', '-help', '--?']) expect(parse(h).isPrintUsage()).toBe(true);
  });

  it('testErrors', () => {
    expect(() => parse('--apply', '--taggeronly')).toThrow(IllegalArgumentException);
  });

  it('testSimple', () => {
    let options = parse('filename.txt');
    expect(options.getLanguage()).toBeNull();
    expect(options.getFilename()).toBe('filename.txt');
    expect(options.isVerbose()).toBe(false);
    options = parse('--language', 'en', 'filename.txt');
    expect(options.getLanguage().getShortCode()).toBe('en');
    expect(options.getFilename()).toBe('filename.txt');
    options = parse('-l', 'en-US', 'filename.txt');
    expect(options.getLanguage().getShortCodeWithCountryAndVariant()).toBe('en-US');
    options = parse('-v', '-l', 'en', 'filename.txt');
    expect(options.isVerbose()).toBe(true);
    expect(parse('--version').isPrintVersion()).toBe(true);
    expect(parse('--list').isPrintLanguages()).toBe(true);
  });

  it('arg count limit (CLI-0001)', () => {
    expect(() => parse(...Array(15).fill('-b'))).toThrow(WrongParameterNumberException);
    expect(parse(...Array(14).fill('-b')).isSingleLineBreakMarksParagraph()).toBe(true);
  });

  it('unknown parameter only when not last (CLI-0002)', () => {
    expect(() => parse('--bogus', 'a.txt')).toThrow(new UnknownParameterException('Unknown parameter: --bogus'));
    expect(parse('--bogus').getFilename()).toBe('--bogus');
  });

  it('missing option values (CLI-0003)', () => {
    expect(() => parse('-l')).toThrow('Missing argument to -l/--language command line option.');
    expect(() => parse('-b', '-d')).toThrow('Missing argument to -d/--disable command line option.');
    expect(() => parse('-c')).toThrow('Missing argument to -c/--encoding command line option.');
    expect(() => parse('--level')).toThrow('Missing value for option --level'); // DEV-019
    expect(() => parse('--level', 'FOO')).toThrow("Unknown level 'FOO' - currently, only 'PICKY' is supported");
  });

  it('unknown language (CLI-0021)', () => {
    expect(() => parse('-l', 'zz', '-')).toThrow(/^'zz' is not a language code known to LanguageTool\. Supported language codes are: /);
  });

  it('-eo and -d conflict, categories accumulate, empty id fails', () => {
    expect(() => parse('-eo', '-d', 'A', 'f')).toThrow('You cannot specify both disabled rules and enabledonly');
    expect(() => parse('-d', 'A', '-eo', 'f')).toThrow('You cannot specify both disabled rules and enabledonly');
    const o = parse('--enablecategories', 'A,B', '--enablecategories', 'C', 'f');
    expect(o.getEnabledCategories().map(String).sort()).toEqual(['A', 'B', 'C']);
    expect(() => parse('--enablecategories', '', 'f')).toThrow("Category id must not be empty: ''");
  });
});
