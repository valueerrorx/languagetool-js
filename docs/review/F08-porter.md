# F08 porter checkpoint
- [x] bytecode read (javap, morfologik 2.2.0): FSA/CFSA2/FSA5/ByteSequenceIterator/FSATraversal, encoders (decode only used), DictionaryLookup/Iterator/WordData/BufferUtils, DictionaryMetadata/Attribute
- [x] errors.js: +UnmappableCharacterException, NoSuchFileException, BufferOverflowException, UnsupportedCharsetException, IllegalCharsetNameException (tests requested)
- [x] src/lib/fsa/{charsets,buffers,FSA,CFSA2,FSA5,encoders,metadata,DictionaryLookup}.js written
- [x] adapters oracle/adapters/fsa-{common,info,lookup,enum}.mjs; npm run parity -- X-FSA: 36 pass, info-synthetic 1/62 notPorted (noInfo: random temp dir in message)
- [x] tests/lib/fsa/fsa.test.js (9 tests); lint clean; npm test 145 pass; full parity 165 pass / 0 fail / 51 notPorted (all pre-existing except X-FSA/info-synthetic 1 request)
- perf (en english.dict, node 24): ~800k lookups/s incl. stem+tag decode; load 0.3-3.6 ms per dict (readFileSync + subarray views)
