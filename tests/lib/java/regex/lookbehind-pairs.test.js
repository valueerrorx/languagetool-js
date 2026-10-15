// Anchored matches (lookingAt/matches via match()) try look-behind starts inside surrogate pairs like Java (found by F11: SRX exception patterns).
import { describe, it, expect } from 'vitest';
import { Pattern } from '../../../../src/lib/java/regex/index.js';

describe('look-behind over surrogate pairs in anchored matches', () => {
  const p = Pattern.compile("(?:(?<=[^-\\p{L}'/]\\p{L}[\\.!?][\\)]?[\\u00A0\\s]))", Pattern.UNICODE_CHARACTER_CLASS);
  it('lookingAt at a position after a supplementary letter initial', () => {
    const t = 'Non-BMP \u{1D4B3}\u{1D4B4}\u{1D4B5}. Next.';
    const m = p.matcher(t);
    expect(m.match(16, 0)).toBe(true); // Java: Behind(min 4,max 5 units) starts inside the pair of the preceding letter
  });
  it('plain BMP text is unchanged', () => {
    expect(p.matcher('Non-BMP XYZ. Next.').match(13, 0)).toBe(false);
    expect(p.matcher('Non-BMP X. Next.').match(11, 0)).toBe(true);
  });
});
