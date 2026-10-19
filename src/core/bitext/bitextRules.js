// registers BitextRule.getRelevantRules() (DifferentLengthRule, SameTranslationRule, DifferentPunctuationRule; Java order)
import { BitextRule } from './BitextRule.js';
import { DifferentLengthRule } from './DifferentLengthRule.js';
import { DifferentPunctuationRule } from './DifferentPunctuationRule.js';
import { SameTranslationRule } from './SameTranslationRule.js';

BitextRule.relevantRules = [DifferentLengthRule, SameTranslationRule, DifferentPunctuationRule];
