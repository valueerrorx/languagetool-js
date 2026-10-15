// JS twin of harness op "word-tokenize" (WordTokOps#wordTokenize); out-of-scope languages are notPorted (DEV-006).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { WordTokenizer } from '../../src/core/text/tokenizers/WordTokenizer.js';
import { safe, str } from './_text-common.mjs';

const OUT_OF_SCOPE = new Set(['ar', 'ast', 'be', 'br', 'ca', 'crh', 'da', 'el', 'eo', 'es', 'fa', 'ga', 'gl', 'it', 'ja', 'km', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'tl', 'uk', 'zh']);

// Java: Languages#getLanguageForShortCode(String); DEV-006: languages outside the wave-1 modules are notPorted
function languageFor(code) {
  if (/-x-simple-language/.test(code) || (OUT_OF_SCOPE.has(code.split('-')[0]) && code !== '')) {
    throw Object.assign(new Error(`language ${code} is out of scope (DEV-006)`), { notPorted: true });
  }
  return Languages.getLanguageForShortCode(code);
}

// each case file is its own JVM in the oracle: language instances (and their cached tokenizers) start fresh
export function beginCase() {
  for (const l of Languages.get()) {
    l.setSentenceTokenizer(null);
    l.setWordTokenizer(null);
  }
}

// Java: WordTokOps#wordTokenize(JsonNode)
export function run(a) {
  let tok;
  let lang = null;
  if ('core' === (a.tokenizer === undefined ? null : str(a.tokenizer))) tok = new WordTokenizer();
  else {
    lang = languageFor(a.lang);
    tok = lang.getWordTokenizer();
  }
  const split = a.split === true;
  const st = split ? (lang !== null ? lang.getSentenceTokenizer() : Languages.getLanguageForShortCode('en-US').getSentenceTokenizer()) : null;
  const out = {};
  out.class = tok.constructor.FQCN;
  out.tokenizingCharacters = tok instanceof WordTokenizer ? tok.getTokenizingCharacters() : null;
  out.results = a.texts.map((t) => safe(() => {
    if (!split) return tok.tokenize(str(t));
    const sents = st.tokenize(str(t));
    const toks = sents.map((s) => tok.tokenize(s));
    return { sentences: sents, tokens: toks };
  }));
  return out;
}
