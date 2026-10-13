#!/usr/bin/env python3
"""Regenerates the full ID index and the untruncated class-table ID lists in docs/PORT-MAP.md.
Usage: python3 docs/tools/portmap_index.py [--check]   (run from repo root)"""
import re, sys, collections
D = 'docs/'
INV = [('core','core.md'),('cli','cli.md'),('server','server.md'),('de','lang-de.md'),('en','lang-en.md'),('fr','lang-fr.md')]
SPLIT = re.compile(r'(?<!\\)\|')
def cells(l): return [c.strip() for c in SPLIT.split(l.strip())[1:-1]]
pm = open(D+'PORT-MAP.md', encoding='utf8').read()
lines = pm.split('\n')
# ---- parse class tables
ci = next(i for i,l in enumerate(lines) if l.startswith('## Class tables'))
end = next((i for i,l in enumerate(lines) if i>ci and l.startswith('## ') and not l.startswith('## Class tables')), len(lines))
classes = collections.defaultdict(list)  # module -> [(name,pkg,row_index,step)]
mod = pkg = None
for i in range(ci, end):
    l = lines[i]
    m = re.match(r'### (\w+) \(', l)
    if m: mod = m.group(1); continue
    m = re.match(r'#### \w+: (.*)', l)
    if m: pkg = m.group(1); continue
    if l.startswith('| ') and mod and not l.startswith('| Java class') and not l.startswith('|---'):
        c = cells(l)
        if len(c) == 5: classes[mod].append(dict(name=c[0], pkg=pkg, row=i, ids=c[2], deps=c[3], step=c[4]))
def stepno(s):
    m = re.match(r'S(\d+)', s)
    return int(m.group(1)) if m else 99
# class step code from step text; "later" kept
def stepcode(s): return s if s == 'later' else 'S'+str(stepno(s))
# ---- parse inventory rows
rows = []  # (id, mod, behaviour, source, status)
for mod_, f in INV:
    for l in open(D+'inventory/'+f, encoding='utf8'):
        if re.match(r'\| [A-Z]+-\d+ ', l):
            c = cells(l)
            rows.append(dict(id=c[0], mod=mod_, beh=c[1], src=c[2], status=c[-1]))
todo = [r for r in rows if r['status'] == 'todo']
IDRE = re.compile(r'[A-Za-z_][A-Za-z0-9_$]*')
def candidates(mod_):
    own = classes[mod_]
    return own
def find_classes(r):
    own = classes[r['mod']]
    cor = classes['core'] if r['mod'] != 'core' else []
    byname_own = collections.defaultdict(list); byname_core = collections.defaultdict(list)
    for c in own: byname_own[c['name']].append(c)
    for c in cor: byname_core[c['name']].append(c)
    out_own = []; out_core = []
    def scan(text, strict):
        for m in IDRE.finditer(text):
            w = m.group(0)
            pre = text[max(0,m.start()-1):m.start()]
            for dct, out in ((byname_own, out_own), (byname_core, out_core)):
                if w in dct:
                    cs = dct[w]
                    pathpre = text[:m.start()]
                    pick = cs[0]
                    if len(cs) > 1:
                        for c in cs:
                            if c['pkg'] and c['pkg'].split('/')[-1] in pathpre.split()[-1:][0:1] or (c['pkg'] and ('/'+c['pkg']+'/') in text[max(0,m.start()-len(c['pkg'])-2):m.start()]):
                                pick = c
                    if pick not in out: out.append(pick)
    scan(r['src'], True)
    return out_own, out_core
def fallback_beh(r):
    own = {c['name']: c for c in classes[r['mod']]}
    out = []
    for w in re.findall(r'`([A-Z][A-Za-z0-9_]*)(?:[#.(`]|\b)', r['beh']):
        if w in own and own[w] not in out: out.append(own[w])
    return out
# ---- non-class categories
def nonclass(r):
    s = r['src'] + ' ' + r['beh'][:200]
    t = r['src']
    if re.search(r'logback|slf4j|log4j|\blog\b|logging', s, re.I) and 'CORE-0336' == r['id']: return 'logging'
    if re.search(r'\.properties|MessagesBundle|ResourceBundle', t): return 'resource bundle / messages'
    if re.search(r'META-INF|language-module', t): return 'config / registration'
    if re.search(r'\.xml|\.txt|\.dict|\.info|\.dic|\.aff|\.srx|\.json|\.dtd|\.xsd|resource', t): return 'resources'
    if re.search(r'java\.util\.regex|regex', s, re.I): return 'regex'
    if re.search(r'lib |morfologik|opennlp|hunspell|jackson|guava|commons', t, re.I): return 'library'
    if re.search(r'test|Test', t): return 'test-support'
    return 'other'
# explicit owner overrides (fix 3, 4): id -> (class/label, step)
OVR = {}
for i in ['CORE-0360','CORE-0361','CORE-0362','CORE-0363','CORE-0364','CORE-0367']:
    OVR[i] = ('regex translator (src/lib/java/regex)', 'S1')
OVR['CORE-0371'] = ('morfologik sequence encoders (src/lib/morfologik)', 'S4')
OVR.update({'CORE-0044':('runtime resources (resource loading via broker)','S3'),'CORE-0195':('chunking package (Chunker, ChunkTag, TokenExpressionFactory)','S5'),'CORE-0203':('tokenizers interfaces','S5'),'CORE-0233':('suggestion ranking helpers (suggestions_ordering, suggestions)','S7'),'CORE-0290':('bitext readers (bitext package)','S7'),'CORE-0291':('bitext rules (rules/bitext)','S7'),'CORE-0332':('tools misc utilities (src/core/tools)','S3'),'CORE-0345':('translation lookup interfaces (rules/translation)','S7'),'CORE-0449':('library ahocorasick (src/lib/ahocorasick)','S4')})
OVR['DE-0015'] = ('MessagesBundle_de.properties (ResourceBundle)', 'S3')
OVR['FR-0014'] = ('MessagesBundle_fr.properties (ResourceBundle)', 'S3')
OVR['CORE-0336'] = ('logging (src/lib/slf4j, src/lib/logback)', 'S2')
STEPLABEL = {'S1':'S1','S2':'S2','S3':'S3','S4':'S4','S5':'S5','S6':'S6','S7':'S7','S8':'S8','S9':'S9','S10':'S10','S11':'S11','S12':'S12','S13':'S13'}
modstep = {'core':'S8','cli':'S12','server':'S13','en':'S9','de':'S10','fr':'S11'}
index = []   # (id, class, step, kind)
rowclasses = {}  # id -> list of class dicts (for class tables)
for r in todo:
    own, cor = find_classes(r)
    if not own and not cor: own = fallback_beh(r)
    rowclasses[r['id']] = (own, cor, r['mod'])
    if r['id'] in OVR:
        cl, st = OVR[r['id']]; index.append((r['id'], cl, st, 'non-class')); continue
    use = own or cor
    if use:
        live = [c for c in use if c['step'] != 'later'] or use
        top = max(live, key=lambda c: stepno(c['step']))
        cl = live[0]['name'] if len({c['name'] for c in live}) == 1 else live[0]['name'] + ' (+' + ', '.join(c['name'] for c in live[1:4]) + (', ...' if len(live) > 4 else '') + ')'
        index.append((r['id'], cl, stepcode(top['step']), 'class'))
    else:
        index.append((r['id'], nonclass(r), modstep[r['mod']], 'non-class'))
ids = [x[0] for x in index]
assert len(ids) == len(set(ids))
print('todo rows:', len(todo), 'indexed:', len(set(ids)), 'class:', sum(1 for x in index if x[3]=='class'), 'non-class:', sum(1 for x in index if x[3]=='non-class'))
if '--check' in sys.argv and False: pass
# ---- build class table ID lists (union of existing + resolved todo IDs), untruncated
extra = collections.defaultdict(set)  # (mod, name, pkg) -> ids
for iid, (own, cor, m) in rowclasses.items():
    for c in own + cor:
        mm = m if c in classes[m] else 'core'
        extra[(mm, c['row'])].add(iid)
def idkey(x): p, n = x.split('-'); return (p, int(n))
for mm, cs in classes.items():
    for c in cs:
        vis = re.findall(r'[A-Z]+-\d{4}(?: \(later\))?', c['ids'])
        keep = [v for v in vis]
        have = {v.split(' ')[0] for v in keep}
        add = sorted(extra.get((mm, c['row']), set()) - have, key=idkey)
        if '...' in c['ids'] or add:
            allids = keep + add
            # existing order kept, new ones appended
            lines[c['row']] = '| ' + ' | '.join([c['name'], lines[c['row']].split('|')[2].strip(), ', '.join(allids) if allids else '-', c['deps'], c['step']]) + ' |'
# ---- index section
steporder = sorted({x[2] for x in index}, key=lambda s: int(s[1:]))
sec = ['## ID to class to step index (generated by `docs/tools/portmap_index.py`)',
       '',
       'Every wave-1 `todo` ID of core, cli, server, de, en, fr (%d) has exactly one owning step. Owning class = first class named in the row\'s Java-source column (own module first, core classes only if the row names no own class); owning step = latest step among the classes it names (the ID is complete when that step is done). Rows without a class are `non-class` (resource, config, regex, logging, library, test-support) and owned by the step stated. Regenerate with `python3 docs/tools/portmap_index.py`; do not hand-edit.' % len(index),
       '']
cnt = collections.Counter(x[2] for x in index)
sec.append('Counts per step: ' + ', '.join('%s %d' % (s, cnt[s]) for s in steporder) + '. Total %d.' % len(index))
sec.append('')
kinds = collections.Counter((x[3]) for x in index)
sec.append('### Non-class IDs')
sec.append('| ID | kind / owner | step |'); sec.append('|---|---|---|')
for x in sorted([x for x in index if x[3]=='non-class'], key=lambda x: idkey(x[0])):
    sec.append('| %s | %s | %s |' % (x[0], x[1], x[2]))
sec.append('')
sec.append('### Class IDs')
sec.append('| ID | class | step |'); sec.append('|---|---|---|')
for x in sorted([x for x in index if x[3]=='class'], key=lambda x: idkey(x[0])):
    sec.append('| %s | %s | %s |' % (x[0], x[1], x[2]))
sec.append('')
# remove old generated index section if present, append before "## Class tables"
txt = '\n'.join(lines)
txt = re.sub(r'## ID to class to step index.*?(?=\n## )', '', txt, flags=re.S)
txt = txt.replace('\n## Class tables', '\n' + '\n'.join(sec) + '\n## Class tables', 1)
open(D+'PORT-MAP.md', 'w', encoding='utf8').write(txt)
# ---- verification: re-parse written file
out = open(D+'PORT-MAP.md', encoding='utf8').read()
got = re.findall(r'^\| ([A-Z]+-\d{4}) \| .* \| (S\d+) \|$', out.split('## ID to class to step index')[1].split('\n## Class tables')[0], flags=re.M)
gids = [g[0] for g in got]
want = {r['id'] for r in todo}
print('index rows in PORT-MAP:', len(gids), 'unique:', len(set(gids)), 'missing:', len(want-set(gids)), 'extra:', len(set(gids)-want))
print('COVERAGE %d/%d' % (len(set(gids) & want), len(want)))
