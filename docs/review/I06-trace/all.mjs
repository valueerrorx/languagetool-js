import { check, listLanguages } from '/home/valueerror/STUFF/DEV/LanguageTool/LT-JS/src/index.js';
const T = { de: 'Das ist ein Tesst, das er komt. Ich weis nicht ob das stimmt dass ist gut.', en: 'This is an tesst. Their going too the store.', fr: 'Ceci est un tesst. Il sont allé.', it: 'Questo è un tesst. Loro è andato.', es: 'Esto es un tesst. Ellos va.', sl: 'To je tesst. Oni gre.', ru: 'Это тесст. Они идёт.', sk: 'Toto je tesst. Oni ide.', pl: 'To jest tesst. Oni idzie.' };
const langs = await listLanguages();
for (const l of langs.filter(x => (x.longCode||x.code).split("-")[0] === process.env.L)) {
  const code = l.longCode || l.code;
  const t = T[code.split('-')[0]] ?? T.en;
  for (const level of ['default', 'picky']) {
    try { const r = await check(t, { language: code, level }); process.stdout.write(`${code} ${level} ${r.matches.length}\n`); } catch (e) { console.log(code, 'ERR', e.message); }
  }
}
