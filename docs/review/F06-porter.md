# F06 porter checkpoint

- [x] 1 scripts/resources.mjs + scripts/build-info.mjs + scripts/lib/zip.mjs; `npm run resources` -> resources/ (370 files, MANIFEST.sha256, .dup/<n>/ for paths present in several modules, all MessagesBundle* of all language modules, git.properties)
- [x] 2 Locale.js, Properties.js, ResourceBundle.js, io.js, core/resources/{ResourceDataBroker,ClassBroker,LtStatics,ResourceBundleTools,ResourceBundleWithFallback}.js, core/LtBuildInfo.js (statics: brokers, temp files, password switch)
- [x] 3a DecimalFormat.js (en_US, HALF_EVEN, no exponent patterns), boxed.js BigInteger#bitLength
- [x] 3b MessageFormat.js DateFormat.js Tools.js, adapters i18n-{format,bundle,buildinfo}; next: run parity, tests, lint, .gitignore decision
- [x] 3c tests/lib/java/i18n.test.js, parity 5/5 X-I18N, resources/ = generated (gitignored, npm run resources reproducible: identical MANIFEST on rerun), errors.js Throwable#cause getter
