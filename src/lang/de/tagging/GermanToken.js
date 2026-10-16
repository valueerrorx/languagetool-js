// Java: org.languagetool.tagging.de.GermanToken (constants describing the properties of German tokens)

// Java: GermanToken.POSType
export class POSType {
  static FQCN = 'org.languagetool.tagging.de.GermanToken$POSType';

  // Java: POSType#POSType(String)
  constructor(name) {
    this.name = name;
  }

  // Java: POSType#toString()
  toString() {
    return this.name;
  }
}
POSType.NOMEN = new POSType('Nomen');
POSType.VERB = new POSType('Verb');
POSType.ADJEKTIV = new POSType('Adjektiv');
POSType.DETERMINER = new POSType('Determiner');
POSType.PRONOMEN = new POSType('Pronomen');
POSType.PARTIZIP = new POSType('Partizip');
POSType.PROPER_NOUN = new POSType('Eigenname');
POSType.OTHER = new POSType('Other'); // e.g. sentence start

// Java: GermanToken.Kasus
export class Kasus {
  static FQCN = 'org.languagetool.tagging.de.GermanToken$Kasus';

  // Java: Kasus#Kasus(String)
  constructor(name) {
    this.name = name;
  }

  // Java: Kasus#toString()
  toString() {
    return this.name;
  }
}
Kasus.NOMINATIV = new Kasus('Nominativ');
Kasus.AKKUSATIV = new Kasus('Akkusativ');
Kasus.DATIV = new Kasus('Dativ');
Kasus.GENITIV = new Kasus('Genitiv');
Kasus.OTHER = new Kasus('Other');

// Java: GermanToken.Numerus
export class Numerus {
  static FQCN = 'org.languagetool.tagging.de.GermanToken$Numerus';

  // Java: Numerus#Numerus(String)
  constructor(name) {
    this.name = name;
  }

  // Java: Numerus#toString()
  toString() {
    return this.name;
  }
}
Numerus.SINGULAR = new Numerus('Singular');
Numerus.PLURAL = new Numerus('Plural');
Numerus.OTHER = new Numerus('Other');

// Java: GermanToken.Genus
export class Genus {
  static FQCN = 'org.languagetool.tagging.de.GermanToken$Genus';

  // Java: Genus#Genus(String)
  constructor(name) {
    this.name = name;
  }

  // Java: Genus#toString()
  toString() {
    return this.name;
  }
}
Genus.NEUTRUM = new Genus('Neutrum');
Genus.MASKULINUM = new Genus('Maskulinum');
Genus.FEMININUM = new Genus('Femininum');
Genus.OTHER = new Genus('Other');
Genus.ALLGEMEIN = new Genus('Allgemein'); // Morphy ALG = Mas, Fem, or Neu

// Java: GermanToken.Determination
export class Determination {
  static FQCN = 'org.languagetool.tagging.de.GermanToken$Determination';

  // Java: Determination#Determination(String)
  constructor(name) {
    this.name = name;
  }

  // Java: Determination#toString()
  toString() {
    return this.name;
  }
}
Determination.DEFINITE = new Determination('definit');
Determination.INDEFINITE = new Determination('indefinit');

// Java: GermanToken (only static nested classes)
export const GermanToken = { POSType, Kasus, Numerus, Genus, Determination };
