// java.nio.ByteBuffer subset (array + position + limit, heap buffers) and morfologik BufferUtils.
import { BufferOverflowException, IllegalArgumentException, IndexOutOfBoundsException } from '../java/errors.js';

// Java: java.nio.ByteBuffer (heap, arrayOffset 0); capacity = a.length
export class ByteBuf {
  constructor(a, pos, lim) {
    this.a = a;
    this.pos = pos;
    this.lim = lim;
  }

  // Java: ByteBuffer#allocate(int)
  static allocate(n) {
    if (n < 0) throw new IllegalArgumentException(`capacity < 0: (${n} < 0)`);
    return new ByteBuf(new Uint8Array(n), 0, n);
  }

  // Java: ByteBuffer#wrap(byte[],int,int)
  static wrap(a, off, len) {
    if (off < 0 || len < 0 || off + len > a.length) throw new IndexOutOfBoundsException();
    return new ByteBuf(a, off, off + len);
  }

  // Java: ByteBuffer#remaining()
  remaining() {
    return this.lim - this.pos;
  }

  // Java: ByteBuffer#capacity()
  capacity() {
    return this.a.length;
  }

  // Java: ByteBuffer#clear()
  clear() {
    this.pos = 0;
    this.lim = this.a.length;
    return this;
  }

  // Java: ByteBuffer#flip()
  flip() {
    this.lim = this.pos;
    this.pos = 0;
    return this;
  }

  // Java: ByteBuffer#put(byte[],int,int)
  put(src, off, len) {
    if (off < 0 || len < 0 || len > src.length - off) {
      throw new IndexOutOfBoundsException(`Range [${off}, ${off} + ${len}) out of bounds for length ${src.length}`);
    }
    if (len > this.lim - this.pos) throw new BufferOverflowException();
    this.a.set(src.subarray(off, off + len), this.pos);
    this.pos += len;
    return this;
  }

  // Java: ByteBuffer#put(ByteBuffer) (advances the source)
  putBuf(src) {
    const n = src.lim - src.pos;
    if (n > this.lim - this.pos) throw new BufferOverflowException();
    this.a.set(src.a.subarray(src.pos, src.lim), this.pos);
    this.pos += n;
    src.pos = src.lim;
    return this;
  }
}

// Java: BufferUtils#clearAndEnsureCapacity(ByteBuffer,int)
export function clearAndEnsureCapacity(buffer, requiredCapacity) {
  if (buffer === null || buffer.a.length < requiredCapacity) return ByteBuf.allocate(requiredCapacity);
  return buffer.clear();
}

// Java: Arrays#toString(byte[]) of a[off,off+len)
export function bytesToString(a, off, len) {
  if (len === 0) return '[]';
  const parts = [];
  for (let i = off; i < off + len; i++) parts.push(String(a[i] << 24 >> 24));
  return `[${parts.join(', ')}]`;
}
