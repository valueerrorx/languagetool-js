// org.languagetool.tagging.disambiguation.MultiWordChunker (multiword tagger-chunker with shared per-settings cache)
import { AbstractDisambiguator } from './AbstractDisambiguator.js';
import { AnalyzedToken } from '../../AnalyzedToken.js';
import { AnalyzedSentence } from '../../AnalyzedSentence.js';
import { AnalyzedTokenReadings } from '../../AnalyzedTokenReadings.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { isCamelCase, uppercaseFirstChar, allStartWithLowercase, titlecaseGlobal } from '../../text/StringTools.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { RuntimeException, NullPointerException } from '../../../lib/java/errors.js';
import { decodeUtf8, readerLines } from '../../../lib/java/io.js';
import { javaSplit, javaTrim, javaReplace, toUpperCase, substring } from '../../../lib/java/strings.js';
import { substringBefore } from '../../../lib/java/StringUtils.js';
import { capitalize } from '../../../lib/java/WordUtils.js';

const MAX_TOKENS_IN_MULTIWORD = 20;
const DEFAULT_SEPARATOR = '\t';
const GermanLineExpander = Pattern.compile('^.*/[ESN]+$');
const chunkerCache = new Map(); // Java: ConcurrentHashMap<Settings, MultiWordChunker>

// Java: MultiWordChunker.Settings (equals/hashCode as cache key)
function settingsKey(filename, allowFirstCapitalized, allowAllUppercase, allowTitlecase, defaultTag) {
  return JSON.stringify([filename, allowFirstCapitalized, allowAllUppercase, allowTitlecase, defaultTag]);
}

// Java: MultiWordChunker
export class MultiWordChunker extends AbstractDisambiguator {
  static FQCN = 'org.languagetool.tagging.disambiguation.MultiWordChunker';

  static tagForNotAddingTags = '_NONE_';

  // Java: MultiWordChunker#MultiWordChunker(Settings)
  constructor(settings) {
    super();
    this.settings = settings;
    this.initialized = false;
    this.mStartSpace = null;
    this.mStartNoSpace = null;
    this.mFullSpace = null;
    this.mFullNoSpace = null;
    this.separator = null;
    this.addIgnoreSpelling = false;
    this.isRemovePreviousTags = false;
  }

  // Java: MultiWordChunker#lazyInit()
  lazyInit() {
    if (this.initialized) {
      return;
    }
    const mStartSpace = new Map();
    const mStartNoSpace = new Map();
    const mFullSpace = new Map();
    const mFullNoSpace = new Map();
    this.fillMaps(mStartSpace, mStartNoSpace, mFullSpace, mFullNoSpace);
    this.mStartSpace = mStartSpace;
    this.mStartNoSpace = mStartNoSpace;
    this.mFullSpace = mFullSpace;
    this.mFullNoSpace = mFullNoSpace;
    this.initialized = true;
  }

  // Java: MultiWordChunker#fillMaps(Map,Map,Map,Map)
  fillMaps(mStartSpace, mStartNoSpace, mFullSpace, mFullNoSpace) {
    const stream = getDataBroker().getFromResourceDirAsStream(this.settings.filename);
    const lines = this.loadWords(stream);
    for (const line of lines) {
      const stringAndTag = javaSplit(line, this.separator);
      if (stringAndTag.length !== 2 && this.settings.defaultTag === null) {
        throw new RuntimeException(
          `Invalid format in ${this.settings.filename}: '${line}', expected two tab-separated parts`);
      }
      if (stringAndTag.length !== 1 && this.settings.defaultTag !== null) {
        throw new RuntimeException(
          `Invalid format in ${this.settings.filename}: '${line}', expected one element with no separator`);
      }
      const casingVariants = [];
      const originalString = stringAndTag[0];
      const tag = this.settings.defaultTag !== null ? this.settings.defaultTag : stringAndTag[1];
      const containsSpace = originalString.indexOf(' ') > 0;
      casingVariants.push(originalString);
      if (containsSpace) {
        casingVariants.push(...this.getTokenLettercaseVariants(originalString, mFullSpace));
      } else {
        casingVariants.push(...this.getTokenLettercaseVariants(originalString, mFullNoSpace));
      }
      for (const casingVariant of casingVariants) {
        if (!containsSpace) {
          const firstChar = substring(casingVariant, 0, 1);
          if (mStartNoSpace.has(firstChar)) {
            if (mStartNoSpace.get(firstChar) < casingVariant.length) {
              mStartNoSpace.set(firstChar, casingVariant.length);
            }
          } else {
            mStartNoSpace.set(firstChar, casingVariant.length);
          }
          mFullNoSpace.set(casingVariant, new AnalyzedToken(casingVariant, tag, originalString));
        } else {
          const tokens = javaSplit(casingVariant, ' ');
          const firstToken = tokens[0];
          if (mStartSpace.has(firstToken)) {
            if (mStartSpace.get(firstToken) < tokens.length) {
              mStartSpace.set(firstToken, tokens.length);
            }
          } else {
            mStartSpace.set(firstToken, tokens.length);
          }
          mFullSpace.set(casingVariant, new AnalyzedToken(casingVariant, tag, originalString));
        }
      }
    }
  }

  // Java: MultiWordChunker#getTokenLettercaseVariants(String,Map)
  getTokenLettercaseVariants(originalToken, tokenMap) {
    const newTokens = [];
    if (this.settings.allowAllUppercase && !isCamelCase(originalToken)) {
      // do not capitalize iPad, iPhone, etc. (single tokens)
      const tokenAllUppercase = toUpperCase(originalToken);
      if (!tokenMap.has(tokenAllUppercase) && originalToken !== tokenAllUppercase) {
        newTokens.push(tokenAllUppercase);
      }
    }
    if (this.settings.allowFirstCapitalized) {
      const tokenFirstCapitalized = uppercaseFirstChar(originalToken);
      if (!tokenMap.has(tokenFirstCapitalized) && originalToken !== tokenFirstCapitalized) {
        newTokens.push(tokenFirstCapitalized);
      }
      // Titlecasing is only relevant for multi-token entries, and only done for expressions that are entirely lowercase
      // It is also limited to when first-letter capitalisation is allowed.
      if (this.settings.allowTitlecase && javaSplit(originalToken, ' ').length > 1 && allStartWithLowercase(originalToken)) {
        const tokenNaivelyTitlecased = capitalize(originalToken);
        if (tokenNaivelyTitlecased !== tokenFirstCapitalized && originalToken !== tokenNaivelyTitlecased) {
          newTokens.push(tokenNaivelyTitlecased);
        }
        const tokenSmartlyTitlecased = titlecaseGlobal(originalToken);
        if (tokenSmartlyTitlecased !== tokenFirstCapitalized && tokenSmartlyTitlecased !== tokenNaivelyTitlecased &&
          originalToken !== tokenSmartlyTitlecased) {
          newTokens.push(tokenSmartlyTitlecased);
        }
      }
    }
    return newTokens;
  }

  // Java: MultiWordChunker#disambiguate(AnalyzedSentence) / disambiguate(AnalyzedSentence,CheckCancelledCallback)
  disambiguate(input, checkCanceled = null) {
    this.lazyInit();
    const anTokens = input.getTokens();
    const output = anTokens;
    for (let i = 0; i < anTokens.length; i++) {
      let tok = output[i].getToken();
      if (tok.length < 1) {
        continue;
      }
      let tokBuilder = tok;
      // If the next token is not whitespace, concatenate it
      let k = i + 1;
      while (k < anTokens.length && !anTokens[k].isWhitespace()) {
        tokBuilder += output[k].getToken();
        k++;
      }
      tok = tokBuilder;
      if (checkCanceled !== null && checkCanceled !== undefined && checkCanceled.checkCancelled()) {
        break;
      }
      if (this.mStartSpace.has(tok)) {
        let finalLen = 0;
        let keyBuilder = '';
        const len = this.mStartSpace.get(tok);
        let j = i;
        let lenCounter = 0;
        while (j < anTokens.length && j - i < MAX_TOKENS_IN_MULTIWORD) {
          if (!anTokens[j].isWhitespace()) {
            keyBuilder += anTokens[j].getToken();
            const keyStr = keyBuilder;
            const at = this.mFullSpace.get(keyStr) ?? null;
            if (at !== null) {
              if (at.getPOSTag() !== MultiWordChunker.tagForNotAddingTags) {
                if (finalLen === 0) { // the key has only one token
                  output[i] = this.setAndAnnotate(output[i], new AnalyzedToken(anTokens[j].getToken(), at.getPOSTag(), at.getLemma()));
                } else {
                  output[i] = this.prepareNewReading(at, output[i].getToken(), output[i], false);
                  output[finalLen] = this.prepareNewReading(at, anTokens[finalLen].getToken(), output[finalLen], true);
                }
              }
              if (this.addIgnoreSpelling) {
                if (finalLen === 0) {
                  output[i].ignoreSpelling();
                } else {
                  for (let m = i; m <= finalLen; m++) {
                    output[m].ignoreSpelling();
                  }
                }
              }
            }
          } else {
            if (j > 1 && !anTokens[j - 1].isWhitespace()) { // avoid multiple whitespaces
              keyBuilder += ' ';
              lenCounter++;
            }
            if (lenCounter === len) {
              break;
            }
          }
          j++;
          finalLen = j;
        }
      }
      if (this.mStartNoSpace.has(substring(tok, 0, 1))) {
        let j = i;
        let keyBuilder = '';
        while (j < anTokens.length && !anTokens[j].isWhitespace() && j - i < MAX_TOKENS_IN_MULTIWORD) {
          keyBuilder += anTokens[j].getToken();
          const keyStr = keyBuilder;
          const at = this.mFullNoSpace.get(keyStr) ?? null;
          if (at !== null) {
            if (at.getPOSTag() !== MultiWordChunker.tagForNotAddingTags) {
              if (i === j) {
                const postag = at.getPOSTag();
                if (!this.isLowPriorityTag(postag) || !output[i].hasReading() || output[i].isPosTagUnknown()) {
                  output[i] = this.setAndAnnotate(output[i], new AnalyzedToken(anTokens[j].getToken(), postag, at.getLemma()));
                }
              } else {
                output[i] = this.prepareNewReading(at, anTokens[i].getToken(), output[i], false);
                output[j] = this.prepareNewReading(at, anTokens[j].getToken(), output[j], true);
              }
            }
            if (this.addIgnoreSpelling) {
              for (let m = i; m <= j; m++) {
                output[m].ignoreSpelling();
              }
            }
          }
          j++;
        }
      }
    }
    if (this.isRemovePreviousTags) {
      return new AnalyzedSentence(this.removePreviousTags(output));
    }
    return new AnalyzedSentence(output);
  }

  // Java: MultiWordChunker#prepareNewReading(AnalyzedToken,String,AnalyzedTokenReadings,boolean)
  prepareNewReading(at, token, atrs, isLast) {
    let sb = '<';
    if (isLast) {
      sb += '/';
    }
    sb += at.getPOSTag();
    sb += '>';
    return this.setAndAnnotate(atrs, new AnalyzedToken(token, sb, at.getLemma()));
  }

  // Java: MultiWordChunker#setAndAnnotate(AnalyzedTokenReadings,AnalyzedToken)
  setAndAnnotate(oldReading, newReading) {
    const newAtr = oldReading;
    newAtr.addReading(newReading, 'MULTIWORD_CHUNKER');
    return newAtr;
  }

  // Java: MultiWordChunker#loadWords(InputStream)
  loadWords(stream) {
    const lines = [];
    this.separator = DEFAULT_SEPARATOR;
    for (let line of readerLines(decodeUtf8(stream))) {
      line = javaTrim(line);
      if (line.startsWith('#separatorRegExp=')) {
        this.separator = javaReplace(line, '#separatorRegExp=', '');
      }
      if (line.length === 0 || line.charAt(0) === '#') { // ignore comments
        continue;
      }
      line = javaTrim(substringBefore(line, '#'));
      if (GermanLineExpander.matcher(line).matches()) {
        // German special case
        const parts = javaSplit(line, '/');
        lines.push(javaTrim(parts[0]));
        if (parts[1].includes('E')) {
          lines.push(javaTrim(parts[0]) + 'e');
        }
        if (parts[1].includes('S')) {
          lines.push(javaTrim(parts[0]) + 's');
        }
        if (parts[1].includes('N')) {
          lines.push(javaTrim(parts[0]) + 'n');
        }
      } else {
        lines.push(line);
      }
    }
    return lines;
  }

  // Java: MultiWordChunker#setIgnoreSpelling(boolean)
  setIgnoreSpelling(ignoreSpelling) {
    this.addIgnoreSpelling = ignoreSpelling;
  }

  // Java: MultiWordChunker#setRemovePreviousTags(boolean)
  setRemovePreviousTags(removePreviousTags) {
    this.isRemovePreviousTags = removePreviousTags;
  }

  // Java: MultiWordChunker#removePreviousTags(AnalyzedTokenReadings[])
  removePreviousTags(aTokens) {
    let i = 0;
    let POSTag = '';
    let lemma = '';
    let nextPOSTag = '';
    let analyzedToken = null;
    while (i < aTokens.length) {
      if (!aTokens[i].isWhitespace()) {
        if (nextPOSTag.length > 0) {
          const newAnalyzedToken = new AnalyzedToken(aTokens[i].getToken(), nextPOSTag, lemma);
          if (aTokens[i].hasPosTagAndLemma('</' + POSTag + '>', lemma)) {
            nextPOSTag = '';
            lemma = '';
          }
          aTokens[i] = new AnalyzedTokenReadings(aTokens[i], [newAnalyzedToken], 'HybridDisamb');
        } else if ((analyzedToken = this.getMultiWordAnalyzedToken(aTokens, i)) !== null) {
          POSTag = substring(analyzedToken.getPOSTag(), 1, analyzedToken.getPOSTag().length - 1);
          lemma = analyzedToken.getLemma();
          if (aTokens[i].hasPosTagAndLemma('</' + POSTag + '>', lemma)) {
            // it is only one token
            aTokens[i].removeReading(nn(aTokens[i].readingWithTagRegex('</' + POSTag + '>')), 'HybridDisamb');
            aTokens[i].removeReading(nn(aTokens[i].readingWithTagRegex('<' + POSTag + '>')), 'HybridDisamb');
            aTokens[i].addReading(new AnalyzedToken(analyzedToken.getToken(), POSTag, lemma), 'HybridDisamb');
            nextPOSTag = '';
            lemma = '';
          } else {
            const newAnalyzedToken = new AnalyzedToken(analyzedToken.getToken(), POSTag, lemma);
            aTokens[i] = new AnalyzedTokenReadings(aTokens[i], [newAnalyzedToken], 'HybridDisamb');
            nextPOSTag = this.getNextPosTag(POSTag);
          }
        }
      }
      i++;
    }
    return aTokens;
  }

  // Java: MultiWordChunker#getMultiWordAnalyzedToken(AnalyzedTokenReadings[],Integer)
  getMultiWordAnalyzedToken(aTokens, i) {
    const l = [];
    for (const reading of aTokens[i].getReadings()) {
      const POSTag = reading.getPOSTag();
      if (POSTag !== null) {
        if (POSTag.startsWith('<') && POSTag.endsWith('>') && !POSTag.startsWith('</')) {
          l.push(reading);
        }
      }
    }
    // choose the longest one
    if (l.length > 0) {
      let selectedAT = null;
      let maxDistance = 0;
      for (const at of l) {
        const tag = '</' + substring(at.getPOSTag(), 1);
        const cleanTag = substring(at.getPOSTag(), 1, at.getPOSTag().length - 2);
        const lemma = at.getLemma();
        let distance = 1;
        while (i + distance < aTokens.length) {
          if (aTokens[i + distance].hasPosTagAndLemma(tag, lemma)) {
            if (distance > maxDistance) {
              maxDistance = distance;
              selectedAT = at;
            }
            if (distance === maxDistance && !this.isLowPriorityTag(cleanTag)) {
              maxDistance = distance;
              selectedAT = at;
            }
            break;
          }
          distance++;
        }
      }
      return selectedAT;
    }
    return null;
  }

  // Java: MultiWordChunker#getNextPosTag(String)
  getNextPosTag(postag) {
    if (postag.startsWith('NC')) {
      // for ES, PT, CA
      return 'AQ0' + substring(postag, 2, 4) + '0';
    } else if (postag.startsWith('N ')) {
      // French
      return 'J ' + substring(postag, 2);
    }
    return postag;
  }

  // Java: MultiWordChunker#isLowPriorityTag(String)
  isLowPriorityTag(tag) {
    // CA, ES
    return tag === 'NPCN000';
  }

  // Java: MultiWordChunker#getInstance(String) / (String,boolean,boolean,boolean) / (String,boolean,boolean,boolean,String)
  static getInstance(filename, allowFirstCapitalized = false, allowAllUppercase = false, allowTitlecase = false, defaultTag = null) {
    if (filename === null || filename === undefined) throw new NullPointerException();
    const key = settingsKey(filename, allowFirstCapitalized, allowAllUppercase, allowTitlecase, defaultTag ?? null);
    let c = chunkerCache.get(key);
    if (c === undefined) {
      c = new MultiWordChunker({ filename, allowFirstCapitalized, allowAllUppercase, allowTitlecase, defaultTag: defaultTag ?? null });
      chunkerCache.set(key, c);
    }
    return c;
  }
}

// Java: NPE on dereferencing a null result
function nn(x) {
  if (x === null || x === undefined) throw new NullPointerException();
  return x;
}
