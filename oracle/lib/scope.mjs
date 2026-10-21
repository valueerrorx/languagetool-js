// Wave-2 scope (W02): languages the JS port provides = the registered ones; everything else stays DEV-006 / notPorted.
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';

export const WAVE_CODES = ['de', 'en', 'fr', 'sl', 'sk', 'it', 'pl', 'ru', 'es'];
const FQCN_PREFIX = /^org\.languagetool\.language\./;

// short codes (base language) of the languages registered in the port
export const portedBases = () => new Set(Languages.get().map((l) => l.getShortCode()));
export const isPortedBase = (code) => portedBases().has(String(code).split('-')[0]);
// simple class names (without package) of the registered languages
export const portedClasses = () => new Set(Languages.get().map((l) => l.constructor.FQCN.replace(FQCN_PREFIX, '')));
