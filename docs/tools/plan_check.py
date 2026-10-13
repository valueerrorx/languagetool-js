#!/usr/bin/env python3
"""Checks docs/PLAN.md steps: every wave-1 todo ID in exactly one step. Usage (repo root): python3 docs/tools/plan_check.py"""
import re,sys,collections
pm=open('docs/PORT-MAP.md',encoding='utf8').read()
sec=pm.split('## ID to class to step index')[1].split('\n## Class tables')[0]
want=set(re.findall(r'^\| ([A-Z]+-\d{4}) \|',sec,flags=re.M))
plan=open('docs/PLAN.md',encoding='utf8').read()
cnt=collections.Counter(); sizes=[]
for l in plan.split('\n'):
    m=re.match(r'- \[[ x]\] (S\d+) (.*?) \| java: .*? \| js: .*? \| ids: (.*?) \| owner: (porter|oracle) \| est: (\d+) \| status: (\w+)$',l)
    if l.startswith('- [') and re.match(r'- \[[ x]\] S\d+ ',l):
        if not m: print('BAD LINE',l[:100]); continue
        for i in re.findall(r'[A-Z]+-\d{4}',m.group(3)): cnt[i]+=1
        sizes.append((int(m.group(5)),m.group(1),m.group(2)[:70],m.group(4)))
got=set(cnt)
print('steps',len(sizes),'covered %d/%d'%(len(got&want),len(want)))
print('missing',sorted(want-got)); print('extra',sorted(got-want)); print('dups',[i for i,n in cnt.items() if n>1])
if '-v' in sys.argv:
    for s in sorted(sizes,reverse=True)[:15]: print(s)
