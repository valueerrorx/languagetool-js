// org.languagetool.rules.patterns.CaseConversionHelper
import { CaseConversion } from './Match.js';
import { isEmpty, startsWithUppercase, isAllUppercase, uppercaseFirstChar, removeTashkeel } from '../text/StringTools.js';
import { NullPointerException } from '../../lib/java/errors.js';
import { substring, toLowerCase, toUpperCase } from '../../lib/java/strings.js';

// Java: CaseConversionHelper#convertCase(Match.CaseConversion,String,String,Language)
export function convertCase(conversion, s, sample, lang) {
  if (isEmpty(s)) {
    return s;
  }
  let token = s;
  if (conversion === null || conversion === undefined) throw new NullPointerException(); // switch on null
  switch (conversion) {
    case CaseConversion.NONE:
      break;
    case CaseConversion.PRESERVE:
      if (startsWithUppercase(sample)) {
        if (isAllUppercase(sample)) {
          token = toUpperCase(token, 'en');
        } else {
          token = uppercaseFirstChar(token, lang);
        }
      }
      break;
    case CaseConversion.STARTLOWER:
      token = toLowerCase(substring(token, 0, 1)) + substring(token, 1);
      break;
    case CaseConversion.STARTUPPER:
      token = uppercaseFirstChar(token, lang);
      break;
    case CaseConversion.ALLUPPER:
      token = toUpperCase(token, 'en');
      break;
    case CaseConversion.FIRSTUPPER:
      token = toLowerCase(token);
      token = uppercaseFirstChar(token, lang);
      break;
    case CaseConversion.ALLLOWER:
      token = toLowerCase(token);
      break;
    case CaseConversion.NOTASHKEEL:
      token = removeTashkeel(token);
      break;
    default:
      break;
  }
  return token;
}

export const CaseConversionHelper = { convertCase };
