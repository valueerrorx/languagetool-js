# Approved deviations

Only entries approved by the user. Format: ID | Java behaviour | JS behaviour | reason | approved (date)


## Approved
- DEV-001 | ngram/Lucene, fastText, word2vec/ONNX/BERT/neural, remote/gRPC/AI rules, Grammalecte, NER, premium/JWT/Redis, remote A/B tests (LocalAbTestService stays ported, D-027), telemetry | functional in Java when configured | not available; behaviour as if not configured | D-005 scope | approved by user 2026-10-13
- DEV-002 | DB-backed user dictionary (/v2/words with DB), Prometheus exporter, JMX ActiveRules MBean, HTTPS/JKS server | functional when configured | not available; no-config behaviour identical | D-026, D-027, D-028 (incl. gRPC RemoteSynthesizer/GRPCServer) | approved by user 2026-10-13
- DEV-003 | Exception stack traces: Java `\tat ...` frames and `... n more` | identical exception header, `Caused by:` lines and exit code; frame lines in Java format with JS content, normalised in fixtures | JS cannot reproduce JVM frames | approved by user 2026-10-13
- DEV-004 | StackOverflowError / OutOfMemoryError thresholds | handling code and messages ported 1:1; trigger input sizes differ (V8 vs JVM limits) | runtime limits differ | approved by user 2026-10-13
- DEV-005 | JDK HttpServer transport details: idle/request timeouts, header-size limits, half-closed sockets | not reproduced; everything reachable with well-formed HTTP/1.x requests plus "Bad request URI" is byte-exact (D-024) | scope of D-024 "where reachable" | approved by user 2026-10-13
- DEV-006 | /v2/languages, "Supported language codes are: ..." error lists, language detection candidates contain all ~60 Java languages | port lists/detects only in-scope languages (wave 1: de, en, fr; after wave 2: 9); requests for out-of-scope language codes give the Java unknown-language error | D-035, ca/pt/... not ported | approved by user 2026-10-13
