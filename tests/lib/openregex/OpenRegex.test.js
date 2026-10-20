// Extra tests for src/lib/openregex (no Java tests exist for openregex 1.1.1): expected values recorded from the pinned openregex-1.1.1.jar (JDK 17 probe, word/stringMatch demo parsers)
import { describe, it, expect } from 'vitest';
import { RegularExpressionParsers } from '../../../src/lib/openregex/regex/RegularExpressionParsers.js';
import { LogicExpressionParsers } from '../../../src/lib/openregex/logic/LogicExpressionParsers.js';

// [pattern, tokens, expected summary of toString/find/matches/findAll]
const REGEX_CASES = [
  ["^ ((?:(<a>|<a>))*|(<b>*|(<b>|<b>)))* (<b>*|<b>) <a>* $", "c b a a c a a", "^ (((<b> | <b>) | <b>*) | (?:(<a> | <a>))*)* (<b> | <b>*) <a>* $ | find=null | matches=false | all="],
  ["^ (<a>*|((?:<a>)*|<b>*))* $", "b a b", "^ ((<b> | (?:<a>)**) | <a>*)* $ | find=0-3[(^ ((<b> | (?:<a>)**) | <a>*)* $):'b a b', ((<b> | (?:<a>)**) | <a>*)*:'b a b', ((<b> | (?:<a>)**) | <a>*):'b a b', (<b> | (?:<a>)**) | <a>*:'b a b', (<b> | (?:<a>)**):'b a b', <b> | (?:<a>)**:'b a b', <b> | (?:<a>)*:'b', <b>:'b', <b> | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', <b> | (?:<a>)*:'b', <b>:'b'] | matches=true | all=0-3[(^ ((<b> | (?:<a>)**) | <a>*)* $):'b a b', ((<b> | (?:<a>)**) | <a>*)*:'b a b', ((<b> | (?:<a>)**) | <a>*):'b a b', (<b> | (?:<a>)**) | <a>*:'b a b', (<b> | (?:<a>)**):'b a b', <b> | (?:<a>)**:'b a b', <b> | (?:<a>)*:'b', <b>:'b', <b> | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', <b> | (?:<a>)*:'b', <b>:'b'][(^ ((<b> | (?:<a>)**) | <a>*)* $):'b a b', ((<b> | (?:<a>)**) | <a>*):'b a b', (<b> | (?:<a>)**):'b a b'][b, a, b];"],
  ["^ <a> $", "c b", "^ <a> $ | find=null | matches=false | all="],
  ["^ ((<a>|<a>)|<c>*) $", "a c c b b a", "^ (<c> | (<a> | <a>)*) $ | find=null | matches=false | all="],
  ["^ <b> $", "c c a a", "^ <b> $ | find=null | matches=false | all="],
  ["^ (?:<c>)* $", "a b a b a c", "^ (?:<c>)* $ | find=null | matches=false | all="],
  ["^ <c> $", "b b b a", "^ <c> $ | find=null | matches=false | all="],
  ["^ (<a>|<a>)* $", "b b b a a b b b", "^ (<a> | <a>)* $ | find=null | matches=false | all="],
  ["^ <c> $", "", "^ <c> $ | find=null | matches=false | all="],
  ["^ (((<b>*|<c>)|(<b>|<c>))*|<c>) $", "", "^ (<c> | ((<c> | <b>) | (<c> | <b>*))*) $ | find=null | matches=false | all="],
  ["^ <b> $", "c a b a c b c", "^ <b> $ | find=null | matches=false | all="],
  ["^ <a>* $", "c b b", "^ <a>* $ | find=null | matches=false | all="],
  ["^ <b> $", "b c a b", "^ <b> $ | find=null | matches=false | all="],
  ["^ (?:(?:(?:<a>*)*)) $", "b c a b a b", "^ (?:(?:(?:<a>*)*)) $ | find=null | matches=false | all="],
  ["^ (<b>*|<b>*) $", "c", "^ (<b> | <b>**) $ | find=null | matches=false | all="],
  ["^ <a> $", "b c c c b a c", "^ <a> $ | find=null | matches=false | all="],
  ["^ <b>* $", "c a b", "^ <b>* $ | find=null | matches=false | all="],
  ["^ <b> $", "c a a", "^ <b> $ | find=null | matches=false | all="],
  ["^ ((?:(?:<a>)*)|(?:<b>))* $", "b a", "^ ((?:<b>) | (?:(?:<a>)*))* $ | find=0-2[(^ ((?:<b>) | (?:(?:<a>)*))* $):'b a', ((?:<b>) | (?:(?:<a>)*))*:'b a', ((?:<b>) | (?:(?:<a>)*)):'b', (?:<b>) | (?:(?:<a>)*):'b', (?:<b>):'b', <b>:'b', ((?:<b>) | (?:(?:<a>)*)):'a', (?:<b>) | (?:(?:<a>)*):'a', (?:(?:<a>)*):'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a'] | matches=true | all=0-2[(^ ((?:<b>) | (?:(?:<a>)*))* $):'b a', ((?:<b>) | (?:(?:<a>)*))*:'b a', ((?:<b>) | (?:(?:<a>)*)):'b', (?:<b>) | (?:(?:<a>)*):'b', (?:<b>):'b', <b>:'b', ((?:<b>) | (?:(?:<a>)*)):'a', (?:<b>) | (?:(?:<a>)*):'a', (?:(?:<a>)*):'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a'][(^ ((?:<b>) | (?:(?:<a>)*))* $):'b a', ((?:<b>) | (?:(?:<a>)*)):'b', ((?:<b>) | (?:(?:<a>)*)):'a'][b, a];"],
  ["^ (?:<b>*)* $", "c a b b", "^ (?:<b>*)* $ | find=null | matches=false | all="],
  ["^ <b>* $", "a b a b b", "^ <b>* $ | find=null | matches=false | all="],
  ["^ <c> $", "a", "^ <c> $ | find=null | matches=false | all="],
  ["^ <b>* $", "c a a c b a", "^ <b>* $ | find=null | matches=false | all="],
  ["^ <a> $", "c", "^ <a> $ | find=null | matches=false | all="],
  ["^ (((<b>*|<c>)|(<c>|<c>*)*)|(?:(?:<b>)))* $", "a c a a a c a", "^ ((?:(?:<b>)) | ((<c> | <c>*) | (<c> | <b>*)*))* $ | find=null | matches=false | all="],
  ["^ <b> $", "a", "^ <b> $ | find=null | matches=false | all="],
  ["^ (?:<a>) $", "c c a c b", "^ (?:<a>) $ | find=null | matches=false | all="],
  ["^ <c> $", "b c c a c b c", "^ <c> $ | find=null | matches=false | all="],
  ["^ <a> $", "b a c a b b a", "^ <a> $ | find=null | matches=false | all="],
  ["^ (<b>|<b>) $", "", "^ (<b> | <b>) $ | find=null | matches=false | all="],
  ["^ <b> $", "b b a c c c c", "^ <b> $ | find=null | matches=false | all="],
  ["^ <c> $", "b", "^ <c> $ | find=null | matches=false | all="],
  ["^ ((<b>*|<b>*)|(?:<a>*)) $", "b b c a", "^ ((?:<a>*) | (<b> | <b>**)) $ | find=null | matches=false | all="],
  ["^ <a> $", "a b c b a c", "^ <a> $ | find=null | matches=false | all="],
  ["^ <a>* $", "b c", "^ <a>* $ | find=null | matches=false | all="],
  ["^ <b>* $", "a c a b", "^ <b>* $ | find=null | matches=false | all="],
  ["^ (<c>*|(<c>*|(<a>|<b>)))* $", "a", "^ (((<b> | <a>) | <c>*) | <c>*)* $ | find=0-1[(^ (((<b> | <a>) | <c>*) | <c>*)* $):'a', (((<b> | <a>) | <c>*) | <c>*)*:'a', (((<b> | <a>) | <c>*) | <c>*):'a', ((<b> | <a>) | <c>*) | <c>*:'a', ((<b> | <a>) | <c>*):'a', (<b> | <a>) | <c>*:'a', (<b> | <a>):'a', <b> | <a>:'a', <a>:'a'] | matches=true | all=0-1[(^ (((<b> | <a>) | <c>*) | <c>*)* $):'a', (((<b> | <a>) | <c>*) | <c>*)*:'a', (((<b> | <a>) | <c>*) | <c>*):'a', ((<b> | <a>) | <c>*) | <c>*:'a', ((<b> | <a>) | <c>*):'a', (<b> | <a>) | <c>*:'a', (<b> | <a>):'a', <b> | <a>:'a', <a>:'a'][(^ (((<b> | <a>) | <c>*) | <c>*)* $):'a', (((<b> | <a>) | <c>*) | <c>*):'a', ((<b> | <a>) | <c>*):'a', (<b> | <a>):'a'][a];"],
  ["^ (<c>|<b>) $", "c c b", "^ (<b> | <c>) $ | find=null | matches=false | all="],
  ["^ <c>* $", "a", "^ <c>* $ | find=null | matches=false | all="],
  ["^ <b> $", "a a c c a", "^ <b> $ | find=null | matches=false | all="],
  ["^ <c> $", "a c c", "^ <c> $ | find=null | matches=false | all="],
  ["^ ((?:(?:<a>))|(<c>*|<b>*)) $", "c", "^ ((<b> | <c>**) | (?:(?:<a>))) $ | find=0-1[(^ ((<b> | <c>**) | (?:(?:<a>))) $):'c', ((<b> | <c>**) | (?:(?:<a>))):'c', (<b> | <c>**) | (?:(?:<a>)):'c', (<b> | <c>**):'c', <b> | <c>**:'c', <b> | <c>*:'c', <c>*:'c', <c>:'c'] | matches=true | all=0-1[(^ ((<b> | <c>**) | (?:(?:<a>))) $):'c', ((<b> | <c>**) | (?:(?:<a>))):'c', (<b> | <c>**) | (?:(?:<a>)):'c', (<b> | <c>**):'c', <b> | <c>**:'c', <b> | <c>*:'c', <c>*:'c', <c>:'c'][(^ ((<b> | <c>**) | (?:(?:<a>))) $):'c', ((<b> | <c>**) | (?:(?:<a>))):'c', (<b> | <c>**):'c'][c];"],
  ["^ <b>* $", "b c a a c c c", "^ <b>* $ | find=null | matches=false | all="],
  ["^ <b>* $", "b c c c a a", "^ <b>* $ | find=null | matches=false | all="],
  ["^ <a>* $", "b c", "^ <a>* $ | find=null | matches=false | all="],
  ["^ <a>* $", "b a b b", "^ <a>* $ | find=null | matches=false | all="],
  ["^ ((?:(?:<a>*))|<b>)* $", "b a a a b", "^ (<b> | (?:(?:<a>*)))* $ | find=0-5[(^ (<b> | (?:(?:<a>*)))* $):'b a a a b', (<b> | (?:(?:<a>*)))*:'b a a a b', (<b> | (?:(?:<a>*))):'b', <b> | (?:(?:<a>*)):'b', <b>:'b', (<b> | (?:(?:<a>*))):'a a a', <b> | (?:(?:<a>*)):'a a a', (?:(?:<a>*)):'a a a', (?:<a>*):'a a a', <a>*:'a a a', <a>:'a', <a>:'a', <a>:'a', (<b> | (?:(?:<a>*))):'b', <b> | (?:(?:<a>*)):'b', <b>:'b'] | matches=true | all=0-5[(^ (<b> | (?:(?:<a>*)))* $):'b a a a b', (<b> | (?:(?:<a>*)))*:'b a a a b', (<b> | (?:(?:<a>*))):'b', <b> | (?:(?:<a>*)):'b', <b>:'b', (<b> | (?:(?:<a>*))):'a a a', <b> | (?:(?:<a>*)):'a a a', (?:(?:<a>*)):'a a a', (?:<a>*):'a a a', <a>*:'a a a', <a>:'a', <a>:'a', <a>:'a', (<b> | (?:(?:<a>*))):'b', <b> | (?:(?:<a>*)):'b', <b>:'b'][(^ (<b> | (?:(?:<a>*)))* $):'b a a a b', (<b> | (?:(?:<a>*))):'b', (<b> | (?:(?:<a>*))):'a a a', (<b> | (?:(?:<a>*))):'b'][b, a, a, a, b];"],
  ["^ (<c>*|(?:<a>)*) $", "c a b c c", "^ ((?:<a>) | <c>**) $ | find=null | matches=false | all="],
  ["^ <c>* $", "a b", "^ <c>* $ | find=null | matches=false | all="],
  ["^ <c> $", "c c", "^ <c> $ | find=null | matches=false | all="],
  ["^ ((<b>|<b>*)*|(?:(?:<a>)*)*) $", "a b c c a c a", "^ ((?:(?:<a>)*) | (<b> | <b>*)**) $ | find=null | matches=false | all="],
  ["^ ((?:<a>)*|(<c>*|(<b>*|<b>*)*)*)* $", "a b c c a c", "^ (((<b> | <b>**) | <c>**) | (?:<a>)**)* $ | find=0-6[(^ (((<b> | <b>**) | <c>**) | (?:<a>)**)* $):'a b c c a c', (((<b> | <b>**) | <c>**) | (?:<a>)**)*:'a b c c a c', (((<b> | <b>**) | <c>**) | (?:<a>)**):'a b c c a c', ((<b> | <b>**) | <c>**) | (?:<a>)**:'a b c c a c', ((<b> | <b>**) | <c>**) | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', ((<b> | <b>**) | <c>**) | (?:<a>)*:'b c c', ((<b> | <b>**) | <c>**):'b c c', (<b> | <b>**) | <c>**:'b c c', (<b> | <b>**) | <c>*:'b', (<b> | <b>**):'b', <b> | <b>**:'b', <b> | <b>*:'b', <b>:'b', (<b> | <b>**) | <c>*:'c c', <c>*:'c c', <c>:'c', <c>:'c', ((<b> | <b>**) | <c>**) | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', ((<b> | <b>**) | <c>**) | (?:<a>)*:'c', ((<b> | <b>**) | <c>**):'c', (<b> | <b>**) | <c>**:'c', (<b> | <b>**) | <c>*:'c', <c>*:'c', <c>:'c'] | matches=true | all=0-6[(^ (((<b> | <b>**) | <c>**) | (?:<a>)**)* $):'a b c c a c', (((<b> | <b>**) | <c>**) | (?:<a>)**)*:'a b c c a c', (((<b> | <b>**) | <c>**) | (?:<a>)**):'a b c c a c', ((<b> | <b>**) | <c>**) | (?:<a>)**:'a b c c a c', ((<b> | <b>**) | <c>**) | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', ((<b> | <b>**) | <c>**) | (?:<a>)*:'b c c', ((<b> | <b>**) | <c>**):'b c c', (<b> | <b>**) | <c>**:'b c c', (<b> | <b>**) | <c>*:'b', (<b> | <b>**):'b', <b> | <b>**:'b', <b> | <b>*:'b', <b>:'b', (<b> | <b>**) | <c>*:'c c', <c>*:'c c', <c>:'c', <c>:'c', ((<b> | <b>**) | <c>**) | (?:<a>)*:'a', (?:<a>)*:'a', (?:<a>):'a', <a>:'a', ((<b> | <b>**) | <c>**) | (?:<a>)*:'c', ((<b> | <b>**) | <c>**):'c', (<b> | <b>**) | <c>**:'c', (<b> | <b>**) | <c>*:'c', <c>*:'c', <c>:'c'][(^ (((<b> | <b>**) | <c>**) | (?:<a>)**)* $):'a b c c a c', (((<b> | <b>**) | <c>**) | (?:<a>)**):'a b c c a c', ((<b> | <b>**) | <c>**):'b c c', (<b> | <b>**):'b', ((<b> | <b>**) | <c>**):'c'][a, b, c, c, a, c];"],
  ["^ <b>* $", "c", "^ <b>* $ | find=null | matches=false | all="],
  ["^ ((?:<b>)|<a>) $", "c b b", "^ (<a> | (?:<b>)) $ | find=null | matches=false | all="],
  ["^ <c> $", "c a", "^ <c> $ | find=null | matches=false | all="],
  ["^ <a> $", "c a c b a a", "^ <a> $ | find=null | matches=false | all="],
  ["^ <a> $", "c a b", "^ <a> $ | find=null | matches=false | all="],
  ["^ <a> $", "a a b c", "^ <a> $ | find=null | matches=false | all="],
  ["^ (?:<c>*) $", "c b b b", "^ (?:<c>*) $ | find=null | matches=false | all="],
  ["^ (<a>|<b>) $", "a c b a c a", "^ (<b> | <a>) $ | find=null | matches=false | all="],
  ["(<a>", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unclosed parenthesis: 0:\"(<a>)\""],
  ["(<a>", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unclosed parenthesis: 0:\"(<a>)\""],
  ["(<a>", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unclosed parenthesis: 0:\"(<a>)\""],
  ["<a", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<a\""],
  ["<a", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<a\""],
  ["<a", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<a\""],
  ["*", "", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["*", "a b c", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["*", "b c a b", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["<a> |", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
  ["<a> |", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
  ["<a> |", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
  ["| <a>", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: error parsing OR (|) operator. / java.lang.IllegalStateException: OR operator is applied to fewer than 2 elements."],
  ["| <a>", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: error parsing OR (|) operator. / java.lang.IllegalStateException: OR operator is applied to fewer than 2 elements."],
  ["| <a>", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: error parsing OR (|) operator. / java.lang.IllegalStateException: OR operator is applied to fewer than 2 elements."],
  ["<a>{3,1}", "", "ERR java.lang.IllegalArgumentException: minOccurrences must be <= maxOccurrences: 3 > 1"],
  ["<a>{3,1}", "a b c", "ERR java.lang.IllegalArgumentException: minOccurrences must be <= maxOccurrences: 3 > 1"],
  ["<a>{3,1}", "b c a b", "ERR java.lang.IllegalArgumentException: minOccurrences must be <= maxOccurrences: 3 > 1"],
  ["<a>{0,0}", "", "ERR java.lang.IllegalArgumentException: minOccurrences must be >= 0 and maxOccurrences must be >= 1: 0, 0"],
  ["<a>{0,0}", "a b c", "ERR java.lang.IllegalArgumentException: minOccurrences must be >= 0 and maxOccurrences must be >= 1: 0, 0"],
  ["<a>{0,0}", "b c a b", "ERR java.lang.IllegalArgumentException: minOccurrences must be >= 0 and maxOccurrences must be >= 1: 0, 0"],
  ["?", "", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["?", "a b c", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["?", "b c a b", "ERR java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 0"],
  ["x", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unknown symbol: x"],
  ["x", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unknown symbol: x"],
  ["x", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: unknown symbol: x"],
  ["", "", " | find=null | matches=false | all="],
  ["", "a b c", " | find=null | matches=false | all="],
  ["", "b c a b", " | find=null | matches=false | all="],
  ["[a] [b]*", "", "<a> <b>* | find=null | matches=false | all="],
  ["[a] [b]*", "a b c", "<a> <b>* | find=0-2[(<a> <b>*):'a b', <a>:'a', <b>*:'b', <b>:'b'] | matches=false | all=0-2[(<a> <b>*):'a b', <a>:'a', <b>*:'b', <b>:'b'][(<a> <b>*):'a b'][a, b];"],
  ["[a] [b]*", "b c a b", "<a> <b>* | find=2-4[(<a> <b>*):'a b', <a>:'a', <b>*:'b', <b>:'b'] | matches=false | all=2-4[(<a> <b>*):'a b', <a>:'a', <b>*:'b', <b>:'b'][(<a> <b>*):'a b'][a, b];"],
  ["<a>{2,2}", "", "<a>{2,2} | find=null | matches=false | all="],
  ["<a>{2,2}", "a b c", "<a>{2,2} | find=null | matches=false | all="],
  ["<a>{2,2}", "b c a b", "<a>{2,2} | find=null | matches=false | all="],
  ["<a> | <b> | <c>", "", "<c> | <b> | <a> | find=null | matches=false | all="],
  ["<a> | <b> | <c>", "a b c", "<c> | <b> | <a> | find=0-1[(<c> | <b> | <a>):'a', <c> | <b> | <a>:'a', <b> | <a>:'a', <a>:'a'] | matches=false | all=0-1[(<c> | <b> | <a>):'a', <c> | <b> | <a>:'a', <b> | <a>:'a', <a>:'a'][(<c> | <b> | <a>):'a'][a];1-2[(<c> | <b> | <a>):'b', <c> | <b> | <a>:'b', <b> | <a>:'b', <b>:'b'][(<c> | <b> | <a>):'b'][b];2-3[(<c> | <b> | <a>):'c', <c> | <b> | <a>:'c', <c>:'c'][(<c> | <b> | <a>):'c'][c];"],
  ["<a> | <b> | <c>", "b c a b", "<c> | <b> | <a> | find=0-1[(<c> | <b> | <a>):'b', <c> | <b> | <a>:'b', <b> | <a>:'b', <b>:'b'] | matches=false | all=0-1[(<c> | <b> | <a>):'b', <c> | <b> | <a>:'b', <b> | <a>:'b', <b>:'b'][(<c> | <b> | <a>):'b'][b];1-2[(<c> | <b> | <a>):'c', <c> | <b> | <a>:'c', <c>:'c'][(<c> | <b> | <a>):'c'][c];2-3[(<c> | <b> | <a>):'a', <c> | <b> | <a>:'a', <b> | <a>:'a', <a>:'a'][(<c> | <b> | <a>):'a'][a];3-4[(<c> | <b> | <a>):'b', <c> | <b> | <a>:'b', <b> | <a>:'b', <b>:'b'][(<c> | <b> | <a>):'b'][b];"],
  ["(?:<a>|<b>)+ <c>", "", "(?:<b> | <a>)+ <c> | find=null | matches=false | all="],
  ["(?:<a>|<b>)+ <c>", "a b c", "(?:<b> | <a>)+ <c> | find=0-3[((?:<b> | <a>)+ <c>):'a b c', (?:<b> | <a>)+:'a b', (?:<b> | <a>):'a', <b> | <a>:'a', <a>:'a', (?:<b> | <a>):'b', <b> | <a>:'b', <b>:'b', <c>:'c'] | matches=true | all=0-3[((?:<b> | <a>)+ <c>):'a b c', (?:<b> | <a>)+:'a b', (?:<b> | <a>):'a', <b> | <a>:'a', <a>:'a', (?:<b> | <a>):'b', <b> | <a>:'b', <b>:'b', <c>:'c'][((?:<b> | <a>)+ <c>):'a b c'][a, b, c];"],
  ["(?:<a>|<b>)+ <c>", "b c a b", "(?:<b> | <a>)+ <c> | find=0-2[((?:<b> | <a>)+ <c>):'b c', (?:<b> | <a>)+:'b', (?:<b> | <a>):'b', <b> | <a>:'b', <b>:'b', <c>:'c'] | matches=false | all=0-2[((?:<b> | <a>)+ <c>):'b c', (?:<b> | <a>)+:'b', (?:<b> | <a>):'b', <b> | <a>:'b', <b>:'b', <c>:'c'][((?:<b> | <a>)+ <c>):'b c'][b, c];"],
  ["(<n>:<a>+) <b>", "", "(<n>:<a>+) <b> | find=null | matches=false | all="],
  ["(<n>:<a>+) <b>", "a b c", "(<n>:<a>+) <b> | find=0-2[((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a', <a>+:'a', <a>:'a', <b>:'b'] | matches=false | all=0-2[((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a', <a>+:'a', <a>:'a', <b>:'b'][((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a'][a, b];"],
  ["(<n>:<a>+) <b>", "b c a b", "(<n>:<a>+) <b> | find=2-4[((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a', <a>+:'a', <a>:'a', <b>:'b'] | matches=false | all=2-4[((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a', <a>+:'a', <a>:'a', <b>:'b'][((<n>:<a>+) <b>):'a b', (<n>:<a>+):'a'][a, b];"],
  ["(<n:<a>+)", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<n:<a>+\""],
  ["(<n:<a>+)", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<n:<a>+\""],
  ["(<n:<a>+)", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: bad token. Non-matching brackets (<> or []): 0:\"<n:<a>+\""],
  ["<a>{1,2}{1,2}", "", "<a>{1,2}{1,2} | find=null | matches=false | all="],
  ["<a>{1,2}{1,2}", "a b c", "<a>{1,2}{1,2} | find=0-1[(<a>{1,2}{1,2}):'a', <a>{1,2}{1,2}:'a', <a>{1,2}:'a', <a>:'a'] | matches=false | all=0-1[(<a>{1,2}{1,2}):'a', <a>{1,2}{1,2}:'a', <a>{1,2}:'a', <a>:'a'][(<a>{1,2}{1,2}):'a'][a];"],
  ["<a>{1,2}{1,2}", "b c a b", "<a>{1,2}{1,2} | find=2-3[(<a>{1,2}{1,2}):'a', <a>{1,2}{1,2}:'a', <a>{1,2}:'a', <a>:'a'] | matches=false | all=2-3[(<a>{1,2}{1,2}):'a', <a>{1,2}{1,2}:'a', <a>{1,2}:'a', <a>:'a'][(<a>{1,2}{1,2}):'a'][a];"],
  ["^ $", "", "^ $ | find=null | matches=false | all="],
  ["^ $", "a b c", "^ $ | find=null | matches=false | all="],
  ["^ $", "b c a b", "^ $ | find=null | matches=false | all="],
  ["<a>* $", "", "<a>* $ | find=null | matches=false | all="],
  ["<a>* $", "a b c", "<a>* $ | find=null | matches=false | all="],
  ["<a>* $", "b c a b", "<a>* $ | find=null | matches=false | all="],
  ["^ <a>*", "", "^ <a>* | find=null | matches=false | all="],
  ["^ <a>*", "a b c", "^ <a>* | find=0-1[(^ <a>*):'a', <a>*:'a', <a>:'a'] | matches=false | all=0-1[(^ <a>*):'a', <a>*:'a', <a>:'a'][(^ <a>*):'a'][a];"],
  ["^ <a>*", "b c a b", "^ <a>* | find=null | matches=false | all="],
  ["<a>+*", "", "<a>+* | find=null | matches=false | all="],
  ["<a>+*", "a b c", "<a>+* | find=0-1[(<a>+*):'a', <a>+*:'a', <a>+:'a', <a>:'a'] | matches=false | all=0-1[(<a>+*):'a', <a>+*:'a', <a>+:'a', <a>:'a'][(<a>+*):'a'][a];"],
  ["<a>+*", "b c a b", "<a>+* | find=2-3[(<a>+*):'a', <a>+*:'a', <a>+:'a', <a>:'a'] | matches=false | all=2-3[(<a>+*):'a', <a>+*:'a', <a>+:'a', <a>:'a'][(<a>+*):'a'][a];"],
  ["<a> ( | ) <b>", "", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
  ["<a> ( | ) <b>", "a b c", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
  ["<a> ( | ) <b>", "b c a b", "ERR edu.washington.cs.knowitall.regex.RegexException$TokenizationRegexException: OR remains on the stack."],
];

// [expression, expected summary of toString/apply/getArgs]
const LOGIC_CASES = [
  ["\"a\" | \"a\"", "(\"a\" | \"a\") | 1 0 0 0 0 0 | [\"a\", \"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["\"a\"", "\"a\" | 1 0 0 0 0 0 | [\"a\"]"],
  ["", "(empty) | 1 1 1 1 1 1 | []"],
  [" ", "(empty) | 1 1 1 1 1 1 | []"],
  ["!", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: No argument for operator (stack empty): !"],
  ["&", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: No argument for operator (stack empty): &"],
  ["\"a\" &", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: No argument for operator (stack empty): &"],
  ["& \"a\"", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: No argument for operator (stack empty): &"],
  ["\"a\" \"b\"", "\"a\" \"b\" | 0 0 0 0 0 0 | [\"a\" \"b\"]"],
  ["(", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: Unbalanced parentheses."],
  [")", "ERR java.util.EmptyStackException: null"],
  ["\"a\")", "ERR java.util.EmptyStackException: null"],
  ["((\"a\")", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: Unbalanced parentheses."],
  ["!!\"a\"", "!(!(\"a\")) | 1 0 0 0 0 0 | []"],
  ["\"a\"&\"b\"|\"c\"", "((\"a\" & \"b\") | \"c\") | 0 0 1 0 0 0 | [\"a\", \"b\", \"c\"]"],
  ["abc", "abc | 0 1 0 0 0 0 | [abc]"],
  ["/re/", "/re/ | 0 0 0 0 0 0 | [/re/]"],
  ["\"unterminated", "\"unterminated | 0 0 0 0 0 0 | [\"unterminated]"],
  ["\"a\" | | \"b\"", "ERR edu.washington.cs.knowitall.logic.LogicException$CompileLogicException: No argument for operator (stack empty): |"],
];

const L = (a) => '[' + a.map(String).join(', ') + ']';

describe('openregex RegularExpression', () => {
  it('matches the recorded Java results', () => {
    for (const [pattern, tokenString, expected] of REGEX_CASES) {
      let sb = '';
      try {
        const re = RegularExpressionParsers.word.parse(pattern);
        sb += re.toString();
        const toks = tokenString === '' ? [] : tokenString.split(' ');
        sb += ' | find=';
        const f = re.find(toks);
        sb += f === null ? 'null' : f.startIndex() + '-' + f.endIndex() + f.toString();
        sb += ' | matches=' + re.matches(toks);
        sb += ' | all=';
        for (const m of re.findAll(toks)) sb += m.startIndex() + '-' + m.endIndex() + m.toString() + L(m.groups()) + L(m.tokens()) + ';';
      } catch (t) {
        sb += 'ERR ' + t.javaClass + ': ' + t.message;
        if (t.getCause()) sb += ' / ' + t.getCause().javaClass + ': ' + t.getCause().message;
      }
      expect(sb, pattern + ' on ' + tokenString).toBe(expected);
    }
  });
});

describe('openregex LogicExpression', () => {
  it('matches the recorded Java results', () => {
    for (const [expression, expected] of LOGIC_CASES) {
      let sb = '';
      try {
        const e = LogicExpressionParsers.stringMatch.parse(expression);
        sb += e.toString() + ' |';
        for (const s of ['a', 'b', 'c', 'd', 'a b', 'x&y']) sb += e.apply(s) ? ' 1' : ' 0';
        sb += ' | ' + L(e.getArgs());
      } catch (t) {
        sb += 'ERR ' + t.javaClass + ': ' + t.message;
        if (t.getCause()) sb += ' / ' + t.getCause().javaClass + ': ' + t.getCause().message;
      }
      expect(sb, expression).toBe(expected);
    }
  });
});
