# Performance watch list (D-046: warm >= 0.8x Java) — measure vs Java in the perf step

| Step | Component | JS measured | Note |
|---|---|---|---|
| F05 | regex compile / find | 15 µs / 26 µs per pattern/run | |
| F07 | XML scanner | en grammar.xml 8.3 MB in 162 ms | |
| F08 | FSA lookup | ~800k lookups/s (en tagger) | |
| F11 | SRX sentence tokenizer | ~5,500 sentences/s, 620 kchar/s (en corpus) | risk: may dominate check time; compare with Java early |
| F11 | SRX RuleMatcher substring per before-match O(n·m); surrogate-pair texts use interpreter | perf on very long / emoji-heavy texts |
| F12 | word tokenizers (corpus sentences, warm) | en 1.33 M tokens/s (3.4 Mchar/s), fr 0.54 M tokens/s, de 3.5 M tokens/s | en/fr include dictionary lookups for hyphen/apostrophe words |
| F13 | taggers tag(List) (corpus sentences incl. whitespace tokens, warm) | en 0.35 M tokens/s, fr 0.32 M tokens/s | dominated by FSA lookups (several per token); compare with Java in the perf step |
