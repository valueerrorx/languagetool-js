// java.util.Random parity: expected values from a JDK 17 run (scratch R.java, seeds 41 and -5).
import { describe, expect, it } from 'vitest';
import { Random } from '../../../src/lib/java/Random.js';

const bits = (d) => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, d); return b.getBigInt64(0); };

describe('Random', () => {
  it('matches JDK 17 sequences for seed 41 (optimaize DEFAULT_SEED)', () => {
    const r = new Random(41);
    const g = [];
    for (let i = 0; i < 5; i++) g.push(bits(r.nextGaussian()));
    expect(g).toEqual([4603698952170922332n, -4617708303616669990n, -4628040554798937504n, 4586520405940336231n, 4604558280567318788n]);
    const n = [];
    for (let i = 0; i < 5; i++) n.push(r.nextInt(1000));
    expect(n).toEqual([451, 548, 938, 18, 660]);
    expect(r.nextInt(1 << 20)).toBe(966907);
    expect(r.nextInt()).toBe(-703071765);
    expect(bits(r.nextDouble())).toBe(4600652479878214958n);
    expect(r.nextInt(7)).toBe(3);
    expect(r.nextLong()).toBe(230528999779399810n);
  });
  it('handles negative seeds and large bounds', () => {
    const r = new Random(-5n);
    expect(r.nextInt(2147483647)).toBe(578319411);
    expect(bits(r.nextGaussian())).toBe(-4615137606839317662n);
  });
  it('rejects non-positive bounds like the JDK', () => {
    expect(() => new Random(1).nextInt(0)).toThrow('bound must be positive');
  });
});
