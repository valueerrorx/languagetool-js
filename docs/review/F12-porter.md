# F12 porter checkpoint
- [ ] core WordTokenizer.js (+ interface Tokenizer)
- [ ] De/En/Fr word tokenizers + hooks in languages
- [ ] adapters word-tokenize, wordtok-static
- [ ] tests (4 JUnit)
- [ ] parity, lint, perf-watch, report
- done: core WordTokenizer, Tokenizer, De/En/Fr tokenizers, minimal tagging (TaggedWord, MorfologikTagger, ManualTagger, CombiningTagger, BaseTagger partial, EnglishTagger/FrenchTagger tag(List) only; F13 extends), register.js imports. Next: adapters, tests, parity
- all done: parity X-WORDTOK 42 pass/2 notPorted; full parity 324 pass 0 fail; tests+lint green
