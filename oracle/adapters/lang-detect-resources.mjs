// JS twin of harness op "lang-detect-resources" (DetectOps#resources).
import { createHash } from 'node:crypto';
import '../../src/lang/register.js';
import { getAll } from '../../src/core/language/identifier/DetectionLanguages.js';
import { getLanguageCodes } from '../../src/core/language/identifier/DefaultLanguageIdentifier.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { getResource, getResourceAsStream } from '../../src/core/resources/ResourceDataBroker.js';
import { decodeUtf8 } from '../../src/lib/java/io.js';
import { lang } from './lang-detect.mjs';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');

// Java: DetectOps#resources(JsonNode)
export function run() {
  const db = getDataBroker();
  const languages = [];
  for (const l of getAll()) {
    const o = { ...lang(l), isVariant: l.isVariant() };
    const p = l.getCommonWordsPath();
    o.commonWordsPath = p;
    const ex = p !== null && db.resourceExists(p);
    o.commonWordsExists = ex;
    if (ex) {
      const all = db.getFromResourceDirAsStream(p);
      o.commonWordsBytes = all.length;
      o.commonWordsSha256 = sha256(all);
      o.commonWordsEntries = decodeUtf8(all).split('\n').filter((line) => line.length !== 0 && !line.startsWith('#')).length;
    }
    languages.push(o);
  }
  const codes = getLanguageCodes();
  const profiles = codes.map((code) => {
    const o = { code };
    const u = getResource(`/languages/${code}`);
    o.resource = u === null ? null : `jar:${code}`; // Harness: jar URL shortened to "jar:<file name>"
    if (u !== null) {
      const b = getResourceAsStream(`/languages/${code}`);
      o.bytes = b.length;
      o.sha256 = sha256(b);
    }
    return o;
  });
  const externalProfiles = ['eo', 'crh'].map((e) => {
    const p = `/${e}/${e}.profile`;
    const o = { path: p, exists: db.resourceExists(p) };
    if (o.exists) {
      const b = db.getFromResourceDirAsStream(p);
      o.bytes = b.length;
      o.sha256 = sha256(b);
    }
    return o;
  });
  return { languages, profileCodes: codes, profiles, externalProfiles };
}
