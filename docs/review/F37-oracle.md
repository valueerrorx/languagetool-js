# F37 oracle (X-REPLACE)
Status: DONE (26 cases, 219 requests, golden 3,4M). `npm run oracle -- X-REPLACE [<case>]`; `node oracle/parity.mjs X-REPLACE`. Generator `node oracle/scripts/gen-cases-replace.mjs` (wipes oracle/cases/X-REPLACE only). Compare: jsonl. Env: pinned oracle env.
Java: oracle/harness/src/ltjs/oracle/ReplaceOps.java (op replace-check; Harness.java dispatch). Adapter oracle/adapters/replace-check.mjs always throws notPorted.
- args.mode "rules" (default): delegates to StyleOps.check (format as F36: {lang, ids, cases[{text, level, paraMode}], extra}); real language rule lists. "aho": {map tree|linked|hash, entries[[k,v]], texts, get} -> {size, texts[{hits[[begin,end,value]], matches, first}|{error}], get}. "confusion": {lang, file} -> ConfusionSetLoader.loadConfusionPairs -> {pairs{key:[{str,factor,bidi,terms,upper}]}} or {error}. "shortdesc": {lang, words} -> {descs}.
- Derived inputs: texts are generated from the Java resource files (replace.txt, contractions.txt, compounds.txt, coherency.txt, specific_case.txt, check_case.txt) with case variants; expected values only from Java.
## Cases per ID
- CORE-0265 wrongword-en-US, wrongword-de-DE (6 en / 6 de word pairs, both directions, context words, case, empty).
- CORE-0270 contractions-en-US (EN_CONTRACTION_SPELLING, AbstractSimpleReplaceRule; lemma/WARN path not reachable here).
- CORE-0271 replace-en-US/DE-DE, replace-en-GB/NZ/AU/CA/ZA (variant rules; AU/CA/ZA have none), profanity-en-US (PROFANITY, plain english, diacritics); multiword keys, UPPER/Capitalised variants.
- CORE-0426 checkcase-nl, checkcase-ca (case variants, sentence start).
- CORE-0272 compound-en-US, compound-de-DE (spaced/hyphen/joined/upper variants, `+ * $` markers, cities).
- CORE-0273 dash-en-US (en/em dash, spaced, hyphen, `--`; PICKY since rule is picky, plus DEFAULT run).
- CORE-0449 aho-corasick (11 key sets x TreeMap/LinkedHashMap/HashMap: overlap, nested, unicode/surrogates, duplicate and empty keys, empty map, 400 keys, hit order, matches/findFirst/get).
- CORE-0274 confusion-sets (22 file variants x en/de: one-way, descriptions, comments, ordering/duplicate/format/number errors, long overflow, CRLF, real confusion_sets.txt).
- CORE-0279 shortdesc (en, de real word lists, fr/es/nl without file, missing/empty/whitespace words). Also visible via confusion descriptions.
- CORE-0275 coherency-en-US, coherency-de-DE (cross-sentence/paragraph, case, repeats), coherency-modes (paraMode).
- CORE-0425 specificcase-en-US (case variants, sentence start, quotes, possessive).
- CORE-0423 punctuation-uk (uk PunctuationCheckRule instantiated via extra: no uk rule list entry), CORE-0424 spacebefore-fa, spacebefore-km.
## Gaps / notes
- No UNORACLED IDs. AbstractSimpleReplaceRule lemma branch (CORE-0270 WARN) needs a tagged language with replace lemma lists: not covered.
- AbstractCheckCaseRule has no en/de instance: covered via nl/ca. AbstractPunctuationCheckRule only uk; SpaceBefore only fa/km.
- No NoSuchElement fallback for ScoredConfusionSet (CORE-0274): not loaded by any loader here, UNORACLED beyond ConfusionPair/String.
- Direct ConfusionSet/ScoredConfusionSet constructors are not exercised (no harness op).
## Parity state
All 26 cases NOT PORTED.
