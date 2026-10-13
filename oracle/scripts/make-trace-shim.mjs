// Derives the traced StringMatcher from the original source (hook only; behaviour unchanged).
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
let s = readFileSync(src, 'utf8');
const sig = 'public static StringMatcher create(String pattern, boolean isRegExp, boolean caseSensitive) {';
if (!s.includes(sig)) throw new Error('StringMatcher.create signature not found');
s = s.replace(sig, `public static final java.util.Map<Object, String[]> TRACE = java.util.Collections.synchronizedMap(new java.util.IdentityHashMap<>());

  public static StringMatcher create(String pattern, boolean isRegExp, boolean caseSensitive) {
    StringMatcher m = create0(pattern, isRegExp, caseSensitive);
    if (isRegExp) TRACE.put(m, new String[]{pattern, caseSensitive ? "1" : "0"});
    return m;
  }

  private static StringMatcher create0(String pattern, boolean isRegExp, boolean caseSensitive) {`);
writeFileSync(dst, s);
