// java.text.MessageFormat (applyPattern/format) for the default en_US locale.
import { IllegalArgumentException, NumberFormatException } from './errors.js';
import { Integer } from './int.js';
import { javaTrim, toLowerCase } from './strings.js';
import { ChoiceFormat } from './ChoiceFormat.js';
import { DecimalFormat } from './DecimalFormat.js';
import * as DateFormat from './DateFormat.js';
import { BigDecimal, BigInteger, JavaDate } from './boxed.js';

const SEG_RAW = 0;
const SEG_INDEX = 1;
const SEG_TYPE = 2;
const SEG_MODIFIER = 3;
const TYPE_NULL = 0;
const TYPE_NUMBER = 1;
const TYPE_DATE = 2;
const TYPE_TIME = 3;
const TYPE_CHOICE = 4;
const TYPE_KEYWORDS = ['', 'number', 'date', 'time', 'choice'];
const NUMBER_MODIFIER_KEYWORDS = ['', 'currency', 'percent', 'integer'];
const DATE_TIME_MODIFIER_KEYWORDS = ['', 'short', 'medium', 'long', 'full'];
const DATE_TIME_MODIFIERS = [DateFormat.DEFAULT, DateFormat.SHORT, DateFormat.MEDIUM, DateFormat.LONG, DateFormat.FULL];

// Java: MessageFormat#findKeyword(String,String[])
function findKeyword(s, list) {
  for (let i = 0; i < list.length; ++i) if (s === list[i]) return i;
  const ls = toLowerCase(javaTrim(s), 'ROOT');
  if (ls !== s) {
    for (let i = 0; i < list.length; ++i) if (ls === list[i]) return i;
  }
  return -1;
}

// Java: Number instance check of a boxed argument (bigint = Integer/Long/Short/Byte, number = Double/Float)
const isNumber = (o) => typeof o === 'bigint' || typeof o === 'number' || o instanceof BigInteger || o instanceof BigDecimal;

// Java: Number#doubleValue()
function doubleValue(o) {
  return typeof o === 'bigint' ? Number(o) : typeof o === 'number' ? o : o.doubleValue();
}

// Java: java.text.MessageFormat
export class MessageFormat {
  static FQCN = 'java.text.MessageFormat';

  // Java: MessageFormat#MessageFormat(String)
  constructor(pattern) {
    this.pattern = '';
    this.formats = [];
    this.offsets = [];
    this.argumentNumbers = [];
    this.maxOffset = -1;
    this.applyPattern(pattern);
  }

  // Java: MessageFormat#applyPattern(String)
  applyPattern(pattern) {
    const segments = ['', null, null, null];
    let part = SEG_RAW;
    let formatNumber = 0;
    let inQuote = false;
    let braceStack = 0;
    this.maxOffset = -1;
    for (let i = 0; i < pattern.length; ++i) {
      const ch = pattern[i];
      if (part === SEG_RAW) {
        if (ch === "'") {
          if (i + 1 < pattern.length && pattern[i + 1] === "'") {
            segments[part] += ch;
            ++i;
          } else {
            inQuote = !inQuote;
          }
        } else if (ch === '{' && !inQuote) {
          part = SEG_INDEX;
          if (segments[SEG_INDEX] === null) segments[SEG_INDEX] = '';
        } else {
          segments[part] += ch;
        }
      } else if (inQuote) {
        segments[part] += ch;
        if (ch === "'") inQuote = false;
      } else {
        switch (ch) {
          case ',':
            if (part < SEG_MODIFIER) {
              if (segments[++part] === null) segments[part] = '';
            } else {
              segments[part] += ch;
            }
            break;
          case '{':
            ++braceStack;
            segments[part] += ch;
            break;
          case '}':
            if (braceStack === 0) {
              part = SEG_RAW;
              this.makeFormat(i, formatNumber, segments);
              formatNumber++;
              segments[SEG_INDEX] = null;
              segments[SEG_TYPE] = null;
              segments[SEG_MODIFIER] = null;
            } else {
              --braceStack;
              segments[part] += ch;
            }
            break;
          case ' ':
            if (part !== SEG_TYPE || segments[SEG_TYPE].length > 0) segments[part] += ch;
            break;
          case "'":
            inQuote = true;
            segments[part] += ch;
            break;
          default:
            segments[part] += ch;
            break;
        }
      }
    }
    if (braceStack === 0 && part !== 0) {
      this.maxOffset = -1;
      throw new IllegalArgumentException('Unmatched braces in the pattern.');
    }
    this.pattern = segments[0];
  }

  // Java: MessageFormat#makeFormat(int,int,StringBuilder[])
  makeFormat(position, offsetNumber, textSegments) {
    const segments = textSegments.map((s) => (s !== null ? s : ''));
    let argumentNumber;
    try {
      argumentNumber = Integer.parseInt(segments[SEG_INDEX]);
    } catch (e) {
      if (!(e instanceof NumberFormatException)) throw e;
      throw new IllegalArgumentException(`can't parse argument number: ${segments[SEG_INDEX]}`, e);
    }
    if (argumentNumber < 0) throw new IllegalArgumentException(`negative argument number: ${segments[SEG_INDEX]}`);
    const oldMaxOffset = this.maxOffset;
    this.maxOffset = offsetNumber;
    this.offsets[offsetNumber] = segments[SEG_RAW].length;
    this.argumentNumbers[offsetNumber] = argumentNumber;
    let newFormat = null;
    if (segments[SEG_TYPE].length !== 0) {
      const type = findKeyword(segments[SEG_TYPE], TYPE_KEYWORDS);
      switch (type) {
        case TYPE_NULL:
          break;
        case TYPE_NUMBER:
          switch (findKeyword(segments[SEG_MODIFIER], NUMBER_MODIFIER_KEYWORDS)) {
            case 0: newFormat = DecimalFormat.getInstance(); break;
            case 1: newFormat = DecimalFormat.getCurrencyInstance(); break;
            case 2: newFormat = DecimalFormat.getPercentInstance(); break;
            case 3: newFormat = DecimalFormat.getIntegerInstance(); break;
            default:
              try {
                newFormat = new DecimalFormat(segments[SEG_MODIFIER]);
              } catch (e) {
                if (!(e instanceof IllegalArgumentException)) throw e;
                this.maxOffset = oldMaxOffset;
                throw e;
              }
          }
          break;
        case TYPE_DATE:
        case TYPE_TIME: {
          const mod = findKeyword(segments[SEG_MODIFIER], DATE_TIME_MODIFIER_KEYWORDS);
          if (mod >= 0 && mod < DATE_TIME_MODIFIER_KEYWORDS.length) {
            newFormat = type === TYPE_DATE ? DateFormat.getDateInstance(DATE_TIME_MODIFIERS[mod]) : DateFormat.getTimeInstance(DATE_TIME_MODIFIERS[mod]);
          } else {
            try {
              newFormat = new DateFormat.SimpleDateFormat(segments[SEG_MODIFIER]);
            } catch (e) {
              if (!(e instanceof IllegalArgumentException)) throw e;
              this.maxOffset = oldMaxOffset;
              throw e;
            }
          }
          break;
        }
        case TYPE_CHOICE:
          try {
            newFormat = new ChoiceFormat(segments[SEG_MODIFIER]);
          } catch (e) {
            if (e && e.notPorted) throw e;
            this.maxOffset = oldMaxOffset;
            throw new IllegalArgumentException(`Choice Pattern incorrect: ${e.getMessage()}`, e);
          }
          break;
        default:
          this.maxOffset = oldMaxOffset;
          throw new IllegalArgumentException(`unknown format type: ${segments[SEG_TYPE]}`);
      }
    }
    this.formats[offsetNumber] = newFormat;
  }

  // Java: MessageFormat#format(String,Object...) (static)
  static format(pattern, ...args) {
    return new MessageFormat(pattern).format(args);
  }

  // Java: MessageFormat#format(Object) (Format#format(Object) with an Object[] argument)
  format(arguments_) {
    return this.subformat(arguments_);
  }

  // Java: MessageFormat#subformat(Object[],StringBuffer,FieldPosition,List)
  subformat(args) {
    let result = '';
    let lastOffset = 0;
    for (let i = 0; i <= this.maxOffset; ++i) {
      result += this.pattern.substring(lastOffset, this.offsets[i]);
      lastOffset = this.offsets[i];
      const argumentNumber = this.argumentNumbers[i];
      if (args === null || argumentNumber >= args.length) {
        result += `{${argumentNumber}}`;
        continue;
      }
      let obj = args[argumentNumber];
      let arg = null;
      let subFormatter = null;
      if (obj === null) {
        arg = 'null';
      } else if (this.formats[i] !== null && this.formats[i] !== undefined) {
        subFormatter = this.formats[i];
        if (subFormatter instanceof ChoiceFormat) {
          arg = formatChoice(subFormatter, obj);
          if (arg.indexOf('{') >= 0) {
            subFormatter = new MessageFormat(arg);
            obj = args;
            arg = null;
          }
        }
      } else if (isNumber(obj)) {
        subFormatter = DecimalFormat.getInstance();
      } else if (obj instanceof JavaDate) {
        subFormatter = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT);
      } else if (typeof obj === 'string') {
        arg = obj;
      } else {
        arg = String(obj);
      }
      if (arg === null) arg = subFormatter instanceof MessageFormat ? subFormatter.format(obj) : subFormatter.format(obj);
      result += arg;
    }
    result += this.pattern.substring(lastOffset);
    return result;
  }
}

// Java: NumberFormat#format(Object) on a ChoiceFormat
function formatChoice(cf, obj) {
  if (!isNumber(obj)) throw new IllegalArgumentException('Cannot format given Object as a Number');
  return cf.formatDouble(doubleValue(obj));
}
