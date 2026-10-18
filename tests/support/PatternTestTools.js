// Ported from PatternTestTools (languagetool-core test); warnings go to console.error like System.err
import { AssertionError } from '../../src/lib/java/errors.js';
import { Pattern } from '../../src/lib/java/regex/index.js';
import { javaMatches, javaReplaceAll, javaSplit, toLowerCase } from '../../src/lib/java/strings.js';

// These characters should not be present in token values as they split tokens in all languages.
const TOKEN_SEPARATOR_PATTERN = Pattern.compile('[ \t.,:;…!?(){}<>«»"]');
const TOKEN_SEPARATOR_PATTERN_NO_DOT = Pattern.compile('[ \t,:;…!?(){}<>«»"]');

const PROBABLE_PATTERN = Pattern.compile('(\\\\[dDsSwW])|.*([^*]\\*|[.+?{}()|\\[\\]].*|\\\\d).*');

// Polish POS tags use dots, so do not consider the presence of a dot as indicating a probable regular expression.
const PROBABLE_PATTERN_PL_POS = Pattern.compile('(\\\\[dDsSwW])|.*([^*]\\*|[+?{}()|\\[\\]].*|\\\\d).*');

const CHAR_SET_PATTERN = Pattern.compile('\\[^?([^\\]]+)\\]');
const STRICT_CHAR_SET_PATTERN = Pattern.compile('(\\(\\?-i\\))?.*(?<!\\\\)\\[^?([^\\]]+)\\]');
const UNBOUND_REPEAT = Pattern.compile('.*\\{\\d+,\\}.*');

// These strings are not be recognized as a regular expression
const NO_REGEXP = new Set([
  'PRP:LOK+TMP+MOD:DAT+AKK', 'AUX:ind+pres+3+p', 'PRP:TMP+MOD+CAU:DAT', 'PRP:LOK+TMP:DAT', 'PRP:LOK+TMP+CAU:DAT+AKK',
  'PRP:MOD:GEN+DAT', 'PRP:LOK+TMP+CAU:DAT',
]);

// Java: org.junit.Assert#fail(String)
export function fail(message) {
  throw new AssertionError(message);
}

// Java: PatternTestTools#failIfWhitespaceInToken(List,AbstractPatternRule,Language)
export function failIfWhitespaceInToken(patternTokens, rule, lang) {
  if (patternTokens !== null && patternTokens !== undefined) {
    for (const token of patternTokens) {
      if (token.getString() !== null && javaMatches(token.getString(), '.*\\s.*')) {
        fail(`Whitespace found in token '${token.getString()}' of rule ${rule.getFullId()}`
          + ` (language ${lang.getShortCodeWithCountryAndVariant()}): `
          + 'Using whitespace in a token will not work, as text gets split at whitespace. '
          + 'Use a new <token> element instead.');
      }
    }
  }
}

// Java: PatternTestTools#warnIfRegexpSyntaxNotKosher(List,String,String,Language)
export function warnIfRegexpSyntaxNotKosher(patternTokens, ruleId, ruleSubId, lang) {
  if (patternTokens === null || patternTokens === undefined) { // for <regexp>
    return;
  }
  let i = 0;
  for (const pToken of patternTokens) {
    i++;

    if (pToken.isReferenceElement()) {
      continue;
    }

    // Check whether token value is consistent with regexp="..."
    warnIfElementNotKosher(
      pToken.getString(),
      pToken.isRegularExpression(),
      pToken.isCaseSensitive(),
      pToken.getNegation(),
      pToken.isInflected(),
      false, // not a POS
      lang, `${ruleId}[${ruleSubId}]`,
      i);

    // Check postag="..." is consistent with postag_regexp="..."
    warnIfElementNotKosher(
      pToken.getPOStag() === null ? '' : pToken.getPOStag(),
      pToken.isPOStagRegularExpression(),
      pToken.isCaseSensitive(),
      pToken.getPOSNegation(),
      false,
      true, // a POS.
      lang, `${ruleId}[${ruleSubId}] (POS tag)`,
      i);

    const exceptionPatternTokens = [];
    if (pToken.getExceptionList().length !== 0) {
      for (const exception of pToken.getExceptionList()) {
        // We now allow scope="next" without skip="..."
        if (exception.hasNextException()) {
          continue;
        }

        // Detect exception that can't possibly be matched.
        if (pToken.getString() !== ''
          && exception.getString() !== ''
          && !pToken.getNegation()
          && !pToken.isInflected()
          && !exception.getNegation()
          && !exception.isInflected()
          && pToken.getSkipNext() === 0
          && pToken.isCaseSensitive() === exception.isCaseSensitive()) {
          if (exception.isRegularExpression()) {
            if (pToken.isRegularExpression()) {
              // Both exception and token are regexp: only check sanity when exception regexp is a simple disjunction
              if (exception.getString().indexOf('|') >= 0) {
                const alt = javaSplit(exception.getString(), '\\|');
                for (const part of alt) {
                  if (exception.getString().indexOf('(') >= 0) {
                    break;
                  }
                  if (javaMatches(part, '[^.*?{}\\[\\]]+')) {
                    if (!javaMatches(part, `(?i)${pToken.getString()}`)) {
                      warn(`The ${lang} rule: `
                        + `${ruleId}[${ruleSubId}]`
                        + ` has exception regexp [${exception.getString()}`
                        + `] which contains disjunction part [${part}`
                        + '] which seems useless since it does not match '
                        + `the regexp of token word [${i}] `
                        + `[${pToken.getString()}`
                        + '], or did you forget skip="..." or scope="previous"?');
                    }
                  }
                }
              }
            } else {
              // It does not make sense to to have a regexp exception with a token which is not a regexp!?
              warn(`The ${lang} rule: `
                + `${ruleId}[${ruleSubId}]`
                + ` has exception regexp [${exception.getString()}`
                + `] in token word [${i}] [${pToken.getString()}`
                + '] which seems useless, or '
                + 'did you forget skip="..." or scope="previous"?');
            }
          } else if (pToken.isRegularExpression()) {
            // An exception that cannot match a token regexp is useless.
            if (!javaMatches(exception.getString(),
              (exception.isCaseSensitive() ? '' : '(?i)') + pToken.getString())) {
              warn(`The ${lang} rule: `
                + `${ruleId}[${ruleSubId}] has exception word [`
                + `${exception.getString()}] which cannot match the `
                + `regexp token [${i}] [${pToken.getString()}`
                + '] so exception seems useless, '
                + 'or did you forget skip="..." or scope="previous"?');
            }
          } else {
            // An exception that cannot match a token string is useless
            warn(`The ${lang} rule: `
              + `${ruleId}[${ruleSubId}] has exception word [`
              + `${exception.getString()}] in token word [${i}`
              + `] [${pToken.getString()}] which seems useless, `
              + 'or did you forget skip="..." or scope="previous"?');
          }
        }

        // Check whether exception value is consistent with regexp="..."
        // Don't check string "." since it is sometimes used as a regexp and sometimes used as non regexp.
        if (exception.getString() !== '.') {
          warnIfElementNotKosher(
            exception.getString(),
            exception.isRegularExpression(),
            exception.isCaseSensitive(),
            exception.getNegation(),
            exception.isInflected(),
            false, // not a POS
            lang,
            `${ruleId}[${ruleSubId}] (exception in token [${i}])`,
            i);
        }
        // Check postag="..." of exception is consistent with postag_regexp="..."
        warnIfElementNotKosher(
          exception.getPOStag() === null ? '' : exception.getPOStag(),
          exception.isPOStagRegularExpression(),
          exception.isCaseSensitive(),
          exception.getPOSNegation(),
          false,
          true, // a POS
          lang,
          `${ruleId}[${ruleSubId}] (exception in POS tag of token [${i}])`,
          i);

        // Search for duplicate exceptions (which are useless).
        for (const otherException of exceptionPatternTokens) {
          if (equalException(exception, otherException)) {
            warn(`The ${lang} rule: `
              + `${ruleId}[${ruleSubId}]`
              + ` in token [${i}]`
              + ' contains duplicate exceptions with'
              + ` string=[${exception.getString()}]`
              + ` POS tag=[${exception.getPOStag()}]`
              + ` negate=[${exception.getNegation()}]`
              + ` POS negate=[${exception.getPOSNegation()}]`);
            break;
          }
        }
        exceptionPatternTokens.push(exception);
      }
    }
  }
}

/**
 * Predicate to check whether two exceptions are identical or whether
 * one exception always implies the other.
 */
// Java: PatternTestTools#equalException(PatternToken,PatternToken)
function equalException(exception1, exception2) {
  let string1 = exception1.getString() === null ? '' : exception1.getString();
  let string2 = exception2.getString() === null ? '' : exception2.getString();
  if (!exception1.isCaseSensitive() || !exception2.isCaseSensitive()) {
    // String comparison is done case insensitive if one or both strings are case insensitive
    string1 = toLowerCase(string1);
    string2 = toLowerCase(string2);
  }
  if (string1 !== '' && string2 !== '') {
    if (string1 !== string2) {
      return false;
    }
  }

  const posTag1 = exception1.getPOStag() === null ? '' : exception1.getPOStag();
  const posTag2 = exception2.getPOStag() === null ? '' : exception2.getPOStag();
  if (posTag1 !== '' && posTag2 !== '') {
    if (posTag1 !== posTag2) {
      return false;
    }
  }

  if ((string1 === '') !== (string2 === '')
    && (posTag1 === '') !== (posTag2 === '')) {
    return false;
  }

  return exception1.getNegation() === exception2.getNegation()
    && exception1.getPOSNegation() === exception2.getPOSNegation()
    && exception1.hasNextException() === exception2.hasNextException()
    && exception1.hasPreviousException() === exception2.hasPreviousException();
}

// Java: PatternTestTools#warnIfElementNotKosher(String,boolean,boolean,boolean,boolean,boolean,Language,String,int)
function warnIfElementNotKosher(stringValue, isRegularExpression, isCaseSensitive, isNegated, isInflected, isPos, lang, ruleId, tokenIndex) {
  if (isRegularExpression && (stringValue.startsWith('|') || stringValue.endsWith('|')) && !stringValue.endsWith('\\|')) {
    fail(`Regex of ${ruleId} starts or ends with '|', which is probably invalid: ${stringValue}`);
  }

  // Check that the string value does not contain token separator.
  if (!isPos && !isRegularExpression && stringValue.length > 1) {
    // Ukrainian dictionary contains some abbreviations with dot
    const tokenSeparatorPattern = lang.getShortCode() === 'uk'
      ? TOKEN_SEPARATOR_PATTERN_NO_DOT
      : TOKEN_SEPARATOR_PATTERN;

    if (tokenSeparatorPattern.matcher(stringValue).find()) {
      warn(`The ${lang} rule: `
        + `${ruleId}, token [${tokenIndex}], contains ` + `"${stringValue}`
        + '" that contains token separators, so can\'t possibly be matched.');
    }
  }

  // Use a different regexp to check for probable regexp in Polish POS tags since Polish uses dot '.' in POS tags.
  const regexPattern = (isPos && lang.getShortCode() === 'pl')
    || (!isPos && lang.getShortCode() === 'uk')
    ? PROBABLE_PATTERN_PL_POS // Polish POS tag or Ukrainian token
    : PROBABLE_PATTERN; // other usual cases

  if (!isRegularExpression && stringValue.length > 1
    && regexPattern.matcher(stringValue).find() && !NO_REGEXP.has(stringValue)) {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], contains ` + `"${stringValue}`
      + '" that is not marked as regular expression but probably is one.');
  }

  if (isRegularExpression && stringValue.length === 0) {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], contains an empty string ` + '"'
      + `${stringValue}" that is marked as regular expression.`);
  } else if (isRegularExpression && stringValue.length > 1
    && !regexPattern.matcher(stringValue).find()) {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], contains ` + `"${stringValue}`
      + '" that is marked as regular expression but probably is not one.');
  }

  if (isNegated && stringValue.length === 0) {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], marked as negated but is `
      + 'empty so the negation is useless. Did you mix up '
      + 'negate="yes" and negate_pos="yes"?');
  }
  if (isInflected && stringValue.length === 0) {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], contains ` + `"${stringValue}`
      + '" that is marked as inflected but is empty, so the attribute is redundant.');
  }
  if (isRegularExpression && stringValue === '.*') {
    warn(`The ${lang} rule: `
      + `${ruleId}, token [${tokenIndex}], marked as regular expression contains `
      + 'regular expression ".*" which is useless: '
      + '(use an empty string without regexp="yes" such as <token/>)');
  }

  if (isRegularExpression) {
    if (UNBOUND_REPEAT.matcher(stringValue).matches()) {
      warn(`${lang}: Please limit repetition in regex, e.g. use '{2,30}' instead of '{2,}': ${stringValue} (${ruleId})`);
    }
    const matcher = CHAR_SET_PATTERN.matcher(stringValue);
    if (matcher.find()) {
      const strictMatcher = STRICT_CHAR_SET_PATTERN.matcher(stringValue); // for performance reasons, only now use the strict pattern
      if (strictMatcher.find()) {
        // Remove things like \p{Punct} which are irrelevant here.
        const s = javaReplaceAll(strictMatcher.group(2), '\\\\p\\{[^}]*\\}', '');
        // case sensitive if pattern contains (?-i).
        if (s.indexOf('|') >= 0) {
          if (!(s.indexOf('|') >= 1 && s.charAt(s.indexOf('|') - 1) === '\\')) { // don't warn if it's escaped
            warn(`The ${lang} rule: `
              + `${ruleId}, token [${tokenIndex}], contains | (pipe) in `
              + `regexp bracket expression [${strictMatcher.group(2)}`
              + '] which is unlikely to be correct.');
          }
        }

        // Arrays.sort(char[]): UTF-16 code unit order
        const sorted = Array.from({ length: s.length }, (_, k) => s.charCodeAt(k)).sort((a, b) => a - b);
        // Sort characters in string, so finding duplicate characters can be done by looking for identical adjacent characters.
        for (let i = 1; i < sorted.length; ++i) {
          const c = sorted[i];
          if ('&\\-|'.indexOf(String.fromCharCode(c)) < 0 && sorted[i - 1] === c) {
            warn(`The ${lang} rule: `
              + `${ruleId}, token [${tokenIndex}], contains `
              + `regexp part [${strictMatcher.group(2)}`
              + `] which contains duplicated char [${String.fromCharCode(c)}].`);
            break;
          }
        }
      }
    }
    if (stringValue.includes('|')) {
      if (stringValue.includes('||')
        || stringValue.charAt(0) === '|'
        || stringValue.charAt(stringValue.length - 1) === '|') {
        // Empty disjunctions in regular expression are most likely not intended.
        warn(`The ${lang} rule: `
          + `${ruleId}, token [${tokenIndex}], contains empty `
          + 'disjunction | within ' + `"${stringValue}".`);
      }
      const groups = javaSplit(stringValue, '[)(]');
      for (const group of groups) {
        const alt = javaSplit(group, '\\|');
        const partSet = new Set();
        const partSetNoCase = new Set();
        let hasSingleChar = false;
        let hasSingleDot = false;

        for (const part of alt) {
          if (part.length === 1) {
            // If all alternatives in disjunction have one char, then a dot . (any char) does not make sense
            if (part === '.') {
              hasSingleDot = true;
            } else {
              hasSingleChar = true;
            }
          }
          const partNoCase = isCaseSensitive ? part : toLowerCase(part);
          if (partSetNoCase.has(partNoCase)) {
            if (partSet.has(part)) {
              // Duplicate disjunction parts "foo|foo".
              warn(`The ${lang} rule: `
                + `${ruleId}, token [${tokenIndex}], contains `
                + 'duplicated disjunction part ('
                + `${part}) within ` + `"${stringValue}".`);
            } else if (!(part === 'K' && ruleId.startsWith('AI_NL_HYDRA_LEO_MISSING_COMMA'))) {
              // Duplicate disjunction parts "Foo|foo" since element ignores case.
              warn(`The ${lang} rule: `
                + `${ruleId}, token [${tokenIndex}], contains duplicated `
                + 'non case sensitive disjunction part ('
                + `${part}) within ` + `"${stringValue}". Did you `
                + 'forget case_sensitive="yes"?');
            }
          }
          partSetNoCase.add(partNoCase);
          partSet.add(part);
        }
        if (hasSingleDot && hasSingleChar) {
          // This finds errors like this <token regexp="yes">.|;|:</token>
          warn(`The ${lang} rule: `
            + `${ruleId}, token [${tokenIndex}], contains a single dot (matching any char) `
            + 'so other single char disjunctions are useless within ' + `"${stringValue}`
            + '". Did you forget forget a backslash before the dot?');
        }
      }
    }
  }
}

// Java: PatternTestTools#warn(String)
function warn(s) {
  console.error(`*** WARNING: ${s}`);
}
