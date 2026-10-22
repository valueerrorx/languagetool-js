// java.util.Calendar / GregorianCalendar subset: fields, set/get, non-lenient validation, Julian/Gregorian cutover 1582, default zone from process TZ.
import { currentTimeMillis } from './clock.js';
import { Locale } from './Locale.js';
import { IllegalArgumentException, NullPointerException, UnsupportedOperationException } from './errors.js';

const ERA = 0; const YEAR = 1; const MONTH = 2; const WEEK_OF_YEAR = 3; const WEEK_OF_MONTH = 4; const DAY_OF_MONTH = 5; const DAY_OF_YEAR = 6;
const DAY_OF_WEEK = 7; const DAY_OF_WEEK_IN_MONTH = 8; const AM_PM = 9; const HOUR = 10; const HOUR_OF_DAY = 11; const MINUTE = 12; const SECOND = 13;
const MILLISECOND = 14; const ZONE_OFFSET = 15; const DST_OFFSET = 16;
const FIELD_COUNT = 17;
const ALL_FIELDS = (1 << FIELD_COUNT) - 1;
const FIELD_NAMES = ['ERA', 'YEAR', 'MONTH', 'WEEK_OF_YEAR', 'WEEK_OF_MONTH', 'DAY_OF_MONTH', 'DAY_OF_YEAR', 'DAY_OF_WEEK', 'DAY_OF_WEEK_IN_MONTH',
  'AM_PM', 'HOUR', 'HOUR_OF_DAY', 'MINUTE', 'SECOND', 'MILLISECOND', 'ZONE_OFFSET', 'DST_OFFSET'];
const MINIMUMS = [0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, -13 * 3600000, 0];
const MAXIMUMS = [1, 292278994, 11, 53, 6, 31, 366, 7, 6, 1, 11, 23, 59, 59, 999, 14 * 3600000, 2 * 3600000];
const UNSET = 0; const COMPUTED = 1; const MINIMUM_USER_STAMP = 2;
const ONE_DAY = 86400000n;
const EPOCH_OFFSET = 719163; // fixed date of 1970-01-01
const CUTOVER_FIXED = 577736; // fixed date of 1582-10-15 (Gregorian)
const CUTOVER_YEAR = 1582;
const CE = 1; const BCE = 0;

const EN_DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_GB_MONTHS_SHORT = EN_MONTHS_SHORT.map((m) => (m === 'Sep' ? 'Sept' : m));

// de/de_DE/de_AT/de_CH names (JDK 17 CLDR, probe-verified)
// pl/pl_PL names (JDK 17 CLDR, probe-verified; month LONG = genitive, LONG_STANDALONE = nominative)
const PL_DAYS_LONG = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const PL_DAYS_SHORT = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
const PL_MONTHS_LONG = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const PL_MONTHS_LONG_STANDALONE = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const PL_MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const FR_DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FR_DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const FR_MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const FR_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const FR_CA_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DE_DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DE_DAYS_SHORT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const DE_DAYS_SHORT_STANDALONE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DE_MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DE_MONTHS_LONG_AT = DE_MONTHS_LONG.map((m) => (m === 'Januar' ? 'Jänner' : m));
const DE_MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
const DE_MONTHS_SHORT_AT = ['Jän.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const DE_MONTHS_SHORT_STANDALONE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const DE_MONTHS_SHORT_STANDALONE_AT = DE_MONTHS_SHORT_STANDALONE.map((m) => (m === 'Jan' ? 'Jän' : m));

const floorDiv = (a, b) => Math.floor(a / b);
const mod = (a, b) => a - Math.floor(a / b) * b;
const isGregorianLeap = (y) => (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
const isJulianLeap = (y) => mod(y, 4) === 0;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

// Java: BaseCalendar#getFixedDate(int,int,int) for the proleptic Gregorian calendar (month 1-based)
function gregorianFixed(y, month, dom) {
  const py = y - 1;
  let days = 365 * py + floorDiv(py, 4) - floorDiv(py, 100) + floorDiv(py, 400) + CUM_DAYS[month - 1] + dom;
  if (month > 2 && isGregorianLeap(y)) days++;
  return days;
}

// Java: JulianCalendar#getFixedDate(int,int,int) (month 1-based)
function julianFixed(y, month, dom) {
  const py = y - 1;
  let days = 365 * py + floorDiv(py, 4) - 2 + CUM_DAYS[month - 1] + dom;
  if (month > 2 && isJulianLeap(y)) days++;
  return days;
}

// Java: fixed date -> [year, month0, dayOfMonth, dayOfYear] in the Gregorian (fixed >= cutover) or Julian system
function fromFixed(fixed) {
  let year;
  let jan1;
  const gregorian = fixed >= CUTOVER_FIXED;
  if (gregorian) {
    const d0 = fixed - 1;
    const n400 = floorDiv(d0, 146097);
    const d1 = mod(d0, 146097);
    const n100 = floorDiv(d1, 36524);
    const d2 = mod(d1, 36524);
    const n4 = floorDiv(d2, 1461);
    const d3 = mod(d2, 1461);
    const n1 = floorDiv(d3, 365);
    year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
    if (!(n100 === 4 || n1 === 4)) year++;
    jan1 = gregorianFixed(year, 1, 1);
  } else {
    year = floorDiv(4 * (fixed + 1) + 1464, 1461);
    jan1 = julianFixed(year, 1, 1);
  }
  const doy = fixed - jan1 + 1;
  const leap = gregorian ? isGregorianLeap(year) : isJulianLeap(year);
  let month = 11;
  while (month > 0) {
    const start = CUM_DAYS[month] + (month > 1 && leap ? 1 : 0);
    if (doy > start) break;
    month--;
  }
  const dom = doy - (CUM_DAYS[month] + (month > 1 && leap ? 1 : 0));
  if (year === CUTOVER_YEAR) { // Java: getFixedDateJan1/getFixedDateMonth1 count only the days that exist in the cutover year
    const jjan1 = julianFixed(year, 1, 1);
    const month1 = gregorian && month === 9 ? julianFixed(year, 10, 1) : fixed - dom + 1;
    return { year, month, dom, doy: fixed - jjan1 + 1, jan1: jjan1, month1, gregorian };
  }
  return { year, month, dom, doy, jan1, month1: fixed - dom + 1, gregorian };
}

// Java: BaseCalendar#getDayOfWeekDateOnOrBefore(long,int)
const dayOfWeekDateOnOrBefore = (fixed, dayOfWeek) => {
  const fd = fixed - (dayOfWeek - 1);
  return fd - mod(fd, 7) + (dayOfWeek - 1);
};

// first day of week / minimal days in first week (CLDR 39 week data by region)
const SUNDAY_FIRST = new Set('AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' '));
const SATURDAY_FIRST = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '));
const MIN_DAYS_4 = new Set('AD AN AT AX BE BG CH CZ DE DK EE ES FI FJ FO FR GB GF GG GI GP GR HU IE IM IS IT JE LI LT LU MC MQ NL NO PL RE RU SE SJ SK SM VA'.split(' '));

// Java: Calendar#setWeekCountData(Locale)
function weekData(locale) {
  const country = locale.getCountry();
  if (country === '') return { firstDayOfWeek: 1, minimalDaysInFirstWeek: 1 }; // JDK 17 probe: country-less locales (en, ar) give Sunday/1
  const first = SUNDAY_FIRST.has(country) ? 1 : SATURDAY_FIRST.has(country) ? 7 : 2;
  return { firstDayOfWeek: first, minimalDaysInFirstWeek: MIN_DAYS_4.has(country) ? 4 : 1 };
}

const SAFE = 8.64e15;
const CYCLE_MS = 146097 * 86400000; // 400 Gregorian years

// Java: ZoneInfo#getOffset(long) for the default zone (process TZ); instants outside the Date range map to an equal calendar position 400*k years away
function zoneOffsetAt(utc) {
  let ms = Number(utc);
  if (ms > SAFE - CYCLE_MS || ms < -SAFE + CYCLE_MS) {
    const k = Math.trunc(ms / CYCLE_MS);
    ms -= k * CYCLE_MS;
  }
  return -new Date(ms).getTimezoneOffset() * 60000;
}

// Java: ZoneInfo#getOffsetsByWall(long,int[]) -> total offset
function offsetByWall(wall) {
  const guess = wall - BigInt(zoneOffsetAt(wall));
  return zoneOffsetAt(guess);
}

// Java: ZoneInfo#getRawOffset() approximated by the smaller of the January and July offsets of the year
function rawOffsetAt(utc) {
  const ms = Number(utc);
  const y = new Date(Math.abs(ms) > SAFE - CYCLE_MS ? ms - Math.trunc(ms / CYCLE_MS) * CYCLE_MS : ms).getUTCFullYear();
  const jan = -new Date(Date.UTC(y, 0, 1)).getTimezoneOffset() * 60000;
  const jul = -new Date(Date.UTC(y, 6, 1)).getTimezoneOffset() * 60000;
  return Math.min(jan, jul);
}

// Java: Calendar (GregorianCalendar behaviour)
export class Calendar {
  static FQCN = 'java.util.Calendar';
  static ERA = ERA;
  static YEAR = YEAR;
  static MONTH = MONTH;
  static WEEK_OF_YEAR = WEEK_OF_YEAR;
  static WEEK_OF_MONTH = WEEK_OF_MONTH;
  static DATE = DAY_OF_MONTH;
  static DAY_OF_MONTH = DAY_OF_MONTH;
  static DAY_OF_YEAR = DAY_OF_YEAR;
  static DAY_OF_WEEK = DAY_OF_WEEK;
  static DAY_OF_WEEK_IN_MONTH = DAY_OF_WEEK_IN_MONTH;
  static AM_PM = AM_PM;
  static HOUR = HOUR;
  static HOUR_OF_DAY = HOUR_OF_DAY;
  static MINUTE = MINUTE;
  static SECOND = SECOND;
  static MILLISECOND = MILLISECOND;
  static ZONE_OFFSET = ZONE_OFFSET;
  static DST_OFFSET = DST_OFFSET;
  static SUNDAY = 1;
  static MONDAY = 2;
  static TUESDAY = 3;
  static WEDNESDAY = 4;
  static THURSDAY = 5;
  static FRIDAY = 6;
  static SATURDAY = 7;
  static JANUARY = 0;
  static FEBRUARY = 1;
  static MARCH = 2;
  static APRIL = 3;
  static MAY = 4;
  static JUNE = 5;
  static JULY = 6;
  static AUGUST = 7;
  static SEPTEMBER = 8;
  static OCTOBER = 9;
  static NOVEMBER = 10;
  static DECEMBER = 11;
  static SHORT = 1;
  static LONG = 2;
  static NARROW_FORMAT = 4;
  static SHORT_FORMAT = 1;
  static LONG_FORMAT = 2;
  static SHORT_STANDALONE = 0x8001;
  static LONG_STANDALONE = 0x8002;
  static AM = 0;
  static PM = 1;

  // Java: Calendar#Calendar(TimeZone,Locale) (via GregorianCalendar: time = System.currentTimeMillis())
  constructor(locale) {
    const w = weekData(locale);
    this.firstDayOfWeek = w.firstDayOfWeek;
    this.minimalDaysInFirstWeek = w.minimalDaysInFirstWeek;
    this.lenient = true;
    this.fields = new Array(FIELD_COUNT).fill(0);
    this.stamp = new Array(FIELD_COUNT).fill(UNSET);
    this.nextStamp = MINIMUM_USER_STAMP;
    this.time = 0n;
    this.isTimeSet = false;
    this.areFieldsSet = false;
    this.setTimeInMillis(currentTimeMillis());
  }

  // Java: Calendar#getInstance() / getInstance(Locale)
  static getInstance(locale = Locale.getDefault()) {
    if (locale === null || locale === undefined) throw new NullPointerException();
    return new Calendar(locale);
  }

  // Java: Calendar#setLenient(boolean)
  setLenient(lenient) {
    this.lenient = lenient;
  }

  // Java: Calendar#isLenient()
  isLenient() {
    return this.lenient;
  }

  // Java: Calendar#getFirstDayOfWeek()
  getFirstDayOfWeek() {
    return this.firstDayOfWeek;
  }

  // Java: Calendar#getMinimalDaysInFirstWeek()
  getMinimalDaysInFirstWeek() {
    return this.minimalDaysInFirstWeek;
  }

  // Java: Calendar#setTimeInMillis(long)
  setTimeInMillis(millis) {
    this.time = BigInt(millis);
    this.isTimeSet = true;
    this.computeFields();
    this.areFieldsSet = true;
  }

  // Java: Calendar#getTimeInMillis()
  getTimeInMillis() {
    return Number(this.getTimeBig());
  }

  // Java: Calendar#getTimeInMillis() (long value)
  getTimeBig() {
    if (!this.isTimeSet) {
      this.computeTime();
      this.isTimeSet = true;
    }
    return this.time;
  }

  // Java: Calendar#complete()
  complete() {
    if (!this.isTimeSet) {
      this.computeTime();
      this.isTimeSet = true;
    }
    if (!this.areFieldsSet) {
      this.computeFields();
      this.areFieldsSet = true;
    }
  }

  // Java: Calendar#get(int)
  get(field) {
    this.complete();
    return this.fields[field];
  }

  // Java: Calendar#set(int,int) / set(int,int,int) / set(int,int,int,int,int) / set(int,int,int,int,int,int)
  set(...args) {
    if (args.length === 2) {
      const [field, value] = args;
      if (this.areFieldsSet) this.computeFields();
      this.fields[field] = value;
      this.isTimeSet = false;
      this.areFieldsSet = false;
      this.stamp[field] = this.nextStamp++;
      return;
    }
    const [year, month, date, hourOfDay = null, minute = null, second = null] = args;
    this.set(YEAR, year);
    this.set(MONTH, month);
    this.set(DAY_OF_MONTH, date);
    if (hourOfDay !== null) {
      this.set(HOUR_OF_DAY, hourOfDay);
      this.set(MINUTE, minute);
      if (second !== null) this.set(SECOND, second);
    }
  }

  // Java: Calendar#clear()
  clear() {
    this.fields.fill(0);
    this.stamp.fill(UNSET);
    this.nextStamp = MINIMUM_USER_STAMP;
    this.isTimeSet = false;
    this.areFieldsSet = false;
  }

  // Java: Calendar#after(Object)
  after(when) {
    return when instanceof Calendar && this.compareTo(when) > 0;
  }

  // Java: Calendar#before(Object)
  before(when) {
    return when instanceof Calendar && this.compareTo(when) < 0;
  }

  // Java: Calendar#compareTo(Calendar)
  compareTo(other) {
    const a = Calendar.getMillisOf(this);
    const b = Calendar.getMillisOf(other);
    return a > b ? 1 : a === b ? 0 : -1;
  }

  // Java: Calendar#getMillisOf(Calendar) (private static; a calendar without computed time is cloned and made lenient, so no exception)
  static getMillisOf(calendar) {
    if (calendar.isTimeSet) return calendar.time;
    const cal = calendar.clone();
    cal.setLenient(true);
    return cal.getTimeBig();
  }

  // Java: Calendar#clone()
  clone() {
    const c = Object.create(Calendar.prototype);
    Object.assign(c, this);
    c.fields = [...this.fields];
    c.stamp = [...this.stamp];
    return c;
  }

  // Java: Calendar#equals(Object) (time only)
  equals(other) {
    return other instanceof Calendar && this.getTimeBig() === other.getTimeBig();
  }

  // Java: Calendar#getDisplayName(int,int,Locale) (DAY_OF_WEEK/MONTH with style SHORT/LONG, JDK 17 CLDR names of the locales en, en_US, en_GB, de, de_DE, de_AT, de_CH, fr, fr_FR/CH/BE/CA, pl, pl_PL; probe-verified)
  getDisplayName(field, style, locale) {
    if (locale === null || locale === undefined) throw new NullPointerException();
    const base = style & ~0x8000; // standalone flag
    if (field < 0 || field >= FIELD_COUNT || (base !== 0 && base !== 1 && base !== 2 && base !== 4)) {
      throw new IllegalArgumentException();
    }
    if (style !== 1 && style !== 2 && style !== 0x8001 && style !== 0x8002) {
      throw new UnsupportedOperationException(`Calendar#getDisplayName style ${style} not ported`);
    }
    if (field !== DAY_OF_WEEK && field !== MONTH) {
      if (field === ERA || field === AM_PM) throw new UnsupportedOperationException(`Calendar#getDisplayName field ${FIELD_NAMES[field]} not ported`);
      this.get(field);
      return null;
    }
    const country = locale.getCountry();
    if (locale.getLanguage() === 'de' && locale.getVariant() === '' && (country === '' || country === 'DE' || country === 'AT' || country === 'CH')) {
      const deValue = this.get(field);
      const deLong = (style & 0x7fff) === 2;
      const standalone = (style & 0x8000) !== 0;
      const at = country === 'AT';
      if (field === DAY_OF_WEEK) return (deLong ? DE_DAYS_LONG : standalone ? DE_DAYS_SHORT_STANDALONE : DE_DAYS_SHORT)[deValue - 1];
      if (deLong) return (at ? DE_MONTHS_LONG_AT : DE_MONTHS_LONG)[deValue];
      if (standalone) return (at ? DE_MONTHS_SHORT_STANDALONE_AT : DE_MONTHS_SHORT_STANDALONE)[deValue];
      return (at ? DE_MONTHS_SHORT_AT : DE_MONTHS_SHORT)[deValue];
    }
    if (locale.getLanguage() === 'fr' && locale.getVariant() === '' && (country === '' || country === 'FR' || country === 'CH' || country === 'BE' || country === 'CA')) {
      const frValue = this.get(field);
      const frLong = (style & 0x7fff) === 2;
      if (field === DAY_OF_WEEK) return (frLong ? FR_DAYS_LONG : FR_DAYS_SHORT)[frValue - 1];
      if (frLong) return FR_MONTHS_LONG[frValue];
      return (country === 'CA' ? FR_CA_MONTHS_SHORT : FR_MONTHS_SHORT)[frValue];
    }
    if (locale.getLanguage() === 'pl' && locale.getVariant() === '' && (country === '' || country === 'PL')) {
      const plValue = this.get(field);
      const plLong = (style & 0x7fff) === 2;
      if (field === DAY_OF_WEEK) return (plLong ? PL_DAYS_LONG : PL_DAYS_SHORT)[plValue - 1];
      if (plLong) return ((style & 0x8000) !== 0 ? PL_MONTHS_LONG_STANDALONE : PL_MONTHS_LONG)[plValue];
      return PL_MONTHS_SHORT[plValue];
    }
    if (locale.getLanguage() !== 'en' || locale.getVariant() !== '' || (country !== '' && country !== 'US' && country !== 'GB')) {
      throw new UnsupportedOperationException(`Calendar#getDisplayName locale ${locale} not ported`);
    }
    const value = this.get(field);
    const long = (style & 0x7fff) === 2;
    if (field === DAY_OF_WEEK) return (long ? EN_DAYS_LONG : EN_DAYS_SHORT)[value - 1];
    return (long ? EN_MONTHS_LONG : country === 'GB' ? EN_GB_MONTHS_SHORT : EN_MONTHS_SHORT)[value];
  }

  // Java: Calendar#getActualMaximum(int) for fields with fixed range
  getMaximum(field) {
    return MAXIMUMS[field];
  }

  // Java: Calendar#getMinimum(int)
  getMinimum(field) {
    return MINIMUMS[field];
  }

  // Java: Calendar#isExternallySet(int)
  isExternallySet(field) {
    return this.stamp[field] >= MINIMUM_USER_STAMP;
  }

  // Java: Calendar#selectFields()
  selectFields() {
    const stamp = this.stamp;
    const aggregate = (a, b) => (a === UNSET || b === UNSET ? UNSET : Math.max(a, b));
    let fieldMask = 1 << YEAR;
    if (stamp[ERA] !== UNSET) fieldMask |= 1 << ERA;
    const dowStamp = stamp[DAY_OF_WEEK];
    const monthStamp = stamp[MONTH];
    let domStamp = stamp[DAY_OF_MONTH];
    let womStamp = aggregate(stamp[WEEK_OF_MONTH], dowStamp);
    let dowimStamp = aggregate(stamp[DAY_OF_WEEK_IN_MONTH], dowStamp);
    const doyStamp = stamp[DAY_OF_YEAR];
    let woyStamp = aggregate(stamp[WEEK_OF_YEAR], dowStamp);
    let bestStamp = domStamp;
    if (womStamp > bestStamp) bestStamp = womStamp;
    if (dowimStamp > bestStamp) bestStamp = dowimStamp;
    if (doyStamp > bestStamp) bestStamp = doyStamp;
    if (woyStamp > bestStamp) bestStamp = woyStamp;
    if (bestStamp === UNSET) {
      womStamp = stamp[WEEK_OF_MONTH];
      dowimStamp = Math.max(stamp[DAY_OF_WEEK_IN_MONTH], dowStamp);
      woyStamp = stamp[WEEK_OF_YEAR];
      bestStamp = Math.max(Math.max(womStamp, dowimStamp), woyStamp);
      if (bestStamp === UNSET) {
        bestStamp = domStamp = monthStamp;
      }
    }
    if (bestStamp === domStamp
      || (bestStamp === womStamp && stamp[WEEK_OF_MONTH] >= stamp[WEEK_OF_YEAR])
      || (bestStamp === dowimStamp && stamp[DAY_OF_WEEK_IN_MONTH] >= stamp[WEEK_OF_YEAR])) {
      fieldMask |= 1 << MONTH;
      if (bestStamp === domStamp) {
        fieldMask |= 1 << DAY_OF_MONTH;
      } else {
        if (bestStamp === womStamp) {
          fieldMask |= 1 << WEEK_OF_MONTH;
        } else {
          if (stamp[DAY_OF_WEEK_IN_MONTH] !== UNSET) fieldMask |= 1 << DAY_OF_WEEK_IN_MONTH;
        }
        if (dowStamp !== UNSET) fieldMask |= 1 << DAY_OF_WEEK;
      }
    } else {
      if (bestStamp === doyStamp) {
        fieldMask |= 1 << DAY_OF_YEAR;
      } else {
        if (bestStamp === woyStamp) fieldMask |= 1 << WEEK_OF_YEAR;
        if (dowStamp !== UNSET) fieldMask |= 1 << DAY_OF_WEEK;
      }
    }
    const hourOfDayStamp = stamp[HOUR_OF_DAY];
    const hourStamp = aggregate(stamp[HOUR], stamp[AM_PM]);
    bestStamp = hourStamp > hourOfDayStamp ? hourStamp : hourOfDayStamp;
    if (bestStamp === UNSET) bestStamp = Math.max(stamp[HOUR], stamp[AM_PM]);
    if (bestStamp === UNSET || bestStamp === hourOfDayStamp) {
      fieldMask |= 1 << HOUR_OF_DAY;
    } else {
      fieldMask |= 1 << HOUR;
      if (stamp[AM_PM] !== UNSET) fieldMask |= 1 << AM_PM;
    }
    if (stamp[MINUTE] !== UNSET) fieldMask |= 1 << MINUTE;
    if (stamp[SECOND] !== UNSET) fieldMask |= 1 << SECOND;
    if (stamp[MILLISECOND] !== UNSET) fieldMask |= 1 << MILLISECOND;
    if (stamp[ZONE_OFFSET] >= MINIMUM_USER_STAMP) fieldMask |= 1 << ZONE_OFFSET;
    if (stamp[DST_OFFSET] >= MINIMUM_USER_STAMP) fieldMask |= 1 << DST_OFFSET;
    return fieldMask;
  }

  // Java: GregorianCalendar#getFixedDate(BaseCalendar,int,int)
  getFixedDate(gregorian, year, fieldMask) {
    const set = (f) => (fieldMask & (1 << f)) !== 0;
    const fieldsRef = this.fields;
    let month = 0;
    if (set(MONTH)) {
      month = fieldsRef[MONTH];
      if (month > 11) {
        year += floorDiv(month, 12);
        month = mod(month, 12);
      } else if (month < 0) {
        year += floorDiv(month, 12);
        month = mod(month, 12);
      }
    }
    let fixedDate = gregorian ? gregorianFixed(year, month + 1, 1) : julianFixed(year, month + 1, 1);
    if (set(MONTH)) {
      if (set(DAY_OF_MONTH)) {
        if (this.stamp[DAY_OF_MONTH] !== UNSET) {
          fixedDate += fieldsRef[DAY_OF_MONTH];
          fixedDate -= 1;
        }
      } else if (set(WEEK_OF_MONTH)) {
        let firstDayOfWeek = dayOfWeekDateOnOrBefore(fixedDate + 6, this.firstDayOfWeek);
        if ((firstDayOfWeek - fixedDate) >= this.minimalDaysInFirstWeek) firstDayOfWeek -= 7;
        if (set(DAY_OF_WEEK)) firstDayOfWeek = dayOfWeekDateOnOrBefore(firstDayOfWeek + 6, fieldsRef[DAY_OF_WEEK]);
        fixedDate = firstDayOfWeek + 7 * (fieldsRef[WEEK_OF_MONTH] - 1);
      } else {
        const dayOfWeek = set(DAY_OF_WEEK) ? fieldsRef[DAY_OF_WEEK] : this.firstDayOfWeek;
        const dowim = set(DAY_OF_WEEK_IN_MONTH) ? fieldsRef[DAY_OF_WEEK_IN_MONTH] : 1;
        if (dowim >= 0) {
          fixedDate = dayOfWeekDateOnOrBefore(fixedDate + (7 * dowim) - 1, dayOfWeek);
        } else {
          const leap = gregorian ? isGregorianLeap(year) : isJulianLeap(year);
          const monthLength = MONTH_DAYS[month] + (month === 1 && leap ? 1 : 0);
          const lastDate = monthLength + (7 * (dowim + 1));
          fixedDate = dayOfWeekDateOnOrBefore(fixedDate + lastDate - 1, dayOfWeek);
        }
      }
    } else {
      if (set(DAY_OF_YEAR)) {
        fixedDate += fieldsRef[DAY_OF_YEAR] - 1;
      } else {
        let firstDayOfWeek = dayOfWeekDateOnOrBefore(fixedDate + 6, this.firstDayOfWeek);
        if ((firstDayOfWeek - fixedDate) >= this.minimalDaysInFirstWeek) firstDayOfWeek -= 7;
        if (set(DAY_OF_WEEK)) {
          const dayOfWeek = fieldsRef[DAY_OF_WEEK];
          if (dayOfWeek !== this.firstDayOfWeek) firstDayOfWeek = dayOfWeekDateOnOrBefore(firstDayOfWeek + 6, dayOfWeek);
        }
        fixedDate = firstDayOfWeek + 7 * (fieldsRef[WEEK_OF_YEAR] - 1);
      }
    }
    return fixedDate;
  }

  // Java: GregorianCalendar#computeTime()
  computeTime() {
    const fields = this.fields;
    const originalFields = new Array(FIELD_COUNT);
    if (!this.lenient) {
      for (let field = 0; field < FIELD_COUNT; field++) {
        const value = fields[field];
        if (this.isExternallySet(field)) {
          if (value < this.getMinimum(field) || value > this.getMaximum(field)) {
            throw new IllegalArgumentException(FIELD_NAMES[field]);
          }
        }
        originalFields[field] = value;
      }
    }
    const fieldMask = this.selectFields();
    let year = this.stamp[YEAR] !== UNSET ? fields[YEAR] : 1970;
    const era = this.stamp[ERA] !== UNSET ? fields[ERA] : CE;
    if (era === BCE) {
      year = 1 - year;
    } else if (era !== CE) {
      throw new IllegalArgumentException();
    }
    if (year <= 0 && this.stamp[ERA] === UNSET) this.set(ERA, BCE);
    let timeOfDay = 0n;
    const set = (f) => (fieldMask & (1 << f)) !== 0;
    if (set(HOUR_OF_DAY)) {
      timeOfDay += BigInt(fields[HOUR_OF_DAY]);
    } else {
      timeOfDay += BigInt(fields[HOUR]);
      if (set(AM_PM)) timeOfDay += BigInt(12 * fields[AM_PM]);
    }
    timeOfDay *= 60n;
    timeOfDay += BigInt(fields[MINUTE]);
    timeOfDay *= 60n;
    timeOfDay += BigInt(fields[SECOND]);
    timeOfDay *= 1000n;
    timeOfDay += BigInt(fields[MILLISECOND]);
    let fixedDays = timeOfDay / ONE_DAY;
    timeOfDay %= ONE_DAY;
    while (timeOfDay < 0n) {
      timeOfDay += ONE_DAY;
      fixedDays--;
    }
    let fixedDate;
    if (year > CUTOVER_YEAR) {
      fixedDate = this.getFixedDate(true, year, fieldMask);
    } else if (year < CUTOVER_YEAR) {
      fixedDate = this.getFixedDate(false, year, fieldMask);
    } else {
      fixedDate = this.getFixedDate(true, year, fieldMask);
      if (fixedDate < CUTOVER_FIXED) {
        fixedDate = this.getFixedDate(false, year, fieldMask);
        if (!this.lenient && fixedDate >= CUTOVER_FIXED) throw new IllegalArgumentException("the specified date doesn't exist");
      }
    }
    let millis = (BigInt(fixedDate) + fixedDays - BigInt(EPOCH_OFFSET)) * ONE_DAY + timeOfDay;
    if (set(ZONE_OFFSET) || set(DST_OFFSET)) {
      let zoneOffset = 0;
      if (set(ZONE_OFFSET)) zoneOffset += fields[ZONE_OFFSET]; else zoneOffset += rawOffsetAt(millis);
      if (set(DST_OFFSET)) zoneOffset += fields[DST_OFFSET];
      millis -= BigInt(zoneOffset);
    } else {
      millis -= BigInt(offsetByWall(millis));
    }
    this.time = BigInt.asIntN(64, millis);
    this.computeFields();
    if (!this.lenient) {
      for (let field = 0; field < FIELD_COUNT; field++) {
        if (!this.isExternallySet(field)) continue;
        if (originalFields[field] !== fields[field]) {
          const s = originalFields[field] + ' -> ' + fields[field];
          for (let i = 0; i < FIELD_COUNT; i++) fields[i] = originalFields[i];
          throw new IllegalArgumentException(FIELD_NAMES[field] + ': ' + s);
        }
      }
    }
  }

  // Java: GregorianCalendar#computeFields()
  computeFields() {
    const f = this.fields;
    const zoneOffset = zoneOffsetAt(this.time);
    const raw = rawOffsetAt(this.time);
    const wall = this.time + BigInt(zoneOffset);
    let days = wall / ONE_DAY;
    let timeOfDay = wall % ONE_DAY;
    if (timeOfDay < 0n) {
      timeOfDay += ONE_DAY;
      days--;
    }
    const fixedDate = Number(days) + EPOCH_OFFSET;
    const t = Number(timeOfDay);
    const d = fromFixed(fixedDate);
    f[ERA] = d.year > 0 ? CE : BCE;
    f[YEAR] = d.year > 0 ? d.year : 1 - d.year;
    f[MONTH] = d.month;
    f[DAY_OF_MONTH] = d.dom;
    f[DAY_OF_YEAR] = d.doy;
    f[DAY_OF_WEEK] = mod(fixedDate, 7) + 1;
    f[DAY_OF_WEEK_IN_MONTH] = floorDiv(d.dom - 1, 7) + 1;
    f[HOUR_OF_DAY] = floorDiv(t, 3600000);
    f[AM_PM] = f[HOUR_OF_DAY] >= 12 ? 1 : 0;
    f[HOUR] = f[HOUR_OF_DAY] % 12;
    f[MINUTE] = floorDiv(t, 60000) % 60;
    f[SECOND] = floorDiv(t, 1000) % 60;
    f[MILLISECOND] = t % 1000;
    f[ZONE_OFFSET] = raw;
    f[DST_OFFSET] = zoneOffset - raw;
    const weekNumber = (fixedDay1, fixedDay) => {
      let fixedDay1st = dayOfWeekDateOnOrBefore(fixedDay1 + 6, this.firstDayOfWeek);
      const ndays = fixedDay1st - fixedDay1;
      if (ndays >= this.minimalDaysInFirstWeek) fixedDay1st -= 7;
      const normalized = fixedDay - fixedDay1st;
      if (normalized >= 0) return floorDiv(normalized, 7) + 1;
      return floorDiv(normalized, 7) + 1;
    };
    const yearLength = (y) => (y === CUTOVER_YEAR ? 355 : d.gregorian ? (isGregorianLeap(y) ? 366 : 365) : (isJulianLeap(y) ? 366 : 365));
    let weekOfYear = weekNumber(d.jan1, fixedDate);
    if (weekOfYear === 0) {
      const fixedDec31 = d.jan1 - 1;
      const prevJan1 = d.jan1 - yearLength(d.year - 1);
      weekOfYear = weekNumber(prevJan1, fixedDec31);
    } else if (weekOfYear >= 52) {
      const nextJan1 = d.jan1 + yearLength(d.year);
      const nextJan1st = dayOfWeekDateOnOrBefore(nextJan1 + 6, this.firstDayOfWeek);
      const ndays = nextJan1st - nextJan1;
      if (ndays >= this.minimalDaysInFirstWeek && fixedDate >= (nextJan1st - 7)) weekOfYear = 1;
    }
    f[WEEK_OF_YEAR] = weekOfYear;
    f[WEEK_OF_MONTH] = weekNumber(d.month1, fixedDate);
    for (let i = 0; i < FIELD_COUNT; i++) {
      if (this.stamp[i] < MINIMUM_USER_STAMP) this.stamp[i] = COMPUTED;
    }
  }

  // Java: Calendar.Builder
  static Builder = class Builder {
    constructor() { this.args = null; }

    // Java: Calendar.Builder#setDate(int,int,int)
    setDate(year, month, dayOfMonth) {
      this.args = [year, month, dayOfMonth];
      return this;
    }

    // Java: Calendar.Builder#build()
    build() {
      const cal = Calendar.getInstance();
      cal.clear();
      cal.setLenient(true);
      if (this.args !== null) cal.set(...this.args);
      cal.getTimeInMillis();
      return cal;
    }
  };
}
