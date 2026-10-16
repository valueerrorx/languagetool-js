# F19 porter checkpoint
All done: serializer src/core/RuleMatchesAsJsonSerializer.js (PORT-MAP path; adapter updated), ConfidenceKey inside it, adapter fixes (_synth-rules sourceFile/issueType/contextForSure, dynamic langs, SuggestionType), tests/core/RuleMatchesAsJsonSerializerTest.test.js.
Case-level notPorted ({notPorted:true} per case, comparator skips) for languages outside wave-1 (DEV-006, e.g. ca, pt, es).
Results: parity X-JSON 18 pass/0 fail/9 not ported (de-DE); full parity 503/0/132; npm test 344 pass; lint clean.
