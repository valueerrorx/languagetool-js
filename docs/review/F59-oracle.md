# F59 oracle (X-DERULES-XML, X-DECHECK)
Status: DONE (X-DERULES-XML 56 cases, 42M, 73 responses; X-DECHECK 60 cases, 9.6M, 1234 responses; all ok). `npm run oracle -- X-DERULES-XML|X-DECHECK`; generator `node oracle/scripts/gen-cases-dexml.mjs`. Env: pinned oracle env (D-018), fixed clock.
Ops: no new harness code; the F50 op `en-rulelist` (kinds direct/lt) and `rule-examples`/`check`/`analyze`/`tools-correct`/`rules-list`/`replace-check shortdesc` are language-generic. JS adapter oracle/adapters/en-rulelist.mjs is reused (any lang).
## Cases
- X-DERULES-XML: rulelist-direct-de (de-DE/AT/CH/de x mother tongue none/en/fr), rulelist-all-<de-DE|de-AT|de-CH|de> (5328/5328/5336/5289 rules), rulelist-all-de-DE-mt-<en|fr>, rulelist-contentop, examples-de-DE-000..024 (150 rules each, grammar+style+variant XML, restricted + unrestricted), examples-<de-AT|de-CH>-variant(+picky), -sample (60 de-DE ids under variant), examples-de-DE-variant-picky, examples-de-DE-tempoff-sample, examples-de-short-code, examples-de-DE-off-N / -tempoff-N (default-off / temp_off rules, with and without enableTempOff).
- X-DECHECK: corpus-<de-DE|de-AT|de-CH>-<default|picky>-0..5 and corpus-de-default (ids [], 14 paragraphs each), edge-<variant>, positions-de-DE (DE-0226: "Stundenkilometer", "TRGS - Technische Regeln fuer Gefahrstoffe" at PICKY/ALL, plus modes), modes-de-DE, tones-de-DE, tempoff-<variant>, selection-de-DE, mothertongue-en/-fr, analyze-de, tools-correct-de, markup-like-de, shortdesc-NN + shortdesc-variants (DE-0181).
## Leftovers to re-run once F59 lands (existing cases, notPorted for lack of German#getRelevantRules)
- X-DERULES-AC: combined-de-DE, agreement-* / case-* requests with compound check (AgreementRule initLt via new JLanguageTool(de), F54/F55; 7 notPorted).
- X-DERULES-A: *-full-targeted-* (infinitiv, subjverb, verbagree; de-DE/AT/CH). X-DERULES-B full-corpus-*/full-targeted. X-DEFILTERS cases needing the rule list (suppressifany). Run with `npm run parity -- <ID>`.
## UNORACLED
- de-DE-x-simple-language: not in F59 scope (title lists de, de-DE, de-AT, de-CH); only analyze in X-DECHUNK.
- N-gram LM rules (GermanConfusionProbabilityRule, ProhibitedCompoundRule, UpperCaseNgram), remote rules, premium: only null-LM behaviour in rulelist-direct-de.
- Mother tongues es/nl etc. out of scope (DEV-006); en/fr used.
