# F44 oracle (X-OPENNLP)
Status: DONE (25 cases, 25 requests, golden 4.1M). `npm run oracle -- X-OPENNLP`; `npm run parity -- X-OPENNLP`. Generator `node oracle/scripts/gen-cases-opennlp.mjs` (also writes X-ENCHUNK; wipes both case dirs; seeded PRNG; rerun both IDs after regenerating). Compare: jsonl. Env: pinned oracle env.
Java: oracle/harness/src/ltjs/oracle/OpenNlpOps.java (dispatch in Harness.java, probe mapper prefix `opennlp-`). Models are loaded exactly like EnglishChunker (Tools.getStream with SHA-256).
- opennlp-model: manifest properties (Component-Name, OpenNLP-Version, Language, Timestamp, Training-*, useAlphaNumericOptimization), outcome lists, GISModel class, POS tag dictionary presence, factory (EN-0029, EN-0204..0206).
- opennlp-run {texts}: per text TokenizerME tokens, token probabilities, spans; POSTaggerME tags, probs(), topKSequences (beam 3: outcomes, probs, score); ChunkerME chunks, probs(), topKSequences (beam 10), chunkAsSpans (EN-0031..0034). Input apostrophe U+2019 replaced by ' as EnglishChunker#tokenize does.
- opennlp-eval {model: token|pos|chunk, contexts}: GISModel#eval double[] (Double.toString and raw bits hex), best outcome, getAllOutcomes (EN-0030). Includes empty, unknown predicates, repeated predicates.
- opennlp-math {fn: exp|log|sqrt|pow2|log10|expm1, values}: StrictMath result, toString and bits (X-MATH): specials (+-0, NaN, +-Inf, subnormals, overflow 709.78, underflow -745.13), 150 uniform in [-50,50] (GIS range), 100 in [-1,1], 80 in [-745,710], 20 tiny. math-errors: unknown fn -> IllegalArgumentException.
Cases: model, run-corpus-00..09 (300 sentences sampled from oracle/corpus/en), run-edge-00..03 (empty, space, punctuation-only, numbers, URLs, apostrophes incl. U+2019, umlauts/German, emoji/astral, U+FEFF, tabs/newlines, ALL CAPS, 2400+ char and 4000 char single token, CJK/Arabic), eval-{pos,token,chunk}, math-*.
Note: all doubles are strings (Java Double.toString), never JSON numbers.
## UNORACLED
- Training of models, TokenizerME with other models, POSTaggerME with custom tag dictionaries/beam sizes other than the defaults: not used by LanguageTool.
- BeamSearch is covered through topKSequences/probs of POS and chunker only (no direct class-level harness; its inputs are fixed by the models).
## Parity state
No adapters (src not ported): all 25 cases NOT PORTED.
