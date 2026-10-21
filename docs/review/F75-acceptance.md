# F75 Final acceptance, wave 1 (2026-10-22)

| Area | verified | ported (blocked) | later | n/a |
|---|---|---|---|---|
| core | 274 | 10 | 13 | 19 |
| cli | 63 | 2 | 3 | 1 |
| server | 124 | 2 | 25 | 14 |
| de | 138 | 0 | 8 | 3 |
| en | 120 | 1 | 10 | 1 |
| fr | 51 | 0 | 6 | 0 |
| **wave 1** | **770** | **17** | 65 | 38 |

- The 17 ported IDs are blocked by wave 2 / DEV-006 (12), DEV-001 (3) or unoracleable (CLI-0045, SRV-0015). See RESIDUALS.md.
- Full `npm test`: 1164 pass, 23 skipped, exit 0 (371 s).
- Lint clean. plan_check: missing [], dups [], bad [].
- Independent Java scan (AUDIT-java-scan.md / AUDIT-diff.md): gaps closed in F74.
- Reviewer audit (AUDIT-reviewer.md): HIGH 0. The MED finding is invalid (see lead note). The LOW findings are covered by DEV-001/006.
- End-to-end: X-CORPUS has 444/444 pass. X-AUDIT is pass or DEV.
- Deviations: DEV-001..027, all approved by D-055/D-056 or explicitly.
- Open: F73 perf. Warm de/en are below the 0.8 ratio target; rerun on a quiet machine.
