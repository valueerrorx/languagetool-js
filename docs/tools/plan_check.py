#!/usr/bin/env python3
"""Checks docs/PLAN.md functional steps (D-044): every wave-1 todo inventory ID in exactly one step.
Range syntax `CORE-0360..0367` expands to existing inventory IDs of that prefix in the range.
Usage (repo root): python3 docs/tools/plan_check.py [-v]"""
import re, sys, collections
INV = ['core', 'cli', 'server', 'lang-de', 'lang-en', 'lang-fr', 'lang-it', 'lang-es', 'lang-sl', 'lang-ru', 'lang-sk', 'lang-pl']
status = {}
for f in INV:
    for l in open(f'docs/inventory/{f}.md', encoding='utf8'):
        m = re.match(r'^\| ([A-Z]+-\d{4}) \|', l)
        if m:
            status[m.group(1)] = l.rstrip().rstrip('|').split('|')[-1].strip()
want = {i for i, s in status.items() if s == 'todo'}
by_prefix = collections.defaultdict(list)
for i in status:
    p, n = i.split('-'); by_prefix[p].append(int(n))
LINE = re.compile(r'^- \[[ x]\] (F\d+) (.*?) \| ids: (.*?) \| verify: (.*?) \| status: (\w+)$')
LINEW = re.compile(r'^- \[[ x]\] (W\d+) (.*?) \| java: (.*?) \| js: (.*?) \| ids: (.*?) \| status: (\w+)$')
cnt = collections.Counter(); steps = 0; bad = []; explicit_nontodo = []
for l in open('docs/PLAN.md', encoding='utf8').read().split('\n'):
    if not re.match(r'- \[[ x]\] [FW]\d+ ', l): continue
    if l.startswith('- [') and re.match(r'- \[[ x]\] W', l):
        mw = LINEW.match(l); m = None
        if not mw: bad.append(l[:100]); continue
        idtext = mw.group(5)
    else:
        m = LINE.match(l)
        if not m: bad.append(l[:100]); continue
        idtext = m.group(3)
    steps += 1
    for tok in [t.strip() for t in idtext.split(',')]:
        r = re.fullmatch(r'([A-Z]+)-(\d{4})\.\.(\d{4})', tok)
        if r:
            p, a, b = r.group(1), int(r.group(2)), int(r.group(3))
            for n in sorted(by_prefix[p]):
                if a <= n <= b:
                    i = f'{p}-{n:04d}'
                    if status[i] == 'todo': cnt[i] += 1
            continue
        if re.fullmatch(r'[A-Z]+-\d{4}', tok):
            if tok not in status: bad.append('unknown id ' + tok)
            elif status[tok] != 'todo': explicit_nontodo.append(tok)
            else: cnt[tok] += 1
        elif not re.fullmatch(r'X-[A-Z0-9-]+', tok): bad.append('bad token ' + tok)
got = set(cnt)
print('steps', steps, 'covered %d/%d' % (len(got & want), len(want)))
print('missing', sorted(want - got))
print('dups', sorted(i for i, n in cnt.items() if n > 1))
print('non-todo listed', sorted(explicit_nontodo))
print('bad', bad)
sys.exit(0 if not (want - got) and not [i for i, n in cnt.items() if n > 1] and not bad else 1)
