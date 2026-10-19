#!/bin/sh
# Rebuilds src/lib/hunspell/wasm from hunspell tag v1.7.5 + scripts/hunspell-1.7.5-hash64.patch (git apply; 64-bit hash as native LP64); emsdk 3.1.74 active; DETCLOCK_TICK_NS = ns per now() call (default 1; DETCLOCK_CPD_NS = extra ns per compound_check in suggest, default 30000, tuned against the Java golden); run in the checkout: build-hunspell-wasm.sh <outdir>
# DEV-009: wall-clock limits -> deterministic work budget: steady_clock replaced by a counter clock (one tick per now() call, i.e. per limit check point)
sed -i 's/std::chrono::steady_clock/detclock/g' src/hunspell/*.cxx src/hunspell/*.hxx
grep -q DETCLOCK src/hunspell/atypes.hxx || sed -i '/^#include <chrono>/a\
#ifndef DETCLOCK\
#define DETCLOCK\
struct detclock {\
  typedef std::chrono::nanoseconds duration;\
  typedef duration::rep rep;\
  typedef duration::period period;\
  typedef std::chrono::time_point<detclock> time_point;\
  static const bool is_steady = true;\
  static rep& counter() { static rep c = 0; return c; }\
  static time_point now() {\
    counter() += DETCLOCK_TICK_NS;\
    return time_point(duration(counter()));\
  }\
  static void bump(rep ns) { counter() += ns; }\
};\
#endif' src/hunspell/atypes.hxx
# compound checks (compound_check inside checkword) cost much more than a plain lookup: charge DETCLOCK_CPD_NS extra
grep -q DETCLOCK_BUMP src/hunspell/suggestmgr.cxx || sed -i '/rv = pAMgr->compound_check(word, 0, 0, 100, 0, nullptr, (hentry\*\*)&rwords, 0, 1, &info, scratch);  \/\/ EXT/i\
        detclock::bump(DETCLOCK_CPD_NS); /* DETCLOCK_BUMP */' src/hunspell/suggestmgr.cxx
emcc -O2 -DDETCLOCK_TICK_NS=${DETCLOCK_TICK_NS:-1} -DDETCLOCK_CPD_NS=${DETCLOCK_CPD_NS:-30000} -DHUNSPELL_STATIC -I src/hunspell src/hunspell/affentry.cxx src/hunspell/affixmgr.cxx src/hunspell/csutil.cxx src/hunspell/filemgr.cxx src/hunspell/hashmgr.cxx src/hunspell/hunspell.cxx src/hunspell/hunspelltrace.cxx src/hunspell/hunzip.cxx src/hunspell/phonet.cxx src/hunspell/replist.cxx src/hunspell/suggestmgr.cxx \
  -o "${1:?output dir}/hunspell.js" -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=node -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_Hunspell_create","_Hunspell_destroy","_Hunspell_spell","_Hunspell_suggest","_Hunspell_add","_Hunspell_free_list","_Hunspell_get_dic_encoding","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS","HEAPU8","HEAPU32"]'
