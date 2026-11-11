// opennlp.tools.util.model.BaseModel + TokenizerModel/POSModel/ChunkerModel: zip container with manifest.properties and one GIS model (+ tags.tagdict for POS).
import { inflateRawSync } from '#platform';
import { loadProperties } from '../java/Properties.js';
import { IOException } from '../java/errors.js';
import { GISModel } from './GISModel.js';
import { POSDictionary } from './POSDictionary.js';

// Java: java.util.zip.ZipInputStream entries -> Map name -> bytes (central directory based)
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new IOException('invalid zip: no end of central directory');
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const dataStart = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(dataStart, dataStart + csize);
    entries.set(name, method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nlen + elen + clen;
  }
  return entries;
}

// Java: opennlp.tools.util.model.BaseModel
export class BaseModel {
  static FQCN = 'opennlp.tools.util.model.BaseModel';

  // Java: BaseModel#BaseModel(String,InputStream) (loadModel: manifest + artifacts by entry name)
  constructor(componentName, buf, modelEntry) {
    const entries = readZip(buf);
    const mf = entries.get('manifest.properties');
    if (mf === undefined) throw new IOException('Model does not contain manifest.properties');
    this.manifest = loadProperties(mf.toString('latin1'));
    this.maxent = GISModel.read(entries.get(modelEntry));
    const td = entries.get('tags.tagdict');
    this.tagDictionary = td === undefined ? null : POSDictionary.create(td);
  }

  // Java: BaseModel#getManifestProperty(String)
  getManifestProperty(key) {
    return this.manifest.has(key) ? this.manifest.get(key) : null;
  }

  // Java: BaseModel#getLanguage()
  getLanguage() {
    return this.getManifestProperty('Language');
  }
}

// Java: opennlp.tools.tokenize.TokenizerModel
export class TokenizerModel extends BaseModel {
  static FQCN = 'opennlp.tools.tokenize.TokenizerModel';

  // Java: TokenizerModel#TokenizerModel(InputStream)
  constructor(buf) {
    super('TokenizerME', buf, 'token.model');
  }

  // Java: TokenizerModel#getMaxentModel()
  getMaxentModel() {
    return this.maxent;
  }

  // Java: TokenizerModel#useAlphaNumericOptimization()
  useAlphaNumericOptimization() {
    return String(this.getManifestProperty('useAlphaNumericOptimization')).toLowerCase() === 'true';
  }
}

// Java: opennlp.tools.postag.POSModel
export class POSModel extends BaseModel {
  static FQCN = 'opennlp.tools.postag.POSModel';

  // Java: POSModel#POSModel(InputStream)
  constructor(buf) {
    super('POSTaggerME', buf, 'pos.model');
  }

  // Java: POSModel#getPosModel()
  getPosModel() {
    return this.maxent;
  }

  // Java: POSModel#getFactory().getTagDictionary()
  getTagDictionary() {
    return this.tagDictionary;
  }
}

// Java: opennlp.tools.chunker.ChunkerModel
export class ChunkerModel extends BaseModel {
  static FQCN = 'opennlp.tools.chunker.ChunkerModel';

  // Java: ChunkerModel#ChunkerModel(InputStream)
  constructor(buf) {
    super('ChunkerME', buf, 'chunker.model');
  }

  // Java: ChunkerModel#getChunkerModel()
  getChunkerModel() {
    return this.maxent;
  }
}
