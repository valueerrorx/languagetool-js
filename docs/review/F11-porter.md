# F11 porter checkpoint
- [x] src/lib/srx/{Util,SrxDocument,Srx2SaxParser,SrxTextIterator}.js, src/core/text/tokenizers/{SentenceTokenizer,SrxTools,SRXSentenceTokenizer,SimpleSentenceTokenizer}.js; hooks in German/English/French + register.js
- [x] adapters sentence-tokenize/srx-segment/srx-rules; parity X-SRX 50 pass, 0 fail, 2 notPorted (x-simple-language, pl-PL/zz error request)
- [x] tests: tests/core/{German,English}SRX*, FrenchSentenceTokenizerTest, SRXSentenceTokenizerTest (+Simple), tests/lib/srx.test.js, tests/lib/java/regex/lookbehind-pairs.test.js
- [x] regex lib fix: anchored matches (match/lookingAt/matches) now use the own matcher for texts with surrogate pairs when look-behind is not unit-safe (Java Behind starts inside pairs)
- [x] oracle/parity.mjs: optional adapter hook beginCase() (fresh JVM per case => reset cached tokenizers)
- [ ] full parity run, final report
