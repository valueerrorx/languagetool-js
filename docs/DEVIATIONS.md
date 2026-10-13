# Approved deviations

Only entries approved by the user. Format: ID | Java behaviour | JS behaviour | reason | approved (date)


## PROPOSED (awaiting user approval, not yet approved)
- P-001 | ngram/Lucene, fastText, word2vec/ONNX/BERT/neural, remote/gRPC/AI rules, Grammalecte, NER, premium/JWT/Redis/A-B tests, telemetry | functional in Java when configured | not available; behaviour as if not configured | D-005 scope
- P-002 | DB-backed user dictionary (/v2/words with DB), Prometheus exporter, JMX ActiveRules MBean, HTTPS/JKS server | functional when configured | not available; no-config behaviour identical | D-026
