// org.languagetool.rules.spelling.symspell.implementation.ChunkArray (MIT, Hampus Londogard)
const chunkSize = 4096; // this must be a power of 2, otherwise can't optimize row and col functions
const divShift = 12; // number of bits to shift right to do division by chunkSize (the bit position of chunkSize)

// Java: ChunkArray
export class ChunkArray {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.ChunkArray';

  // Java: ChunkArray(int)
  constructor(initialCapacity) {
    const chunks = Math.trunc((initialCapacity + chunkSize - 1) / chunkSize);
    this.values = [];
    for (let i = 0; i < chunks; i++) this.values.push(new Array(chunkSize).fill(null));
    this.count = 0;
  }

  // Java: ChunkArray#add(Node)
  add(value) {
    if (this.count === this.capacity()) {
      this.values.push(new Array(chunkSize).fill(null));
    }
    this.values[this.row(this.count)][this.col(this.count)] = value;
    this.count++;
    return this.count - 1;
  }

  // Java: ChunkArray#clear()
  clear() {
    this.count = 0;
  }

  // Java: ChunkArray#getValues(int)
  getValues(index) {
    return this.values[this.row(index)][this.col(index)];
  }

  // Java: ChunkArray#setValues(int,Node)
  setValues(index, value) {
    this.values[this.row(index)][this.col(index)] = value;
  }

  // Java: ChunkArray#row(int)
  row(index) {
    return index >> divShift;
  }

  // Java: ChunkArray#col(int)
  col(index) {
    return index & (chunkSize - 1);
  }

  // Java: ChunkArray#capacity()
  capacity() {
    return this.values.length * chunkSize;
  }
}
