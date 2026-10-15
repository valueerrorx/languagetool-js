// Java: org.languagetool.tokenizers.en.EnglishWordTokenizer
import { Pattern } from '../../../lib/java/regex/index.js';
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { equalsIgnoreCase } from '../../../lib/java/strings.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { WordTokenizer } from '../../../core/text/tokenizers/WordTokenizer.js';
import '../tagging/EnglishTagger.js';

const wordCharacters = '±§©@€£¥\\$\\p{L}\\d\\-̀-ͯ¨°%‰‱&�­¬，？';
const tokenizerPattern = Pattern.compile(`[${wordCharacters}]+|[^${wordCharacters}]`);
const SINGLE_QUOTE = Pattern.compile("'");
const CURLY_QUOTE = Pattern.compile('’');
const patternList = [
  Pattern.compile("^(fo['’]c['’]sle|rec['’][ds]|OK['’]d|cc['’][ds]|DJ['’][d]|[pd]m['’]d|rsvp['’]d)$", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE),
  Pattern.compile(
    "^(['’]?)(are|is|were|was|do|does|did|have|has|had|wo|would|ca|could|sha|should|must|ai|ought|might|need|may|am|dare|das|dass|hai|used|use)(n['’]t)$",
    Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE),
  Pattern.compile("^(.+)(['’]m|['’]re|['’]ll|['’]ve|['’]d|['’]s)(['’-]?)$", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE),
  Pattern.compile("^(['’]t)(was|were|is)$", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE),
];

// Java: EnglishWordTokenizer
export class EnglishWordTokenizer extends WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.en.EnglishWordTokenizer';

  // Java: EnglishWordTokenizer#enTokenizingChars (field initializer)
  enTokenizingChars = `${super.getTokenizingCharacters()}_`; // underscore

  // Java: EnglishWordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    let auxText = text;
    auxText = SINGLE_QUOTE.matcher(auxText).replaceAll('xxAPOSTYPEWxx');
    auxText = CURLY_QUOTE.matcher(auxText).replaceAll('xxAPOSTYPOGxx');

    const tokenizerMatcher = tokenizerPattern.matcher(auxText);
    while (tokenizerMatcher.find()) {
      let s = tokenizerMatcher.group();
      if (l.length > 0 && s.length === 1 && s.codePointAt(0) >= 0xFE00 && s.codePointAt(0) <= 0xFE0F) {
        l[l.length - 1] = l[l.length - 1] + s;
        continue;
      }
      s = s.replaceAll('xxAPOSTYPEWxx', "'");
      s = s.replaceAll('xxAPOSTYPOGxx', '’');
      let matchFound = false;
      let matcher = null;
      if (s.includes("'") || s.includes('’')) {
        for (const pattern of patternList) {
          matcher = pattern.matcher(s);
          matchFound = matcher.find();
          if (matchFound) {
            break;
          }
        }
      }
      if (matchFound) {
        for (let i = 1; i <= matcher.groupCount(); i++) {
          const groupStr = matcher.group(i);
          l.push(...this.wordsToAdd(groupStr));
        }
      } else {
        l.push(...this.wordsToAdd(s));
      }
    }
    return this.joinEMailsAndUrls(l);
  }

  // Java: EnglishWordTokenizer#wordsToAdd(String)
  wordsToAdd(s) {
    const l = [];
    let hyphensAtEnd = 0;
    if (s === null) throw new NullPointerException('Cannot invoke "String.isEmpty()" because "s" is null');
    if (s.length !== 0) {
      while (s.startsWith('-')) {
        l.push('-');
        s = s.substring(1);
      }
      while (s.endsWith('-')) {
        s = s.substring(0, s.length - 1);
        hyphensAtEnd++;
      }
      if (s.length !== 0) {
        if (!s.includes('-') && !s.includes("'") && !s.includes('’')) {
          l.push(s);
        } else {
          let normalized = s.replaceAll('­', '');
          normalized = normalized.replaceAll('’', "'");
          if (sharedComponent('org.languagetool.tagging.en.EnglishTagger').tag([normalized])[0].isTagged()) {
            l.push(s);
          } else if (equalsIgnoreCase(s, 'mers-cov') || equalsIgnoreCase(s, 'mcgraw-hill')
              || equalsIgnoreCase(s, 'sars-cov-2') || equalsIgnoreCase(s, 'sars-cov') || equalsIgnoreCase(s, 'ph-metre')
              || equalsIgnoreCase(s, 'ph-metres') || equalsIgnoreCase(s, 'anti-ivg') || equalsIgnoreCase(s, 'anti-uv')
              || equalsIgnoreCase(s, 'anti-vih') || equalsIgnoreCase(s, 'al-qaida')) {
            l.push(s);
          } else {
            const st2 = new StringTokenizer(s, "’'", true);
            while (st2.hasMoreElements()) {
              l.push(st2.nextToken());
            }
          }
        }
      }
    }
    while (hyphensAtEnd > 0) {
      l.push('-');
      hyphensAtEnd--;
    }
    return l;
  }
}

registerComponent(EnglishWordTokenizer.FQCN, () => new EnglishWordTokenizer());
