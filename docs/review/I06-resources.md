# I06: resource files not shipped

Source: runtime trace (docs/review/I06-trace/: all variants at default+picky plus the full `npm test`) found 203 never-read files; each was checked against the Java main sources and src/.
The exclude list is scripts/lib/resource-excludes.mjs (applied in scripts/resources.mjs, so resources/ and the npm packages both lose the files). tests/resources/ResourceExcludes.test.js asserts the files are absent.

## language-detection profiles of languages that are not in the distribution language list (DefaultLanguageIdentifier#getLanguageCodes never asks for them)

43 files, 2170252 bytes

- languages/tr
- languages/ast
- languages/lt
- languages/cs
- languages/yi
- languages/ml
- languages/vi
- languages/ms
- languages/hu
- languages/id
- languages/mt
- languages/cy
- languages/bg
- languages/hi
- languages/pa
- languages/an
- languages/mr
- languages/mk
- languages/gu
- languages/gl
- languages/oc
- languages/is
- languages/lv
- languages/so
- languages/te
- languages/sr
- languages/hr
- languages/sw
- languages/ht
- languages/he
- languages/sq
- languages/eu
- languages/kn
- languages/th
- languages/ur
- languages/fi
- languages/et
- languages/af
- languages/ko
- languages/bn
- languages/no
- languages/ne
- org/languagetool/resource/ast/ast.profile

## languages.shorttext/ profiles: the short-text n-gram profiles of the Java distribution are never loaded (no code refers to the directory)

17 files, 944791 bytes

- languages.shorttext/nl
- languages.shorttext/pt
- languages.shorttext/tr
- languages.shorttext/ro
- languages.shorttext/cs
- languages.shorttext/da
- languages.shorttext/sv
- languages.shorttext/es
- languages.shorttext/vi
- languages.shorttext/id
- languages.shorttext/en
- languages.shorttext/fi
- languages.shorttext/it
- languages.shorttext/pl
- languages.shorttext/de
- languages.shorttext/no
- languages.shorttext/fr

## training/candidate/work-in-progress data and ML models that no code refers to

30 files, 4865879 bytes

- org/languagetool/resource/es/test-tagged.txt
- org/languagetool/resource/es/verb_noun.txt
- org/languagetool/resource/es/test.txt
- org/languagetool/resource/es/confusion_set_candidates.txt
- org/languagetool/resource/en/errors.txt
- org/languagetool/resource/en/SynthDictionaryBuilder3603914528902335992.txt
- org/languagetool/resource/en/SynthDictionaryBuilder3205662321312237445.txt
- org/languagetool/resource/en/SynthDictionaryBuilder3745826469764128175.txt
- org/languagetool/resource/en/confusion_sets.README
- org/languagetool/resource/en/SynthDictionaryBuilder1882993958007957272.txt
- org/languagetool/resource/en/SynthDictionaryBuilder7397591226834232389.txt
- org/languagetool/resource/en/confusion_sets_l2_nl_wip.txt
- org/languagetool/resource/en/confusion_sets_extended.txt
- org/languagetool/resource/en/SynthDictionaryBuilder5279936907094871390.txt
- org/languagetool/resource/en/SynthDictionaryBuilder2145606813664182213.txt
- org/languagetool/resource/en/SynthDictionaryBuilder7344112456909493859.txt
- org/languagetool/resource/en/SynthDictionaryBuilder8963484359049568445.txt
- org/languagetool/resource/en/SynthDictionaryBuilder873687180369991925.txt
- org/languagetool/resource/en/confusion_set_candidates.txt
- org/languagetool/resource/en/SynthDictionaryBuilder1302893249096570753.txt
- org/languagetool/resource/en/spelling_correction_model.bin
- org/languagetool/resource/en/SynthDictionaryBuilder13039743766828251768.txt
- org/languagetool/resource/ru/russian_manual_add.txt
- org/languagetool/resource/de/errors.txt
- org/languagetool/resource/de/confusion_set_candidates.txt
- org/languagetool/resource/de/words-similar.txt
- org/languagetool/rules/es/el.txt
- org/languagetool/resource/de/spelling_correction_model.bin
- org/languagetool/rules/sk/grammar-nezaradene.xml
- org/languagetool/resource/de/hunspell/spelling_merged.txt

## data of n-gram language-model rules, which are not ported (DEV-001: English/German/... getRelevantLanguageModelRules are empty or throw notPortedYet)

9 files, 101288 bytes

- org/languagetool/resource/es/confusion_sets.txt
- org/languagetool/resource/en/confusion_sets_l2_es.txt
- org/languagetool/resource/en/confusion_sets_l2_de.txt
- org/languagetool/resource/ru/confusion_sets.txt
- org/languagetool/resource/en/confusion_sets_l2_fr.txt
- org/languagetool/resource/en/confusion_sets_l2_nl.txt
- org/languagetool/resource/it/confusion_sets.txt
- org/languagetool/resource/de/compound_exceptions.txt
- org/languagetool/resource/de/ambiguous_case.txt

## word-list build inputs that the Java jar itself leaves out (en/pom.xml excludes) or that only the dictionary build tools use

12 files, 212605 bytes

- org/languagetool/resource/en/filter-minus.txt
- org/languagetool/resource/en/filter-archaic.txt
- org/languagetool/resource/en/uncountable.txt
- org/languagetool/resource/en/synteza.awk
- org/languagetool/resource/en/get_unc.awk
- org/languagetool/resource/en/get_all_english_cardinal.awk
- org/languagetool/resource/en/remap.awk
- org/languagetool/resource/en/numbers.txt
- org/languagetool/resource/en/filter_out.awk
- org/languagetool/resource/en/partlycountable.txt
- org/languagetool/resource/en/tags.awk
- org/languagetool/resource/en/test_dict.awk

## POS tagset descriptions (documentation only, no code reads tagset.txt)

9 files, 76722 bytes

- org/languagetool/resource/es/etiquetas-eagles.md
- org/languagetool/resource/es/tagset.txt
- org/languagetool/resource/en/tagset.txt
- org/languagetool/resource/ru/tagset.txt
- org/languagetool/resource/it/tagset.txt
- org/languagetool/resource/sk/tagset.txt
- org/languagetool/resource/pl/tagset.txt
- org/languagetool/resource/fr/tagset.txt
- org/languagetool/resource/de/tagset.txt

## dictionary build scripts and hunspell header fragments (shell, awk, python)

16 files, 11643 bytes

- org/languagetool/resource/es/synthesis.awk
- org/languagetool/resource/ru/make_dict_ru.sh
- org/languagetool/resource/ru/yo.awk
- org/languagetool/resource/sk/create_dictionary.sh
- org/languagetool/resource/it/not_smi.awk
- org/languagetool/resource/it/morph_data_italian.awk
- org/languagetool/rules/en/indent.sh
- org/languagetool/resource/ru/hunspell/freq-wordlist.awk
- org/languagetool/resource/ru/hunspell/make_spell_dict.awk
- org/languagetool/resource/ru/hunspell/make_ru_RU.sh
- org/languagetool/resource/ru/hunspell/make-freq-wordlist-ru.sh
- org/languagetool/resource/sk/bin/filter_lft.py
- org/languagetool/resource/de/hunspell/de_AT.dic.header
- org/languagetool/resource/de/hunspell/de_DE.dic.header
- org/languagetool/resource/de/hunspell/create_dict.sh
- org/languagetool/resource/de/hunspell/de_CH.dic.header

## XSLT/CSS/HTML presentation files of the rule XML (editor tooling, never read)

5 files, 22858 bytes

- org/languagetool/rules/print.xsl
- org/languagetool/rules/false-friends.html
- org/languagetool/rules/false-friends.css
- org/languagetool/rules/print-ff.xsl
- org/languagetool/rules/rules.css

## XSD/DTD schemas nothing reads (XSD/DTD validity is not ported, D-048). Kept on purpose: logback.xml, server mapper XMLs and mybatis-config.xml (read by parity case X-XML/sax-core)

6 files, 51865 bytes

- org/languagetool/rules/pattern.xsd
- org/languagetool/resource/api-output.dtd
- org/languagetool/resource/disambiguation.xsd
- org/languagetool/rules/bitext.xsd
- org/languagetool/rules/rules.xsd
- org/languagetool/rules/remote-rules.xsd

Total: 147 files, 8457903 bytes.

## Kept on purpose (unread in the trace)

- MessagesBundle_*.properties of all UI languages: JLanguageTool.getMessageBundle resolves every UI language (X-I18N).
- logback.xml, .dup/1/logback.xml, org/languagetool/server/*MapperOpenSource.xml, mybatis-config.xml: read by parity case X-XML/sax-core.
- LICENSE, README.md (attribution of the languages/ profile data), MANIFEST.sha256 (regenerated from the final file set), git.properties.
- Licence and attribution texts: hunspell/dictionary READMEs, COPYING_GPLv2/3.txt, *_frami_README.txt, de_DE.README, de/README.txt, it/README.txt, pl/README.txt, ru/README.txt, ru/hunspell/README.txt, sk/README.txt, fr README_*.txt, en/12dicts-readme.html, en/agid-readme.txt, en/pos-readme.txt (the packages copy them to licenses/).
- it/italian_tags.txt (ItalianSynthesizer), de/en/fr confusion_sets.txt (read).
- Excluded without a code reference only because the n-gram rules are not ported (DEV-001): see the language-model group; port those rules and the files need to come back.
