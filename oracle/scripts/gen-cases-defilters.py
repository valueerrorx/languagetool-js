# Authors oracle/cases/X-DEFILTERS (F58) inputs only: examples of de rules using the DE-0110..0122 filters.
import re, json, os, hashlib
import xml.etree.ElementTree as ET
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
R = ROOT + '/oracle/java-src/languagetool-language-modules/de/src/main/resources/org/languagetool/'
OUT = ROOT + '/oracle/cases/X-DEFILTERS'
for f in os.listdir(OUT) if os.path.isdir(OUT) else []: os.remove(OUT + '/' + f)
os.makedirs(OUT, exist_ok=True)
FILT = ['AdvancedSynthesizerFilter','CompoundCheckFilter','DateCheckFilter','FutureDateFilter','NewYearDateFilter','YMDNewYearDateFilter','RecentYearFilter','GermanNumberInWordFilter','InsertCommaFilter','PotentialCompoundFilter','RemoveUnknownCompoundsFilter','ValidWordFilter']
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
EDGE = ['', ' ', 'x', '1', 'Test.', 'äöüß é', 'Am 31. Februar war es.', 'Der 1. und 2. und 3. Mai.', 'x' * 300 + '.']
def langs():
    return [('de-DE', R + 'rules/de/grammar.xml')]
def idsof(f):
    out = []
    for rid, _ in collect(R + 'rules/de/grammar.xml', FILT)[f]:
        if rid and rid not in out: out.append(rid)
    return out
cnt = {}
res = collect(R + 'rules/de/grammar.xml', FILT)
for f, lst in res.items():
    if not lst: continue
    ids = []; texts = []
    for rid, exs in lst:
        if rid and rid not in ids: ids.append(rid)
        for ty, tx in exs:
            if tx and tx not in texts: texts.append(tx)
    texts += EDGE
    for lang in (['de-DE', 'de-AT', 'de-CH'] if f in ('DateCheckFilter', 'FutureDateFilter', 'GermanNumberInWordFilter', 'ValidWordFilter') else ['de-DE']):
        ops = []
        for ch in chunks(texts, 40):
            for lvl in ['DEFAULT', 'PICKY']:
                ops.append({'op':'replace-check','args':{'mode':'rules','lang':lang,'ids':ids,'cases':[{'text':t,'level':lvl} for t in ch]}})
        w(f'rules-{f}-{lang}', f'{f} via de rules {ids[:6]}{"..." if len(ids)>6 else ""} ({lang}): rule examples + edge texts, clock fixed', ops)
        cnt[f'{f}-{lang}'] = (len(ids), len(texts))
print(cnt)
def tw(name, desc, f, texts, lang='de-DE'):
    ops = [{'op':'replace-check','args':{'mode':'rules','lang':lang,'ids':idsof(f),'cases':[{'text':t,'level':l} for t in ch]}} for ch in chunks(texts, 40) for l in ['DEFAULT','PICKY']]
    w(name, desc, ops)
days = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag','Mo','Di','Mi','Do','Fr','Sa','So','montag','Sonnabend']
dt = []
for d in days[:9]:
    for s in ['15. März 2026', '16. März 2026', '29. Februar 2024', '29. Februar 2026', '31. April 2026', '1. Januar 2026', '3.12.2025', '1.1.2000', '0. März 2026', '32. März 2026']:
        dt.append(f'Am {d}, den {s} war es.'); dt.append(f'{d}, {s}.')
for m in ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember','Jän','Jänner','Sept.']:
    dt.append(f'Montag, 5. {m} 2027 geht.'); dt.append(f'Freitag, der 10. {m} 2026 geht.')
dt += ['Dienstag, 2026-03-17 hier.', 'Freitag, 13.03.2026', 'Mi, 31.12.2026', 'Montag, 1. Januar 1900', 'Montag, 99999999999999999999. März 2026', 'Sonntag, 15.03.2026']
tw('dates-DateCheckFilter-de-DE', 'DE-0113 DateCheckFilter targeted weekday/date combos', 'DateCheckFilter', dt)
fd = []
for y in ['2000','2025','2026','2027','1999','0','99','26','12345']:
    for s in ['Am 15. März {y} war es.', 'Der 15.03.{y} war es.', 'Am 31. Dezember {y}.', 'Im Januar {y}.', 'Seit {y} gibt es das.', 'Bis {y} gilt das.']:
        fd.append(s.format(y=y))
fd += ['Letztes Jahr, 2026 war gut.', '2026-03-15 ist ein Datum.']
for l in ['de-DE','de-AT','de-CH']: tw(f'dates-FutureDateFilter-{l}', 'DE-0115 FutureDateFilter targeted', 'FutureDateFilter', fd, l)
ny = [f'{p} {y}.' for p in ['Am 1. Januar', 'Im Dezember', 'Am 31. Dezember', 'Frohes neues Jahr', 'Am 2. Februar', 'Im Januar', 'Seit Januar'] for y in ['2025','2026','2027','2024','1999']]
ny += [f'{d}.{m}.{y} war es.' for y in ['2025','2026'] for m in ['01','12','06'] for d in ['01','31','15']]
for f in ['NewYearDateFilter', 'YMDNewYearDateFilter', 'RecentYearFilter']:
    if idsof(f): tw(f'dates-{f}-de-DE', f'DE-0115 {f} targeted', f, ny + [f'Das war im Jahr {y} schon.' for y in ['2000','2010','2015','2016','2020','2025','2026','2027','1900','99999999999']])
nw = [f'Ich habe {x} Katzen.' for x in ['z3hn','Ha11o','f1nf','dr3i','Ber1in','Hall0','4ever','2gether','5Blumen','H3LLO','n1chts','0ben','e1ns','v1er','Mp3','A4']]
nw += ['Das ist f0r dich.', 'x1y2z3', 'ab12cd', '1', '42', 'H2O ist Wasser.', 'Straße1 Ärger2', 'Ich bin 1ns.', 'Gehe3n bitte.', 'Aufgabe3a und 2b.']
tw('numberinword-GermanNumberInWordFilter-de-DE', 'DE-0116 GermanNumberInWordFilter targeted', 'GermanNumberInWordFilter', nw)
ic = ['Ich weiß dass er kommt.', 'Er sagte dass sie geht und dass wir bleiben.', 'Ich glaube dass es regnet weil die Wolken dunkel sind.', 'Das Haus das ich kaufte ist alt.', 'Er kam obwohl er krank war.', 'Ich hoffe es geht dir gut denn ich vermisse dich.', 'Sie fragte ob er kommt.', 'Ich weiß, dass er kommt und dass sie geht.', 'Wir wissen dass.', 'dass', 'Er sagt dass', 'Ich denke dass er der Meinung ist dass das stimmt.']
tw('insertcomma-InsertCommaFilter-de-DE', 'DE-0118 InsertCommaFilter targeted', 'InsertCommaFilter', ic)
cp = ['Das ist ein Haus Tür Beispiel.', 'Ich kaufe Kaffee Maschine.', 'Die Bus Haltestelle ist da.', 'Er hat ein Auto Reifen gekauft.', 'Wir sehen Fernseh Programm.', 'Das Kinder Zimmer ist groß.', 'Die Apfel Saft Flasche.', 'Ein Test Wort.', 'Xyz Abc Haus.', 'Die Baum Haus Treppe.', 'Das ist ein Wort Zusammen Setzung.', 'Der Wind Kraft Anlagen Bau.', 'Geschäfts Führer und Haupt Bahnhof.', 'Handy Hülle für Auto.', 'Sprach Schule in Wien.', 'Computer Spiel Entwickler.']
for f in ['PotentialCompoundFilter', 'RemoveUnknownCompoundsFilter', 'CompoundCheckFilter', 'ValidWordFilter']:
    if idsof(f): tw(f'compound-{f}-de-DE', f'DE targeted texts for {f}', f, cp + ['Das ist ( falsch ) geschrieben.', 'Er sagte ( ja ) .', 'Er ( sagte ) es.'])
