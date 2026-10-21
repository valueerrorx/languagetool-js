// JS twin of harness op "sentence-tokenize" (SrxOps#sentenceTokenize); out-of-scope languages are notPorted (DEV-006).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { isPortedBase } from '../lib/scope.mjs';
import { SimpleSentenceTokenizer } from '../../src/core/text/tokenizers/SimpleSentenceTokenizer.js';
import { SRXSentenceTokenizer } from '../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { safe, str } from './_text-common.mjs';

const OUT_OF_SCOPE = new Set(['ar', 'ast', 'be', 'br', 'ca', 'crh', 'da', 'el', 'eo', 'es', 'fa', 'ga', 'gl', 'it', 'ja', 'km', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'tl', 'uk', 'zh']);
// W02: a language is out of scope only while the port has not registered it
const stillOut = (code) => OUT_OF_SCOPE.has(code) && !isPortedBase(code);

// Java: Languages#getLanguageForShortCode(String); DEV-006: languages outside the wave-1 modules are notPorted
function languageFor(code) {
  if (/-x-simple-language/.test(code) || (stillOut(code.split('-')[0]) && code !== '')) {
    throw Object.assign(new Error(`language ${code} is out of scope (DEV-006)`), { notPorted: true });
  }
  return Languages.getLanguageForShortCode(code);
}

// each case file is its own JVM in the oracle: language instances (and their cached tokenizer) start fresh
export function beginCase() {
  for (const l of Languages.get()) l.setSentenceTokenizer(null);
}

// Java: SrxOps#sentenceTokenize(JsonNode)
export function run(a) {
  let tok;
  const kind = a.tokenizer === undefined ? null : str(a.tokenizer);
  if ('simple' === kind) tok = new SimpleSentenceTokenizer();
  else if ('srx' === kind) tok = new SRXSentenceTokenizer(languageFor(a.lang), a.srx);
  else tok = languageFor(a.lang).getSentenceTokenizer();
  const out = {};
  out.class = tok.constructor.FQCN;
  out.initialSingleLineBreaksMarksPara = tok.singleLineBreaksMarksPara();
  const modes = a.modes.map(Boolean);
  out.results = a.texts.map((t) => {
    const r = {};
    for (const mode of modes) {
      r[String(mode)] = safe(() => {
        tok.setSingleLineBreaksMarksParagraph(mode);
        const s = tok.tokenize(str(t));
        return { sentences: s, singleLineBreaksMarksPara: tok.singleLineBreaksMarksPara() };
      });
    }
    return r;
  });
  return out;
}
