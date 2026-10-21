// JS twin of harness op "synth" (SynthOps#synth).
import '../../src/lang/register.js';
import { getLanguageForShortCodeGuarded } from '../../src/core/language/javaLanguages.js';
import { Languages } from '../../src/core/Languages.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { ManualSynthesizer } from '../../src/core/tagging/synthesis/ManualSynthesizer.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { err, safe, str } from './_text-common.mjs';

// Java: SynthOps#strs(JsonNode)
const strs = (n) => (n === undefined || n === null ? null : n.map((x) => str(x)));

// Java: SynthOps#synth(JsonNode)
export function run(a) {
  const impl = a.impl ?? 'lang';
  const out = {};
  const results = [];
  if (impl === 'manual') {
    let ms;
    try {
      let buf;
      if (a.content !== undefined) buf = Buffer.from(a.content, 'utf8');
      else {
        const parts = [];
        for (const f of a.files) {
          parts.push(Buffer.from(getDataBroker().getFromResourceDirAsStream(`/${a.lang}/${f}`)), Buffer.from('\n'));
        }
        buf = Buffer.concat(parts);
      }
      ms = new ManualSynthesizer(buf);
    } catch (e) {
      if (e && e.notPorted === true) throw e;
      out.buildError = err(e).error;
      return out;
    }
    out.class = ms.constructor.FQCN;
    for (const c of a.calls) {
      results.push(safe(() => {
        switch (c.m) {
          case 'lookup': return ms.lookup(str(c.lemma), str(c.tag));
          case 'possibleTags': return [...ms.getPossibleTags()];
          default: throw new IllegalArgumentException(`unknown method: ${c.m}`);
        }
      }));
    }
    out.results = results;
    return out;
  }
  const lang = getLanguageForShortCodeGuarded(a.lang);
  const s = lang.getSynthesizer();
  out.class = s.constructor.FQCN;
  for (const c of a.calls) {
    results.push(safe(() => {
      switch (c.m) {
        case 'synthesize': {
          let t = new AnalyzedToken(str(c.tok), null, str(c.lemma));
          const tag = str(c.tag);
          if (c.tokNull === true) t = null;
          if (c.re !== undefined) return s.synthesize(t, tag, c.re);
          return s.synthesize(t, tag);
        }
        case 'spell': return s.getSpelledNumber(str(c.n));
        case 'roman': return s.getRomanNumber(str(c.n));
        case 'possibleTags': return s.getPossibleTagsForSynthesis();
        case 'targetPosTag': return s.getTargetPosTag(strs(c.tags), str(c.target));
        case 'posTagCorrection': return s.getPosTagCorrection(str(c.tag));
        case 'lookup': return s.lookup(str(c.lemma), str(c.tag));
        default: throw new IllegalArgumentException(`unknown method: ${c.m}`);
      }
    }));
  }
  out.results = results;
  return out;
}
