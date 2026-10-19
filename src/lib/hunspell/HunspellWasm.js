// Hunspell 1.7.5 compiled to WASM (own emscripten build, scripts/build-hunspell-wasm.sh), byte-level C API wrapper (D-013).
import initializer from './wasm/hunspell.js';

const m = await initializer();
let counter = 0;

// allocates a NUL-terminated byte string in WASM memory
function allocBytes(bytes) {
  const p = m._malloc(bytes.length + 1);
  m.HEAPU8.set(bytes, p);
  m.HEAPU8[p + bytes.length] = 0;
  return p;
}

function cstrLen(p) {
  let e = p;
  while (m.HEAPU8[e] !== 0) e++;
  return e - p;
}

// native Hunspell handle created from in-memory .aff/.dic bytes
export class WasmHunspell {
  // C: Hunspell_create(affpath, dpath), files written to the in-memory FS
  constructor(affBytes, dicBytes) {
    const id = `hs${counter++}`;
    m.FS.writeFile(`${id}.aff`, affBytes);
    m.FS.writeFile(`${id}.dic`, dicBytes);
    const a = allocBytes(Buffer.from(`${id}.aff`));
    const d = allocBytes(Buffer.from(`${id}.dic`));
    this.handle = m._Hunspell_create(a, d);
    m.FS.unlink(`${id}.aff`);
    m.FS.unlink(`${id}.dic`);
    m._free(a);
    m._free(d);
    if (this.handle === 0) throw new Error('Unable to create Hunspell instance');
  }

  // C: Hunspell_get_dic_encoding
  getDicEncoding() {
    const p = m._Hunspell_get_dic_encoding(this.handle);
    return Buffer.from(m.HEAPU8.subarray(p, p + cstrLen(p))).toString('latin1');
  }

  // C: Hunspell_spell(handle, word bytes)
  spell(bytes) {
    const w = allocBytes(bytes);
    const r = m._Hunspell_spell(this.handle, w);
    m._free(w);
    return r;
  }

  // C: Hunspell_add(handle, word bytes)
  add(bytes) {
    const w = allocBytes(bytes);
    const r = m._Hunspell_add(this.handle, w);
    m._free(w);
    return r;
  }

  // C: Hunspell_suggest -> array of byte arrays
  suggest(bytes) {
    const w = allocBytes(bytes);
    const pp = m._malloc(4);
    m.HEAPU32[pp >> 2] = 0;
    const n = m._Hunspell_suggest(this.handle, pp, w);
    const out = [];
    if (n > 0) {
      const list = m.HEAPU32[pp >> 2];
      for (let i = 0; i < n; i++) {
        const p = m.HEAPU32[(list >> 2) + i];
        out.push(Buffer.from(m.HEAPU8.subarray(p, p + cstrLen(p))));
      }
      m._Hunspell_free_list(this.handle, pp, n);
    }
    m._free(pp);
    m._free(w);
    return out;
  }

  // C: Hunspell_destroy
  close() {
    m._Hunspell_destroy(this.handle);
  }
}
