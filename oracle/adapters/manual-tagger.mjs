// JS twin of harness op "manual-tagger" (TagOps#manualTagger).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { getDictionaryWithCaching } from '../../src/core/rules/spelling/morfologik/MorfologikSpeller.js';
import { BaseTagger } from '../../src/core/tagging/BaseTagger.js';
import { CombiningTagger } from '../../src/core/tagging/CombiningTagger.js';
import { ManualTagger } from '../../src/core/tagging/ManualTagger.js';
import { MorfologikTagger } from '../../src/core/tagging/MorfologikTagger.js';
import { ClassCastException, IllegalArgumentException } from '../../src/lib/java/errors.js';
import { err, safe, str } from './_text-common.mjs';

// Java: TagOps#stream(String)
function stream(res) {
  let is = null;
  for (const url of getDataBroker().getFromResourceDirAsUrls(res)) {
    const s = url.openStream();
    is = is === null ? s : Buffer.concat([is, s]);
  }
  return is;
}

// Java: TagOps#manual(JsonNode)
function manual(spec) {
  if (spec.content !== undefined) return new ManualTagger(Buffer.from(spec.content, 'utf8'), spec.internTags === true);
  const lc = spec.lang;
  let is = null;
  for (const f of spec.files) {
    const s = stream(`/${lc}/${f}`);
    if (s !== null) is = is === null ? s : Buffer.concat([is, s]);
  }
  return new ManualTagger(is);
}

// Java: TagOps#wordTagger(JsonNode)
function wordTagger(spec) {
  const kind = spec.kind;
  switch (kind) {
    case 'manual': return manual(spec);
    case 'dict': return new MorfologikTagger(getDictionaryWithCaching(spec.dict), spec.internTags === true);
    case 'combining': {
      const removal = spec.removal !== undefined ? wordTagger(spec.removal) : null;
      return new CombiningTagger(wordTagger(spec.tagger1), wordTagger(spec.tagger2), removal, spec.overwrite === true);
    }
    case 'language': {
      const lang = Languages.getLanguageForShortCode(spec.lang);
      const bt = lang.getTagger();
      if (!(bt instanceof BaseTagger)) throw new ClassCastException(`class ${bt === null ? 'null' : bt.constructor.FQCN} cannot be cast to class org.languagetool.tagging.BaseTagger`);
      return bt.getWordTagger();
    }
    default: throw new IllegalArgumentException(`kind: ${kind}`);
  }
}

// Java: TagOps#manualTagger(JsonNode)
export function run(a) {
  const out = {};
  let t;
  try {
    t = wordTagger(a.tagger);
  } catch (e) {
    if (e && e.notPorted === true) throw e;
    out.buildError = err(e).error;
    return out;
  }
  out.class = t.constructor.FQCN;
  out.results = a.words.map((w) => safe(() => t.tag(str(w)).map((x) => [x.getLemma(), x.getPosTag()])));
  return out;
}
