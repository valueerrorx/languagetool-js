// Java: org.languagetool.tokenizers.SrxTools (package-private)
import { Pattern } from '../../../lib/java/regex/index.js';
import { parse } from '../../../lib/srx/Srx2SaxParser.js';
import { DEFAULT_PATTERN_FLAGS_PARAMETER, SrxTextIterator } from '../../../lib/srx/SrxTextIterator.js';
import { getDataBroker } from '../../resources/LtStatics.js';

const TOKENIZE_PARAMETERS = new Map([[DEFAULT_PATTERN_FLAGS_PARAMETER, Pattern.UNICODE_CHARACTER_CLASS]]);

// Java: SrxTools#createSrxDocument(String)
export function createSrxDocument(path) {
  return parse(getDataBroker().getFromResourceDirAsStream(path));
}

// Java: SrxTools#tokenize(String,SrxDocument,String)
export function tokenize(text, srxDocument, languageCode) {
  const segments = [];
  const textIterator = new SrxTextIterator(srxDocument, languageCode, text, TOKENIZE_PARAMETERS);
  while (textIterator.hasNext()) segments.push(textIterator.next());
  return segments;
}
