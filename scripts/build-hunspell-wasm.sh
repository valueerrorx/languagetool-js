#!/bin/sh
# Rebuilds src/lib/hunspell/wasm from hunspell tag v1.7.5 + scripts/hunspell-1.7.5-hash64.patch (git apply; 64-bit hash as native LP64); emsdk 3.1.74 active; run in the checkout: build-hunspell-wasm.sh <outdir>
emcc -O2 -DHUNSPELL_STATIC -I src/hunspell src/hunspell/affentry.cxx src/hunspell/affixmgr.cxx src/hunspell/csutil.cxx src/hunspell/filemgr.cxx src/hunspell/hashmgr.cxx src/hunspell/hunspell.cxx src/hunspell/hunspelltrace.cxx src/hunspell/hunzip.cxx src/hunspell/phonet.cxx src/hunspell/replist.cxx src/hunspell/suggestmgr.cxx \
  -o "${1:?output dir}/hunspell.js" -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=node -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_Hunspell_create","_Hunspell_destroy","_Hunspell_spell","_Hunspell_suggest","_Hunspell_add","_Hunspell_free_list","_Hunspell_get_dic_encoding","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS","HEAPU8","HEAPU32"]'
