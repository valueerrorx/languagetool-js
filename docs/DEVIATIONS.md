# Approved deviations

Only entries approved by the user. Format: ID | Java behaviour | JS behaviour | reason | approved (date)


## Approved
- DEV-001 | ngram/Lucene, fastText, word2vec/ONNX/BERT/neural, remote/gRPC/AI rules, Grammalecte, NER, premium/JWT/Redis, remote A/B tests (LocalAbTestService stays ported, D-027), telemetry | functional in Java when configured | not available; behaviour as if not configured | D-005 scope | approved by user 2026-10-13
- DEV-002 | DB-backed user dictionary (/v2/words with DB), Prometheus exporter, JMX ActiveRules MBean, HTTPS/JKS server | functional when configured | not available; no-config behaviour identical | D-026, D-027, D-028 (incl. gRPC RemoteSynthesizer/GRPCServer) | approved by user 2026-10-13
- DEV-003 | Exception stack traces: Java `\tat ...` frames and `... n more` | identical exception header, `Caused by:` lines and exit code; frame lines in Java format with JS content, normalised in fixtures | JS cannot reproduce JVM frames | approved by user 2026-10-13
- DEV-004 | StackOverflowError / OutOfMemoryError thresholds | handling code and messages ported 1:1; trigger input sizes differ (V8 vs JVM limits) | runtime limits differ | approved by user 2026-10-13
- DEV-005 | JDK HttpServer transport details: idle/request timeouts, header-size limits, half-closed sockets | not reproduced; everything reachable with well-formed HTTP/1.x requests plus "Bad request URI" is byte-exact (D-024) | scope of D-024 "where reachable" | approved by user 2026-10-13
- DEV-006 | /v2/languages, "Supported language codes are: ..." error lists contain all ~60 Java languages (detection: see DEV-008, D-051) | port lists/detects only in-scope languages (wave 1: de, en, fr; after wave 2: 9); requests for out-of-scope language codes give the Java unknown-language error | D-035, ca/pt/... not ported | approved by user 2026-10-13
- DEV-007 | Java interrupts a running regex check at the next charAt (InterruptibleCharSequence) on timeout | V8 cannot interrupt a running regex; a catastrophic-backtracking regex keeps its worker busy until it returns (longer pool occupancy -> possible extra 503s, different q: values in logs) | V8 limitation | approved by user 2026-10-13
- DEV-008 | Java checks a text auto-detected as a not-ported language (e.g. es before wave 2) with that language's rules | port detects with all Java languages (identical detectedLanguage name/code/confidence/source) but returns 0 matches for languages without a port; out-of-scope languages exist in the port only as detection descriptors (code, name, variants, common words, profile) | D-051 | approved by user 2026-10-16
