// org.languagetool.markup.MappingValue (package-private)
export class MappingValue {
  static FQCN = 'org.languagetool.markup.MappingValue';

  // Java: MappingValue#MappingValue(int) / (int,int)
  constructor(totalPosition, fakeMarkupLength = 0) {
    this.totalPosition = totalPosition;
    this.fakeMarkupLength = fakeMarkupLength;
  }

  // Java: MappingValue#getTotalPosition()
  getTotalPosition() {
    return this.totalPosition;
  }

  // Java: MappingValue#getFakeMarkupLength()
  getFakeMarkupLength() {
    return this.fakeMarkupLength;
  }

  // Java: MappingValue#toString()
  toString() {
    return `totalPos:${this.totalPosition},fakeMarkupLen=${this.fakeMarkupLength}`;
  }
}
