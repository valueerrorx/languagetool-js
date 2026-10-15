// org.languagetool.rules.Category, CategoryId, CategoryIds, Categories
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { javaTrim, stringHashCode } from '../../../lib/java/strings.js';

// Java: org.languagetool.rules.CategoryId
export class CategoryId {
  static FQCN = 'org.languagetool.rules.CategoryId';

  // Java: CategoryId#CategoryId(String)
  constructor(id) {
    Objects.requireNonNull(id, 'Category id must not be null.');
    if (javaTrim(id).length === 0) {
      throw new IllegalArgumentException(`Category id must not be empty: '${id}'`);
    }
    this.id = id;
  }

  // Java: CategoryId#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return this.id === o.id;
  }

  // Java: CategoryId#hashCode()
  hashCode() {
    return stringHashCode(this.id);
  }

  // Java: CategoryId#toString()
  toString() {
    return this.id;
  }
}

// Java: org.languagetool.rules.CategoryIds
export const CategoryIds = Object.freeze({
  TYPOGRAPHY: new CategoryId('TYPOGRAPHY'),
  CASING: new CategoryId('CASING'),
  GRAMMAR: new CategoryId('GRAMMAR'),
  TYPOS: new CategoryId('TYPOS'),
  PUNCTUATION: new CategoryId('PUNCTUATION'),
  CONFUSED_WORDS: new CategoryId('CONFUSED_WORDS'),
  REDUNDANCY: new CategoryId('REDUNDANCY'),
  STYLE: new CategoryId('STYLE'),
  GENDER_NEUTRALITY: new CategoryId('GENDER_NEUTRALITY'),
  SEMANTICS: new CategoryId('SEMANTICS'),
  COLLOQUIALISMS: new CategoryId('COLLOQUIALISMS'),
  WIKIPEDIA: new CategoryId('WIKIPEDIA'),
  BARBARISM: new CategoryId('BARBARISM'),
  MISC: new CategoryId('MISC'),
});

// Java: org.languagetool.rules.Category.Location
export class Location extends JavaEnum {
  static FQCN = 'org.languagetool.rules.Category.Location';
}
Location.INTERNAL = new Location('INTERNAL', 0);
Location.EXTERNAL = new Location('EXTERNAL', 1);

// Java: org.languagetool.rules.Category
export class Category {
  static FQCN = 'org.languagetool.rules.Category';
  static Location = Location;

  // Java: Category#Category(CategoryId,String[,Location[,boolean[,String]]])
  constructor(id, name, location = Location.INTERNAL, onByDefault = true, tabName = null) {
    this.id = Objects.requireNonNull(id);
    this.name = Objects.requireNonNull(name);
    this.location = location;
    this.defaultOff = !onByDefault;
    this.tabName = tabName;
  }

  // Java: Category#getId()
  getId() {
    return this.id;
  }

  // Java: Category#getName()
  getName() {
    return this.name;
  }

  // Java: Category#toString()
  toString() {
    return this.name;
  }

  // Java: Category#getTabName()
  getTabName() {
    return this.tabName;
  }

  // Java: Category#isDefaultOff()
  isDefaultOff() {
    return this.defaultOff;
  }

  // Java: Category#getLocation()
  getLocation() {
    return this.location;
  }
}

// Java: org.languagetool.rules.Categories
export class Categories {
  static FQCN = 'org.languagetool.rules.Categories';

  // Java: Categories#Categories(String,String)
  constructor(id, messageKey) {
    this.id = Objects.requireNonNull(id);
    this.messageKey = Objects.requireNonNull(messageKey);
  }

  // Java: Categories#getId()
  getId() {
    return new CategoryId(this.id);
  }

  // Java: Categories#getCategory(ResourceBundle)
  getCategory(messages) {
    return new Category(new CategoryId(this.id), messages.getString(this.messageKey));
  }
}
// Java: Categories#make(String,String) constants
Categories.CASING = new Categories('CASING', 'category_case');
Categories.COMPOUNDING = new Categories('COMPOUNDING', 'category_compounding');
Categories.GRAMMAR = new Categories('GRAMMAR', 'category_grammar');
Categories.TYPOS = new Categories('TYPOS', 'category_typo');
Categories.PUNCTUATION = new Categories('PUNCTUATION', 'category_punctuation');
Categories.TYPOGRAPHY = new Categories('TYPOGRAPHY', 'category_typography');
Categories.CONFUSED_WORDS = new Categories('CONFUSED_WORDS', 'category_confused_words');
Categories.REPETITIONS = new Categories('REPETITIONS', 'category_repetitions');
Categories.REDUNDANCY = new Categories('REDUNDANCY', 'category_redundancy');
Categories.REPETITIONS_STYLE = new Categories('REPETITIONS_STYLE', 'cateogry_repetitions_style'); // sic: Java key typo
Categories.STYLE = new Categories('STYLE', 'category_style');
Categories.PLAIN_ENGLISH = new Categories('PLAIN_ENGLISH', 'category_plain_english');
Categories.GENDER_NEUTRALITY = new Categories('GENDER_NEUTRALITY', 'category_gender_neutrality');
Categories.SEMANTICS = new Categories('SEMANTICS', 'category_semantics');
Categories.COLLOQUIALISMS = new Categories('COLLOQUIALISMS', 'category_colloquialism');
Categories.REGIONALISMS = new Categories('REGIONALISMS', 'category_regionalisms');
Categories.FALSE_FRIENDS = new Categories('FALSE_FRIENDS', 'category_false_friend');
Categories.WIKIPEDIA = new Categories('WIKIPEDIA', 'category_wikipedia');
Categories.MISC = new Categories('MISC', 'category_misc');
Categories.ALL = [Categories.STYLE, Categories.REPETITIONS_STYLE, Categories.REPETITIONS, Categories.CASING, Categories.COMPOUNDING,
  Categories.COLLOQUIALISMS, Categories.CONFUSED_WORDS, Categories.FALSE_FRIENDS, Categories.GENDER_NEUTRALITY, Categories.GRAMMAR,
  Categories.MISC, Categories.PLAIN_ENGLISH, Categories.REDUNDANCY, Categories.REGIONALISMS, Categories.PUNCTUATION,
  Categories.TYPOGRAPHY, Categories.WIKIPEDIA, Categories.TYPOS];
