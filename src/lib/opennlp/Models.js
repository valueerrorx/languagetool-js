// Loads the three English OpenNLP models once (checksummed like EnglishChunker: Tools.getStream with SHA-256).
import { getStream } from '../../core/Tools.js';
import { TokenizerModel, POSModel, ChunkerModel } from './BaseModel.js';

let tm = null;
let pm = null;
let cm = null;

// Java: EnglishChunker static model loading (/en-token.bin, /en-pos-maxent.bin, /en-chunker.bin)
export function loadModels() {
  if (tm === null) tm = new TokenizerModel(getStream('/en-token.bin', '2d0dd64ffb3d084382d7bdb65e7bd004c5001ba5503c36413d97c3e46321437c'));
  if (pm === null) pm = new POSModel(getStream('/en-pos-maxent.bin', '645a094f45a866687a617385233fd23ae8b0f5fa8b1b76996781a50c17bdcf3d'));
  if (cm === null) cm = new ChunkerModel(getStream('/en-chunker.bin', '7861a0c2f134d9c12a022a1ba501e88bc7039f6db72b4140e1bafd1fb5ef76cc'));
  return { tm, pm, cm };
}
