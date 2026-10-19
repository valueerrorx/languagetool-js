# F45 oracle (X-ENCHUNK)
Status: DONE (42 cases, 42 requests, golden 8.1M). `npm run oracle -- X-ENCHUNK`; `npm run parity -- X-ENCHUNK`. Generator `node oracle/scripts/gen-cases-opennlp.mjs` (shared with X-OPENNLP). Env: pinned oracle env.
Reused (not duplicated): disambiguation.xml examples and rule-match disambiguation for EN-0160 are X-DISAMB ex-en-*/rmd-en-*; chunk-run en MultiWordChunker chains X-CHUNK real-en-*/corpus-en-*; X-CHECK-PIPE analyze-en-US stays. This ID adds the real EnglishChunker and the full en pipeline on a corpus.
- opennlp-enchunker {texts} (OpenNlpOps.enchunker, reflection into package-private EnglishChunker#getChunkTagsForReadings/tokenize and EnglishChunkFilter#filter): OpenNLP tokens, chunker output before the filter (token, tags, readings token, startPos or null when unmappable), after EnglishChunkFilter (B-/I-/E-NP-singular/plural), and tags assigned via Chunker#addChunkTags on a no-op-chunker raw sentence (EN-0026, EN-0027).
- analyze-raw en-US (existing op, comparator check-pipe): raw / post-disambiguation (EnglishHybridDisambiguator: multiwords.txt, spelling_global, disambiguation.xml) / pre-disambiguation dumps with readings and chunk tags (EN-0025, EN-0173, EN-0160).
Cases: enchunker-corpus-00..09, enchunker-edge-00..03 (same 300 sentences + edge inputs as X-OPENNLP), analyze-corpus-00..14 (20 sentences each), analyze-edge-00..03, analyze-multiword-00..05 (120 multiwords.txt entries as "We met X yesterday. X is here."), analyze-variant-{en-GB,en-CA,en-AU} (20 sentences each).
## UNORACLED
- Other languages and en-NZ/en-ZA variants (same language class chain).
- Disambiguation under server-side language-detection fallback.
## Parity state
No adapters (src not ported): all 42 cases NOT PORTED.
