# F22 oracle checkpoint: X-TAGGER-DE (DE-0024..0026, DE-0031, DE-0032, DE-0170, DE-0171, DE-0200)

Status: IN PROGRESS. Plan: new ID X-TAGGER-DE (X-TAGGER untouched); generator oracle/scripts/gen-cases-tagger-de.mjs reusing ops tag / manual-tagger (oracle/harness TagOps.java, see F13-oracle.md). Inputs from X-WORDTOK de case files + oracle/corpus/de + edge word list + spelling.txt/added/removed forms.
Generator written, 81 case files; running oracle.

Status: DONE. `node oracle/scripts/gen-cases-tagger-de.mjs` -> oracle/cases/X-TAGGER-DE (51 files, 14.2 MB); `npm run oracle -- X-TAGGER-DE` -> tests/golden/X-TAGGER-DE (<15 MB). Reuses ops tag / manual-tagger unchanged (tokens included in tag op output). Env: D-018 pin, JDK 17.
Cases: words-<de-DE|de-AT|de-CH>-N (~1100 edge words as single-token lists, CH/AT: every 3rd + all ss/ß words), spelling-words-* (spelling.txt /P /A prefix_verb _in plain expansions), sentences-*, edge-* (X-WORDTOK), corpus-* (de-DE full, AT/CH first 25 paragraphs), examples-*, sequences, errors, long, wordtagger-N (added/removed/dict/internTags/language/combining), manual-words-added/removed, edge-de-DE-x-simple-language.
Taggers observed: de-DE/AT -> GermanTagger, de-CH -> SwissGermanTagger.
Parity: no JS adapters for German yet (tag/manual-tagger adapters exist from F13; German tagger not ported -> fails/NOT PORTED until F22 port).
