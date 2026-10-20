# Authors oracle/cases/X-ENFILTERS (F49) inputs only: examples of en rules using the EN-0100..0109 filters.
import re, json, os, hashlib
import xml.etree.ElementTree as ET
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
R = ROOT + '/oracle/java-src/languagetool-language-modules/en/src/main/resources/org/languagetool/'
OUT = ROOT + '/oracle/cases/X-ENFILTERS'
for f in os.listdir(OUT) if os.path.isdir(OUT) else []: os.remove(OUT + '/' + f)
os.makedirs(OUT, exist_ok=True)
FILT = ['AdverbFilter','DateCheckFilter','FutureDateFilter','NewYearDateFilter','YMDNewYearDateFilter','EnglishNumberInWordFilter','EnglishSuppressMisspelledSuggestionsFilter','FindSuggestionsFilter','OrdinalSuffixFilter']
def plain(e):
    s = ''.join(e.itertext())
    return re.sub(r'\s+', ' ', s).strip()
def collect(path, filt):
    t = ET.parse(path).getroot()
    res = {f: [] for f in filt}
    def walk(n, gid):
        for c in n:
            if c.tag == 'rulegroup': walk_rules(c, c.get('id'))
            elif c.tag == 'rule': walk_rules(c, c.get('id'), single=True)
            elif c.tag == 'category': walk(c, gid)
    def walk_rules(n, gid, single=False):
        rules = [n] if single else [r for r in n if r.tag == 'rule']
        for r in rules:
            fs = [x.get('class').split('.')[-1] for x in r.iter('filter') if x.get('class')]
            rid = r.get('id') or gid
            for f in fs:
                if f in res:
                    exs = [(x.get('type') or '', plain(x)) for x in n.iter('example')] if not single else [(x.get('type') or '', plain(x)) for x in r.iter('example')]
                    res[f].append((rid, exs))
    walk(t, None)
    return res
def chunks(a, n): return [a[i:i+n] for i in range(0, len(a), n)]
def w(name, desc, ops, compare='jsonl', env=None):
    o = {'kind':'harness','clock':'fixed','description':desc,'normalize':['paths'],'compare':compare,'ops':ops}
    if env: o['env'] = env
    json.dump(o, open(f'{OUT}/{name}.json','w'), ensure_ascii=False)
    if re.search(r'DateFilter|DateCheck|NewYear', name) and not env:
        for tag, ft in [('jan', '@2027-01-05 12:00:00'), ('dec', '@2026-12-31 12:00:00')]:
            o2 = dict(o, env={'FAKETIME': ft}, description=o['description'] + f' [clock {ft[1:]}]')
            json.dump(o2, open(f'{OUT}/{name}-{tag}.json','w'), ensure_ascii=False)
EDGE = ['', ' ', 'x', '1', 'Test.', 'äöüß é', 'It happened on 31st of Feb.', 'The 1nd and 2th and 3st.', 'x' * 300 + '.']
cnt = {}
for lang, gpath in [('en-US', R + 'rules/en/grammar.xml'), ('en-GB', R + 'rules/en/en-GB/grammar.xml'), ('en-AU', R + 'rules/en/en-AU/grammar.xml'), ('en-CA', R + 'rules/en/en-CA/grammar.xml'), ('en-NZ', R + 'rules/en/en-NZ/grammar.xml'), ('en-ZA', R + 'rules/en/en-ZA/grammar.xml')]:
    if not os.path.exists(gpath): continue
    res = collect(gpath, FILT)
    for f, lst in res.items():
        if not lst: continue
        ids = []; texts = []
        for rid, exs in lst:
            if rid and rid not in ids: ids.append(rid)
            for ty, tx in exs:
                if tx and tx not in texts: texts.append(tx)
        texts += EDGE
        ops = []
        for ch in chunks(texts, 60):
            for lvl in ['DEFAULT', 'PICKY']:
                ops.append({'op':'replace-check','args':{'mode':'rules','lang':lang,'ids':ids,'cases':[{'text':t,'level':lvl} for t in ch]}})
        w(f'rules-{f}-{lang}', f'{f} via en rules {ids[:6]}{"..." if len(ids)>6 else ""} ({lang}): rule examples + edge texts, clock fixed', ops)
        cnt[f'{f}-{lang}'] = (len(ids), len(texts))
# EN-0106 partial pos tag filters (disambiguation.xml): disambiguated analysis of the rule examples
dres = collect_d = None
t = ET.parse(R + 'resource/en/disambiguation.xml').getroot()
ex = []
for r in t.iter('rule'):
    if any(x.get('class') and x.get('class').split('.')[-1] in ('EnglishPartialPosTagFilter','NoDisambiguationEnglishPartialPosTagFilter') for x in r.iter('filter')):
        for x in r.iter('example'):
            p = plain(x)
            if p and p not in ex: ex.append(p)
extra = ['4-Hour test', 'A 10-year-old girl.', 'This is clockwise and counterclockwise.', 'He is moneywise fine.', 'a catlike creature', 'a hopeless, heartless man', 'xyzwise', 'abwise', 'Wise', 'x-wise', '12-hour shifts', '12-HOUR shifts', '']
ex += extra
for i, ch in enumerate(chunks(ex, 40)):
    w(f'partialpos-analyze-{i:02d}', 'EN-0106 (NoDisambiguation)EnglishPartialPosTagFilter via disambiguation.xml: analyze-raw dumps of rule examples', [{'op':'analyze-raw','args':{'lang':'en-US','texts':ch}}], 'check-pipe')
print(cnt, len(ex))
# targeted inputs (clock 2026-03-15 per pinned env): dates, ordinals, numbers in words, adverbs
def idsof(f, lang='en-US'):
    out = []
    for rid, _ in collect(R + ('rules/en/grammar.xml' if lang == 'en-US' else f'rules/en/{lang}/grammar.xml'), FILT)[f]:
        if rid and rid not in out: out.append(rid)
    return out
def tw(name, desc, f, texts, lang='en-US'):
    ops = [{'op':'replace-check','args':{'mode':'rules','lang':lang,'ids':idsof(f, lang),'cases':[{'text':t,'level':l} for t in ch]}} for ch in chunks(texts, 60) for l in ['DEFAULT','PICKY']]
    w(name, desc, ops)
days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Mon','Tue','Wed','Thu','Fri','Sat','Sun','monday','Thurs','Funday']
mons = ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Sept','Dec']
dt = []
for d in days[:9]:
    for s in ['15 March 2026', 'March 15, 2026', '16 March 2026', '29 February 2024', '29 February 2026', '31 April 2026', '1st January 2026', '3rd of December 2025', '1 Jan 2000', '0 March 2026', '32 March 2026']:
        dt.append(f'{d}, {s} was it.'); dt.append(f'On {d} {s}.')
for m in mons: dt.append(f'Monday, 5 {m} 2027 works.'); dt.append(f'Friday, {m} 10, 2026 works.')
dt += ['Tuesday, 2026-03-17 here.', 'Friday 2026-03-13', 'Tue, 31/12/2026', 'Wed 1.1.2025', 'Monday, 1 January 1900', 'Monday, 99999999999999999999 March 2026', 'Sunday, March 15th 2026', 'Sunday March 15th, 2026']
tw('dates-DateCheckFilter-en-US', 'EN-0102 DateCheckFilter targeted weekday/date combos (leap, invalid, abbreviations)', 'DateCheckFilter', dt)
fd = []
for y in ['2000','2025','2026','2027','1999','0','99','26','12345']:
    for s in ['March 15, {y}', '15 March {y}', '15th of March {y}', 'Dec 31, {y}', 'January {y}']:
        fd.append('It was on ' + s.format(y=y) + '.')
fd += ['Last year, 2026 was ok.', 'In 2025 we met.', '2026-03-15 is a date.']
for l in ['en-US','en-GB','en-AU','en-CA','en-NZ']:
    if idsof('FutureDateFilter', l): tw(f'dates-FutureDateFilter-{l}', 'EN-0103 FutureDateFilter targeted years/dates', 'FutureDateFilter', fd, l)
ny = [f'{p} {y}.' for p in ['On 1 January', 'January 1,', 'In December', 'On 31 December', 'Happy New Year', 'On 2 February', 'In January'] for y in ['2025','2026','2027','2024','1999']]
ny += [f'{y}-{m}-{d} was.' for y in ['2025','2026'] for m in ['01','12','06'] for d in ['01','31','15']]
for f in ['NewYearDateFilter', 'YMDNewYearDateFilter']: tw(f'dates-{f}-en-US', f'EN-0103 {f} targeted', f, ny)
od = [f'The {n}{s} of May.' for n in ['1','2','3','4','11','12','13','21','22','23','31','101','111','112','0','00','5'] for s in ['st','nd','rd','th','ND','Th','tn','']]
od += ['I was 1nd in the race.', 'On the 2th floor.', 'The 3st one.', 'The 22th of June.', 'The 1,001nd.', 'The 100000000000nd.', 'the 0th', 'It was 1ND place.']
tw('ordinal-OrdinalSuffixFilter-en-US', 'EN-0109 OrdinalSuffixFilter targeted', 'OrdinalSuffixFilter', od)
nw = [f'I have {w} cats.' for w in ['t0o','Go0d','a3ft','tw0','1o','o1','10ne','f1ve','fiv3','th1rd','4ever','2gether','5fl0wers','h3llo','H3LLO','b4','l8r','0ne','n1ne']]
nw += ['A3ft elephant', 'Go0d morning!', 'It is f0r you', 'x1y2z3', 'ab12cd', '1', '42', '3rd', 'Mp3 player', 'H2O is water.', 'Straße1 Ärger2']
tw('numberinword-EnglishNumberInWordFilter-en-US', 'EN-0105 EnglishNumberInWordFilter targeted (digits embedded in words)', 'EnglishNumberInWordFilter', nw)
ad = [f'He did it {w}.' for w in ['quick','slow','good','bad','fast','hard','late','early','easy','happy','simple','gentle','true','public','basic','full','whole','dull','y']]
ad += [f'It was a {w} car.' for w in ['quickly','slowly','happily','easily','gently','truly','publicly','basically','fully','wholly','dully','really','nicely','madly']]
ad += ['This is a quickly solution.', 'A happily day.', 'a really good', 'A  slowly   one', 'An easily.']
tw('adverb-AdverbFilter-en-US', 'EN-0100 AdverbFilter targeted adj/adverb mixups', 'AdverbFilter', ad)
