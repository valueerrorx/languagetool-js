# F60 oracle (X-FRDISAMB)
Status: DONE (44 cases, golden written). `npm run oracle -- X-FRDISAMB`; `npm run parity -- X-FRDISAMB`. Generator `node oracle/scripts/gen-cases-frdisamb.mjs`. Env: pinned oracle env.
Op: `analyze-raw` (existing, compare check-pipe): raw/post/pre-disambiguation dumps with readings through the fr chain (FrenchHybridDisambiguator: multiwords.txt, disambiguation.xml; FR-0024, FR-0153, FR-0172).
Cases: analyze-corpus-00..14 (300 fr sentences), analyze-edge-00..06 (25 elision/hyphen sentences + edge inputs), analyze-multiword-00..07 (160 multiwords.txt entries), analyze-hyphen-00..07 (160 hyphenated_words.txt entries, FR-0173), analyze-global-00..01 (spelling_global multi-word), analyze-variant-{fr-FR,fr-BE,fr-CA,fr-CH}.
Reused, not duplicated: disambiguation.xml examples/rule matches are X-DISAMB ex-fr/rmd-fr/rule-fr/xml-fr; FrenchMultitokenSpeller (FR-0025) is X-SPELLRULE misc-multitoken fr.
## UNORACLED
- Direct hyphenated-word lookup: no public entry point beyond FrenchMultitokenSpeller (covered by misc-multitoken and JLanguageToolTest#testMultitokenSpeller port).
- Other fr variants beyond BE/CA/CH, server-side language-detection fallback.
## Parity state
No JS adapters yet for fr real disambiguation: cases NOT PORTED until F60 port.
