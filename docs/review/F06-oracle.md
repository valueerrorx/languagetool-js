# F06 oracle checkpoint (X-I18N)

Status: done. Fixtures tests/golden/X-I18N (732 KB), generator oracle/scripts/gen-cases-i18n.mjs, Java ops oracle/harness/src/ltjs/oracle/I18nOps.java (i18n-bundle, i18n-format, i18n-buildinfo).
Cases: bundle-dump-wave1 (6 langs), bundle-dump-other (21: default, de, en, fr-CA, variants, languages without own bundle), i18n-format-keys (157), i18n-format-patterns (35), build-info (buildDate+commit normalised).
Raw MessageFormat is covered by X-PROBE-FORMAT (messageformat-misc 336, -numbers 1845 ops), not duplicated.
No {0,number}/{0,choice} in any LT bundle; only the synthetic pattern case uses them.
JS adapters: none (ops listed as NOT PORTED).
