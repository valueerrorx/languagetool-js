// Per-part notPorted: adapters mark single texts/jobs; parity masks those parts on the Java side and counts them.
export const MARK = '__notPorted';
export const NP_KEY = '__np';

export class Tally {
  constructor() { this.total = 0; this.skipped = 0; this.first = null; }
  // part computed by the port
  ok(v) { this.total++; return v; }
  // part hit a not-yet-ported class: returns the marker that replaces it
  skip(t) { this.total++; this.skipped++; this.first ??= t; return { [MARK]: true }; }
  // all parts skipped -> whole request notPorted; otherwise attach the tally for parity
  finish(res) {
    if (this.skipped === 0) return res;
    if (this.skipped === this.total) throw this.first;
    res[NP_KEY] = { skipped: this.skipped, total: this.total };
    return res;
  }
}

export const isMark = (v) => v !== null && typeof v === 'object' && v[MARK] === true;
