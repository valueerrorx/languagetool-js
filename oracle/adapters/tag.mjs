// JS twin of harness op "tag" (TagOps#tag); out-of-scope languages are notPorted (DEV-006).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { componentClassName } from '../../src/core/language/components.js';
import { safe, str } from './_text-common.mjs';

const OUT_OF_SCOPE = new Set(['ar', 'ast', 'be', 'br', 'ca', 'crh', 'da', 'el', 'eo', 'es', 'fa', 'ga', 'gl', 'it', 'ja', 'km', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'tl', 'uk', 'zh']);

// Java: Languages#getLanguageForShortCode(String); DEV-006: languages outside the wave-1 modules are notPorted
function languageFor(code) {
  if (/-x-simple-language/.test(code) || (OUT_OF_SCOPE.has(code.split('-')[0]) && code !== '')) {
    throw Object.assign(new Error(`language ${code} is out of scope (DEV-006)`), { notPorted: true });
  }
  return Languages.getLanguageForShortCode(code);
}

// each case file is its own JVM in the oracle: language instances start fresh
export function beginCase() {
  for (const l of Languages.get()) {
    l.setSentenceTokenizer(null);
    l.setWordTokenizer(null);
  }
}

// Java: TagOps#tokenInfo(AnalyzedTokenReadings)
function tokenInfo(t) {
  return [
    t.getToken(), t.getStartPos(), t.getEndPos(),
    (t.isTagged() ? 1 : 0) | (t.isWhitespace() ? 2 : 0) | (t.isLinebreak() ? 4 : 0) | (t.isWhitespaceBefore() ? 8 : 0) | (t.hasTypographicApostrophe() ? 16 : 0),
    t.getReadings().map((r) => [r.getToken(), r.getLemma(), r.getPOSTag()]),
    t.getChunkTags().map((c) => c.getChunkTag()),
  ];
}

// Java: TagOps#tagTokens(Tagger,List)
function tagTokens(tagger, toks) {
  return tagger.tag(toks).map(tokenInfo);
}

// Java: TagOps#tag(JsonNode)
export function run(a) {
  const lang = languageFor(a.lang);
  const tagger = lang.getTagger();
  const wt = lang.getWordTokenizer();
  const st = lang.getSentenceTokenizer();
  const split = a.split === undefined || a.split === true;
  const out = {};
  out.taggerClass = tagger === null ? null : componentClassName(tagger);
  out.wordTokenizerClass = wt.constructor.FQCN;
  if (a.tokenLists !== undefined) {
    out.results = a.tokenLists.map((tl) => safe(() => tagTokens(tagger, tl.map(str))));
  } else {
    out.results = a.texts.map((t) => safe(() => {
      const sents = split ? st.tokenize(str(t)) : [str(t)];
      return sents.map((s) => {
        const toks = wt.tokenize(s);
        return { tokens: toks, tagged: tagTokens(tagger, toks) };
      });
    }));
  }
  return out;
}
