# Approved deviations

Only entries approved by the user. Format: ID | Java behaviour | JS behaviour | reason | approved (date)


## Approved
- DEV-001 | ngram/Lucene, fastText, word2vec/ONNX/BERT/neural, remote/gRPC/AI rules, Grammalecte, NER, premium/JWT/Redis, remote A/B tests (LocalAbTestService stays ported, D-027), telemetry | functional in Java when configured | not available; behaviour as if not configured | D-005 scope | approved by user 2026-10-13
- DEV-002 | DB-backed user dictionary (/v2/words with DB), Prometheus exporter, JMX ActiveRules MBean, HTTPS/JKS server | functional when configured | not available; no-config behaviour identical | D-026, D-027, D-028 (incl. gRPC RemoteSynthesizer/GRPCServer) | approved by user 2026-10-13
