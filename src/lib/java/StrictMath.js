// java.lang.StrictMath: faithful port of fdlibm 5.3 (as used by JDK 17) for exp, log, log10, pow, sin, cos, atan, atan2, cbrt, hypot, sqrt.

const buf = new DataView(new ArrayBuffer(8));

// Java: __HI(x) (signed high word)
function HI(x) {
  buf.setFloat64(0, x);
  return buf.getInt32(0);
}

// Java: __LO(x) (low word, unsigned as JS number)
function LO(x) {
  buf.setFloat64(0, x);
  return buf.getUint32(4);
}

// Java: __HI(x) = h
function withHi(x, h) {
  buf.setFloat64(0, x);
  buf.setInt32(0, h);
  return buf.getFloat64(0);
}

// Java: __LO(x) = l
function withLo(x, l) {
  buf.setFloat64(0, x);
  buf.setUint32(4, l >>> 0);
  return buf.getFloat64(0);
}

// helper (no Java counterpart): builds a double from its high and low words
function fromWords(h, l) {
  buf.setInt32(0, h);
  buf.setUint32(4, l >>> 0);
  return buf.getFloat64(0);
}

// x86 default NaN (negative quiet NaN) as produced by invalid operations in HotSpot
export const DEFAULT_NAN = fromWords(0xfff80000 | 0, 0);

const zero = 0.0;
const one = 1.0;
const huge = 1.0e300;
const tiny = 1.0e-300;
const two54 = 1.80143985094819840000e16;
const twom54 = 5.55111512312578270212e-17;

// Java: FdLibm#scalbn(double,int)
function scalbn(x, n) {
  let hx = HI(x);
  const lx = LO(x);
  let k = (hx & 0x7ff00000) >> 20;
  if (k === 0) {
    if ((lx | (hx & 0x7fffffff)) === 0) return x;
    x *= two54;
    hx = HI(x);
    k = ((hx & 0x7ff00000) >> 20) - 54;
    if (n < -50000) return tiny * x;
  }
  if (k === 0x7ff) return x + x;
  k += n;
  if (k > 0x7fe) return huge * copySign(huge, x);
  if (k > 0) return withHi(x, (hx & 0x800fffff) | (k << 20));
  if (k <= -54) {
    if (n > 50000) return huge * copySign(huge, x);
    return tiny * copySign(tiny, x);
  }
  k += 54;
  x = withHi(x, (hx & 0x800fffff) | (k << 20));
  return x * twom54;
}

// Java: Math#copySign(double,double) for the sign bit only
function copySign(m, s) {
  const neg = HI(s) < 0;
  const a = Math.abs(m);
  return neg ? -a : a;
}

const ln2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01];
const ln2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10];
const halF = [0.5, -0.5];
const invln2 = 1.44269504088896338700e+00;
const twom1000 = 9.33263618503218878990e-302;
const o_threshold = 7.09782712893383973096e+02;
const u_threshold = -7.45133219101941108420e+02;
const P1 = 1.66666666666666019037e-01;
const P2 = -2.77777777770155933842e-03;
const P3 = 6.61375632143793436117e-05;
const P4 = -1.65339022054652515390e-06;
const P5 = 4.13813679705723846039e-08;

// Java: FdLibm.Exp#compute(double) / __ieee754_exp
function exp(x) {
  let hi = 0.0;
  let lo = 0.0;
  let k = 0;
  let hx = HI(x);
  const xsb = (hx >> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | LO(x)) !== 0) return x + x;
      return xsb === 0 ? x : 0.0;
    }
    if (x > o_threshold) return huge * huge;
    if (x < u_threshold) return twom1000 * twom1000;
  }
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      hi = x - ln2HI[xsb];
      lo = ln2LO[xsb];
      k = 1 - xsb - xsb;
    } else {
      k = Math.trunc(invln2 * x + halF[xsb]);
      const t = k;
      hi = x - t * ln2HI[0];
      lo = t * ln2LO[0];
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    if (huge + x > one) return one + x;
  } else {
    k = 0;
  }
  const t = x * x;
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return one - ((x * c) / (c - 2.0) - x);
  let y = one - ((lo - (x * c) / (2.0 - c)) - hi);
  if (k >= -1021) {
    y = withHi(y, HI(y) + (k << 20));
    return y;
  }
  y = withHi(y, HI(y) + ((k + 1000) << 20));
  return y * twom1000;
}

const ln2_hi = 6.93147180369123816490e-01;
const ln2_lo = 1.90821492927058770002e-10;
const Lg1 = 6.666666666666735130e-01;
const Lg2 = 3.999999999940941908e-01;
const Lg3 = 2.857142874366239149e-01;
const Lg4 = 2.222219843214978396e-01;
const Lg5 = 1.818357216161805012e-01;
const Lg6 = 1.531383769920937332e-01;
const Lg7 = 1.479819860511658591e-01;

// Java: FdLibm.Log#compute(double) / __ieee754_log
function log(x) {
  let hx = HI(x);
  const lx = LO(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -two54 / zero;
    if (hx < 0) return DEFAULT_NAN;
    k -= 54;
    x *= two54;
    hx = HI(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  let i = (hx + 0x95f64) & 0x100000;
  x = withHi(x, hx | (i ^ 0x3ff00000));
  k += i >> 20;
  const f = x - 1.0;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === zero) {
      if (k === 0) return zero;
      const dk = k;
      return dk * ln2_hi + dk * ln2_lo;
    }
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    if (k === 0) return f - R;
    const dk = k;
    return dk * ln2_hi - ((R - dk * ln2_lo) - f);
  }
  const s = f / (2.0 + f);
  const dk = k;
  const z = s * s;
  i = hx - 0x6147a;
  const w = z * z;
  const j = 0x6b851 - hx;
  const t1 = w * (Lg2 + w * (Lg4 + w * Lg6));
  const t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return dk * ln2_hi - ((hfsq - (s * (hfsq + R) + dk * ln2_lo)) - f);
  }
  if (k === 0) return f - s * (f - R);
  return dk * ln2_hi - ((s * (f - R) - dk * ln2_lo) - f);
}

const ivln10 = 4.34294481903251816668e-01;
const log10_2hi = 3.01029995663611771306e-01;
const log10_2lo = 3.69423907715893078616e-13;

// Java: StrictMath#log10(double) / __ieee754_log10
function log10(x) {
  let hx = HI(x);
  const lx = LO(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -two54 / zero;
    if (hx < 0) return DEFAULT_NAN;
    k -= 54;
    x *= two54;
    hx = HI(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  const i = (k & 0x80000000) >>> 31;
  hx = (hx & 0x000fffff) | ((0x3ff - i) << 20);
  const y = k + i;
  x = withHi(x, hx);
  const z = y * log10_2lo + ivln10 * log(x);
  return z + y * log10_2hi;
}

const bp = [1.0, 1.5];
const dp_h = [0.0, 5.84962487220764160156e-01];
const dp_l = [0.0, 1.35003920212974897128e-08];
const two = 2.0;
const two53 = 9007199254740992.0;
const L1 = 5.99999999999994648725e-01;
const L2 = 4.28571428578550184252e-01;
const L3 = 3.33333329818377432918e-01;
const L4 = 2.72728123808534006489e-01;
const L5 = 2.30660745775561754067e-01;
const L6 = 2.06975017800338417784e-01;
const lg2 = 6.93147180559945286227e-01;
const lg2_h = 6.93147182464599609375e-01;
const lg2_l = -1.90465429995776804525e-09;
const ovt = 8.0085662595372944372e-17;
const cp = 9.61796693925975554329e-01;
const cp_h = 9.61796700954437255859e-01;
const cp_l = -7.02846165095275826516e-09;
const ivln2 = 1.44269504088896338700e+00;
const ivln2_h = 1.44269502162933349609e+00;
const ivln2_l = 1.92596299112661746887e-08;

// Java: FdLibm.Pow#compute(double,double) / __ieee754_pow
function pow(x, y) {
  let z;
  let z_h;
  let z_l;
  let p_h;
  let p_l;
  let t1;
  let t2;
  let r;
  let s;
  let t;
  let u;
  let v;
  let w;
  let i;
  let j;
  let k;
  let yisint;
  let n;
  const hx = HI(x);
  const lx = LO(x);
  const hy = HI(y);
  const ly = LO(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;

  if ((iy | ly) === 0) return one;
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return x + y;

  yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      k = (iy >> 20) - 0x3ff;
      if (k > 20) {
        j = ly >>> (52 - k);
        if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1);
      } else if (ly === 0) {
        j = iy >> (20 - k);
        if (j << (20 - k) === iy) yisint = 2 - (j & 1);
      }
    }
  }

  if (ly === 0) {
    if (iy === 0x7ff00000) {
      if (((ix - 0x3ff00000) | lx) === 0) return y - y;
      else if (ix >= 0x3ff00000) return hy >= 0 ? y : zero;
      return hy < 0 ? -y : zero;
    }
    if (iy === 0x3ff00000) {
      if (hy < 0) return one / x;
      return x;
    }
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000) {
      if (hx >= 0) return Math.sqrt(x);
    }
  }

  let ax = Math.abs(x);
  if (lx === 0) {
    if (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000) {
      z = ax;
      if (hy < 0) z = one / z;
      if (hx < 0) {
        if (((ix - 0x3ff00000) | yisint) === 0) {
          z = (z - z) / (z - z);
        } else if (yisint === 1) z = -z;
      }
      return z;
    }
  }

  n = (hx >> 31) + 1;
  if ((n | yisint) === 0) return (x - x) / (x - x);

  s = one;
  if ((n | (yisint - 1)) === 0) s = -one;

  if (iy > 0x41e00000) {
    if (iy > 0x43f00000) {
      if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny;
      if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny;
    if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny;
    t = ax - one;
    w = t * t * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
    u = ivln2_h * t;
    v = t * ivln2_l - w * ivln2;
    t1 = u + v;
    t1 = withLo(t1, 0);
    t2 = v - (t1 - u);
  } else {
    n = 0;
    if (ix < 0x00100000) {
      ax *= two53;
      n -= 53;
      ix = HI(ax);
    }
    n += (ix >> 20) - 0x3ff;
    j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    if (j <= 0x3988e) k = 0;
    else if (j < 0xbb67a) k = 1;
    else {
      k = 0;
      n += 1;
      ix -= 0x00100000;
    }
    ax = withHi(ax, ix);

    u = ax - bp[k];
    v = one / (ax + bp[k]);
    const ss = u * v;
    let s_h = ss;
    s_h = withLo(s_h, 0);
    let t_h = zero;
    t_h = withHi(t_h, ((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18));
    let t_l = ax - (t_h - bp[k]);
    const s_l = v * ((u - s_h * t_h) - s_h * t_l);
    let s2 = ss * ss;
    r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += s_l * (s_h + ss);
    s2 = s_h * s_h;
    t_h = 3.0 + s2 + r;
    t_h = withLo(t_h, 0);
    t_l = r - ((t_h - 3.0) - s2);
    u = s_h * t_h;
    v = s_l * t_h + t_l * ss;
    p_h = u + v;
    p_h = withLo(p_h, 0);
    p_l = v - (p_h - u);
    z_h = cp_h * p_h;
    z_l = cp_l * p_h + p_l * cp + dp_l[k];
    t = n;
    t1 = ((z_h + z_l) + dp_h[k]) + t;
    t1 = withLo(t1, 0);
    t2 = z_l - (((t1 - t) - dp_h[k]) - z_h);
  }

  let y1 = y;
  y1 = withLo(y1, 0);
  p_l = (y - y1) * t1 + y * t2;
  p_h = y1 * t1;
  z = p_l + p_h;
  j = HI(z);
  i = LO(z);
  if (j >= 0x40900000) {
    if (((j - 0x40900000) | i) !== 0) return s * huge * huge;
    if (p_l + ovt > z - p_h) return s * huge * huge;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if (((j - 0xc090cc00) | i) !== 0) return s * tiny * tiny;
    if (p_l <= z - p_h) return s * tiny * tiny;
  }

  i = j & 0x7fffffff;
  k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    t = zero;
    t = withHi(t, n & ~(0x000fffff >> k));
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    p_h -= t;
  }
  t = p_l + p_h;
  t = withLo(t, 0);
  u = t * lg2_h;
  v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
  z = u + v;
  w = v - (z - u);
  t = z * z;
  t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  r = (z * t1) / (t1 - two) - (w + z * w);
  z = one - (r - z);
  j = HI(z);
  j += n << 20;
  if (j >> 20 <= 0) z = scalbn(z, n);
  else z = withHi(z, HI(z) + (n << 20));
  return s * z;
}

// Java: FdLibm k_rem_pio2 constants: 2/pi in 24-bit chunks
const two_over_pi = [
  0xa2f983, 0x6e4e44, 0x1529fc, 0x2757d1, 0xf534dd, 0xc0db62, 0x95993c, 0x439041, 0xfe5163, 0xabdebb, 0xc561b7, 0x246e3a, 0x424dd2, 0xe00649, 0x2eea09, 0xd1921c, 0xfe1deb, 0x1cb129,
  0xa73ee8, 0x8235f5, 0x2ebb44, 0x84e99c, 0x7026b4, 0x5f7e41, 0x3991d6, 0x398353, 0x39f49c, 0x845f8b, 0xbdf928, 0x3b1ff8, 0x97ffde, 0x05980f, 0xef2f11, 0x8b5a0a, 0x6d1f6d, 0x367ecf,
  0x27cb09, 0xb74f46, 0x3f669e, 0x5fea2d, 0x7527ba, 0xc7ebe5, 0xf17b3d, 0x0739f7, 0x8a5292, 0xea6bfb, 0x5fb11f, 0x8d5d08, 0x560330, 0x46fc7b, 0x6babf0, 0xcfbc20, 0x9af436, 0x1da9e3,
  0x91615e, 0xe61b08, 0x659985, 0x5f14a0, 0x68408d, 0xffd880, 0x4d7327, 0x310606, 0x1556ca, 0x73a8c9, 0x60e27b, 0xc08c6b,
];
const PIo2 = [
  1.57079625129699707031e+00, 7.54978941586159635335e-08, 5.39030252995776476554e-15, 3.28200341580791294123e-22,
  1.27065575308067607349e-29, 1.22933308981111328932e-36, 2.73370053816464559624e-44, 2.16741683877804819444e-51,
];
const init_jk = [2, 3, 4, 6];
const twon24 = 5.96046447753906250000e-08;
const two24 = 1.67772160000000000000e+07;

// Java: FdLibm#__kernel_rem_pio2(double[],double[],int,int,int,int[])
function kernelRemPio2(x, y, e0, nx, prec, ipio2) {
  const iq = new Array(20).fill(0);
  const f = new Array(20).fill(0);
  const fq = new Array(20).fill(0);
  const q = new Array(20).fill(0);
  let jz;
  let carry;
  let n;
  let i;
  let j;
  let k;
  let ih;
  let z;
  let fw;
  const jk = init_jk[prec];
  const jp = jk;
  const jx = nx - 1;
  let jv = Math.trunc((e0 - 3) / 24);
  if (jv < 0) jv = 0;
  let q0 = e0 - 24 * (jv + 1);

  j = jv - jx;
  const m = jx + jk;
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? zero : ipio2[j];

  for (i = 0; i <= jk; i++) {
    for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
    q[i] = fw;
  }

  jz = jk;
  for (;;) {
    for (i = 0, j = jz, z = q[jz]; j > 0; i++, j--) {
      fw = Math.trunc(twon24 * z);
      iq[i] = Math.trunc(z - two24 * fw);
      z = q[j - 1] + fw;
    }

    z = scalbn(z, q0);
    z -= 8.0 * Math.floor(z * 0.125);
    n = Math.trunc(z);
    z -= n;
    ih = 0;
    if (q0 > 0) {
      i = iq[jz - 1] >> (24 - q0);
      n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) ih = iq[jz - 1] >> 23;
    else if (z >= 0.5) ih = 2;

    if (ih > 0) {
      n += 1;
      carry = 0;
      for (i = 0; i < jz; i++) {
        j = iq[i];
        if (carry === 0) {
          if (j !== 0) {
            carry = 1;
            iq[i] = 0x1000000 - j;
          }
        } else iq[i] = 0xffffff - j;
      }
      if (q0 > 0) {
        switch (q0) {
          case 1:
            iq[jz - 1] &= 0x7fffff;
            break;
          case 2:
            iq[jz - 1] &= 0x3fffff;
            break;
          default:
            break;
        }
      }
      if (ih === 2) {
        z = one - z;
        if (carry !== 0) z -= scalbn(one, q0);
      }
    }

    if (z === zero) {
      j = 0;
      for (i = jz - 1; i >= jk; i--) j |= iq[i];
      if (j === 0) {
        for (k = 1; iq[jk - k] === 0; k++);
        for (i = jz + 1; i <= jz + k; i++) {
          f[jx + i] = ipio2[jv + i];
          for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
          q[i] = fw;
        }
        jz += k;
        continue;
      }
    }
    break;
  }

  if (z === 0.0) {
    jz -= 1;
    q0 -= 24;
    while (iq[jz] === 0) {
      jz--;
      q0 -= 24;
    }
  } else {
    z = scalbn(z, -q0);
    if (z >= two24) {
      fw = Math.trunc(twon24 * z);
      iq[jz] = Math.trunc(z - two24 * fw);
      jz += 1;
      q0 += 24;
      iq[jz] = Math.trunc(fw);
    } else iq[jz] = Math.trunc(z);
  }

  fw = scalbn(one, q0);
  for (i = jz; i >= 0; i--) {
    q[i] = fw * iq[i];
    fw *= twon24;
  }

  for (i = jz; i >= 0; i--) {
    for (fw = 0.0, k = 0; k <= jp && k <= jz - i; k++) fw += PIo2[k] * q[i + k];
    fq[jz - i] = fw;
  }

  // prec is always 2 here
  fw = 0.0;
  for (i = jz; i >= 0; i--) fw += fq[i];
  y[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (i = 1; i <= jz; i++) fw += fq[i];
  y[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

// Java: FdLibm.RemPio2 npio2_hw table (high words of n*pi/2, n = 1..32)
const npio2_hw = [
  0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb, 0x402c463a, 0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb,
  0x403ab41b, 0x403c463a, 0x403dd85a, 0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c, 0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb, 0x40478fdb, 0x404858eb, 0x404921fb,
];
const invpio2 = 6.36619772367581382433e-01;
const pio2_1 = 1.57079632673412561417e+00;
const pio2_1t = 6.07710050650619224932e-11;
const pio2_2 = 6.07710050630396597660e-11;
const pio2_2t = 2.02226624879595063154e-21;
const pio2_3 = 2.02226624871116645580e-21;
const pio2_3t = 8.47842766036889956997e-32;

// Java: FdLibm#__ieee754_rem_pio2(double,double[])
function remPio2(x, y) {
  let z;
  let w;
  let t;
  let r;
  let fn;
  let n;
  let i;
  let j;
  const hx = HI(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    y[0] = x;
    y[1] = 0;
    return 0;
  }
  if (ix < 0x4002d97c) {
    if (hx > 0) {
      z = x - pio2_1;
      if (ix !== 0x3ff921fb) {
        y[0] = z - pio2_1t;
        y[1] = (z - y[0]) - pio2_1t;
      } else {
        z -= pio2_2;
        y[0] = z - pio2_2t;
        y[1] = (z - y[0]) - pio2_2t;
      }
      return 1;
    }
    z = x + pio2_1;
    if (ix !== 0x3ff921fb) {
      y[0] = z + pio2_1t;
      y[1] = (z - y[0]) + pio2_1t;
    } else {
      z += pio2_2;
      y[0] = z + pio2_2t;
      y[1] = (z - y[0]) + pio2_2t;
    }
    return -1;
  }
  if (ix <= 0x413921fb) {
    t = Math.abs(x);
    n = Math.trunc(t * invpio2 + 0.5);
    fn = n;
    r = t - fn * pio2_1;
    w = fn * pio2_1t;
    if (n < 32 && ix !== npio2_hw[n - 1]) {
      y[0] = r - w;
    } else {
      j = ix >> 20;
      y[0] = r - w;
      i = j - ((HI(y[0]) >> 20) & 0x7ff);
      if (i > 16) {
        t = r;
        w = fn * pio2_2;
        r = t - w;
        w = fn * pio2_2t - ((t - r) - w);
        y[0] = r - w;
        i = j - ((HI(y[0]) >> 20) & 0x7ff);
        if (i > 49) {
          t = r;
          w = fn * pio2_3;
          r = t - w;
          w = fn * pio2_3t - ((t - r) - w);
          y[0] = r - w;
        }
      }
    }
    y[1] = (r - y[0]) - w;
    if (hx < 0) {
      y[0] = -y[0];
      y[1] = -y[1];
      return -n;
    }
    return n;
  }
  if (ix >= 0x7ff00000) {
    y[0] = x - x;
    y[1] = y[0];
    return 0;
  }
  const tx = [0, 0, 0];
  z = withLo(0, LO(x));
  const e0 = (ix >> 20) - 1046;
  z = withHi(z, ix - (e0 << 20));
  for (i = 0; i < 2; i++) {
    tx[i] = Math.trunc(z);
    z = (z - tx[i]) * two24;
  }
  tx[2] = z;
  let nx = 3;
  while (tx[nx - 1] === zero) nx--;
  n = kernelRemPio2(tx, y, e0, nx, 2, two_over_pi);
  if (hx < 0) {
    y[0] = -y[0];
    y[1] = -y[1];
    return -n;
  }
  return n;
}

const half = 0.5;
const S1 = -1.66666666666666324348e-01;
const S2 = 8.33333333332248946124e-03;
const S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06;
const S5 = -2.50507602534068634195e-08;
const S6 = 1.58969099521155010221e-10;

// Java: FdLibm#__kernel_sin(double,double,int)
function kernelSin(x, y, iy) {
  const ix = HI(x) & 0x7fffffff;
  if (ix < 0x3e400000) {
    if (Math.trunc(x) === 0) return x;
  }
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (half * y - v * r) - y) - v * S1);
}

const C1 = 4.16666666666666019037e-02;
const C2 = -1.38888888888741095749e-03;
const C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07;
const C5 = 2.08757232129817482790e-09;
const C6 = -1.13596475577881948265e-11;

// Java: FdLibm#__kernel_cos(double,double)
function kernelCos(x, y) {
  const ix = HI(x) & 0x7fffffff;
  if (ix < 0x3e400000) {
    if (Math.trunc(x) === 0) return one;
  }
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return one - (0.5 * z - (z * r - x * y));
  let qx;
  if (ix > 0x3fe90000) qx = 0.28125;
  else qx = fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx;
  const a = one - qx;
  return a - (hz - (z * r - x * y));
}

// Java: StrictMath#sin(double) / s_sin.c
function sin(x) {
  const y = [0, 0];
  const ix = HI(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0.0, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x, y);
  switch (n & 3) {
    case 0: return kernelSin(y[0], y[1], 1);
    case 1: return kernelCos(y[0], y[1]);
    case 2: return -kernelSin(y[0], y[1], 1);
    default: return -kernelCos(y[0], y[1]);
  }
}

// Java: StrictMath#cos(double) / s_cos.c
function cos(x) {
  const y = [0, 0];
  const ix = HI(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0.0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x, y);
  switch (n & 3) {
    case 0: return kernelCos(y[0], y[1]);
    case 1: return -kernelSin(y[0], y[1], 1);
    case 2: return -kernelCos(y[0], y[1]);
    default: return kernelSin(y[0], y[1], 1);
  }
}

const atanhi = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const atanlo = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const aT = [
  3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02,
  6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02,
];

// Java: StrictMath#atan(double) / s_atan.c
function atan(x) {
  let id;
  const hx = HI(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && LO(x) !== 0)) return x + x;
    if (hx > 0) return atanhi[3] + atanlo[3];
    return -atanhi[3] - atanlo[3];
  }
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e200000) {
      if (huge + x > one) return x;
    }
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) {
        id = 0;
        x = (2.0 * x - one) / (2.0 + x);
      } else {
        id = 1;
        x = (x - one) / (x + one);
      }
    } else if (ix < 0x40038000) {
      id = 2;
      x = (x - 1.5) / (one + 1.5 * x);
    } else {
      id = 3;
      x = -1.0 / x;
    }
  }
  let z = x * x;
  const w = z * z;
  const s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))));
  const s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  z = atanhi[id] - ((x * (s1 + s2) - atanlo[id]) - x);
  return hx < 0 ? -z : z;
}

const pi_o_4 = 7.8539816339744827900e-01;
const pi_o_2 = 1.5707963267948965580e+00;
const pi = 3.1415926535897931160e+00;
const pi_lo = 1.2246467991473531772e-16;

// Java: StrictMath#atan2(double,double) / e_atan2.c
function atan2(y, x) {
  let z;
  const hx = HI(x);
  const ix = hx & 0x7fffffff;
  const lx = LO(x);
  const hy = HI(y);
  const iy = hy & 0x7fffffff;
  const ly = LO(y);
  if ((ix | ((lx | -lx) >>> 31)) > 0x7ff00000 || (iy | ((ly | -ly) >>> 31)) > 0x7ff00000) return x + y;
  if (((hx - 0x3ff00000) | lx) === 0) return atan(y);
  const m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) {
    switch (m) {
      case 0:
      case 1: return y;
      case 2: return pi + tiny;
      default: return -pi - tiny;
    }
  }
  if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0: return pi_o_4 + tiny;
        case 1: return -pi_o_4 - tiny;
        case 2: return 3.0 * pi_o_4 + tiny;
        default: return -3.0 * pi_o_4 - tiny;
      }
    } else {
      switch (m) {
        case 0: return zero;
        case 1: return -zero;
        case 2: return pi + tiny;
        default: return -pi - tiny;
      }
    }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
  const k = (iy - ix) >> 20;
  if (k > 60) z = pi_o_2 + 0.5 * pi_lo;
  else if (hx < 0 && k < -60) z = 0.0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return withHi(z, HI(z) ^ 0x80000000);
    case 2: return pi - (z - pi_lo);
    default: return (z - pi_lo) - pi;
  }
}

const B1 = 715094163;
const B2 = 696219795;
const CBRT_C = 5.42857142857142815906e-01;
const CBRT_D = -7.05306122448979611050e-01;
const CBRT_E = 1.41428571428571436819e+00;
const CBRT_F = 1.60714285714285720630e+00;
const CBRT_G = 3.57142857142857150787e-01;

// Java: StrictMath#cbrt(double) / s_cbrt.c
function cbrt(x) {
  const hx0 = HI(x);
  const sign = hx0 & 0x80000000;
  const hx = hx0 ^ sign;
  if (hx >= 0x7ff00000) return x + x;
  if ((hx | LO(x)) === 0) return x;
  x = withHi(x, hx);
  let t = 0.0;
  if (hx < 0x00100000) {
    t = withHi(t, 0x43500000);
    t *= x;
    const high = HI(t);
    t = withHi(t, Math.trunc(high / 3) + B2);
  } else {
    t = withHi(t, Math.trunc(hx / 3) + B1);
  }
  let r = (t * t) / x;
  let s = CBRT_C + r * t;
  t *= CBRT_G + CBRT_F / (s + CBRT_E + CBRT_D / s);
  t = withLo(t, 0);
  t = withHi(t, HI(t) + 0x00000001);
  s = t * t;
  r = x / s;
  const w = t + t;
  r = (r - t) / (w + r);
  t += t * r;
  return withHi(t, HI(t) | sign);
}

// Java: StrictMath#hypot(double,double) / e_hypot.c
function hypot(x, y) {
  let a;
  let b;
  let t1;
  let t2;
  let y1;
  let y2;
  let w;
  let j;
  let k = 0;
  let ha = HI(x) & 0x7fffffff;
  let hb = HI(y) & 0x7fffffff;
  if (hb > ha) {
    a = y;
    b = x;
    j = ha;
    ha = hb;
    hb = j;
  } else {
    a = x;
    b = y;
  }
  a = withHi(a, ha);
  b = withHi(b, hb);
  if (ha - hb > 0x3c00000) return a + b;
  if (ha > 0x5f300000) {
    if (ha >= 0x7ff00000) {
      w = a + b;
      if (((ha & 0xfffff) | LO(a)) === 0) w = a;
      if (((hb ^ 0x7ff00000) | LO(b)) === 0) w = b;
      return w;
    }
    ha -= 0x25800000;
    hb -= 0x25800000;
    k += 600;
    a = withHi(a, ha);
    b = withHi(b, hb);
  }
  if (hb < 0x20b00000) {
    if (hb <= 0x000fffff) {
      if ((hb | LO(b)) === 0) return a;
      t1 = fromWords(0x7fd00000, 0);
      b *= t1;
      a *= t1;
      k -= 1022;
      ha = HI(a);
      hb = HI(b);
      if (hb > ha) {
        t1 = a;
        a = b;
        b = t1;
        j = ha;
        ha = hb;
        hb = j;
      }
    } else {
      ha += 0x25800000;
      hb += 0x25800000;
      k -= 600;
      a = withHi(a, ha);
      b = withHi(b, hb);
    }
  }
  w = a - b;
  if (w > b) {
    t1 = fromWords(ha, 0);
    t2 = a - t1;
    w = Math.sqrt(t1 * t1 - (b * -b - t2 * (a + t1)));
  } else {
    a += a;
    y1 = fromWords(hb, 0);
    y2 = b - y1;
    t1 = fromWords(ha + 0x00100000, 0);
    t2 = a - t1;
    w = Math.sqrt(t1 * y1 - (w * -w - (t1 * y2 + t2 * b)));
  }
  if (k !== 0) {
    t1 = fromWords(0x3ff00000 + (k << 20), 0);
    return t1 * w;
  }
  return w;
}

// Java: java.lang.StrictMath (fdlibm ports; sqrt is the IEEE operation)
export const StrictMath = {
  exp,
  log,
  log10,
  pow,
  sin,
  cos,
  atan,
  atan2,
  cbrt,
  hypot,
  scalbn,

  // Java: StrictMath#sqrt(double)
  sqrt(x) {
    return Math.sqrt(x);
  },
};
