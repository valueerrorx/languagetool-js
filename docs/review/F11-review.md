# F11 review checkpoint
- SrxTextIterator/RuleMatcher/RuleManager/isException compared with javap of segment-2.0.4: equal (break, cut, move, min matcher, cache key, margin=0).
- Region emulation via substring: equal for opaque bounds + anchoring bounds. Exception check (transparent bounds): Java Behind relaxes matcher.from to 0, so ^ in look-behind sees text start as JS does; only ^ inside look-AHEAD of an exception would differ; no after-pattern with ^ in GeneralImportant/ByLineBreak/ByTwoLineBreaks/English/German/French/Default (^ only in before-patterns: English 1145, GeneralImportant 7121). Probe (en/de/fr, both modes, 11 texts) identical to Java.
- regex fix (anchored use own matcher on pair texts when look-behind not unit-safe): correct; find() already guarded by pairSafe (includes behindUnitSafe) plus start-inside-pair path.
- tests 235 pass, lint clean, parity X-SRX X-REGEX 108 pass 0 fail 2 notPorted.
VERDICT ACCEPT
