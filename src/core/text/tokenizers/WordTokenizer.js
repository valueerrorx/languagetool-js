// Java: org.languagetool.tokenizers.WordTokenizer
import { IMPLEMENTS } from '../../../lib/java/interfaces.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { StringTokenizer } from '../../../lib/java/StringTokenizer.js';
import { NullPointerException } from '../../../lib/java/errors.js';
import { javaReplace } from '../../../lib/java/strings.js';
import { registerComponent } from '../../language/components.js';
import { CHARS_NOT_FOR_SPELLING, isWhitespace } from '../StringTools.js';
import { Tokenizer } from './Tokenizer.js';

const PROTOCOLS = Object.freeze(['http', 'https', 'ws', 'wss', 'ftp', 'ftps', 'sftp', 'file', 'mailto', 'tel', 'sms', 'git', 'ssh', 'data', 'magnet', 'smb', 'slack', 'spotify', 'magnet']);
const URL_CHARS = Pattern.compile("[a-zA-ZÄÖÜäöü0-9/%$-_.+!*'(),?#~]+");
const DOMAIN_CHARS = Pattern.compile('[a-zA-Z0-9][a-zA-Z0-9-]+');
const NO_PROTOCOL_URL = Pattern.compile('([a-zA-Z0-9][a-zA-Z0-9-]+\\.)?'
  + '([a-zA-Z0-9][a-zA-Z0-9-]+)\\.([a-zA-Z0-9][a-zA-Z0-9-]+)/.*');
const E_MAIL = Pattern.compile("(?<!:)@?\\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@((\\[[0-9]{1,"
  + '3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))\\b');
const CURRENCY_SYMBOLS = Pattern.compile('[A-Z]*[฿₿₵¢₡$₫֏€ƒ₲₴₭₾₺₼₦₱£៛₽₹₪৳₸₮₩¥¤]');
const CURRENCY_VALUE = Pattern.compile('\\d+(?:[.,]\\d+)*');
const CURRENCY_EXPRESSION = Pattern.compile(`(?:(${CURRENCY_SYMBOLS})(${CURRENCY_VALUE})|(${CURRENCY_VALUE})(${CURRENCY_SYMBOLS}))`);

const TOKENIZING_CHARACTERS = '  ᅟᅠ '
  + '        '
  + '   ​‌‍‎‏'
  + '  ‪‫‬‭‮ '
  + ' ⁠⁡⁢⁣⁪⁫⁬⁭'
  + '⁮⁯　ㅤ﻿ﾠ￹￺￻'
  + '¦‖∣|,.;()[]{}=*#∗+×·÷<>!?:~/\\"\'«»„”“‘’`´‛′›‹…¿¡‼⁇⁈⁉™®‽¶￫⸮'
  + '‒–—―'
  + '─ㅡ✓'
  + '●○◆➢■□★❏➔↵❖▪❑•'
  + '⮚≥→⇾⇉⇒⇨⇛'
  + '¹²³⁰ⁱ⁴⁵⁶⁷⁸⁹'
  + '\t\n\r\u000B';

const URL_END_NEXT = ['"', '»', '«', '‘', '’', '“', '”', "'", '.'];
const URL_END_TOKEN = ['.', ',', ';', ':', '!', '?'];

// Java: WordTokenizer
export class WordTokenizer {
  static FQCN = 'org.languagetool.tokenizers.WordTokenizer';
  static [IMPLEMENTS] = [Tokenizer];

  // Java: WordTokenizer#REMOVED_EMOJI
  REMOVED_EMOJI = 'MyReMoVeDeMoJi';

  // Java: WordTokenizer#getProtocols()
  static getProtocols() {
    return PROTOCOLS;
  }

  // Java: WordTokenizer#isUrl(String)
  static isUrl(token) {
    if (token === null || token === undefined) throw new NullPointerException('Cannot invoke "String.startsWith(String)" because "token" is null');
    for (const protocol of WordTokenizer.getProtocols()) {
      if (token.startsWith(`${protocol}://`) || token.startsWith('www.')) {
        return true;
      }
    }
    return NO_PROTOCOL_URL.matcher(token).matches();
  }

  // Java: WordTokenizer#isEMail(String)
  static isEMail(token) {
    return E_MAIL.matcher(token).matches();
  }

  // Java: WordTokenizer#tokenize(String)
  tokenize(text) {
    const l = [];
    const st = new StringTokenizer(text, this.getTokenizingCharacters(), true);
    while (st.hasMoreElements()) {
      l.push(st.nextToken());
    }
    return this.joinEMailsAndUrls(l);
  }

  // Java: WordTokenizer#getTokenizingCharacters()
  getTokenizingCharacters() {
    return TOKENIZING_CHARACTERS;
  }

  // Java: WordTokenizer#joinEMailsAndUrls(List)
  joinEMailsAndUrls(list) {
    return this.joinUrls(this.joinEMails(list));
  }

  // Java: WordTokenizer#joinEMails(List)
  joinEMails(list) {
    const text = list.join('');
    if (text.includes('@') && E_MAIL.matcher(text).find()) {
      const matcher = E_MAIL.matcher(text);
      const l = [];
      let currentPosition = 0;
      let idx = 0;
      while (matcher.find()) {
        const start = matcher.start();
        const end = matcher.end();
        while (currentPosition < end) {
          if (currentPosition < start) {
            l.push(list[idx]);
          } else if (currentPosition === start) {
            l.push(matcher.group());
          }
          currentPosition += list[idx].length;
          idx++;
        }
      }
      if (currentPosition < text.length) {
        for (let k = idx; k < list.length; k++) l.push(list[k]);
      }
      return l;
    }
    return list;
  }

  // Java: WordTokenizer#joinUrls(List)
  joinUrls(l) {
    const newList = [];
    let inUrl = false;
    let url = '';
    let urlQuote = null;
    for (let i = 0; i < l.length; i++) {
      if (!inUrl && this.urlStartsAt(i, l)) {
        inUrl = true;
        if (i - 1 >= 0) {
          urlQuote = l[i - 1];
        }
        url += l[i];
      } else if (inUrl && this.urlEndsAt(i, l, urlQuote)) {
        inUrl = false;
        urlQuote = null;
        newList.push(url);
        url = '';
        newList.push(l[i]);
      } else if (inUrl) {
        url += l[i];
      } else {
        newList.push(l[i]);
      }
    }
    if (url.length > 0) {
      newList.push(url);
    }
    return newList;
  }

  // Java: WordTokenizer#urlStartsAt(int,List)
  urlStartsAt(i, l) {
    const token = l[i];
    if (this.isProtocol(token) && l.length > i + 3) {
      const nToken = l[i + 1];
      const nnToken = l[i + 2];
      const nnnToken = l[i + 3];
      if (nToken === ':' && nnToken === '/' && nnnToken === '/') {
        return true;
      }
    }
    if (l.length > i + 1) {
      const nToken = l[i];
      const nnToken = l[i + 1];
      if (nToken === 'www' && nnToken === '.') {
        return true;
      }
    }
    if (l.length > i + 3
        && l[i + 1] === '.'
        && l[i + 3] === '/'
        && DOMAIN_CHARS.matcher(token).matches()
        && DOMAIN_CHARS.matcher(l[i + 2]).matches()) {
      return true;
    }
    return (l.length > i + 5
        && l[i + 1] === '.'
        && l[i + 3] === '.'
        && l[i + 5] === '/'
        && DOMAIN_CHARS.matcher(token).matches()
        && DOMAIN_CHARS.matcher(l[i + 2]).matches()
        && DOMAIN_CHARS.matcher(l[i + 4]).matches());
  }

  // Java: WordTokenizer#isProtocol(String)
  isProtocol(token) {
    return PROTOCOLS.includes(token);
  }

  // Java: WordTokenizer#urlEndsAt(int,List,String)
  urlEndsAt(i, l, urlQuote) {
    const token = l[i];
    if (isWhitespace(token) || token === ')' || token === ']') {
      return true;
    } else if (l.length > i + 1) {
      const nextToken = l[i + 1];
      if (((isWhitespace(nextToken) || URL_END_NEXT.includes(nextToken))
          && (URL_END_TOKEN.includes(token) || token === urlQuote))
          || !URL_CHARS.matcher(token).matches()) {
        return true;
      }
    } else if (!URL_CHARS.matcher(token).matches() || token === '.' || token === urlQuote) {
      return true;
    }
    return false;
  }

  // Java: WordTokenizer#isCurrencyExpression(String)
  isCurrencyExpression(token) {
    return CURRENCY_EXPRESSION.matcher(token).matches();
  }

  // Java: WordTokenizer#splitCurrencyExpression(String)
  splitCurrencyExpression(token) {
    const newList = [];
    const matcher = CURRENCY_EXPRESSION.matcher(token);
    while (matcher.find()) {
      if (matcher.group(1) !== null && matcher.group(2) !== null) {
        newList.push(matcher.group(1));
        newList.push(matcher.group(2));
      } else if (matcher.group(3) !== null && matcher.group(4) !== null) {
        newList.push(matcher.group(3));
        newList.push(matcher.group(4));
      }
    }
    if (newList.length === 0) {
      newList.push(token);
    }
    return newList;
  }

  // Java: WordTokenizer#replaceEmojis(String)
  replaceEmojis(s) {
    const removedEmojis = [];
    let cpCount = 0;
    for (const _ of s) cpCount++;
    if (s.length > 1 && cpCount !== s.length) {
      const matcher = CHARS_NOT_FOR_SPELLING.matcher(s);
      while (matcher.find()) {
        const found = matcher.group(0);
        if (found.length > 1) {
          s = javaReplace(s, found, `,${this.REMOVED_EMOJI},`);
          removedEmojis.push(found);
        }
      }
    }
    removedEmojis.unshift(s);
    return removedEmojis;
  }

  // Java: WordTokenizer#restoreEmojis(List,List)
  restoreEmojis(tokens, removedEmojis) {
    if (removedEmojis.length < 2) {
      return tokens;
    }
    const results = [];
    let i = 0;
    let emojiCount = 1;
    while (i < tokens.length) {
      if (i + 2 < tokens.length && tokens[i] === ','
        && tokens[i + 1] === this.REMOVED_EMOJI && tokens[i + 2] === ',') {
        results.push(removedEmojis[emojiCount]);
        emojiCount++;
        i += 3;
      } else {
        results.push(tokens[i]);
        i += 1;
      }
    }
    return results;
  }
}

registerComponent(WordTokenizer.FQCN, () => new WordTokenizer());
